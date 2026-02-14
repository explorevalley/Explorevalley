/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), "server", ".env") });
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const DATA_PATH = process.env.DATA_JSON_PATH || path.join(process.cwd(), "data", "data.json");

function required(name, value) {
  if (!value) throw new Error(`${name} is required`);
}

function headers() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal"
  };
}

async function upsert(table, rows, conflict = "id") {
  if (!rows || rows.length === 0) return 0;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`;
    const r = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(chunk) });
    if (!r.ok) throw new Error(`${table} upsert failed ${r.status}: ${await r.text()}`);
  }
  return rows.length;
}

async function upsertWithOptionalPriceDropped(table, rows, conflict = "id") {
  try {
    return await upsert(table, rows, conflict);
  } catch (err) {
    const msg = String((err && err.message) || err || "");
    if (!msg.includes("price_dropped") && !msg.includes("price_drop_percent") && !msg.includes("image_meta") && !msg.includes("hero_image")) throw err;
    const fallbackRows = (rows || []).map((r) => {
      const copy = { ...(r || {}) };
      delete copy.price_dropped;
      delete copy.price_drop_percent;
      delete copy.image_meta;
      delete copy.hero_image;
      return copy;
    });
    return upsert(table, fallbackRows, conflict);
  }
}

async function upsertIfExists(table, rows, conflict = "id") {
  try {
    return await upsert(table, rows, conflict);
  } catch (err) {
    const msg = String((err && err.message) || err || "");
    if (msg.includes("PGRST205") || msg.includes("does not exist")) return 0;
    throw err;
  }
}

async function main() {
  required("SUPABASE_URL", SUPABASE_URL);
  required("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const db = JSON.parse(raw);
  if (!db || Array.isArray(db)) throw new Error("data.json must be full object, not array");

  const counts = {};

  counts.ev_settings = await upsert("ev_settings", [{
    id: "main",
    currency: db.settings?.currency || "INR",
    tax_rules: db.settings?.taxRules || {},
    pricing_tiers: db.settings?.pricingTiers || [],
    page_slugs: db.settings?.pageSlugs || {
      affiliateProgram: "affiliate-program",
      contactUs: "contact-us",
      privacyPolicy: "privacy-policy",
      refundPolicy: "refund-policy",
      termsAndConditions: "terms-and-conditions"
    }
  }]);

  counts.ev_policies = await upsert("ev_policies", [{
    id: "main",
    hotel: db.policies?.hotel || {},
    tour: db.policies?.tour || {},
    cab: db.policies?.cab || {},
    food: db.policies?.food || {}
  }]);

  counts.ev_payments = await upsert("ev_payments", [{
    id: "main",
    wallet_enabled: !!db.payments?.walletEnabled,
    refund_method: db.payments?.refundMethod || "original",
    refund_window_hours: Number(db.payments?.refundWindowHours || 72)
  }]);

  counts.ev_tours = await upsertWithOptionalPriceDropped("ev_tours", (db.tours || []).map((x) => ({
    id: x.id, title: x.title, description: x.description, price: x.price, price_dropped: x.priceDropped === true, price_drop_percent: Number(x.priceDropPercent || 0), hero_image: x.heroImage || "", duration: x.duration,
    image_meta: x.imageMeta || [],
    images: x.images || [], highlights: x.highlights || [], itinerary: x.itinerary || "",
    inclusions: x.inclusions || [], exclusions: x.exclusions || [], max_guests: x.maxGuests,
    availability: x.availability || {}, available: x.available !== false,
    created_at: x.createdAt || null, updated_at: x.updatedAt || null
  })));

  counts.ev_festivals = await upsertWithOptionalPriceDropped("ev_festivals", (db.festivals || []).map((x) => ({
    id: x.id, title: x.title, description: x.description || "", location: x.location || "",
    price_dropped: x.priceDropped === true, price_drop_percent: Number(x.priceDropPercent || 0), hero_image: x.heroImage || "", image_meta: x.imageMeta || [],
    month: x.month || "All Season", date: x.date || null, vibe: x.vibe || "",
    ticket: String(x.ticket ?? "On request"), images: x.images || [], highlights: x.highlights || [],
    available: x.available !== false, created_at: x.createdAt || null, updated_at: x.updatedAt || null
  })));

  counts.ev_hotels = await upsertWithOptionalPriceDropped("ev_hotels", (db.hotels || []).map((x) => ({
    id: x.id, name: x.name, description: x.description, location: x.location, price_per_night: x.pricePerNight,
    price_dropped: x.priceDropped === true, price_drop_percent: Number(x.priceDropPercent || 0), hero_image: x.heroImage || "", image_meta: x.imageMeta || [],
    images: x.images || [], amenities: x.amenities || [], room_types: x.roomTypes || [],
    rating: x.rating || 0, reviews: x.reviews || 0, check_in_time: x.checkInTime || "14:00", check_out_time: x.checkOutTime || "11:00",
    availability: x.availability || {}, seasonal_pricing: x.seasonalPricing || [], date_overrides: x.dateOverrides || {},
    min_nights: x.minNights || 1, max_nights: x.maxNights || 30, child_policy: x.childPolicy || "",
    available: x.available !== false, created_at: x.createdAt || null
  })));

  counts.ev_restaurants = await upsertWithOptionalPriceDropped("ev_restaurants", (db.restaurants || []).map((x) => ({
    id: x.id, name: x.name, description: x.description, cuisine: x.cuisine || [], rating: x.rating || 0,
    review_count: x.reviewCount || 0, delivery_time: x.deliveryTime || "", minimum_order: x.minimumOrder || 0,
    price_dropped: x.priceDropped === true, price_drop_percent: Number(x.priceDropPercent || 0), hero_image: x.heroImage || "", image_meta: x.imageMeta || [],
    images: x.images || [], available: x.available !== false, is_veg: !!x.isVeg, tags: x.tags || [],
    location: x.location || "", service_radius_km: x.serviceRadiusKm || 0, delivery_zones: x.deliveryZones || [],
    open_hours: x.openHours || "09:00", closing_hours: x.closingHours || "22:00"
  })));

  counts.ev_vendor_menus = await upsertIfExists("ev_vendor_menus", (db.restaurants || []).map((x) => ({
    restaurant_id: x.id,
    menu: Array.isArray(x.menu) ? x.menu : [],
    updated_at: new Date().toISOString()
  })), "restaurant_id");

  counts.ev_menu_items = await upsertWithOptionalPriceDropped("ev_menu_items", (db.menuItems || []).map((x) => ({
    id: x.id, restaurant_id: x.restaurantId, category: x.category, name: x.name, description: x.description || "",
    price: x.price, price_dropped: x.priceDropped === true, price_drop_percent: Number(x.priceDropPercent || 0), hero_image: x.heroImage || "", image: x.image || null, image_meta: x.imageMeta || [], available: x.available !== false, is_veg: !!x.isVeg, tags: x.tags || [],
    stock: x.stock || 0, max_per_order: x.maxPerOrder || 10, addons: x.addons || [], variants: x.variants || []
  })));

  counts.ev_bookings = await upsert("ev_bookings", (db.bookings || []).map((x) => ({
    id: x.id, type: x.type, item_id: x.itemId, user_name: x.userName, email: x.email, phone: x.phone, guests: x.guests,
    check_in: x.checkIn || null, check_out: x.checkOut || null, room_type: x.roomType || null, num_rooms: x.numRooms || 1,
    tour_date: x.tourDate || null, special_requests: x.specialRequests || "", pricing: x.pricing || {},
    status: x.status || "pending", booking_date: x.bookingDate || null
  })));

  counts.ev_cab_bookings = await upsert("ev_cab_bookings", (db.cabBookings || []).map((x) => ({
    id: x.id, user_name: x.userName, phone: x.phone, pickup_location: x.pickupLocation, drop_location: x.dropLocation,
    datetime: x.datetime, passengers: x.passengers, vehicle_type: x.vehicleType, estimated_fare: x.estimatedFare,
    service_area_id: x.serviceAreaId || null, pricing: x.pricing || {}, status: x.status || "pending", created_at: x.createdAt || null
  })));

  counts.ev_food_orders = await upsert("ev_food_orders", (db.foodOrders || []).map((x) => ({
    id: x.id, user_name: x.userName, phone: x.phone, items: x.items || [], delivery_address: x.deliveryAddress,
    special_instructions: x.specialInstructions || "", pricing: x.pricing || {}, status: x.status || "pending", order_time: x.orderTime || null
  })));

  counts.ev_queries = await upsert("ev_queries", (db.queries || []).map((x) => ({
    id: x.id, user_name: x.userName, email: x.email, phone: x.phone, subject: x.subject, message: x.message,
    status: x.status || "pending", submitted_at: x.submittedAt || null, responded_at: x.respondedAt || null, response: x.response || null
  })));

  counts.ev_audit_log = await upsert("ev_audit_log", (db.auditLog || []).map((x) => ({
    id: x.id, at: x.at, admin_chat_id: x.adminChatId || null, action: x.action, entity: x.entity || null,
    entity_id: x.entityId || null, meta: x.meta || {}
  })));

  counts.ev_cab_providers = await upsertWithOptionalPriceDropped("ev_cab_providers", (db.cabProviders || []).map((x) => ({
    id: x.id, name: x.name, vehicle_type: x.vehicleType, plate_number: x.plateNumber, capacity: x.capacity,
    price_dropped: x.priceDropped === true, price_drop_percent: Number(x.priceDropPercent || 0), hero_image: x.heroImage || "", active: x.active !== false, service_area_id: x.serviceAreaId || null
  })));

  counts.ev_service_areas = await upsert("ev_service_areas", (db.serviceAreas || []).map((x) => ({
    id: x.id, name: x.name, city: x.city, enabled: x.enabled !== false
  })));

  counts.ev_coupons = await upsert("ev_coupons", (db.coupons || []).map((x) => ({
    code: x.code, type: x.type, amount: x.amount, min_cart: x.minCart || 0, category: x.category || "all", expiry: x.expiry, max_uses: x.maxUses || null
  })), "code");

  console.log(JSON.stringify({ ok: true, source: DATA_PATH, counts }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
