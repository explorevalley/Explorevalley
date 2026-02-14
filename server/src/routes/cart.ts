import { Router } from "express";
import { z } from "zod";
import { requireAuth, getAuthClaims } from "../middleware/auth";
import { readData, mutateData } from "../services/jsondb";
import { makeId } from "@explorevalley/shared";

const MAX_CART_ITEMS = 100;
const MAX_PER_ITEM = 50;

function norm(value: any) {
  return String(value || "").trim();
}

function same(a?: string, b?: string) {
  return norm(a).toLowerCase() === norm(b).toLowerCase() && norm(a) !== "";
}

function buildCartKey(claims: any) {
  const userId = norm(claims?.sub) || norm(claims?.userId);
  const phone = norm(claims?.phone);
  const email = norm(claims?.email).toLowerCase();
  if (!userId && !phone && !email) return null;
  return { userId, phone, email };
}

function cartMatches(cart: any, key: { userId?: string; phone?: string; email?: string }) {
  if (!cart) return false;
  if (key.userId && same(cart.userId, key.userId)) return true;
  if (key.phone && same(cart.phone, key.phone)) return true;
  if (key.email && same(cart.email, key.email)) return true;
  return false;
}

function presentCart(db: any, cart: any) {
  if (!cart) {
    return {
      id: "",
      restaurantId: "",
      restaurantName: "",
      updatedAt: new Date(0).toISOString(),
      items: [] as any[],
      itemCount: 0,
      subtotal: 0
    };
  }
  const restaurants = db.restaurants || [];
  const menuItems = db.menuItems || [];
  const rest = restaurants.find((r: any) => norm(r.id) === norm(cart.restaurantId));
  const items = (Array.isArray(cart.items) ? cart.items : []).map((it: any) => {
    const menu = menuItems.find((m: any) => norm(m.id) === norm(it.menuItemId));
    return {
      menuItemId: norm(it.menuItemId),
      restaurantId: norm(it.restaurantId || cart.restaurantId),
      name: menu?.name || it.name || "Menu item",
      price: Number(menu?.price ?? it.price ?? 0),
      quantity: Number(it.quantity || 0),
      isVeg: menu?.isVeg ?? it.isVeg ?? false,
      image: menu?.image || menu?.heroImage || null
    };
  }).filter((it: any) => it.quantity > 0);
  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
  return {
    id: cart.id,
    restaurantId: cart.restaurantId,
    restaurantName: rest?.name || cart.restaurantId,
    updatedAt: cart.updatedAt || new Date().toISOString(),
    items,
    itemCount: items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0),
    subtotal
  };
}

function normalizeIncomingItems(db: any, payload: Array<{ menuItemId: string; quantity: number }>, explicitRestaurantId?: string) {
  const menuItems = db.menuItems || [];
  const byId = new Map(menuItems.map((m: any) => [norm(m.id), m]));
  const now = new Date().toISOString();
  const merged = new Map<string, { menuItemId: string; restaurantId: string; name: string; price: number; quantity: number; isVeg: boolean; addedAt: string }>();
  let restaurantId = norm(explicitRestaurantId);

  for (const raw of payload) {
    const menuId = norm(raw?.menuItemId);
    const qty = Math.max(0, Math.min(Number(raw?.quantity ?? 0), MAX_PER_ITEM));
    if (!menuId) continue;
    const menu = byId.get(menuId);
    if (!menu) throw new Error("INVALID_MENU_ITEM");
    const restId = norm(menu.restaurantId || (menu as any).restaurant_id);
    if (!restId) throw new Error("INVALID_RESTAURANT");
    if (restaurantId && restaurantId !== restId) throw new Error("MIXED_RESTAURANTS_NOT_ALLOWED");
    restaurantId = restId;
    if (!qty) {
      merged.delete(menuId);
      continue;
    }
    merged.set(menuId, {
      menuItemId: menuId,
      restaurantId: restId,
      name: menu.name,
      price: Number(menu.price || 0),
      quantity: qty,
      isVeg: !!menu.isVeg,
      addedAt: now
    });
  }

  if (merged.size > MAX_CART_ITEMS) throw new Error("MAX_CART_ITEMS_EXCEEDED");
  if (merged.size > 0 && !restaurantId) throw new Error("INVALID_RESTAURANT");
  return { items: Array.from(merged.values()), restaurantId };
}

export function cartRouter() {
  const r = Router();
  r.use(requireAuth);

  const UpdateSchema = z.object({
    restaurantId: z.string().optional(),
    items: z.array(z.object({
      menuItemId: z.string(),
      quantity: z.number().int().nonnegative()
    })).default([])
  });

  r.get("/", async (req, res) => {
    const claims = getAuthClaims(req);
    const key = buildCartKey(claims);
    if (!key) return res.status(400).json({ error: "PROFILE_REQUIRED" });
    const db = await readData();
    const cart = (db.carts || []).find((c: any) => cartMatches(c, key)) || null;
    return res.json({ cart: presentCart(db, cart) });
  });

  r.post("/", async (req, res) => {
    const claims = getAuthClaims(req);
    const key = buildCartKey(claims);
    if (!key) return res.status(400).json({ error: "PROFILE_REQUIRED" });
    const parsed = UpdateSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

    const db = await readData();
    const payload = parsed.data.items || [];
    let normalized;
    try {
      normalized = normalizeIncomingItems(db, payload, parsed.data.restaurantId);
    } catch (err: any) {
      const code = String(err?.message || err);
      return res.status(400).json({ error: code });
    }

    const hasItems = normalized.items.length > 0;
    let updatedCart: any = null;
    await mutateData((live: any) => {
      if (!Array.isArray(live.carts)) live.carts = [];
      const idx = live.carts.findIndex((c: any) => cartMatches(c, key));
      if (!hasItems) {
        if (idx >= 0) live.carts.splice(idx, 1);
        updatedCart = null;
        return;
      }
      const now = new Date().toISOString();
      const record = idx >= 0 ? live.carts[idx] : {
        id: makeId("cart"),
        userId: key.userId || key.phone || key.email || "",
        phone: key.phone || "",
        email: key.email || ""
      };
      record.restaurantId = normalized.restaurantId;
      record.items = normalized.items.map((it) => ({ ...it, addedAt: now }));
      record.updatedAt = now;
      if (idx >= 0) {
        live.carts[idx] = record;
      } else {
        live.carts.push(record);
      }
      updatedCart = record;
    }, "cart_update");

    const freshDb = await readData();
    return res.json({ cart: presentCart(freshDb, updatedCart) });
  });

  r.delete("/", async (req, res) => {
    const claims = getAuthClaims(req);
    const key = buildCartKey(claims);
    if (!key) return res.status(400).json({ error: "PROFILE_REQUIRED" });
    await mutateData((live: any) => {
      if (!Array.isArray(live.carts)) return;
      const idx = live.carts.findIndex((c: any) => cartMatches(c, key));
      if (idx >= 0) live.carts.splice(idx, 1);
    }, "cart_clear");
    const db = await readData();
    return res.json({ cart: presentCart(db, null) });
  });

  return r;
}
