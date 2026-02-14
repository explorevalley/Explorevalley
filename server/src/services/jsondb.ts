import fs from "fs-extra";
import path from "path";
import { DatabaseSchema, makeId, type Database } from "@explorevalley/shared";
import { syncUserBehaviorProfilesFromData, syncUserProfilesFromOrders } from "./userProfiles";
import { applyOperationalRules } from "./operationalRules";

const BACKUP_DIR = path.join(process.cwd(), "..", "data", "backups");
// Snapshot backups can get very large (full DB JSON). Keep them opt-in and prune automatically when enabled.
const BACKUP_SNAPSHOTS_ENABLED = String(process.env.EV_BACKUP_SNAPSHOTS || "").trim() === "1";
const BACKUP_RETENTION_DAYS = Number(process.env.EV_BACKUP_RETENTION_DAYS || 7);
const BACKUP_KEEP_MAX = Number(process.env.EV_BACKUP_KEEP_MAX || 200);
const BACKUP_MIN_INTERVAL_SEC = Number(process.env.EV_BACKUP_MIN_INTERVAL_SEC || 300);
const BACKUP_SKIP_PREFIXES = String(process.env.EV_BACKUP_SKIP_PREFIXES || "analytics_")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const lastBackupAtByLabel = new Map<string, number>();
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

function nowISO() { return new Date().toISOString(); }
function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_NOT_CONFIGURED: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
}

const DEFAULT_SETTINGS = {
  currency: "INR",
  pageSlugs: {
    affiliateProgram: "affiliate-program",
    contactUs: "contact-us",
    privacyPolicy: "privacy-policy",
    refundPolicy: "refund-policy",
    termsAndConditions: "terms-and-conditions"
  },
  taxRules: {
    hotel: { slabs: [{ min: 0, max: 999, gst: 0 }, { min: 1000, max: 7500, gst: 0.05 }, { min: 7500.01, max: null, gst: 0.18 }] },
    tour: { gst: 0.05, mode: "NO_ITC" },
    food: { gst: 0.05, mode: "DEFAULT" },
    cab: { gst: 0.05, mode: "DEFAULT" }
  }
} as const;

const DEFAULT_POLICIES = {
  hotel: { freeCancelHours: 24, feeAfter: 0.5 },
  tour: { freeCancelHours: 24, feeAfter: 0.5 },
  cab: { freeCancelMinutes: 15, feeAfter: 50 },
  food: { allowCancelMinutes: 5, feeAfter: 20 }
} as const;

const DEFAULT_PAYMENTS = {
  walletEnabled: false,
  refundMethod: "original",
  refundWindowHours: 72
} as const;

const DEFAULT_SITE_PAGES = {
  affiliateProgram: { title: "Affiliate Program", slug: "affiliate-program", content: "" },
  contactUs: { title: "Contact Us", slug: "contact-us", content: "" },
  privacyPolicy: { title: "Privacy Policy", slug: "privacy-policy", content: "" },
  refundPolicy: { title: "Refund Policy", slug: "refund-policy", content: "" },
  termsAndConditions: { title: "Terms and Conditions", slug: "terms-and-conditions", content: "" }
} as const;

function supabaseHeaders(extra?: Record<string, string>) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...(extra || {})
  };
}

async function supabaseSelect<T = any>(table: string, query = "select=*"): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const r = await fetch(url, { headers: supabaseHeaders() });
  if (!r.ok) throw new Error(`${table}_SELECT_FAILED:${r.status}:${await r.text()}`);
  return r.json();
}

async function supabaseSelectAll<T = any>(table: string, pageSize = 1000, orderColumn = "id"): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const query = `select=*&order=${encodeURIComponent(orderColumn)}.asc&limit=${pageSize}&offset=${offset}`;
    const page = await supabaseSelect<T>(table, query);
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

function isMissingTableError(err: any) {
  const msg = String(err?.message || err || "");
  return msg.includes("PGRST205") || msg.includes("does not exist");
}

async function supabaseSelectAllIfExists<T = any>(table: string, pageSize = 1000, orderColumn = "id"): Promise<T[]> {
  try {
    return await supabaseSelectAll<T>(table, pageSize, orderColumn);
  } catch (err) {
    if (isMissingTableError(err)) return [];
    throw err;
  }
}

async function supabaseUpsert(table: string, rows: any[], onConflict = "id") {
  if (!rows.length) return;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders({
        Prefer: "resolution=merge-duplicates,return=minimal"
      }),
      body: JSON.stringify(chunk)
    });
    if (!r.ok) throw new Error(`${table}_UPSERT_FAILED:${r.status}:${await r.text()}`);
  }
}

async function supabaseInsertIgnoreDuplicates(table: string, rows: any[], onConflict = "id") {
  if (!rows.length) return;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders({
        Prefer: "resolution=ignore-duplicates,return=minimal"
      }),
      body: JSON.stringify(chunk)
    });
    if (!r.ok) throw new Error(`${table}_INSERT_FAILED:${r.status}:${await r.text()}`);
  }
}

async function supabaseUpsertWithOptionalPriceFields(table: string, rows: any[], onConflict = "id") {
  // Columns that may not exist on older Supabase schemas; we strip them and retry.
  const optionalColumns = [
    "price_dropped",
    "price_drop_percent",
    "image_meta",
    "hero_image",
    "image_titles",
    "image_descriptions",
    "vendor_mobile",
    "additional_comments",
    // WP-Travel-like tour enrichment / i18n (backward compatible).
    "map_embed_url",
    "faqs",
    "itinerary_items",
    "facts",
    "content_blocks",
    "i18n",
    // WP-Travel-like booking enrichment (backward compatible).
    "country_code",
    "paid_amount",
    // Food orders enrichment (backward compatible).
    "user_id",
    "restaurant_id",
    // Settings (backward compatible).
    "page_slugs"
  ];
  let workingRows = rows.map((r) => ({ ...r }));
  const removed = new Set<string>();

  for (;;) {
    try {
      await supabaseUpsert(table, workingRows, onConflict);
      return;
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      const hit = optionalColumns.find((c) => msg.includes(c) && !removed.has(c));
      if (!hit) throw err;
      removed.add(hit);
      workingRows = workingRows.map((r) => {
        const copy = { ...r };
        delete (copy as any)[hit];
        return copy;
      });
    }
  }
}

async function supabaseDeleteAll(table: string, keyColumn = "id") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${encodeURIComponent(keyColumn)}=not.is.null`;
  const r = await fetch(url, { method: "DELETE", headers: supabaseHeaders({ Prefer: "return=minimal" }) });
  if (!r.ok) throw new Error(`${table}_DELETE_FAILED:${r.status}:${await r.text()}`);
}

function buildImageMeta(images: string[], titles: string[], descriptions: string[]) {
  const maxLen = Math.max(images.length, titles.length, descriptions.length);
  const out: Array<{ url: string; title: string; description: string }> = [];
  for (let i = 0; i < maxLen; i += 1) {
    const url = String(images[i] || "");
    const title = String(titles[i] || "");
    const description = String(descriptions[i] || "");
    if (url || title || description) out.push({ url, title, description });
  }
  return out;
}

function extractImageTitles(meta: any[], fallbackTitles: any[] = []) {
  if (Array.isArray(fallbackTitles) && fallbackTitles.length) return fallbackTitles.map((x) => String(x || ""));
  return (Array.isArray(meta) ? meta : []).map((m) => String(m?.title || ""));
}

function extractImageDescriptions(meta: any[], fallbackDescriptions: any[] = []) {
  if (Array.isArray(fallbackDescriptions) && fallbackDescriptions.length) return fallbackDescriptions.map((x) => String(x || ""));
  return (Array.isArray(meta) ? meta : []).map((m) => String(m?.description || ""));
}

function normalizeImagePayload(imagesRaw: any, titlesRaw: any, descriptionsRaw: any, metaRaw: any) {
  const images = Array.isArray(imagesRaw) ? imagesRaw : [];
  const titles = Array.isArray(titlesRaw) ? titlesRaw : [];
  const descriptions = Array.isArray(descriptionsRaw) ? descriptionsRaw : [];
  const meta = Array.isArray(metaRaw) ? metaRaw : [];

  const hasObjectImages = images.some((x) => x && typeof x === "object");
  if (hasObjectImages) {
    const normalizedMeta = images.map((x) => {
      const o = x && typeof x === "object" ? x : { url: x };
      return {
        url: String((o as any).url || (o as any).src || ""),
        title: String((o as any).title || ""),
        description: String((o as any).description || "")
      };
    }).filter((x) => x.url || x.title || x.description);
    return {
      images: normalizedMeta.map((x) => x.url).filter(Boolean),
      imageTitles: normalizedMeta.map((x) => x.title),
      imageDescriptions: normalizedMeta.map((x) => x.description),
      imageMeta: normalizedMeta
    };
  }

  const imageStrings = images.map((x) => String(x || "")).filter(Boolean);
  const metaFinal = meta.length ? meta : buildImageMeta(imageStrings, titles, descriptions);
  return {
    images: imageStrings,
    imageTitles: extractImageTitles(metaFinal, titles),
    imageDescriptions: extractImageDescriptions(metaFinal, descriptions),
    imageMeta: metaFinal
  };
}

function toIsoStringOrNow(v: any) {
  if (!v) return nowISO();
  return String(v);
}

function nullableText(v: any) {
  if (v === null || v === undefined || v === "") return undefined;
  return String(v);
}

function safeJsonParseObject(value: any) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || !(t.startsWith("{") || t.startsWith("["))) return null;
  try { return JSON.parse(t); } catch { return null; }
}

function normalizeTaxBreakup(raw: any, baseAmount: number, totalAmount: number) {
  const input = raw && typeof raw === "object" ? raw : (safeJsonParseObject(raw) || {});
  const gstRate = Number((input as any).gstRate ?? (input as any).gst_rate ?? (input as any).rate ?? 0) || 0;
  const taxableValue = Number((input as any).taxableValue ?? (input as any).taxable_value ?? baseAmount) || 0;
  const inferredGst = Math.max(0, Number(((input as any).gstAmount ?? (input as any).gst_amount) ?? (totalAmount - baseAmount)) || 0);
  const cgst = Number((input as any).cgst ?? 0) || 0;
  const sgst = Number((input as any).sgst ?? 0) || 0;
  const igst = Number((input as any).igst ?? 0) || 0;
  return {
    gstRate: Math.max(0, Math.min(1, gstRate)),
    taxableValue: Math.max(0, taxableValue),
    gstAmount: Math.max(0, inferredGst),
    cgst: Math.max(0, cgst),
    sgst: Math.max(0, sgst),
    igst: Math.max(0, igst)
  };
}

function normalizeFoodOrderItems(items: any, restaurantId: string) {
  const parsed = safeJsonParseObject(items);
  const list = Array.isArray(items) ? items : (Array.isArray(parsed) ? parsed : []);
  return list.map((it: any) => {
    const qty = it?.quantity ?? it?.qty ?? it?.count ?? it?.q ?? 1;
    return {
      menuItemId: nullableText(it?.menuItemId ?? it?.menu_item_id ?? it?.id) || undefined,
      restaurantId: nullableText(it?.restaurantId ?? it?.restaurant_id ?? restaurantId) || undefined,
      name: String(it?.name ?? it?.title ?? "").trim() || "Item",
      quantity: Math.max(1, Number(qty || 1)),
      price: Math.max(0, Number(it?.price ?? it?.amount ?? 0) || 0)
    };
  }).filter((x: any) => x.name && x.quantity > 0);
}

function normalizeFoodPricing(rawPricing: any, items: Array<{ quantity: number; price: number }>) {
  const p = rawPricing && typeof rawPricing === "object" ? rawPricing : (safeJsonParseObject(rawPricing) || {});
  const totalAmount = Number((p as any).totalAmount ?? (p as any).total_amount ?? (p as any).total ?? 0) || 0;
  const baseCandidate = Number((p as any).baseAmount ?? (p as any).base_amount ?? (p as any).subtotal ?? 0) || 0;
  const sumItems = items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.price || 0)), 0);
  const baseAmount = Math.max(0, baseCandidate || sumItems || totalAmount || 0);
  const tax = normalizeTaxBreakup((p as any).tax, baseAmount, totalAmount || baseAmount);
  const computedTotal = Math.max(0, totalAmount || (baseAmount + (tax.gstAmount || 0)));
  if (!tax.taxableValue) tax.taxableValue = baseAmount;
  return { baseAmount, tax, totalAmount: computedTotal };
}

function normalizeRestaurantKey(v: any) {
  return String(v || "").trim();
}

function normalizeVendorMenuPayload(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      return normalizeVendorMenuPayload(JSON.parse(v));
    } catch {
      return [];
    }
  }
  if (v && typeof v === "object") {
    const obj: any = v;
    if (Array.isArray(obj.menu)) return obj.menu;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.dishes)) return obj.dishes;
  }
  return [];
}

async function loadSupabaseDatabase(): Promise<Database> {
  const [
    settingsRows,
    policiesRows,
    paymentsRows,
    tours,
    festivals,
    hotels,
    restaurants,
    menuItems,
    bookings,
    cabBookings,
    busRoutes,
    busBookings,
    foodOrders,
    foodCarts,
    queries,
    auditLog,
    cabProviders,
    serviceAreas,
    coupons,
    vendorMenus,
    sitePagesRows,
    userProfilesRows,
    userBehaviorRows,
    analyticsEventRows
  ] = await Promise.all([
    supabaseSelect<any>("ev_settings", "id=eq.main&select=*"),
    supabaseSelect<any>("ev_policies", "id=eq.main&select=*"),
    supabaseSelect<any>("ev_payments", "id=eq.main&select=*"),
    supabaseSelectAll<any>("ev_tours"),
    supabaseSelectAll<any>("ev_festivals"),
    supabaseSelectAll<any>("ev_hotels"),
    supabaseSelectAll<any>("ev_restaurants"),
    supabaseSelectAll<any>("ev_menu_items"),
    supabaseSelectAll<any>("ev_bookings"),
    supabaseSelectAll<any>("ev_cab_bookings"),
    supabaseSelectAllIfExists<any>("ev_buses"),
    supabaseSelectAllIfExists<any>("ev_bus_bookings"),
    supabaseSelectAll<any>("ev_food_orders"),
    supabaseSelectAllIfExists<any>("ev_food_carts"),
    supabaseSelectAll<any>("ev_queries"),
    supabaseSelectAll<any>("ev_audit_log"),
    supabaseSelectAll<any>("ev_cab_providers"),
    supabaseSelectAll<any>("ev_service_areas"),
    supabaseSelectAll<any>("ev_coupons", 1000, "code"),
    supabaseSelectAllIfExists<any>("ev_vendor_menus", 1000, "restaurant_id"),
    supabaseSelectAllIfExists<any>("ev_site_pages", 1000, "slug"),
    supabaseSelectAllIfExists<any>("ev_user_profiles", 1000, "id"),
    supabaseSelectAllIfExists<any>("ev_user_behavior_profiles", 1000, "id"),
    supabaseSelectAllIfExists<any>("ev_analytics_events", 1000, "at")
  ]);

  const settings = settingsRows[0]
    ? {
        currency: settingsRows[0].currency || "INR",
        pageSlugs: {
          ...DEFAULT_SETTINGS.pageSlugs,
          ...((settingsRows[0].page_slugs && typeof settingsRows[0].page_slugs === "object") ? settingsRows[0].page_slugs : {})
        },
        taxRules: settingsRows[0].tax_rules || DEFAULT_SETTINGS.taxRules,
        pricingTiers: settingsRows[0].pricing_tiers || []
      }
    : DEFAULT_SETTINGS;

  const policyRow = policiesRows[0] || {};
  const paymentsRow = paymentsRows[0] || {};

  const mergedPolicies = {
    hotel: {
      freeCancelHours: Number(policyRow?.hotel?.freeCancelHours ?? DEFAULT_POLICIES.hotel.freeCancelHours),
      feeAfter: Number(policyRow?.hotel?.feeAfter ?? DEFAULT_POLICIES.hotel.feeAfter)
    },
    tour: {
      freeCancelHours: Number(policyRow?.tour?.freeCancelHours ?? DEFAULT_POLICIES.tour.freeCancelHours),
      feeAfter: Number(policyRow?.tour?.feeAfter ?? DEFAULT_POLICIES.tour.feeAfter)
    },
    cab: {
      freeCancelMinutes: Number(policyRow?.cab?.freeCancelMinutes ?? DEFAULT_POLICIES.cab.freeCancelMinutes),
      feeAfter: Number(policyRow?.cab?.feeAfter ?? DEFAULT_POLICIES.cab.feeAfter)
    },
    food: {
      allowCancelMinutes: Number(policyRow?.food?.allowCancelMinutes ?? DEFAULT_POLICIES.food.allowCancelMinutes),
      feeAfter: Number(policyRow?.food?.feeAfter ?? DEFAULT_POLICIES.food.feeAfter)
    }
  };

  const mergedPayments = {
    walletEnabled: Boolean(paymentsRow?.wallet_enabled ?? DEFAULT_PAYMENTS.walletEnabled),
    refundMethod: String(paymentsRow?.refund_method || DEFAULT_PAYMENTS.refundMethod),
    refundWindowHours: Number(paymentsRow?.refund_window_hours ?? DEFAULT_PAYMENTS.refundWindowHours)
  };

  const vendorMenuByRestaurant = (vendorMenus || []).reduce((acc: Record<string, any[]>, x: any) => {
    const rid = normalizeRestaurantKey(x.restaurant_id);
    if (!rid) return acc;
    acc[rid] = normalizeVendorMenuPayload(x.menu);
    return acc;
  }, {});

  const menuByRestaurant = (menuItems || []).reduce((acc: Record<string, any[]>, m: any) => {
    const rid = normalizeRestaurantKey(m.restaurant_id);
    if (!rid) return acc;
    if (!acc[rid]) acc[rid] = [];
    acc[rid].push({
      id: String(m.id || ""),
      name: String(m.name || ""),
      category: String(m.category || "General"),
      description: String(m.description || ""),
      image: String(m.image || m.hero_image || ""),
      price: Number(m.price || 0),
      rating: 0,
      maxOrders: Number(m.max_per_order || 10),
      addons: Array.isArray(m.addons) ? m.addons : []
    });
    return acc;
  }, {});

  const sitePagesMap = (sitePagesRows || []).reduce((acc: Record<string, any>, row: any) => {
    const slug = String(row?.slug || "").trim();
    if (!slug) return acc;
    acc[slug] = {
      title: String(row?.title || slug),
      slug,
      content: String(row?.content || ""),
      updatedAt: nullableText(row?.updated_at)
    };
    return acc;
  }, {});

  const slugs = (settings as any)?.pageSlugs || DEFAULT_SETTINGS.pageSlugs;
  const pickPage = (key: keyof typeof DEFAULT_SITE_PAGES, fallback: any) => {
    const slug = String((slugs && (slugs as any)[key]) || fallback.slug || "");
    const hit = slug ? sitePagesMap[slug] : null;
    if (hit) return hit;
    return { ...fallback, slug };
  };

  const sitePages = {
    affiliateProgram: pickPage("affiliateProgram", DEFAULT_SITE_PAGES.affiliateProgram),
    contactUs: pickPage("contactUs", DEFAULT_SITE_PAGES.contactUs),
    privacyPolicy: pickPage("privacyPolicy", DEFAULT_SITE_PAGES.privacyPolicy),
    refundPolicy: pickPage("refundPolicy", DEFAULT_SITE_PAGES.refundPolicy),
    termsAndConditions: pickPage("termsAndConditions", DEFAULT_SITE_PAGES.termsAndConditions)
  };

  const dbCandidate = {
    settings,
    tours: tours.map((x: any) => ({
      id: x.id,
      title: x.title,
      description: x.description,
      price: Number(x.price || 0),
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      duration: x.duration,
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      highlights: x.highlights || [],
      itinerary: x.itinerary || "",
      mapEmbedUrl: String(x.map_embed_url || ""),
      faqs: x.faqs || [],
      itineraryItems: x.itinerary_items || [],
      facts: x.facts || [],
      contentBlocks: x.content_blocks || {},
      i18n: x.i18n || {},
      inclusions: x.inclusions || [],
      exclusions: x.exclusions || [],
      maxGuests: Number(x.max_guests || 1),
      availability: x.availability || { closedDates: [], capacityByDate: {} },
      available: x.available !== false,
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: nullableText(x.updated_at)
    })),
    festivals: festivals.map((x: any) => ({
      id: x.id,
      title: x.title,
      description: x.description || "",
      location: x.location || "",
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      month: x.month || "All Season",
      date: nullableText(x.date),
      vibe: x.vibe || "",
      ticket: x.ticket || "On request",
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      highlights: x.highlights || [],
      available: x.available !== false,
      createdAt: nullableText(x.created_at),
      updatedAt: nullableText(x.updated_at)
    })),
    hotels: hotels.map((x: any) => ({
      id: x.id,
      name: x.name,
      description: x.description,
      location: x.location,
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      pricePerNight: Number(x.price_per_night || 0),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      amenities: x.amenities || [],
      roomTypes: x.room_types || [],
      rating: Number(x.rating || 0),
      reviews: Number(x.reviews || 0),
      checkInTime: x.check_in_time || "14:00",
      checkOutTime: x.check_out_time || "11:00",
      availability: x.availability || { closedDates: [], roomsByType: {} },
      seasonalPricing: x.seasonal_pricing || [],
      dateOverrides: x.date_overrides || {},
      minNights: Number(x.min_nights || 1),
      maxNights: Number(x.max_nights || 30),
      childPolicy: x.child_policy || "",
      available: x.available !== false,
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    restaurants: restaurants.map((x: any) => ({
      id: x.id,
      name: x.name,
      description: x.description,
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      cuisine: x.cuisine || [],
      rating: Number(x.rating || 0),
      reviewCount: Number(x.review_count || 0),
      deliveryTime: x.delivery_time || "",
      minimumOrder: Number(x.minimum_order || 0),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      available: x.available !== false,
      isVeg: !!x.is_veg,
      tags: x.tags || [],
      location: x.location || "",
      serviceRadiusKm: Number(x.service_radius_km || 0),
      deliveryZones: x.delivery_zones || [],
      openHours: x.open_hours || "09:00",
      closingHours: x.closing_hours || "22:00",
      menu: (() => {
        const rid = normalizeRestaurantKey(x.id);
        const directVendorMenu = normalizeVendorMenuPayload(vendorMenuByRestaurant[rid]);
        const tableMenu = normalizeVendorMenuPayload(x.menu);
        const fallbackMenu = normalizeVendorMenuPayload(menuByRestaurant[rid] || []);
        const chosen = directVendorMenu.length ? directVendorMenu : (tableMenu.length ? tableMenu : fallbackMenu);
        return chosen.map((m: any, i: number) => ({
        id: String(m?.id || `${x.id}_menu_${i + 1}`),
        name: String(m?.name || ""),
        category: String(m?.category || "General"),
        description: String(m?.description || ""),
        image: String(m?.image || ""),
        price: Number(m?.price || 0),
        rating: Number(m?.rating || 0),
        maxOrders: Number(m?.maxOrders || 10),
        addons: Array.isArray(m?.addons) ? m.addons : []
        }));
      })()
    })),
    menuItems: menuItems.map((x: any) => ({
      id: x.id,
      restaurantId: x.restaurant_id,
      category: x.category,
      name: x.name,
      description: x.description || "",
      price: Number(x.price || 0),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      image: nullableText(x.image),
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(x.image ? [x.image] : [], x.image_titles || [], x.image_descriptions || []),
      available: x.available !== false,
      isVeg: !!x.is_veg,
      tags: x.tags || [],
      stock: Number(x.stock || 0),
      maxPerOrder: Number(x.max_per_order || 10),
      addons: x.addons || [],
      variants: x.variants || []
    })),
    bookings: bookings.map((x: any) => ({
      id: x.id,
      type: x.type,
      itemId: x.item_id,
      userName: x.user_name,
      email: x.email,
      phone: x.phone,
      aadhaarUrl: nullableText(x.aadhaar_url) || "",
      countryCode: nullableText(x.country_code) || "",
      paidAmount: x.paid_amount === undefined || x.paid_amount === null ? undefined : Number(x.paid_amount),
      guests: Number(x.guests || 1),
      checkIn: nullableText(x.check_in),
      checkOut: nullableText(x.check_out),
      roomType: nullableText(x.room_type),
      numRooms: Number(x.num_rooms || 1),
      tourDate: nullableText(x.tour_date),
      specialRequests: x.special_requests || "",
      pricing: x.pricing || {},
      status: x.status || "pending",
      bookingDate: toIsoStringOrNow(x.booking_date)
    })),
    cabBookings: cabBookings.map((x: any) => ({
      id: x.id,
      userName: x.user_name,
      phone: x.phone,
      pickupLocation: x.pickup_location,
      dropLocation: x.drop_location,
      datetime: x.datetime,
      passengers: Number(x.passengers || 1),
      vehicleType: x.vehicle_type,
      estimatedFare: Number(x.estimated_fare || 0),
      serviceAreaId: nullableText(x.service_area_id),
      pricing: x.pricing || {},
      status: x.status || "pending",
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    busRoutes: busRoutes.map((x: any) => ({
      id: String(x.id || ""),
      operatorName: String(x.operator_name || ""),
      operatorCode: String(x.operator_code || ""),
      fromCity: String(x.from_city || ""),
      fromCode: String(x.from_code || ""),
      toCity: String(x.to_city || ""),
      toCode: String(x.to_code || ""),
      departureTime: String(x.departure_time || ""),
      arrivalTime: String(x.arrival_time || ""),
      durationText: String(x.duration_text || ""),
      busType: String(x.bus_type || "Non AC"),
      fare: Number(x.fare || 0),
      totalSeats: Number(x.total_seats || 20),
      seatLayout: Array.isArray(x.seat_layout) ? x.seat_layout : [],
      serviceDates: Array.isArray(x.service_dates) ? x.service_dates : [],
      seatsBookedByDate: (x.seats_booked_by_date && typeof x.seats_booked_by_date === "object") ? x.seats_booked_by_date : {},
      heroImage: String(x.hero_image || ""),
      active: x.active !== false,
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    busBookings: busBookings.map((x: any) => ({
      id: String(x.id || ""),
      routeId: String(x.route_id || ""),
      userName: String(x.user_name || ""),
      phone: String(x.phone || ""),
      fromCity: String(x.from_city || ""),
      toCity: String(x.to_city || ""),
      travelDate: String(x.travel_date || ""),
      seats: Array.isArray(x.seats) ? x.seats.map((s: any) => String(s || "")) : [],
      farePerSeat: Number(x.fare_per_seat || 0),
      totalFare: Number(x.total_fare || 0),
      status: String(x.status || "pending"),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    foodOrders: foodOrders.map((x: any) => ({
      id: x.id,
      userId: String(x.user_id || ""),
      restaurantId: String(x.restaurant_id || ""),
      userName: x.user_name,
      phone: x.phone,
      items: (() => {
        const rid = String(x.restaurant_id || "");
        return normalizeFoodOrderItems(x.items, rid);
      })(),
      deliveryAddress: x.delivery_address,
      specialInstructions: x.special_instructions || "",
      pricing: (() => {
        const rid = String(x.restaurant_id || "");
        const itemsNorm = normalizeFoodOrderItems(x.items, rid);
        return normalizeFoodPricing(x.pricing || {}, itemsNorm);
      })(),
      status: x.status || "pending",
      orderTime: toIsoStringOrNow(x.order_time)
    })),
    queries: queries.map((x: any) => ({
      id: x.id,
      userName: x.user_name,
      email: x.email,
      phone: x.phone,
      subject: x.subject,
      message: x.message,
      status: x.status || "pending",
      submittedAt: toIsoStringOrNow(x.submitted_at),
      respondedAt: x.responded_at || null,
      response: x.response || null
    })),
    auditLog: auditLog.map((x: any) => ({
      id: x.id,
      at: toIsoStringOrNow(x.at),
      adminChatId: x.admin_chat_id ?? undefined,
      action: x.action,
      entity: nullableText(x.entity),
      entityId: nullableText(x.entity_id),
      meta: x.meta || {}
    })),
    cabProviders: cabProviders.map((x: any) => ({
      id: x.id,
      name: x.name,
      vehicleType: x.vehicle_type,
      plateNumber: x.plate_number,
      capacity: Number(x.capacity || 1),
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      active: x.active !== false,
      serviceAreaId: nullableText(x.service_area_id)
    })),
    serviceAreas: serviceAreas.map((x: any) => ({
      id: x.id,
      name: x.name,
      city: x.city,
      enabled: x.enabled !== false
    })),
    coupons: coupons.map((x: any) => ({
      code: x.code,
      type: x.type,
      amount: Number(x.amount || 0),
      minCart: Number(x.min_cart || 0),
      category: x.category || "all",
      expiry: x.expiry,
      maxUses: x.max_uses ?? undefined
    })),
    userProfiles: userProfilesRows.map((x: any) => ({
      id: String(x.id || ""),
      phone: String(x.phone || ""),
      name: String(x.name || ""),
      email: String(x.email || ""),
      ipAddress: String(x.ip_address || ""),
      browser: String(x.browser || ""),
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at),
      orders: Array.isArray(x.orders) ? x.orders : []
    })),
    userBehaviorProfiles: userBehaviorRows.map((x: any) => ({
      id: String(x.id || ""),
      userId: String(x.user_id || ""),
      phone: String(x.phone || ""),
      name: String(x.name || ""),
      email: String(x.email || ""),
      coreIdentity: x.core_identity || {},
      deviceFingerprinting: x.device_fingerprinting || {},
      locationMobility: x.location_mobility || {},
      behavioralAnalytics: x.behavioral_analytics || {},
      transactionPayment: x.transaction_payment || {},
      preferencePersonalization: x.preference_personalization || {},
      ratingsReviewsFeedback: x.ratings_reviews_feedback || {},
      marketingAttribution: x.marketing_attribution || {},
      trustSafetyFraud: x.trust_safety_fraud || {},
      derivedInferred: x.derived_inferred || {},
      orders: Array.isArray(x.orders) ? x.orders : [],
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    carts: (foodCarts || []).map((x: any) => ({
      id: String(x.id || ""),
      userId: String(x.user_id || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      restaurantId: String(x.restaurant_id || ""),
      items: Array.isArray(x.items) ? x.items : [],
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    analyticsEvents: analyticsEventRows.map((x: any) => ({
      id: String(x.id || ""),
      type: String(x.type || ""),
      category: String(x.category || ""),
      userId: String(x.user_id || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      at: toIsoStringOrNow(x.at),
      meta: x.meta || {}
    })),
    policies: mergedPolicies,
    payments: mergedPayments,
    sitePages
  };

  syncUserProfilesFromOrders(dbCandidate as any);
  syncUserBehaviorProfilesFromData(dbCandidate as any);
  return DatabaseSchema.parse(dbCandidate);
}

async function writeSupabaseDatabase(db: Database) {
  await supabaseUpsertWithOptionalPriceFields("ev_settings", [{
    id: "main",
    currency: db.settings.currency,
    page_slugs: (db.settings as any).pageSlugs || DEFAULT_SETTINGS.pageSlugs,
    tax_rules: db.settings.taxRules || {},
    pricing_tiers: db.settings.pricingTiers || []
  }]);

  await supabaseUpsert("ev_policies", [{
    id: "main",
    hotel: db.policies?.hotel || {},
    tour: db.policies?.tour || {},
    cab: db.policies?.cab || {},
    food: db.policies?.food || {}
  }]);

  await supabaseUpsert("ev_payments", [{
    id: "main",
    wallet_enabled: !!db.payments?.walletEnabled,
    refund_method: db.payments?.refundMethod || "original",
    refund_window_hours: Number(db.payments?.refundWindowHours || 72)
  }]);

  await supabaseDeleteAll("ev_tours");
  await supabaseDeleteAll("ev_festivals");
  await supabaseDeleteAll("ev_hotels");
  await supabaseDeleteAll("ev_restaurants");
  await supabaseDeleteAll("ev_menu_items");
  await supabaseDeleteAll("ev_bookings");
  await supabaseDeleteAll("ev_cab_bookings");
  try {
    await supabaseDeleteAll("ev_buses");
    await supabaseDeleteAll("ev_bus_bookings");
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
  await supabaseDeleteAll("ev_food_orders");
  try {
    await supabaseDeleteAll("ev_food_carts");
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
  await supabaseDeleteAll("ev_queries");
  await supabaseDeleteAll("ev_cab_providers");
  await supabaseDeleteAll("ev_service_areas");
  await supabaseDeleteAll("ev_coupons", "code");
  try {
    await supabaseDeleteAll("ev_user_profiles");
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
  try {
    await supabaseDeleteAll("ev_user_behavior_profiles");
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
  try {
    await supabaseDeleteAll("ev_vendor_menus", "restaurant_id");
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
  try {
    await supabaseDeleteAll("ev_site_pages", "slug");
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }

  if (db.tours.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_tours", db.tours.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload((x as any).images, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, title: x.title, description: x.description, price: x.price, vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", duration: x.duration, images: n.images, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta
        };
      })(),
      highlights: x.highlights || [], itinerary: x.itinerary || "", inclusions: x.inclusions || [], exclusions: x.exclusions || [],
      map_embed_url: String((x as any).mapEmbedUrl || ""),
      faqs: (x as any).faqs || [],
      itinerary_items: (x as any).itineraryItems || [],
      facts: (x as any).facts || [],
      content_blocks: (x as any).contentBlocks || {},
      i18n: (x as any).i18n || {},
      max_guests: x.maxGuests, availability: x.availability || {}, available: x.available !== false,
      created_at: x.createdAt || null, updated_at: x.updatedAt || null
    })));
  }
  if (db.festivals.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_festivals", db.festivals.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload((x as any).images, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, title: x.title, description: x.description || "", location: x.location || "", vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", month: x.month || "All Season", images: n.images, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta
        };
      })(),
      date: x.date || null, vibe: x.vibe || "", ticket: String(x.ticket ?? "On request"), highlights: x.highlights || [],
      available: x.available !== false, created_at: x.createdAt || null, updated_at: x.updatedAt || null
    })));
  }
  if (db.hotels.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_hotels", db.hotels.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload((x as any).images, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, name: x.name, description: x.description, location: x.location, vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", price_per_night: x.pricePerNight, price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", images: n.images, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta
        };
      })(),
      amenities: x.amenities || [], room_types: x.roomTypes || [], rating: x.rating || 0, reviews: x.reviews || 0,
      check_in_time: x.checkInTime || "14:00", check_out_time: x.checkOutTime || "11:00", availability: x.availability || {},
      seasonal_pricing: x.seasonalPricing || [], date_overrides: x.dateOverrides || {}, min_nights: x.minNights || 1,
      max_nights: x.maxNights || 30, child_policy: x.childPolicy || "", available: x.available !== false, created_at: x.createdAt || null
    })));
  }
  if (db.restaurants.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_restaurants", db.restaurants.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload((x as any).images, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, name: x.name, description: x.description, vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", cuisine: x.cuisine || [], rating: x.rating || 0, review_count: x.reviewCount || 0,
          delivery_time: x.deliveryTime || "", minimum_order: x.minimumOrder || 0, price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", images: n.images, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta, available: x.available !== false
        };
      })(),
      is_veg: !!x.isVeg, tags: x.tags || [], location: x.location || "", service_radius_km: x.serviceRadiusKm || 0,
      delivery_zones: x.deliveryZones || [], open_hours: x.openHours || "09:00", closing_hours: x.closingHours || "22:00",
      menu: (x as any).menu || []
    })));
  }
  if (db.restaurants.length) {
    try {
      await supabaseUpsert("ev_vendor_menus", db.restaurants.map((x) => ({
        restaurant_id: x.id,
        menu: (x as any).menu || [],
        updated_at: nowISO()
      })), "restaurant_id");
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  const existingMenuById = new Map((db.menuItems || []).map((mi: any) => [String(mi.id || ""), mi]));
  const existingMenuByRestaurantAndName = new Map(
    (db.menuItems || []).map((mi: any) => [`${String(mi.restaurantId || "").trim()}::${String(mi.name || "").trim().toLowerCase()}`, mi])
  );
  const menuItemsFromVendors = (db.restaurants || []).flatMap((r: any) => {
    const items = Array.isArray(r?.menu) ? r.menu : [];
    return items.map((m: any, idx: number) => {
      const id = String(m?.id || `${r.id}_menu_${idx + 1}`);
      const nameKey = `${String(r.id || "").trim()}::${String(m?.name || "").trim().toLowerCase()}`;
      const existing = existingMenuById.get(id) || existingMenuByRestaurantAndName.get(nameKey);
      return {
      id,
      restaurantId: r.id,
      category: String(m?.category || "General"),
      name: String(m?.name || ""),
      description: String(m?.description || ""),
      price: Number(m?.price || 0),
      heroImage: String(m?.image || ""),
      image: String(m?.image || ""),
      available: existing ? existing.available !== false : true,
      isVeg: existing ? !!existing.isVeg : false,
      tags: Array.isArray(existing?.tags) ? existing.tags : [],
      stock: (() => {
        const incoming = Number((m as any)?.stock);
        if (Number.isFinite(incoming) && incoming >= 0) return Math.floor(incoming);
        if (existing && Number.isFinite(Number(existing.stock))) return Math.max(0, Number(existing.stock));
        return 9999;
      })(),
      maxPerOrder: Number(m?.maxOrders || Number(existing?.maxPerOrder || 10)),
      addons: Array.isArray(m?.addons) ? m.addons.map((a: any) => ({ name: String(a?.name || ""), price: Number(a?.price || 0) })) : [],
      variants: [],
      priceDropped: false,
      priceDropPercent: 0,
      imageTitles: [],
      imageDescriptions: [],
      imageMeta: []
    };});
  });

  const menuItemsToPersist = menuItemsFromVendors.length ? menuItemsFromVendors : db.menuItems;
  if (menuItemsToPersist.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_menu_items", menuItemsToPersist.map((x) => ({
      ...(() => {
        const rawImages = Array.isArray((x as any).images) && (x as any).images.length
          ? (x as any).images
          : ((x as any).image ? [(x as any).image] : []);
        const n = normalizeImagePayload(rawImages, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, restaurant_id: x.restaurantId, category: x.category, name: x.name, description: x.description || "",
          price: x.price, price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", image: x.image || n.images[0] || null, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta, available: x.available !== false, is_veg: !!x.isVeg, tags: x.tags || [], stock: x.stock || 0
        };
      })(),
      max_per_order: x.maxPerOrder || 10, addons: x.addons || [], variants: x.variants || []
    })));
  }
  if (db.bookings.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_bookings", db.bookings.map((x) => ({
      id: x.id, type: x.type, item_id: x.itemId, user_name: x.userName, email: x.email, phone: x.phone, guests: x.guests,
      check_in: x.checkIn || null, check_out: x.checkOut || null, room_type: x.roomType || null, num_rooms: x.numRooms || 1,
      tour_date: x.tourDate || null, special_requests: x.specialRequests || "", pricing: x.pricing || {}, status: x.status || "pending",
      booking_date: x.bookingDate || null, aadhaar_url: (x as any).aadhaarUrl || "",
      country_code: String((x as any).countryCode || ""),
      paid_amount: (x as any).paidAmount === undefined ? null : Number((x as any).paidAmount)
    })));
  }
  if (db.cabBookings.length) {
    await supabaseUpsert("ev_cab_bookings", db.cabBookings.map((x) => ({
      id: x.id, user_name: x.userName, phone: x.phone, pickup_location: x.pickupLocation, drop_location: x.dropLocation,
      datetime: x.datetime, passengers: x.passengers, vehicle_type: x.vehicleType, estimated_fare: x.estimatedFare,
      service_area_id: x.serviceAreaId || null, pricing: x.pricing || {}, status: x.status || "pending", created_at: x.createdAt || null
    })));
  }
  if (db.busRoutes.length) {
    try {
      await supabaseUpsert("ev_buses", db.busRoutes.map((x) => ({
        id: x.id,
        operator_name: x.operatorName,
        operator_code: x.operatorCode || "",
        from_city: x.fromCity,
        from_code: x.fromCode || "",
        to_city: x.toCity,
        to_code: x.toCode || "",
        departure_time: x.departureTime || "",
        arrival_time: x.arrivalTime || "",
        duration_text: x.durationText || "",
        bus_type: x.busType || "Non AC",
        fare: Number(x.fare || 0),
        total_seats: Number(x.totalSeats || 20),
        seat_layout: x.seatLayout || [],
        service_dates: x.serviceDates || [],
        seats_booked_by_date: x.seatsBookedByDate || {},
        hero_image: x.heroImage || "",
        active: x.active !== false,
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.busBookings.length) {
    try {
      await supabaseUpsert("ev_bus_bookings", db.busBookings.map((x) => ({
        id: x.id,
        route_id: x.routeId,
        user_name: x.userName,
        phone: x.phone,
        from_city: x.fromCity,
        to_city: x.toCity,
        travel_date: x.travelDate,
        seats: x.seats || [],
        fare_per_seat: Number(x.farePerSeat || 0),
        total_fare: Number(x.totalFare || 0),
        status: x.status || "pending",
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.foodOrders.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_food_orders", db.foodOrders.map((x) => ({
      id: x.id, user_id: String((x as any).userId || ""), restaurant_id: String((x as any).restaurantId || ""),
      user_name: x.userName, phone: x.phone, items: x.items || [], delivery_address: x.deliveryAddress,
      special_instructions: x.specialInstructions || "", pricing: x.pricing || {}, status: x.status || "pending", order_time: x.orderTime || null
    })));
  }
  if ((db as any).carts?.length) {
    try {
      await supabaseUpsert("ev_food_carts", (db as any).carts.map((x: any) => ({
        id: String(x.id || makeId("cart")),
        user_id: String(x.userId || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        restaurant_id: String(x.restaurantId || ""),
        items: Array.isArray(x.items) ? x.items : [],
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.queries.length) {
    await supabaseUpsert("ev_queries", db.queries.map((x) => ({
      id: x.id, user_name: x.userName, email: x.email, phone: x.phone, subject: x.subject, message: x.message, status: x.status || "pending",
      submitted_at: x.submittedAt || null, responded_at: x.respondedAt || null, response: x.response || null
    })));
  }
  if (db.auditLog.length) {
    // Audit logs should be append-only. We insert and ignore duplicates so DB-level
    // UPDATE/DELETE blocking triggers (if installed) won't break server sync.
    const tail = db.auditLog.length > 2000 ? db.auditLog.slice(-2000) : db.auditLog;
    await supabaseInsertIgnoreDuplicates("ev_audit_log", tail.map((x) => ({
      id: x.id, at: x.at, admin_chat_id: x.adminChatId ?? null, action: x.action, entity: x.entity || null, entity_id: x.entityId || null, meta: x.meta || {}
    })));
  }
  if (db.cabProviders.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_cab_providers", db.cabProviders.map((x) => ({
      id: x.id, name: x.name, vehicle_type: x.vehicleType, plate_number: x.plateNumber, capacity: x.capacity, vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", active: x.active !== false,
      service_area_id: x.serviceAreaId || null
    })));
  }
  if (db.serviceAreas.length) {
    await supabaseUpsert("ev_service_areas", db.serviceAreas.map((x) => ({
      id: x.id, name: x.name, city: x.city, enabled: x.enabled !== false
    })));
  }
  if (db.coupons.length) {
    await supabaseUpsert("ev_coupons", db.coupons.map((x) => ({
      code: x.code, type: x.type, amount: x.amount, min_cart: x.minCart || 0, category: x.category || "all", expiry: x.expiry, max_uses: x.maxUses || null
    })), "code");
  }
  const userProfiles = (db as any).userProfiles as any[] | undefined;
  if (userProfiles?.length) {
    try {
      await supabaseUpsert("ev_user_profiles", userProfiles.map((x: any) => ({
        id: String(x.id || ""),
        phone: String(x.phone || ""),
        name: String(x.name || ""),
        email: String(x.email || ""),
        ip_address: String(x.ipAddress || ""),
        browser: String(x.browser || ""),
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO(),
        orders: Array.isArray(x.orders) ? x.orders : []
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  const userBehaviorProfiles = (db as any).userBehaviorProfiles as any[] | undefined;
  if (userBehaviorProfiles?.length) {
    try {
      await supabaseUpsert("ev_user_behavior_profiles", userBehaviorProfiles.map((x: any) => ({
        id: String(x.id || ""),
        user_id: String(x.userId || ""),
        phone: String(x.phone || ""),
        name: String(x.name || ""),
        email: String(x.email || ""),
        core_identity: x.coreIdentity || {},
        device_fingerprinting: x.deviceFingerprinting || {},
        location_mobility: x.locationMobility || {},
        behavioral_analytics: x.behavioralAnalytics || {},
        transaction_payment: x.transactionPayment || {},
        preference_personalization: x.preferencePersonalization || {},
        ratings_reviews_feedback: x.ratingsReviewsFeedback || {},
        marketing_attribution: x.marketingAttribution || {},
        trust_safety_fraud: x.trustSafetyFraud || {},
        derived_inferred: x.derivedInferred || {},
        orders: Array.isArray(x.orders) ? x.orders : [],
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  const analyticsEvents = (db as any).analyticsEvents as any[] | undefined;
  if (analyticsEvents?.length) {
    try {
      const ordered = analyticsEvents
        .slice()
        .sort((a: any, b: any) => new Date(a?.at || 0).getTime() - new Date(b?.at || 0).getTime())
        .slice(-5000);
      await supabaseUpsert("ev_analytics_events", ordered.map((x: any) => ({
        id: String(x.id || ""),
        type: String(x.type || ""),
        category: String(x.category || ""),
        user_id: String(x.userId || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        at: x.at || nowISO(),
        meta: x.meta || {}
      })), "id");
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.sitePages) {
    try {
      const sitePageRows = Object.values(db.sitePages).map((x: any) => ({
        slug: String(x?.slug || ""),
        title: String(x?.title || x?.slug || ""),
        content: String(x?.content || ""),
        updated_at: x?.updatedAt || nowISO()
      })).filter((x: any) => x.slug);
      if (sitePageRows.length) {
        await supabaseUpsert("ev_site_pages", sitePageRows, "slug");
      }
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
}

export async function readData(): Promise<Database> {
  assertSupabaseConfigured();
  return loadSupabaseDatabase();
}

function parseBackupStampFromName(name: string) {
  // Matches: 2026-02-08T08-09-36-235Z_label.json
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_/.exec(name);
  if (!m) return null;
  const iso = `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

async function pruneBackupDirBestEffort() {
  try {
    if (!BACKUP_SNAPSHOTS_ENABLED) return;
    if (!(await fs.pathExists(BACKUP_DIR))) return;

    const files = (await fs.readdir(BACKUP_DIR))
      .filter((n) => n.toLowerCase().endsWith(".json"))
      .map((n) => ({
        name: n,
        fullPath: path.join(BACKUP_DIR, n),
        ts: parseBackupStampFromName(n)
      }));

    const now = Date.now();
    if (Number.isFinite(BACKUP_RETENTION_DAYS) && BACKUP_RETENTION_DAYS > 0) {
      const cutoff = now - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      for (const f of files) {
        const ts = f.ts ?? (await fs.stat(f.fullPath)).mtimeMs;
        if (ts < cutoff) await fs.remove(f.fullPath);
      }
    }

    if (Number.isFinite(BACKUP_KEEP_MAX) && BACKUP_KEEP_MAX > 0) {
      const remaining = (await fs.readdir(BACKUP_DIR))
        .filter((n) => n.toLowerCase().endsWith(".json"))
        .map((n) => ({ name: n, fullPath: path.join(BACKUP_DIR, n), ts: parseBackupStampFromName(n) }));

      if (remaining.length > BACKUP_KEEP_MAX) {
        const sorted = remaining
          .map((x) => ({ ...x, ts2: x.ts ?? 0 }))
          .sort((a, b) => (b.ts2 - a.ts2));
        const toDelete = sorted.slice(BACKUP_KEEP_MAX);
        for (const f of toDelete) await fs.remove(f.fullPath);
      }
    }
  } catch {
    // Best-effort pruning only.
  }
}

async function writeBackupSnapshot(db: Database, label?: string) {
  if (!label) return;
  if (!BACKUP_SNAPSHOTS_ENABLED) return;

  const normalized = String(label || "").trim();
  if (!normalized) return;

  const lower = normalized.toLowerCase();
  if (BACKUP_SKIP_PREFIXES.some((p) => lower.startsWith(p))) return;

  const now = Date.now();
  const last = lastBackupAtByLabel.get(normalized) || 0;
  if (Number.isFinite(BACKUP_MIN_INTERVAL_SEC) && BACKUP_MIN_INTERVAL_SEC > 0) {
    if ((now - last) < (BACKUP_MIN_INTERVAL_SEC * 1000)) return;
  }
  lastBackupAtByLabel.set(normalized, now);

  await fs.ensureDir(BACKUP_DIR);
  const stamp = nowISO().replace(/[:.]/g, "-");
  const out = path.join(BACKUP_DIR, `${stamp}_${normalized}.json`);
  await fs.writeFile(out, JSON.stringify(db, null, 2), "utf8");
  await pruneBackupDirBestEffort();
}

export async function mutateData(mutator: (db: Database) => void, backupLabel?: string) {
  assertSupabaseConfigured();
  const db = await loadSupabaseDatabase();
  const before = DatabaseSchema.parse(JSON.parse(JSON.stringify(db)));
  await writeBackupSnapshot(db, backupLabel);
  mutator(db);
  const skipOperationalRules = String(backupLabel || "").toLowerCase().startsWith("analytics");
  if (!skipOperationalRules) {
    applyOperationalRules(before, db);
  }
  syncUserProfilesFromOrders(db);
  syncUserBehaviorProfilesFromData(db);
  const validated = DatabaseSchema.parse(db);
  await writeSupabaseDatabase(validated);
  return validated;
}

// retained for scripts/tests to force full DB write through same path
export async function writeData(db: Database) {
  assertSupabaseConfigured();
  syncUserProfilesFromOrders(db);
  syncUserBehaviorProfilesFromData(db);
  const validated = DatabaseSchema.parse(db);
  await writeSupabaseDatabase(validated);
  return validated;
}
