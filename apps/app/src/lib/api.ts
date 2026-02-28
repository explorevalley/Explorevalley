import { getAuthToken, getAuthUser, getSupabaseAccessToken } from "./auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "https://pmqlpbqwyxmfuvcrwoan.supabase.co").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcWxwYnF3eXhtZnV2Y3J3b2FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDQwMDksImV4cCI6MjA4NjEyMDAwOX0.3jYbNoU4ajMQQ751BDrmajuICKrqlyj0B5D7m2Yd_qI").trim();
const SUPABASE_STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_SUPABASE_BUCKET || "explorevalley-uploads").trim() || "explorevalley-uploads";
const SUPABASE_AADHAAR_BUCKET = (process.env.SUPABASE_AADHAAR_BUCKET || process.env.EXPO_PUBLIC_SUPABASE_AADHAAR_BUCKET || "aadhaar-docs").trim() || "aadhaar-docs";
const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;
const SUPABASE_AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const SUPABASE_STORAGE_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}`;
const SUPABASE_AADHAAR_UPLOAD = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_AADHAAR_BUCKET}`;
const SUPABASE_AADHAAR_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_AADHAAR_BUCKET}`;

function resolveBaseUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return "";
}

const BASE_URL = resolveBaseUrl();
const ADMIN_UI_PATH = "/_ev_console_x9k2p7_9b3f21a7c4d8e0f6a1b5c7d9e2f4a6b8c0d1e3f5a7b9c2d4e6f8a0b1c3d5e7f9";

function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeText(v: any): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

function normalizeLower(v: any): string {
  return safeText(v).toLowerCase();
}

function supabaseAuthToken() {
  const supa = getSupabaseAccessToken();
  if (isJwt(supa)) return supa as string;
  return SUPABASE_ANON_KEY;
}

function supabaseHeaders(extra?: Record<string, string>) {
  const token = supabaseAuthToken();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    ...(extra || {})
  } as Record<string, string>;
}

function isJwt(value: string | null) {
  if (!value) return false;
  const parts = value.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

async function errorMessageFromResponse(r: Response): Promise<string> {
  const status = Number.isFinite(r.status) ? r.status : 0;
  const statusText = r.statusText || "";
  let bodyText = "";
  try {
    bodyText = await r.text();
  } catch {
    bodyText = "";
  }

  const trimmed = bodyText.trim();
  const contentType = String(r.headers.get("content-type") || "").toLowerCase();
  let message = "";

  if (trimmed && (contentType.includes("application/json") || trimmed.startsWith("{") || trimmed.startsWith("["))) {
    try {
      const parsed = JSON.parse(trimmed);
      message = String(parsed?.error || parsed?.message || parsed?.detail || "").trim();
    } catch {
      message = "";
    }
  }

  if (!message && trimmed && !trimmed.startsWith("<")) {
    message = trimmed;
  }

  if (!message) {
    if (status >= 500) message = "Server is temporarily unavailable.";
    else if (status === 404) message = "Content not found.";
    else if (status === 401 || status === 403) message = "You are not authorized.";
    else message = "Request failed.";
  }

  const statusLabel = status ? ` (${status}${statusText ? ` ${statusText}` : ""})` : "";
  return `${message}${statusLabel}`;
}

async function supabaseJson(url: string, init?: RequestInit) {
  assertSupabaseConfigured();
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await errorMessageFromResponse(r));
  if (r.status === 204) return null;
  return r.json();
}

async function supabaseSelectAll<T = any>(table: string, params?: Record<string, string>) {
  const search = new URLSearchParams({ select: "*", limit: "1000", ...(params || {}) });
  const url = `${SUPABASE_REST_URL}/${table}?${search.toString()}`;
  try {
    return await supabaseJson(url, { headers: supabaseHeaders() }) as T[];
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("404") || msg.includes("406")) return [] as T[];
    throw err;
  }
}

async function supabaseSelectAllPaged<T = any>(table: string, params?: Record<string, string>) {
  const pageSize = 1000;
  let offset = 0;
  const out: T[] = [];
  while (true) {
    const page = await supabaseSelectAll<T>(table, {
      ...(params || {}),
      limit: String(pageSize),
      offset: String(offset)
    });
    out.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
    if (offset > 50000) break;
  }
  return out;
}

async function supabaseSelectOne<T = any>(table: string, params?: Record<string, string>) {
  const search = new URLSearchParams({ select: "*", limit: "1", ...(params || {}) });
  const url = `${SUPABASE_REST_URL}/${table}?${search.toString()}`;
  const headers = supabaseHeaders({ Accept: "application/vnd.pgrst.object+json" });
  try {
    return await supabaseJson(url, { headers }) as T;
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("404") || msg.includes("406")) return null as T;
    throw err;
  }
}

async function supabaseInsert<T = any>(table: string, rows: any[], opts?: { upsert?: boolean }) {
  const url = `${SUPABASE_REST_URL}/${table}`;
  const headers: Record<string, string> = {
    ...supabaseHeaders({
      "Content-Type": "application/json",
      Prefer: opts?.upsert ? "resolution=merge-duplicates" : "return=representation"
    })
  };
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(rows) });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r));
  if (r.status === 204) return [] as T[];
  return r.json() as Promise<T[]>;
}

async function supabaseUpdate<T = any>(table: string, match: Record<string, string>, patch: any) {
  const search = new URLSearchParams(match);
  const url = `${SUPABASE_REST_URL}/${table}?${search.toString()}`;
  const headers = supabaseHeaders({ "Content-Type": "application/json", Prefer: "return=representation" });
  return supabaseJson(url, { method: "PATCH", headers, body: JSON.stringify(patch) }) as Promise<T[]>;
}

function computeGST(taxableValue: number, gstRate: number) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const gstAmount = round2(taxableValue * gstRate);
  const half = round2(gstAmount / 2);
  return {
    gstRate,
    taxableValue: round2(taxableValue),
    gstAmount,
    cgst: half,
    sgst: round2(gstAmount - half),
    igst: 0
  };
}

function hotelGstRate(perNight: number, settings: any) {
  const slabs = settings?.taxRules?.hotel?.slabs || [];
  const slab = slabs.find((s: any) => perNight >= Number(s.min || 0) && (s.max === null || perNight <= Number(s.max)));
  return Number(slab?.gst || 0);
}

function resolveAssetUrl(value: string) {
  const raw = safeText(value);
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${SUPABASE_STORAGE_PUBLIC}${raw}`;
  return `${SUPABASE_STORAGE_PUBLIC}/${raw}`;
}

function restaurantPlace(r: any) {
  return safeText(r?.location) || safeText(r?.place) || "Unknown";
}

function restaurantImage(r: any) {
  const hero = safeText(r?.heroImage) || safeText(r?.hero_image);
  if (hero) return resolveAssetUrl(hero);
  const images = Array.isArray(r?.images) ? r.images : [];
  if (images.length) return resolveAssetUrl(safeText(images[0]));
  const meta = Array.isArray(r?.imageMeta) ? r.imageMeta : [];
  if (meta.length && meta[0]?.url) return resolveAssetUrl(safeText(meta[0].url));
  return "";
}

function menuItemImage(m: any) {
  const hero = safeText(m?.heroImage);
  if (hero) return resolveAssetUrl(hero);
  const img = safeText(m?.image);
  if (img) return resolveAssetUrl(img);
  const meta = Array.isArray(m?.imageMeta) ? m.imageMeta : [];
  if (meta.length && meta[0]?.url) return resolveAssetUrl(safeText(meta[0].url));
  return "";
}

async function loadSettings() {
  const row = await supabaseSelectOne<any>("ev_settings", { id: "eq.main" });
  return row || null;
}

async function loadCabProviders() {
  const providers = await supabaseSelectAll<any>("ev_cab_providers", { order: "name.asc" });
  return providers.filter((p: any) => p && p.active !== false);
}

async function loadServiceAreas() {
  const areas = await supabaseSelectAll<any>("ev_service_areas", { order: "name.asc" });
  return areas.filter((a: any) => a && a.enabled !== false);
}

async function loadCoupons() {
  return supabaseSelectAll<any>("ev_coupons", { order: "code.asc" });
}

async function loadBusRoutes() {
  return supabaseSelectAll<any>("ev_buses", { order: "fromCity.asc" });
}

async function loadBikeRentals() {
  try {
    const rows = await supabaseSelectAll<any>("ev_rental_vehicles", { order: "updated_at.desc.nullslast" });
    return (Array.isArray(rows) ? rows : [])
      .filter((x: any) => normalizeLower(x?.category) === "bike" && x?.available !== false)
      .map((x: any) => {
        const rates = x?.availability_rates && typeof x.availability_rates === "object" ? x.availability_rates : {};
        const pricing = x?.pricing && typeof x.pricing === "object" ? x.pricing : {};
        const vendor = x?.vendor_details && typeof x.vendor_details === "object" ? x.vendor_details : {};
        const availableQty =
          Number(rates?.available_qty ?? rates?.availableQty ?? rates?.stock ?? vendor?.stock ?? (x?.available === false ? 0 : 1));
        return {
          id: safeText(x?.id),
          name: safeText(x?.name),
          location: safeText(vendor?.location || vendor?.city || vendor?.area || x?.location || "Unknown"),
          bikeType: safeText(x?.bike_model || x?.category || "Bike"),
          maxDays: Number(x?.max_days || 0),
          pricePerHour: Number(pricing?.per_hour ?? pricing?.perHour ?? pricing?.hourly ?? rates?.per_hour ?? rates?.hourly ?? 0),
          pricePerDay: Number(pricing?.per_day ?? pricing?.perDay ?? pricing?.daily ?? rates?.per_day ?? rates?.daily ?? 0),
          availableQty: Number.isFinite(availableQty) ? Math.max(0, availableQty) : 0,
          securityDeposit: Number(pricing?.security_deposit ?? pricing?.securityDeposit ?? vendor?.security_deposit ?? 0),
          helmetIncluded: vendor?.helmet_included !== false && vendor?.helmetIncluded !== false,
          vendorMobile: safeText(vendor?.phone || vendor?.mobile || ""),
          image: safeText(vendor?.image || vendor?.heroImage || vendor?.photo || ""),
          active: x?.available !== false,
          availabilityRates: rates,
          __sourceTable: "ev_rental_vehicles"
        };
      });
  } catch {
    const rows = await supabaseSelectAll<any>("ev_bike_rentals", { order: "location.asc" });
    return rows.filter((x: any) => x && x.active !== false).map((x: any) => ({ ...x, __sourceTable: "ev_bike_rentals" }));
  }
}

async function handleApiGet(path: string): Promise<any> {
  const url = new URL(path, "http://localhost");
  const route = url.pathname;

  if (route === "/api/tours") {
    return supabaseSelectAll<any>("ev_tours", { or: "(available.is.null,available.eq.true)" });
  }
  if (route === "/api/festivals") {
    return supabaseSelectAll<any>("ev_festivals", { or: "(available.is.null,available.eq.true)" });
  }
  if (route === "/api/hotels") {
    return supabaseSelectAll<any>("ev_hotels", { or: "(available.is.null,available.eq.true)" });
  }
  if (route === "/api/restaurants") {
    const place = safeText(url.searchParams.get("place"));
    const list = await supabaseSelectAll<any>("ev_restaurants", { or: "(available.is.null,available.eq.true)" });
    const filtered = !place || normalizeLower(place) === "all"
      ? list
      : list.filter((r: any) => normalizeLower(restaurantPlace(r)) === normalizeLower(place));
    return filtered.map((r: any) => ({ ...r, place: restaurantPlace(r), image: restaurantImage(r) }));
  }
  if (route === "/api/restaurants/search") {
    const query = normalizeLower(url.searchParams.get("query"));
    const place = normalizeLower(url.searchParams.get("place"));
    const list = await supabaseSelectAll<any>("ev_restaurants", { or: "(available.is.null,available.eq.true)" });
    const byPlace = !place || place === "all"
      ? list
      : list.filter((r: any) => normalizeLower(restaurantPlace(r)) === place);
    const filtered = query ? byPlace.filter((r: any) => normalizeLower(r?.name).includes(query)) : byPlace;
    return filtered.map((r: any) => ({ ...r, place: restaurantPlace(r), image: restaurantImage(r) }));
  }
  if (route === "/api/places") {
    const list = await supabaseSelectAll<any>("ev_restaurants", { or: "(available.is.null,available.eq.true)" });
    const set = new Set<string>();
    list.forEach((r: any) => {
      const p = restaurantPlace(r);
      if (p) set.add(p);
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }
  if (route === "/api/menu" || route === "/api/menu-items") {
    const restaurantId = safeText(url.searchParams.get("restaurantId"));
    const list = await supabaseSelectAll<any>("ev_menu_items", { or: "(available.is.null,available.eq.true)" });
    const filtered = restaurantId ? list.filter((m: any) => safeText(m.restaurantId) === restaurantId) : list;
    return filtered.map((m: any) => ({
      ...m,
      image: resolveAssetUrl(safeText(m?.image) || menuItemImage(m)),
      availability: m.available !== false,
      isAvailable: m.available !== false
    }));
  }
  if (route === "/api/menu-items/search") {
    const query = normalizeLower(url.searchParams.get("query"));
    const restaurantId = safeText(url.searchParams.get("restaurantId"));
    let list = await supabaseSelectAll<any>("ev_menu_items", { or: "(available.is.null,available.eq.true)" });
    if (restaurantId) list = list.filter((m: any) => safeText(m.restaurantId) === restaurantId);
    if (query) list = list.filter((m: any) => normalizeLower(m?.name).includes(query));
    return list.map((m: any) => ({
      ...m,
      image: resolveAssetUrl(safeText(m?.image) || menuItemImage(m)),
      availability: m.available !== false,
      isAvailable: m.available !== false
    }));
  }
  if (route === "/api/buses") {
    return loadBusRoutes();
  }
  if (route === "/api/bike-rentals") {
    return loadBikeRentals();
  }
  if (route === "/api/mart-products") {
    const defaultMartId = safeText(process.env.EXPO_PUBLIC_MART_ID || "mart_1772223284995_3e5e8585525848");
    const forceDefault = safeText(process.env.EXPO_PUBLIC_MART_FORCE_DEFAULT_ID || "1") !== "0";
    const requestedMartId = safeText(url.searchParams.get("martId"));
    const activeMartId = forceDefault ? defaultMartId : (requestedMartId || defaultMartId);
    try {
      const rows = await supabaseSelectAllPaged<any>("ev_mart_products", {
        mart_partner_id: `eq.${activeMartId}`,
        order: "created_at.desc.nullslast"
      });
      const items = (Array.isArray(rows) ? rows : [])
        .filter((x: any) => x && x.available !== false)
        .map((x: any) => ({
          id: safeText(x?.id),
          martId: safeText(x?.mart_partner_id || x?.mart_id || activeMartId),
          categoryId: safeText(x?.category_id || "uncategorized"),
          name: safeText(x?.name || "Product"),
          price: Math.max(0, Number(x?.price || 0)),
          mrp: Math.max(0, Number(x?.mrp || 0)),
          image: resolveAssetUrl(safeText(x?.image || x?.image_url || x?.imageUrl || x?.photo || x?.heroImage || "")),
          raw: x
        }))
        .filter((x: any) => !!x.id);
      return { martId: activeMartId, source: "supabase_direct", items };
    } catch {
      return { martId: activeMartId, source: "supabase_direct", items: [] };
    }
  }
  if (route === "/api/cab-rates") {
    return supabaseSelectAll<any>("ev_cab_rates");
  }
  if (route === "/api/buses/search") {
    const from = safeText(url.searchParams.get("from") || url.searchParams.get("fromCity"));
    const to = safeText(url.searchParams.get("to") || url.searchParams.get("toCity"));
    const journeyDate = safeText(url.searchParams.get("journeyDate") || url.searchParams.get("date"));
    const passengers = Math.max(1, Number(url.searchParams.get("passengers") || 1));
    if (!from || !to || !journeyDate) throw new Error("FROM_TO_DATE_REQUIRED");
    if (normalizeLower(from) === normalizeLower(to)) throw new Error("INVALID_ROUTE");
    const routes = await loadBusRoutes();
    const matches = routes
      .filter((x: any) => x?.active !== false)
      .filter((x: any) => normalizeLower(x?.fromCity) === normalizeLower(from) && normalizeLower(x?.toCity) === normalizeLower(to))
      .filter((x: any) => {
        const serviceDates = Array.isArray(x?.serviceDates) ? x.serviceDates : [];
        return serviceDates.length === 0 || serviceDates.includes(journeyDate);
      })
      .map((x: any) => {
        const totalSeats = Math.max(1, Number(x?.totalSeats || 20));
        const booked = Array.isArray(x?.seatsBookedByDate?.[journeyDate]) ? x.seatsBookedByDate[journeyDate] : [];
        const availableSeats = Math.max(0, totalSeats - booked.length);
        return {
          id: x.id,
          operatorName: x.operatorName,
          operatorCode: x.operatorCode || "",
          fromCity: x.fromCity,
          fromCode: x.fromCode || "",
          toCity: x.toCity,
          toCode: x.toCode || "",
          departureTime: x.departureTime || "",
          arrivalTime: x.arrivalTime || "",
          durationText: x.durationText || "",
          busType: x.busType || "Non AC",
          fare: Number(x.fare || 0),
          totalSeats,
          availableSeats,
          seatsLabel: `${availableSeats}/${totalSeats}`,
          canBook: availableSeats >= passengers,
          heroImage: resolveAssetUrl(x.heroImage || "")
        };
      })
      .sort((a: any, b: any) => Number(a.fare || 0) - Number(b.fare || 0));
    return { success: true, count: matches.length, routes: matches };
  }
  if (route.startsWith("/api/buses/") && route.endsWith("/seats")) {
    const parts = route.split("/");
    const routeId = safeText(parts[3]);
    const journeyDate = safeText(url.searchParams.get("journeyDate") || url.searchParams.get("date"));
    if (!routeId || !journeyDate) throw new Error("ROUTE_DATE_REQUIRED");
    const routes = await loadBusRoutes();
    const routeRow = routes.find((x: any) => safeText(x?.id) === routeId);
    if (!routeRow) throw new Error("ROUTE_NOT_FOUND");
    const totalSeats = Math.max(1, Number(routeRow.totalSeats || 20));
    const seatLayout = Array.isArray(routeRow.seatLayout) && routeRow.seatLayout.length
      ? routeRow.seatLayout
      : defaultSeatLayout(totalSeats);
    const bookedSeats = Array.isArray(routeRow?.seatsBookedByDate?.[journeyDate]) ? routeRow.seatsBookedByDate[journeyDate] : [];
    return {
      success: true,
      routeId,
      journeyDate,
      fare: Number(routeRow.fare || 0),
      totalSeats,
      bookedSeats,
      seatLayout
    };
  }
  if (route === "/api/cab-bookings/search") {
    const pickupLocation = safeText(url.searchParams.get("pickupLocation"));
    const dropLocation = safeText(url.searchParams.get("dropLocation"));
    const datetime = safeText(url.searchParams.get("datetime"));
    const passengers = Math.max(1, Number(url.searchParams.get("passengers") || 1));
    const serviceAreaId = safeText(url.searchParams.get("serviceAreaId"));
    if (!pickupLocation || !dropLocation) throw new Error("PICKUP_DROP_REQUIRED");
    if (normalizeLower(pickupLocation) === normalizeLower(dropLocation)) throw new Error("INVALID_TRIP");
    const settings = await loadSettings();
    const providers = (await loadCabProviders())
      .filter((p: any) => Number(p.capacity || 0) >= passengers)
      .filter((p: any) => !serviceAreaId || !safeText(p?.serviceAreaId) || safeText(p?.serviceAreaId) === serviceAreaId);

    const distanceKm = estimateRouteDistanceKm(pickupLocation, dropLocation);
    const durationMin = Math.max(10, Math.round(distanceKm * 2.2));
    const results = providers.map((provider: any) => {
      const fare = estimateFare({
        settings,
        pickupLocation,
        dropLocation,
        datetime,
        distanceKm,
        durationMin,
        provider
      });
      return {
        providerId: safeText(provider.id),
        providerName: safeText(provider.name),
        vehicleType: safeText(provider.vehicleType) || "Sedan",
        plateNumber: safeText(provider.plateNumber),
        capacity: Number(provider.capacity || 0),
        serviceAreaId: safeText(provider.serviceAreaId),
        heroImage: resolveAssetUrl(safeText(provider.heroImage)),
        pickupLocation,
        dropLocation,
        datetime: datetime || "",
        passengers,
        distanceKm: fare.distanceKm,
        durationMin: fare.durationMin,
        baseAmount: fare.subtotal,
        gstAmount: fare.tax.gstAmount,
        totalAmount: fare.total
      };
    }).sort((a: any, b: any) => Number(a.totalAmount || 0) - Number(b.totalAmount || 0));
    return { success: true, count: results.length, results };
  }
  if (route === "/api/meta") {
    const settings = await loadSettings();
    const serviceAreas = await loadServiceAreas();
    const cabProviders = await loadCabProviders();
    const coupons = await loadCoupons();
    const busRoutes = await loadBusRoutes();
    const bikeRentals = await loadBikeRentals();
    const cabLocations = Array.from(new Set([
      ...serviceAreas.flatMap((a: any) => [safeText(a?.name), safeText(a?.city)])
    ].filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const busLocations = Array.from(new Set((busRoutes || [])
      .flatMap((b: any) => [safeText(b?.fromCity), safeText(b?.toCity)])
      .filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const bikeLocations = Array.from(new Set((bikeRentals || [])
      .map((b: any) => safeText(b?.location))
      .filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const settingsOut = settings ? {
      currency: settings.currency,
      taxRules: settings.taxRules,
      pricingTiers: settings.pricingTiers
    } : null;
    return {
      settings: settingsOut,
      cabPricing: settings?.cabPricing || settings?.taxRules?.cab || null,
      cabProviders,
      serviceAreas,
      cabLocations,
      busLocations,
      bikeLocations,
      bikeRentals,
      coupons
    };
  }
  if (route === "/api/pages") {
    const pages = await supabaseSelectAll<any>("ev_site_pages", { order: "slug.asc" });
    const out: Record<string, any> = {};
    pages.forEach((p: any) => {
      if (p?.slug) out[p.slug] = p;
    });
    return out;
  }
  if (route.startsWith("/api/pages/")) {
    const slug = safeText(route.split("/").slice(3).join("/"));
    if (!slug) throw new Error("PAGE_NOT_FOUND");
    const page = await supabaseSelectOne<any>("ev_site_pages", { slug: `eq.${slug}` });
    if (!page) throw new Error("PAGE_NOT_FOUND");
    return page;
  }
  if (route === "/api/profile") {
    const authUser = getAuthUser();
    if (!authUser?.id && !authUser?.email && !authUser?.phone) throw new Error("AUTH_REQUIRED");
    const id = safeText(authUser?.id);
    const email = normalizeLower(authUser?.email);
    const phone = safeText(authUser?.phone);
    const or = [id ? `id.eq.${id}` : "", email ? `email.eq.${email}` : "", phone ? `phone.eq.${phone}` : ""]
      .filter(Boolean)
      .join(",");
    const profile = await supabaseSelectOne<any>("ev_user_profiles", { or: `(${or})` });
    if (profile) return profile;
    const now = new Date().toISOString();
    const created = {
      id: id || makeId("user"),
      phone: phone || "",
      name: safeText(authUser?.name || authUser?.email || authUser?.phone || "User"),
      email: email || "",
      ipAddress: "",
      browser: "",
      password: "",
      createdAt: now,
      updatedAt: now,
      orders: []
    };
    await supabaseInsert("ev_user_profiles", [created], { upsert: true });
    return created;
  }

  if (route === "/api/ai/my-orders") {
    const authUser = getAuthUser();
    if (!authUser?.id && !authUser?.email && !authUser?.phone) throw new Error("AUTH_REQUIRED");
    const phone = safeText(authUser?.phone);
    const email = normalizeLower(authUser?.email);
    const userId = safeText(authUser?.id);

    const bookings = phone || email
      ? await supabaseSelectAll<any>("ev_bookings", { or: `(${phone ? `phone.eq.${phone}` : ""}${phone && email ? "," : ""}${email ? `email.eq.${email}` : ""})` })
      : [];
    const foodOrders = (userId || phone)
      ? await supabaseSelectAll<any>("ev_food_orders", {
          or: `(${userId ? `userId.eq.${userId}` : ""}${userId && phone ? "," : ""}${phone ? `phone.eq.${phone}` : ""})`
        })
      : [];
    const cabBookings = phone ? await supabaseSelectAll<any>("ev_cab_bookings", { phone: `eq.${phone}` }) : [];

    return { bookings, foodOrders, cabBookings };
  }

  throw new Error(`UNSUPPORTED_ENDPOINT:${route}`);
}

async function handleApiPost(path: string, body: any): Promise<any> {
  const url = new URL(path, "http://localhost");
  const route = url.pathname;

  if (route === "/api/analytics/track") {
    try {
      const event = {
        id: makeId("evt"),
        type: safeText(body?.type || ""),
        category: safeText(body?.category || ""),
        userId: safeText(body?.userId || ""),
        phone: safeText(body?.phone || ""),
        email: safeText(body?.email || ""),
        at: new Date().toISOString(),
        meta: body?.meta && typeof body.meta === "object" ? body.meta : {}
      };
      await supabaseInsert("ev_analytics_events", [event]);
    } catch {
      // Ignore analytics failures
    }
    return { ok: true };
  }

  if (route === "/api/admin/supabase/upsert") {
    const table = safeText(body?.table);
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (table !== "ev_reviews") throw new Error("UNSUPPORTED_TABLE");
    if (!rows.length) return { ok: true };
    await supabaseInsert(table, rows, { upsert: true });
    return { ok: true };
  }

  if (route === "/api/ai/chat") {
    return {
      reply: "AI chat is unavailable in direct Supabase mode. Please contact support or try again later."
    };
  }

  if (route === "/api/orders/status") {
    const bookings = Array.isArray(body?.bookings) ? body.bookings : [];
    const cabBookings = Array.isArray(body?.cabBookings) ? body.cabBookings : [];
    const foodOrders = Array.isArray(body?.foodOrders) ? body.foodOrders : [];
    const out: Array<{ id: string; type: "booking" | "cab" | "food"; status: string }> = [];

    if (bookings.length) {
      const list = await supabaseSelectAll<any>("ev_bookings", { id: `in.(${bookings.map((x: string) => `"${x}"`).join(",")})` });
      list.forEach((x: any) => out.push({ id: x.id, type: "booking", status: x.status || "pending" }));
    }
    if (cabBookings.length) {
      const list = await supabaseSelectAll<any>("ev_cab_bookings", { id: `in.(${cabBookings.map((x: string) => `"${x}"`).join(",")})` });
      list.forEach((x: any) => out.push({ id: x.id, type: "cab", status: x.status || "pending" }));
    }
    if (foodOrders.length) {
      const list = await supabaseSelectAll<any>("ev_food_orders", { id: `in.(${foodOrders.map((x: string) => `"${x}"`).join(",")})` });
      list.forEach((x: any) => out.push({ id: x.id, type: "food", status: x.status || "pending" }));
    }
    return { orders: out };
  }

  if (route === "/api/refunds/request") {
    const orderId = safeText(body?.orderId);
    const reason = safeText(body?.reason);
    if (!orderId || !reason) throw new Error("INVALID_INPUT");
    const order = await findOrderById(orderId);
    if (!order) throw new Error("ORDER_NOT_FOUND");
    const amount = Number(order?.pricing?.totalAmount || order?.estimatedFare || 0);
    const refundId = makeId("ref");
    const now = new Date().toISOString();
    await supabaseInsert("ev_audit_log", [{
      id: makeId("audit"),
      at: now,
      action: "REFUND_REQUESTED",
      entity: "refund",
      entityId: refundId,
      meta: { orderId, reason, amount }
    }]);
    return { ok: true, refundId, orderId, amount, status: "requested" };
  }

  if (route === "/api/orders") {
    const restaurantId = safeText(body?.restaurantId);
    const userId = safeText(body?.userId || "");
    const deliveryAddress = safeText(body?.deliveryAddress);
    const phone = safeText(body?.phone);
    const specialInstructions = safeText(body?.specialInstructions);
    const itemsIn = Array.isArray(body?.items) ? body.items : [];
    if (!restaurantId) throw new Error("RESTAURANT_ID_REQUIRED");
    if (!phone) throw new Error("PHONE_REQUIRED");
    if (!deliveryAddress) throw new Error("DELIVERY_ADDRESS_REQUIRED");
    if (!itemsIn.length) throw new Error("ITEMS_REQUIRED");

    const menuItems = await supabaseSelectAll<any>("ev_menu_items", { restaurantId: `eq.${restaurantId}` });
    const byId = new Map(menuItems.map((m: any) => [safeText(m.id), m]));
    const resolvedItems: any[] = [];
    for (const it of itemsIn) {
      const qRaw = Number(it?.quantity);
      if (!Number.isFinite(qRaw) || !Number.isSafeInteger(qRaw)) throw new Error("INVALID_QUANTITY");
      const q = Math.max(1, qRaw);
      const menuItemId = safeText(it?.menuItemId);
      const src = menuItemId ? byId.get(menuItemId) : null;
      if (!src) throw new Error("INVALID_MENU_ITEM");
      if (src.available === false) throw new Error("ITEM_NOT_AVAILABLE");
      const maxPerOrder = Math.max(1, Number(src.maxPerOrder || 10));
      if (q > maxPerOrder) throw new Error("QUANTITY_EXCEEDS_MAX_PER_ORDER");
      resolvedItems.push({
        menuItemId: safeText(src.id),
        restaurantId,
        name: safeText(src.name),
        quantity: q,
        price: Number(src.price || 0)
      });
    }

    const baseAmount = resolvedItems.reduce((sum, x) => sum + Number(x.price || 0) * Number(x.quantity || 0), 0);
    const settings = await loadSettings();
    const gstRate = Number(settings?.taxRules?.food?.gst ?? 0.05);
    const tax = computeGST(baseAmount, gstRate);
    const totalAmount = Math.round((baseAmount + tax.gstAmount) * 100) / 100;
    const now = new Date().toISOString();
    const order = {
      id: makeId("food"),
      userId: userId || safeText(getAuthUser()?.id || ""),
      restaurantId,
      userName: safeText(body?.userName || getAuthUser()?.name || ""),
      phone,
      items: resolvedItems,
      deliveryAddress,
      specialInstructions,
      pricing: { baseAmount, tax, totalAmount },
      status: "pending",
      orderTime: now
    };
    await supabaseInsert("ev_food_orders", [order]);
    return { success: true, id: order.id, order };
  }

  if (route === "/api/cab-bookings") {
    const userName = safeText(body?.userName);
    const phone = safeText(body?.phone);
    const pickupLocation = safeText(body?.pickupLocation);
    const dropLocation = safeText(body?.dropLocation);
    const datetime = safeText(body?.datetime);
    const passengers = Math.max(1, Number(body?.passengers || 1));
    const vehicleType = safeText(body?.vehicleType || "Sedan");
    const serviceAreaId = safeText(body?.serviceAreaId);
    if (!userName || !phone || !pickupLocation || !dropLocation || !datetime) throw new Error("INVALID_INPUT");
    const settings = await loadSettings();
    const providers = await loadCabProviders();
    const provider = providers.find((p: any) => safeText(p?.id) === safeText(body?.providerId)) || null;
    const fare = estimateFare({
      settings,
      pickupLocation,
      dropLocation,
      datetime,
      provider
    });
    const now = new Date().toISOString();
    const booking = {
      id: makeId("cab"),
      userName,
      phone,
      pickupLocation,
      dropLocation,
      datetime,
      passengers,
      vehicleType,
      estimatedFare: Math.round(fare.total * 100) / 100,
      serviceAreaId: serviceAreaId || undefined,
      pricing: { baseAmount: fare.subtotal, tax: fare.tax, totalAmount: fare.total },
      status: "pending",
      createdAt: now
    };
    await supabaseInsert("ev_cab_bookings", [booking]);
    return { success: true, id: booking.id };
  }

  if (route === "/api/bus-bookings/book") {
    const routeId = safeText(body?.routeId);
    const journeyDate = safeText(body?.journeyDate);
    const seats = Array.isArray(body?.seats) ? body.seats.map((x: any) => safeText(x)).filter(Boolean) : [];
    const userName = safeText(body?.userName);
    const phone = safeText(body?.phone);
    if (!routeId || !journeyDate || !userName || !phone || !seats.length) throw new Error("INVALID_INPUT");

    const routes = await loadBusRoutes();
    const routeRow = routes.find((x: any) => safeText(x?.id) === routeId);
    if (!routeRow) throw new Error("ROUTE_NOT_FOUND");

    const totalSeats = Math.max(1, Number(routeRow.totalSeats || 20));
    const seatLayout = Array.isArray(routeRow.seatLayout) && routeRow.seatLayout.length
      ? routeRow.seatLayout
      : defaultSeatLayout(totalSeats);
    const validSeats = new Set(seatLayout.map((x: any) => safeText(x?.code)));
    const invalidSeat = seats.find((s: string) => !validSeats.has(s));
    if (invalidSeat) throw new Error("INVALID_SEAT_SELECTION");

    const currentBooked = Array.isArray(routeRow?.seatsBookedByDate?.[journeyDate]) ? routeRow.seatsBookedByDate[journeyDate] : [];
    const overlap = seats.find((s: string) => currentBooked.includes(s));
    if (overlap) throw new Error("SEAT_ALREADY_BOOKED");

    const nextBooked = [...currentBooked, ...seats];
    const seatsBookedByDate = { ...(routeRow.seatsBookedByDate || {}) };
    seatsBookedByDate[journeyDate] = nextBooked;

    await supabaseUpdate("ev_buses", { id: `eq.${routeId}` }, { seatsBookedByDate });

    const farePerSeat = Number(routeRow.fare || 0);
    const totalFare = Math.round(farePerSeat * seats.length * 100) / 100;
    const now = new Date().toISOString();
    const booking = {
      id: makeId("bus"),
      routeId,
      userName,
      phone,
      fromCity: String(routeRow.fromCity || ""),
      toCity: String(routeRow.toCity || ""),
      travelDate: journeyDate,
      seats,
      farePerSeat,
      totalFare,
      status: "pending",
      createdAt: now
    };
    await supabaseInsert("ev_bus_bookings", [booking]);
    return { success: true, id: booking.id };
  }

  if (route === "/api/bike-bookings/book") {
    const bikeRentalId = safeText(body?.bikeRentalId);
    const userName = safeText(body?.userName);
    const phone = safeText(body?.phone);
    const startDateTime = safeText(body?.startDateTime);
    const days = Math.max(1, Number(body?.days || (Number(body?.hours || 24) / 24) || 1));
    const hours = days * 24;
    const qty = Math.max(1, Number(body?.qty || 1));
    if (!bikeRentalId || !userName || !phone || !startDateTime) throw new Error("INVALID_INPUT");

    const authUser = getAuthUser();
    if (!authUser?.id && !authUser?.email && !authUser?.phone) throw new Error("AUTH_REQUIRED");
    if (authUser?.phone && safeText(authUser.phone) !== phone) throw new Error("AUTH_IDENTITY_MISMATCH");

    const rentals = await loadBikeRentals();
    const bike = rentals.find((x: any) => safeText(x?.id) === bikeRentalId);
    if (!bike) throw new Error("BIKE_NOT_FOUND");
    const availableQty = Math.max(0, Number(bike.availableQty || 0));
    if (availableQty < qty) throw new Error("INSUFFICIENT_BIKE_STOCK");
    const maxDays = Math.max(0, Number((bike as any).maxDays || 0));
    if (maxDays > 0 && days > maxDays) throw new Error("MAX_DAYS_EXCEEDED");

    const perDay = Number(bike.pricePerDay || 0);
    const totalFare = Math.round((days * perDay * qty) * 100) / 100;

    const now = new Date().toISOString();
    const booking = {
      id: makeId("bike"),
      bikeRentalId,
      userName,
      phone,
      startDateTime,
      days,
      hours,
      qty,
      totalFare,
      status: "pending",
      createdAt: now
    };
    await supabaseInsert("ev_bike_bookings", [booking]);
    if (safeText((bike as any)?.__sourceTable) === "ev_rental_vehicles") {
      const nextRates = {
        ...((bike as any)?.availabilityRates || {}),
        available_qty: Math.max(0, availableQty - qty)
      };
      await supabaseUpdate("ev_rental_vehicles", { id: `eq.${bikeRentalId}` }, { availability_rates: nextRates });
    } else {
      await supabaseUpdate("ev_bike_rentals", { id: `eq.${bikeRentalId}` }, { availableQty: Math.max(0, availableQty - qty) });
    }
    return { success: true, id: booking.id };
  }

  if (route === "/api/bookings") {
    const type = safeText(body?.type);
    const itemId = safeText(body?.itemId);
    const userName = safeText(body?.userName);
    const email = safeText(body?.email);
    const phone = safeText(body?.phone);
    const aadhaarUrl = safeText(body?.aadhaarUrl || "");
    const guests = Math.max(1, Number(body?.guests || 1));
    if (!type || !itemId || !userName || !email || !phone) throw new Error("INVALID_INPUT");

    const settings = await loadSettings();
    const now = new Date().toISOString();

    if (type === "hotel") {
      const checkIn = safeText(body?.checkIn);
      const checkOut = safeText(body?.checkOut);
      const roomType = safeText(body?.roomType || "");
      const numRooms = Math.max(1, Number(body?.numRooms || 1));
      if (!checkIn || !checkOut) throw new Error("INVALID_STAY_RANGE");
      const hotels = await supabaseSelectAll<any>("ev_hotels", { id: `eq.${itemId}` });
      const hotel = hotels[0];
      if (!hotel) throw new Error("HOTEL_NOT_FOUND");
      const pricePerNight = Number(hotel.pricePerNight || 0);
      const nights = nightsBetweenStrict(checkIn, checkOut);
      const baseAmount = Math.max(0, pricePerNight * nights * numRooms);
      const gstRate = hotelGstRate(pricePerNight, settings || {});
      const tax = computeGST(baseAmount, gstRate);
      const totalAmount = Math.round((baseAmount + tax.gstAmount) * 100) / 100;
      const booking = {
        id: makeId("book"),
        type: "hotel",
        itemId,
        userName,
        email,
        phone,
        aadhaarUrl,
        guests,
        checkIn,
        checkOut,
        roomType,
        numRooms,
        specialRequests: safeText(body?.specialRequests || ""),
        pricing: { baseAmount, tax, totalAmount },
        status: "pending",
        bookingDate: now
      };
      await supabaseInsert("ev_bookings", [booking]);
      return { success: true, id: booking.id };
    }

    if (type === "tour") {
      const tourDate = safeText(body?.tourDate);
      if (!tourDate) throw new Error("INVALID_TOUR_DATE");
      const tours = await supabaseSelectAll<any>("ev_tours", { id: `eq.${itemId}` });
      const tour = tours[0];
      if (!tour) throw new Error("TOUR_NOT_FOUND");
      const base = Number(tour.price || 0);
      const pct = Math.max(0, Math.min(100, Number(tour.priceDropPercent || (tour.priceDropped ? 10 : 0))));
      const baseAmount = pct > 0 ? Math.round(base * (100 - pct)) / 100 : base;
      const gstRate = Number(settings?.taxRules?.tour?.gst ?? 0.05);
      const tax = computeGST(baseAmount, gstRate);
      const totalAmount = Math.round((baseAmount + tax.gstAmount) * 100) / 100;
      const booking = {
        id: makeId("book"),
        type: "tour",
        itemId,
        userName,
        email,
        phone,
        aadhaarUrl,
        guests,
        tourDate,
        specialRequests: safeText(body?.specialRequests || ""),
        pricing: { baseAmount, tax, totalAmount },
        status: "pending",
        bookingDate: now
      };
      await supabaseInsert("ev_bookings", [booking]);
      return { success: true, id: booking.id };
    }

    throw new Error("INVALID_INPUT");
  }

  if (route === "/api/profile") {
    const authUser = getAuthUser();
    if (!authUser?.id && !authUser?.email && !authUser?.phone) throw new Error("AUTH_REQUIRED");
    const nextName = body?.name !== undefined ? safeText(body?.name) : undefined;
    const nextPhone = body?.phone !== undefined ? safeText(body?.phone) : undefined;
    const nextEmail = body?.email !== undefined ? safeText(body?.email) : undefined;
    const nextPhoto = body?.profilePhoto !== undefined ? safeText(body?.profilePhoto) : undefined;

    const id = safeText(authUser?.id || makeId("user"));
    const email = normalizeLower(authUser?.email);
    const phone = safeText(authUser?.phone);
    const or = [id ? `id.eq.${id}` : "", email ? `email.eq.${email}` : "", phone ? `phone.eq.${phone}` : ""]
      .filter(Boolean)
      .join(",");
    const existing = await supabaseSelectOne<any>("ev_user_profiles", { or: `(${or})` });
    const now = new Date().toISOString();
    const updated = {
      id,
      phone: nextPhone !== undefined ? nextPhone : safeText(existing?.phone || phone || ""),
      name: nextName !== undefined ? nextName : safeText(existing?.name || authUser?.name || ""),
      email: nextEmail !== undefined ? normalizeLower(nextEmail) : safeText(existing?.email || email || ""),
      profilePhoto: nextPhoto !== undefined ? nextPhoto : safeText(existing?.profilePhoto || ""),
      ipAddress: safeText(existing?.ipAddress || ""),
      browser: safeText(existing?.browser || ""),
      password: safeText(existing?.password || ""),
      createdAt: safeText(existing?.createdAt || now),
      updatedAt: now,
      orders: Array.isArray(existing?.orders) ? existing.orders : []
    };
    await supabaseInsert("ev_user_profiles", [updated], { upsert: true });
    return updated;
  }

  if (route === "/api/auth/session-sync") {
    const accessToken = safeText(body?.accessToken);
    if (!accessToken) throw new Error("INVALID_SUPABASE_SESSION");
    const user = await supabaseGetUser(accessToken);
    return { token: accessToken, user, accessToken };
  }

  if (route === "/api/auth/password-login") {
    const email = safeText(body?.email).toLowerCase();
    const password = safeText(body?.password);
    if (!email || !password) throw new Error("INVALID_INPUT");
    const session = await supabasePasswordLogin(email, password);
    return { token: session.access_token, user: session.user, accessToken: session.access_token };
  }

  if (route === "/api/auth/set-password") {
    const accessToken = safeText(body?.accessToken);
    const password = safeText(body?.password);
    if (!accessToken || !password) throw new Error("INVALID_INPUT");
    await supabaseUpdatePassword(accessToken, password);
    return { ok: true };
  }

  throw new Error(`UNSUPPORTED_ENDPOINT:${route}`);
}

function defaultSeatLayout(totalSeats: number) {
  const rows = Math.max(1, Math.ceil(totalSeats / 4));
  const cols = ["A", "B", "C", "D"];
  const out: Array<{ code: string; seatType: string }> = [];
  for (let r = 1; r <= rows; r += 1) {
    for (const c of cols) out.push({ code: `${c}${r}`, seatType: "regular" });
  }
  return out.slice(0, totalSeats);
}

function estimateRouteDistanceKm(pickupLocation: string, dropLocation: string) {
  const normalize = (value: string) => String(value || "").trim().toLowerCase();
  const pickup = normalize(pickupLocation);
  const drop = normalize(dropLocation);
  if (!pickup || !drop) return 10;
  if (pickup === drop) return 0;

  const knownPoints: Record<string, [number, number]> = {
    manali: [0, 0],
    kullu: [42, 6],
    jhibhi: [58, 22],
    jibhi: [58, 22],
    tandi: [72, 37],
    kasol: [78, 16],
    chandigarh: [246, 64],
    delhi: [535, 82]
  };

  const lookupPoint = (text: string) => {
    const key = Object.keys(knownPoints).find((k) => text.includes(k));
    return key ? knownPoints[key] : null;
  };

  const p1 = lookupPoint(pickup);
  const p2 = lookupPoint(drop);
  if (p1 && p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.max(3, Math.round(Math.sqrt(dx * dx + dy * dy)));
  }

  const tokenize = (text: string) => new Set(text.split(/[^a-z0-9]+/g).filter(Boolean));
  const t1 = tokenize(pickup);
  const t2 = tokenize(drop);
  const overlap = [...t1].filter((t) => t2.has(t)).length;
  const union = new Set([...t1, ...t2]).size || 1;
  const similarity = overlap / union;
  const lexicalDistance = Math.round(6 + (1 - similarity) * 22 + Math.abs(pickup.length - drop.length) * 0.2);
  return Math.max(3, Math.min(120, lexicalDistance));
}

function estimateFare(input: {
  settings: any;
  pickupLocation: string;
  dropLocation: string;
  datetime?: string;
  includeToll?: boolean;
  highDemand?: boolean;
  distanceKm?: number;
  durationMin?: number;
  provider?: any;
}) {
  const rawPricing = (input.settings?.cabPricing || {}) as any;
  const pricing = {
    baseFare: 60,
    perKm: 14,
    perMin: 2,
    ...rawPricing,
    surgeRules: Array.isArray(rawPricing.surgeRules) && rawPricing.surgeRules.length > 0
      ? rawPricing.surgeRules
      : [{ from: "18:00", to: "22:00", multiplier: 1.2 }],
    nightCharges: {
      start: "22:00",
      end: "06:00",
      multiplier: 1.35,
      ...(rawPricing.nightCharges || {})
    },
    tolls: {
      enabled: true,
      defaultFee: 50,
      ...(rawPricing.tolls || {})
    }
  } as any;

  const baseFare = Number(pricing.baseFare || 60);
  const perKm = Number(pricing.perKm || 14);
  const perMin = Number(pricing.perMin || 2);
  const distanceKm = Number(input.distanceKm ?? estimateRouteDistanceKm(input.pickupLocation, input.dropLocation));
  const durationMin = Number(input.durationMin ?? Math.max(10, Math.round(distanceKm * 2)));
  const dt = input.datetime ? new Date(input.datetime) : new Date();
  const hour = dt.getHours();

  let multiplier = 1;
  if (input.highDemand) {
    multiplier = 1.5;
  } else {
    const surgeRules = pricing.surgeRules || [];
    const toMins = (s: string) => {
      const [h, m] = String(s || "0:0").split(":").map(Number);
      return h * 60 + m;
    };
    const nowMins = hour * 60 + dt.getMinutes();
    for (const rule of surgeRules) {
      const from = toMins(rule.from);
      const to = toMins(rule.to);
      const inRange = from <= to ? (nowMins >= from && nowMins <= to) : (nowMins >= from || nowMins <= to);
      if (inRange) {
        multiplier = Number(rule.multiplier || 1);
        break;
      }
    }
  }

  const night = pricing.nightCharges || {};
  const nightStart = Number(String(night.start || "22:00").split(":")[0]);
  const nightEnd = Number(String(night.end || "06:00").split(":")[0]);
  const isNight = nightStart > nightEnd ? (hour >= nightStart || hour < nightEnd) : (hour >= nightStart && hour < nightEnd);
  const nightMultiplier = isNight ? Number(night.multiplier || 1.35) : 1;

  const tollEnabled = !!(pricing.tolls?.enabled);
  const tollFee = tollEnabled && input.includeToll !== false ? Number(pricing.tolls?.defaultFee || 50) : 0;
  const rawBase = (baseFare + distanceKm * perKm + durationMin * perMin) * multiplier * nightMultiplier + tollFee;

  const priceDropPercent = Number(input.provider?.priceDropPercent || 0);
  const discountedBase = input.provider?.priceDropped === true
    ? Math.max(0, rawBase - (rawBase * Math.max(0, Math.min(100, priceDropPercent)) / 100))
    : rawBase;

  const gstRate = Number(input.settings?.taxRules?.cab?.gst ?? 0.05);
  const tax = computeGST(discountedBase, gstRate);
  const total = discountedBase + tax.gstAmount;

  return {
    pricing,
    baseFare,
    perKm,
    perMin,
    distanceKm,
    durationMin,
    subtotal: discountedBase,
    tollFee,
    gstRate,
    tax,
    total,
    multiplier,
    isNight
  };
}

function nightsBetweenStrict(checkIn: string, checkOut: string) {
  const a = new Date(checkIn + "T00:00:00Z").getTime();
  const b = new Date(checkOut + "T00:00:00Z").getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("INVALID_STAY_RANGE");
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  if (diff <= 0) throw new Error("INVALID_STAY_RANGE");
  return diff;
}

async function findOrderById(orderId: string) {
  const bookings = await supabaseSelectAll<any>("ev_bookings", { id: `eq.${orderId}` });
  if (bookings[0]) return bookings[0];
  const cab = await supabaseSelectAll<any>("ev_cab_bookings", { id: `eq.${orderId}` });
  if (cab[0]) return cab[0];
  const food = await supabaseSelectAll<any>("ev_food_orders", { id: `eq.${orderId}` });
  if (food[0]) return food[0];
  return null;
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = new URL(path, "http://localhost");
  if (BASE_URL && url.pathname.startsWith("/api/")) {
    try {
      const authToken = getAuthToken();
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const r = await fetch(`${BASE_URL}${url.pathname}${url.search}`, { headers });
      if (!r.ok) throw new Error(await errorMessageFromResponse(r));
      return (await r.json()) as T;
    } catch {
      // fallback to direct Supabase mode
    }
  }
  return handleApiGet(path) as Promise<T>;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const url = new URL(path, "http://localhost");
  if (BASE_URL && url.pathname.startsWith("/api/")) {
    try {
      const authToken = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const r = await fetch(`${BASE_URL}${url.pathname}${url.search}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body ?? {})
      });
      if (!r.ok) throw new Error(await errorMessageFromResponse(r));
      return (await r.json()) as T;
    } catch {
      // fallback to direct Supabase mode
    }
  }
  return handleApiPost(path, body) as Promise<T>;
}

export async function trackEvent(body: any): Promise<void> {
  const type = String(body?.type || body?.eventType || "").toLowerCase();
  const category = String(body?.category || "").toLowerCase();
  const meta = body?.meta && typeof body.meta === "object" ? body.meta : {};
  const flagged = meta?.malicious === true || meta?.suspicious === true;
  const securityCategory = category === "security" || category === "trust" || category === "fraud";
  const securityType =
    type.includes("malicious") ||
    type.includes("suspicious") ||
    type.includes("fraud") ||
    type.includes("abuse") ||
    type.includes("attack") ||
    type.includes("bot") ||
    type.includes("rate_limit") ||
    type.includes("blocked");
  if (!flagged && !securityCategory && !securityType) return;
  try {
    await apiPost("/api/analytics/track", body);
  } catch {
    // ignore analytics errors
  }
}

export async function supabaseGetUser(accessToken: string) {
  assertSupabaseConfigured();
  const r = await fetch(`${SUPABASE_AUTH_URL}/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r));
  const data = await r.json();
  const user = data?.user || data;
  const metadata = user?.user_metadata || {};
  return {
    id: user?.id || null,
    email: user?.email || null,
    phone: user?.phone || null,
    name: metadata?.full_name || metadata?.name || user?.email || user?.phone || "User"
  };
}

export async function supabasePasswordLogin(email: string, password: string) {
  assertSupabaseConfigured();
  const r = await fetch(`${SUPABASE_AUTH_URL}/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r));
  const data = await r.json();
  const user = data?.user || {};
  const metadata = user?.user_metadata || {};
  return {
    access_token: data?.access_token,
    user: {
      id: user?.id || null,
      email: user?.email || null,
      phone: user?.phone || null,
      name: metadata?.full_name || metadata?.name || user?.email || user?.phone || "User"
    }
  };
}

export async function supabaseUpdatePassword(accessToken: string, password: string) {
  assertSupabaseConfigured();
  const r = await fetch(`${SUPABASE_AUTH_URL}/user`, {
    method: "PUT",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r));
  return r.json();
}

export async function uploadAadhaar(file: File) {
  assertSupabaseConfigured();
  const ext = file.name?.split(".").pop() || "jpg";
  const path = `aadhaar/${Date.now()}_${makeId("aadhaar")}.${ext}`;
  const uploadUrl = `${SUPABASE_AADHAAR_UPLOAD}/${encodeURIComponent(path)}`;
  const r = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${supabaseAuthToken()}`,
      "Content-Type": file.type || "image/jpeg"
    },
    body: file
  });
  if (!r.ok) throw new Error(await errorMessageFromResponse(r));
  const publicUrl = `${SUPABASE_AADHAAR_PUBLIC}/${encodeURIComponent(path)}`;
  return { url: publicUrl, path };
}

export { BASE_URL, ADMIN_UI_PATH, resolveAssetUrl };
