import { Router } from "express";
import { mutateData, readData } from "../services/jsondb";
import { computeGST } from "../services/pricing";
import path from "path";
import fs from "fs-extra";
import { makeId } from "@explorevalley/shared";
import { getAuthClaims, requireAuth } from "../middleware/auth";

export const publicRouter = Router();

function stripInternalFields<T extends Record<string, any>>(item: T): T {
  const copy = { ...item };
  delete (copy as any).vendorMobile;
  delete (copy as any).additionalComments;
  return copy as T;
}

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function norm(v: any) {
  return safeText(v).toLowerCase();
}

function restaurantPlace(r: any) {
  return safeText(r?.location) || safeText(r?.place) || "Unknown";
}

function restaurantImage(r: any) {
  const hero = safeText(r?.heroImage) || safeText(r?.hero_image);
  if (hero) return hero;
  const images = Array.isArray(r?.images) ? r.images : [];
  if (images.length) return safeText(images[0]);
  const meta = Array.isArray(r?.imageMeta) ? r.imageMeta : [];
  if (meta.length && meta[0]?.url) return safeText(meta[0].url);
  return "";
}

function menuItemImage(m: any) {
  const hero = safeText(m?.heroImage);
  if (hero) return hero;
  const img = safeText(m?.image);
  if (img) return img;
  const meta = Array.isArray(m?.imageMeta) ? m.imageMeta : [];
  if (meta.length && meta[0]?.url) return safeText(meta[0].url);
  return "";
}

publicRouter.get("/tours", async (_req, res) => {
  const db = await readData();
  res.json(db.tours.filter(t => t.available).map(stripInternalFields));
});

publicRouter.get("/festivals", async (_req, res) => {
  const db = await readData();
  res.json((db.festivals || []).filter((f: any) => f.available !== false).map(stripInternalFields));
});

publicRouter.get("/hotels", async (_req, res) => {
  const db = await readData();
  res.json(db.hotels.filter(h => h.available).map(stripInternalFields));
});

// Food vendors / restaurants (supports place filtering).
publicRouter.get("/places", async (_req, res) => {
  const db = await readData();
  const set = new Set<string>();
  for (const r of db.restaurants || []) {
    if (r?.available === false) continue;
    const p = restaurantPlace(r);
    if (p) set.add(p);
  }
  const places = Array.from(set).sort((a, b) => a.localeCompare(b));
  res.json(["All", ...places]);
});

publicRouter.get("/restaurants", async (req, res) => {
  const db = await readData();
  const place = safeText(req.query.place);
  const qPlace = norm(place);
  const list = (db.restaurants || []).filter((r: any) => r.available !== false);
  const filtered = (!qPlace || qPlace === "all")
    ? list
    : list.filter((r: any) => norm(restaurantPlace(r)) === qPlace);

  // Keep backward compatible shape, but add required aliases.
  const out = filtered.map((r: any) => {
    const base = stripInternalFields(r);
    return {
      ...base,
      place: restaurantPlace(base),
      image: restaurantImage(base)
    };
  });
  res.json(out);
});

publicRouter.get("/restaurants/search", async (req, res) => {
  const db = await readData();
  const query = norm(req.query.query);
  const place = norm(req.query.place);
  const list = (db.restaurants || []).filter((r: any) => r.available !== false);
  const byPlace = (!place || place === "all") ? list : list.filter((r: any) => norm(restaurantPlace(r)) === place);
  const filtered = query ? byPlace.filter((r: any) => norm(r?.name).includes(query)) : byPlace;
  res.json(filtered.map((r: any) => ({ ...stripInternalFields(r), place: restaurantPlace(r), image: restaurantImage(r) })));
});

// Menu items (backward compatible alias for existing /menu).
publicRouter.get("/menu", async (req, res) => {
  const db = await readData();
  const restaurantId = typeof req.query.restaurantId === "string" ? req.query.restaurantId : "";
  const items = db.menuItems.filter(m => m.available);
  if (!restaurantId) {
    return res.json(items);
  }
  res.json(items.filter(m => m.restaurantId === restaurantId));
});

publicRouter.get("/menu-items", async (req, res) => {
  const db = await readData();
  const restaurantId = safeText(req.query.restaurantId);
  const items = (db.menuItems || []).filter((m: any) => m.available !== false);
  const filtered = restaurantId ? items.filter((m: any) => safeText(m.restaurantId) === restaurantId) : items;

  // Return full menu item payload (frontend expects stock/maxPerOrder/isVeg/etc),
  // while also providing spec-friendly aliases.
  res.json(filtered.map((m: any) => ({
    ...m,
    image: safeText(m?.image) || menuItemImage(m),
    availability: m.available !== false,
    isAvailable: m.available !== false
  })));
});

publicRouter.get("/menu-items/search", async (req, res) => {
  const db = await readData();
  const query = norm(req.query.query);
  const restaurantId = safeText(req.query.restaurantId);
  let items = (db.menuItems || []).filter((m: any) => m.available !== false);
  if (restaurantId) items = items.filter((m: any) => safeText(m.restaurantId) === restaurantId);
  if (query) items = items.filter((m: any) => norm(m?.name).includes(query));
  res.json(items.map((m: any) => ({
    ...m,
    image: safeText(m?.image) || menuItemImage(m),
    availability: m.available !== false,
    isAvailable: m.available !== false
  })));
});

// Orders API (food orders).
publicRouter.post("/orders", async (req, res) => {
  const restaurantId = safeText(req.body?.restaurantId);
  const userId = safeText(req.body?.userId);
  const deliveryAddress = safeText(req.body?.deliveryAddress);
  const phone = safeText(req.body?.phone);
  const specialInstructions = safeText(req.body?.specialInstructions);
  const itemsIn = Array.isArray(req.body?.items) ? req.body.items : [];
  const MAX_ITEMS = 50;
  const MAX_ORDER_TOTAL = 5_000_000; // hard cap to prevent pathological totals / abuse

  if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
  if (!phone) return res.status(400).json({ error: "PHONE_REQUIRED" });
  if (!deliveryAddress) return res.status(400).json({ error: "DELIVERY_ADDRESS_REQUIRED" });
  if (!itemsIn.length) return res.status(400).json({ error: "ITEMS_REQUIRED" });
  if (itemsIn.length > MAX_ITEMS) return res.status(400).json({ error: "TOO_MANY_ITEMS" });

  const db = await readData();
  const restaurant = (db.restaurants || []).find((r: any) => safeText(r.id) === restaurantId && r.available !== false);
  if (!restaurant) return res.status(404).json({ error: "RESTAURANT_NOT_FOUND" });

  const menuItems = (db.menuItems || []).filter((m: any) => safeText(m.restaurantId) === restaurantId);
  const byId = new Map(menuItems.map((m: any) => [safeText(m.id), m]));
  const byName = new Map(menuItems.map((m: any) => [norm(m.name), m]));

  const resolvedItems: any[] = [];
  for (const it of itemsIn) {
    const qRaw = Number(it?.quantity);
    if (!Number.isFinite(qRaw) || !Number.isSafeInteger(qRaw)) {
      return res.status(400).json({ error: "INVALID_QUANTITY" });
    }
    const q = Math.max(1, qRaw);
    const menuItemId = safeText(it?.menuItemId);
    const name = safeText(it?.name);
    const src = (menuItemId && byId.get(menuItemId)) || (name && byName.get(norm(name)));
    if (!src) return res.status(400).json({ error: "INVALID_MENU_ITEM", item: { menuItemId, name } });
    if (src.available === false) return res.status(409).json({ error: "ITEM_NOT_AVAILABLE", itemId: src.id });
    const maxPerOrder = Math.max(1, Number(src.maxPerOrder || 10));
    if (q > maxPerOrder) return res.status(400).json({ error: "QUANTITY_EXCEEDS_MAX_PER_ORDER", itemId: src.id, maxPerOrder });
    resolvedItems.push({
      menuItemId: safeText(src.id),
      restaurantId,
      name: safeText(src.name),
      quantity: q,
      price: Number(src.price || 0)
    });
  }

  const baseAmount = resolvedItems.reduce((sum, x) => sum + Number(x.price || 0) * Number(x.quantity || 0), 0);
  if (!Number.isFinite(baseAmount) || baseAmount > MAX_ORDER_TOTAL) return res.status(400).json({ error: "ORDER_TOTAL_TOO_LARGE" });
  const gstRate = Number(db.settings?.taxRules?.food?.gst || 0);
  const tax = computeGST(baseAmount, gstRate, false);
  const totalAmount = Math.round((Number(baseAmount) + Number(tax.gstAmount || 0)) * 100) / 100;

  const id = makeId("food");
  const orderTime = new Date().toISOString();
  const userName = userId || "Customer";

  const created = await mutateData((draft) => {
    const next = {
      id,
      userId: userId || phone,
      restaurantId,
      userName,
      phone,
      items: resolvedItems,
      deliveryAddress,
      specialInstructions,
      pricing: { baseAmount, tax, totalAmount },
      status: "pending",
      orderTime
    };
    draft.foodOrders = Array.isArray(draft.foodOrders) ? draft.foodOrders : [];
    draft.foodOrders.unshift(next as any);
  }, "food_order_create");

  const out = (created.foodOrders || []).find((o: any) => safeText(o.id) === id) || null;
  res.json(out || { ok: true, id });
});

function sameText(a: any, b: any) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

publicRouter.get("/orders", requireAuth, async (req, res) => {
  const db = await readData();
  const claims = getAuthClaims(req);
  const userId = safeText(req.query.userId);
  if (!userId) return res.status(400).json({ error: "USER_ID_REQUIRED" });
  // Only allow reading your own order history.
  // Accepted identifiers: phone, email (lowercased), or JWT sub.
  const ok =
    (claims?.phone && sameText(claims.phone, userId)) ||
    (claims?.email && sameText(claims.email, userId)) ||
    (claims?.sub && sameText(claims.sub, userId));
  if (!ok) return res.status(403).json({ error: "FORBIDDEN" });
  const out = (db.foodOrders || []).filter((o: any) => safeText(o.userId) === userId || safeText(o.phone) === userId);
  res.json(out);
});

publicRouter.get("/meta", async (_req, res) => {
  const db = await readData();
  // Only expose public-safe configuration. Keep operational/payment/policy data admin-only.
  const settings = db.settings ? {
    currency: db.settings.currency,
    taxRules: db.settings.taxRules,
    pricingTiers: db.settings.pricingTiers
  } : null;
  const serviceAreas = (db.serviceAreas || []).filter((x: any) => x && x.enabled !== false);
  const cabLocations = Array.from(new Set([
    ...(Array.isArray(db.cabLocations) ? db.cabLocations : []),
    ...serviceAreas.flatMap((a: any) => [safeText(a?.name), safeText(a?.city)]),
  ].filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  res.json({
    settings,
    cabPricing: db.cabPricing,
    cabProviders: (db.cabProviders || []).filter((x: any) => x && x.active !== false).map(stripInternalFields),
    serviceAreas,
    cabLocations,
    coupons: (db.coupons || [])
  });
});

publicRouter.get("/pages", async (_req, res) => {
  const db = await readData();
  res.json(db.sitePages || {});
});

publicRouter.get("/pages/:slug", async (req, res) => {
  const db = await readData();
  const slug = String(req.params.slug || "").trim();
  const pages = db.sitePages || {};
  const hit = Object.values(pages).find((x: any) => String(x?.slug || "").trim() === slug);
  if (!hit) return res.status(404).json({ error: "PAGE_NOT_FOUND", slug });
  res.json(hit);
});

publicRouter.get("/menu.pdf", async (_req, res) => {
  const file = path.join(process.cwd(), "..", "public", "uploads", "pdf", "menu.pdf");
  if (!(await fs.pathExists(file))) return res.status(404).json({ error: "Menu PDF not found. Add menu items via bot then /status to regenerate." });
  res.sendFile(file);
});
