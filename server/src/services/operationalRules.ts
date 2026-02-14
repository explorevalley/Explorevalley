import type { Database } from "@explorevalley/shared";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function norm(v: any) {
  return safeText(v).toLowerCase();
}

function isBookingActive(status: any) {
  const s = norm(status);
  return s === "pending" || s === "confirmed" || s === "completed";
}

function isFoodConsuming(status: any) {
  const s = norm(status);
  return s === "confirmed" || s === "completed";
}

function parseDateValue(v?: string) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function eachDate(start?: string, end?: string) {
  const s = parseDateValue(start);
  const e = parseDateValue(end);
  if (!s || !e || e <= s) return [] as string[];
  const out: string[] = [];
  for (let d = new Date(s); d < e; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}

function computeFoodConsumptionMap(orders: any[]) {
  const out = new Map<string, number>();
  for (const o of orders || []) {
    if (!isFoodConsuming(o?.status)) continue;
    const items = Array.isArray(o?.items) ? o.items : [];
    for (const it of items) {
      const byId = safeText(it?.menuItemId);
      const key = byId ? `id:${byId}` : `name:${norm(it?.name)}`;
      if (!key) continue;
      const q = Math.max(0, Number(it?.quantity || 0));
      if (!q) continue;
      out.set(key, Number(out.get(key) || 0) + q);
    }
  }
  return out;
}

function pickMenuItemByKey(db: Database, itemKey: string) {
  if (itemKey.startsWith("id:")) {
    const id = itemKey.slice(3);
    return (db.menuItems || []).find((m: any) => safeText(m?.id) === id) || null;
  }
  const nameKey = itemKey.startsWith("name:") ? itemKey.slice(5) : itemKey;
  const candidates = (db.menuItems || []).filter((m: any) => norm(m?.name) === nameKey);
  if (!candidates.length) return null;
  candidates.sort((a: any, b: any) => Number(b?.stock || 0) - Number(a?.stock || 0));
  return candidates[0];
}

function applyFoodStockTransitions(prev: Database, next: Database) {
  const prevMap = computeFoodConsumptionMap(prev.foodOrders || []);
  const nextMap = computeFoodConsumptionMap(next.foodOrders || []);
  const keys = new Set<string>([...Array.from(prevMap.keys()), ...Array.from(nextMap.keys())]);

  for (const itemKey of keys) {
    const prevQty = Number(prevMap.get(itemKey) || 0);
    const nextQty = Number(nextMap.get(itemKey) || 0);
    const delta = nextQty - prevQty;
    if (!delta) continue;
    const menu = pickMenuItemByKey(next, itemKey);
    if (!menu) continue;
    const currentStock = Number(menu.stock || 0);
    if (delta > 0 && currentStock < delta) {
      throw new Error(`OUT_OF_STOCK_FOR_CONFIRMED_ORDER:${menu.name}`);
    }
    menu.stock = Math.max(0, currentStock - delta);
    if (menu.stock === 0) menu.available = false;
    if (menu.stock > 0 && menu.available === false) menu.available = true;
  }
}

function validateTourBookingCapacity(next: Database, booking: any) {
  if (norm(booking?.type) !== "tour" || !isBookingActive(booking?.status)) return;
  const itemId = safeText(booking?.itemId);
  const date = safeText(booking?.tourDate);
  const guests = Math.max(0, Number(booking?.guests || 0));
  if (!itemId || !date || guests <= 0) throw new Error("INVALID_TOUR_BOOKING_DATA");

  const tour = (next.tours || []).find((t: any) => safeText(t?.id) === itemId && t?.available !== false);
  if (!tour) throw new Error("TOUR_UNAVAILABLE");

  const closedDates = Array.isArray(tour.availability?.closedDates) ? tour.availability.closedDates : [];
  if (closedDates.includes(date)) throw new Error("TOUR_DATE_CLOSED");

  const capacity = Number(tour.availability?.capacityByDate?.[date] ?? tour.maxGuests ?? 0);
  const totalGuests = (next.bookings || [])
    .filter((x: any) => norm(x?.type) === "tour" && isBookingActive(x?.status))
    .filter((x: any) => safeText(x?.itemId) === itemId && safeText(x?.tourDate) === date)
    .reduce((sum: number, x: any) => sum + Math.max(0, Number(x?.guests || 0)), 0);

  if (totalGuests > capacity) throw new Error("TOUR_OCCUPANCY_FULL");
}

function validateHotelBookingCapacity(next: Database, booking: any) {
  if (norm(booking?.type) !== "hotel" || !isBookingActive(booking?.status)) return;
  const itemId = safeText(booking?.itemId);
  const roomType = safeText(booking?.roomType);
  const checkIn = safeText(booking?.checkIn);
  const checkOut = safeText(booking?.checkOut);
  const guests = Math.max(0, Number(booking?.guests || 0));
  const numRooms = Math.max(1, Number(booking?.numRooms || 1));
  if (!itemId || !roomType || !checkIn || !checkOut || guests <= 0) throw new Error("INVALID_HOTEL_BOOKING_DATA");

  const hotel = (next.hotels || []).find((h: any) => safeText(h?.id) === itemId && h?.available !== false);
  if (!hotel) throw new Error("HOTEL_UNAVAILABLE");

  const rt = (hotel.roomTypes || []).find((x: any) => safeText(x?.type) === roomType);
  if (!rt) throw new Error("ROOM_TYPE_UNAVAILABLE");
  if (guests > Number(rt.capacity || 0) * numRooms) throw new Error("HOTEL_ROOM_CAPACITY_EXCEEDED");

  const stayDates = eachDate(checkIn, checkOut);
  if (!stayDates.length) throw new Error("INVALID_STAY_RANGE");

  const closedDates = Array.isArray(hotel.availability?.closedDates) ? hotel.availability.closedDates : [];
  if (stayDates.some((d) => closedDates.includes(d))) throw new Error("HOTEL_DATE_CLOSED");

  const totalRoomsForType = hotel.availability?.roomsByType?.[roomType];
  if (typeof totalRoomsForType !== "number") return;

  for (const day of stayDates) {
    const used = (next.bookings || [])
      .filter((x: any) => norm(x?.type) === "hotel" && isBookingActive(x?.status))
      .filter((x: any) => safeText(x?.itemId) === itemId && safeText(x?.roomType) === roomType)
      .filter((x: any) => eachDate(x?.checkIn, x?.checkOut).includes(day))
      .reduce((sum: number, x: any) => sum + Math.max(1, Number(x?.numRooms || 1)), 0);
    if (used > totalRoomsForType) throw new Error("HOTEL_OCCUPANCY_FULL");
  }
}

function changedBookingIds(prev: Database, next: Database) {
  const prevById = new Map((prev.bookings || []).map((x: any) => [safeText(x?.id), x]));
  const nextById = new Map((next.bookings || []).map((x: any) => [safeText(x?.id), x]));
  const ids = new Set<string>([...Array.from(prevById.keys()), ...Array.from(nextById.keys())]);
  const changed: string[] = [];
  for (const id of ids) {
    const a = prevById.get(id);
    const b = nextById.get(id);
    if (!a || !b) {
      changed.push(id);
      continue;
    }
    const fingerprintA = JSON.stringify({
      type: a.type,
      itemId: a.itemId,
      status: a.status,
      guests: a.guests,
      roomType: a.roomType,
      numRooms: a.numRooms,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      tourDate: a.tourDate
    });
    const fingerprintB = JSON.stringify({
      type: b.type,
      itemId: b.itemId,
      status: b.status,
      guests: b.guests,
      roomType: b.roomType,
      numRooms: b.numRooms,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      tourDate: b.tourDate
    });
    if (fingerprintA !== fingerprintB) changed.push(id);
  }
  return changed;
}

export function applyOperationalRules(prev: Database, next: Database) {
  applyFoodStockTransitions(prev, next);

  const nextById = new Map((next.bookings || []).map((x: any) => [safeText(x?.id), x]));
  const changedIds = changedBookingIds(prev, next);
  for (const id of changedIds) {
    const booking = nextById.get(id);
    if (!booking) continue;
    if (norm(booking.type) === "tour") validateTourBookingCapacity(next, booking);
    if (norm(booking.type) === "hotel") validateHotelBookingCapacity(next, booking);
  }
}
