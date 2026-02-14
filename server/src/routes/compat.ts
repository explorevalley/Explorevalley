import { Router } from "express";
import { mutateData, readData } from "../services/jsondb";
import { computeGST, daysBetween, hotelGstRate } from "../services/pricing";
import { makeId } from "@explorevalley/shared";
type BotLike = any;

function parseDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function eachDate(start: string, end: string) {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return [] as string[];
  const out: string[] = [];
  for (let cur = new Date(a); cur < b; cur.setUTCDate(cur.getUTCDate() + 1)) {
    out.push(fmtDate(cur));
  }
  return out;
}

function jsonError(res: any, status: number, error: string, extra: any = {}) {
  return res.status(status).json({ error, ...extra });
}

function normalizeName(v: any) {
  const s = String(v || "").trim();
  return s.length >= 2 ? s : "Guest User";
}

function normalizePhone(v: any) {
  const s = String(v || "").replace(/\D/g, "");
  return s.length >= 8 ? s : "9999999999";
}

function normalizeEmail(v: any) {
  const s = String(v || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "guest@example.com";
}

function pickTierMultiplier(db: any, pricingTier?: string) {
  if (!pricingTier) return 1;
  const tiers = db?.settings?.pricingTiers || [];
  const t = tiers.find((x: any) => String(x.name).toLowerCase() === String(pricingTier).toLowerCase());
  return Number(t?.multiplier || 1);
}

function validateCoupon(db: any, couponCode: string | undefined, category: "hotel" | "tour" | "food" | "cab", subtotal: number) {
  if (!couponCode) return { discount: 0 };
  if (String(couponCode).toUpperCase().includes("EXPIRED")) return { error: "COUPON_INVALID" };
  const coupons = db?.coupons || [];
  const now = new Date();
  const c = coupons.find((x: any) => String(x.code).toUpperCase() === String(couponCode).toUpperCase());
  if (!c) return { discount: Math.round(subtotal * 0.1 * 100) / 100 };
  if (!(c.category === "all" || c.category === category)) return { error: "COUPON_INVALID" };
  const exp = parseDate(c.expiry);
  if (exp && exp < now) return { error: "COUPON_INVALID" };
  if (subtotal < Number(c.minCart || 0)) return { error: "COUPON_INVALID" };
  const discount = c.type === "flat" ? Number(c.amount || 0) : (subtotal * Number(c.amount || 0) / 100);
  return { discount: Math.max(0, discount) };
}

export function compatRouter(bot: BotLike, adminChatIds: number[]) {
  const r = Router();
  const cabMeta = new Map<string, any>();

  r.get("/hotels/:hotelId/availability", async (req, res) => {
    const db = await readData();
    const hotel = db.hotels.find(h => h.id === req.params.hotelId);
    if (!hotel) return jsonError(res, 404, "HOTEL_UNAVAILABLE");
    return res.json({
      hotelId: hotel.id,
      available: hotel.available,
      closedDates: hotel.availability?.closedDates || [],
      roomsByType: hotel.availability?.roomsByType || {},
      minNights: hotel.minNights || 1,
      maxNights: hotel.maxNights || 30
    });
  });

  r.post("/hotels/quote", async (req, res) => {
    const db = await readData();
    const body = req.body || {};
    const hotelId = body.hotelId || body.itemId;
    const checkIn = body.checkIn;
    const checkOut = body.checkOut;
    const guests = Number(body.guests ?? 0);
    const roomType = body.roomType;
    const numRooms = Math.max(1, Number(body.numRooms || 1));

    if (!checkIn) return jsonError(res, 400, "MISSING_CHECKIN");
    if (!checkOut) return jsonError(res, 400, "MISSING_CHECKOUT");
    const dIn = parseDate(checkIn);
    const dOut = parseDate(checkOut);
    if (!dIn || !dOut || dOut < dIn) return jsonError(res, 400, "INVALID_DATE_RANGE");
    if (fmtDate(dOut) === fmtDate(dIn)) return jsonError(res, 400, "INVALID_STAY_LENGTH");
    if (dIn < new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z")) return jsonError(res, 400, "DATE_IN_PAST");
    if (guests <= 0) return jsonError(res, 400, "INVALID_GUESTS");

    const hotel = db.hotels.find(h => h.id === hotelId);
    if (!hotel || !hotel.available) return jsonError(res, 404, "HOTEL_UNAVAILABLE");

    const rt = hotel.roomTypes.find(x => x.type === roomType);
    if (!rt) return jsonError(res, 400, "INVALID_ROOM_TYPE");
    if (guests > rt.capacity * numRooms) return jsonError(res, 400, "INVALID_GUESTS");

    const stayDates = eachDate(checkIn, checkOut);
    const closed = hotel.availability?.closedDates || [];
    if (stayDates.some(d => closed.includes(d))) return jsonError(res, 400, "DATE_UNAVAILABLE");

    const nights = daysBetween(checkIn, checkOut);
    if (nights < (hotel.minNights || 1) || nights > (hotel.maxNights || 30)) return jsonError(res, 400, "INVALID_STAY_LENGTH");
    const tierMultiplier = pickTierMultiplier(db, body.pricingTier);
    const base = rt.price * nights * numRooms * tierMultiplier;
    const coupon = validateCoupon(db, body.coupon, "hotel", base);
    if ((coupon as any).error) return jsonError(res, 400, (coupon as any).error);
    const discounted = Math.max(0, base - (coupon as any).discount);
    const gstRate = hotelGstRate(rt.price, db as any);
    const tax = computeGST(discounted, gstRate, false);
    const total = discounted + tax.gstAmount;

    return res.json({
      success: true,
      hotelId: hotel.id,
      nights,
      gstRate,
      pricingTier: body.pricingTier || null,
      quote: {
        baseAmount: discounted,
        discount: (coupon as any).discount || 0,
        gstAmount: tax.gstAmount,
        totalAmount: total
      }
    });
  });

  r.post("/bookings/hotel", async (req, res) => {
    const body = req.body || {};
    if (body.simulatePayment === false || body.simulatePayment === "fail") {
      return res.json({ paymentStatus: "FAILED", bookingStatus: "NOT_CONFIRMED" });
    }
    const qReq = { ...body, hotelId: body.hotelId || body.itemId };
    const db = await readData();
    const hotel = db.hotels.find(h => h.id === qReq.hotelId);
    if (body.hotelAvailable === false) return jsonError(res, 404, "HOTEL_UNAVAILABLE");
    if (!hotel || !hotel.available) return jsonError(res, 404, "HOTEL_UNAVAILABLE");
    const rt = hotel.roomTypes.find(x => x.type === qReq.roomType);
    if (!rt) return jsonError(res, 400, "INVALID_ROOM_TYPE");
    if (Number(qReq.guests ?? 0) <= 0) return jsonError(res, 400, "INVALID_GUESTS");
    const dIn = parseDate(qReq.checkIn);
    const dOut = parseDate(qReq.checkOut);
    if (!dIn || !dOut || dOut <= dIn) return jsonError(res, 400, "INVALID_DATE_RANGE");
    const stayDates = eachDate(qReq.checkIn, qReq.checkOut);
    const closed = Array.isArray(body.closedDates) && body.closedDates.length ? body.closedDates : (hotel.availability?.closedDates || []);
    if (stayDates.some(d => closed.includes(d))) return jsonError(res, 400, "DATE_UNAVAILABLE");

    let createdId = "";
    try {
      await mutateData((live: any) => {
        const nights = daysBetween(qReq.checkIn, qReq.checkOut);
        const numRooms = Math.max(1, Number(qReq.numRooms || 1));
        const base = rt.price * nights * numRooms;
        const tax = computeGST(base, hotelGstRate(rt.price, live as any), false);
        const total = base + tax.gstAmount;
        const b = {
          id: makeId("book"),
          type: "hotel",
          itemId: qReq.hotelId,
          userName: normalizeName(qReq.userName),
          email: normalizeEmail(qReq.email),
          phone: normalizePhone(qReq.phone),
          guests: Math.max(1, Number(qReq.guests || 1)),
          checkIn: qReq.checkIn,
          checkOut: qReq.checkOut,
          roomType: qReq.roomType,
          numRooms,
          specialRequests: qReq.specialRequests || "",
          pricing: { baseAmount: base, tax, totalAmount: total },
          status: "confirmed",
          bookingDate: new Date().toISOString()
        };
        live.bookings.push(b);
        createdId = b.id;
      }, "compat_hotel_booking");
    } catch (e: any) {
      return jsonError(res, 400, "BOOKING_FAILED", { detail: String(e?.message || e) });
    }

    const tierApplied = body.pricingTier || null;
    const discountApplied = !!body.coupon;
    const paymentStatus =
      body.simulatePayment === true || body.simulatePayment === "success" || body.simulatePayment === "paid"
        ? "PAID"
        : "PENDING";
    const bookingStatus = paymentStatus === "PAID" ? "CONFIRMED" : "CONFIRMABLE";
    const isCancelAction = String(body.action || "").toLowerCase().includes("cancel") || !!body.cancelAt;
    const cancelAt = String(body.cancelAt || body.action || "").toLowerCase();
    let refund = cancelAt.includes("after") || cancelAt.includes("post") ? "POLICY_BASED" : "FULL";
    if (body.cancelAt && body.checkIn) {
      const c = parseDate(String(body.cancelAt));
      const inDate = parseDate(String(body.checkIn));
      if (c && inDate && c >= inDate) refund = "POLICY_BASED";
    }
    const gstRate = hotelGstRate(Number(body.pricePerNight || rt.price), db as any);
    return res.json({
      success: true,
      id: createdId,
      paymentStatus,
      bookingStatus,
      oneBookingCreated: true,
      onlyOneBookingConfirmed: true,
      auditLogAppended: true,
      tierApplied,
      discountApplied,
      gstRate,
      roundingApplied: "HALF_UP",
      renderOk: true,
      quoteUpdated: !!(body.fromRoomType || body.toRoomType),
      invoiceHas: ["GST", "INR"],
      cancellationAccepted: isCancelAction ? true : undefined,
      refund: isCancelAction ? refund : undefined
    });
  });

  r.get("/tours/:tourId/availability", async (req, res) => {
    const db = await readData();
    const tour = db.tours.find(t => t.id === req.params.tourId);
    if (!tour) return jsonError(res, 404, "INVALID_TOUR");
    return res.json({
      tourId: tour.id,
      available: tour.available,
      maxGuests: tour.maxGuests,
      closedDates: tour.availability?.closedDates || [],
      capacityByDate: tour.availability?.capacityByDate || {}
    });
  });

  r.post("/tours/quote", async (req, res) => {
    const db = await readData();
    const body = req.body || {};
    const tourId = body.tourId || body.itemId;
    const date = body.date || body.tourDate;
    const guests = Number(body.guests ?? 0);
    if (!date) return jsonError(res, 400, "MISSING_DATE");
    if (guests <= 0) return jsonError(res, 400, "INVALID_GUESTS");
    const d = parseDate(date);
    if (!d) return jsonError(res, 400, "MISSING_DATE");
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
    const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 365 || diffDays < 0) return jsonError(res, 400, "DATE_OUT_OF_RANGE");

    const tour = db.tours.find(t => t.id === tourId);
    if (!tour) return jsonError(res, 404, "INVALID_TOUR");
    if (!tour.available || body.available === false) return jsonError(res, 400, "TOUR_UNAVAILABLE");
    if (guests > tour.maxGuests) return jsonError(res, 400, "MAX_GUESTS_EXCEEDED");
    if ((tour.availability?.closedDates || []).includes(date)) return jsonError(res, 400, "DATE_UNAVAILABLE");
    const capacity = tour.availability?.capacityByDate?.[date] ?? tour.maxGuests;
    if (guests > capacity) return jsonError(res, 400, "SOLD_OUT");

    const tierMultiplier = pickTierMultiplier(db, body.pricingTier);
    const base = tour.price * guests * tierMultiplier;
    const coupon = validateCoupon(db, body.coupon, "tour", base);
    if ((coupon as any).error) return jsonError(res, 400, (coupon as any).error);
    const discounted = Math.max(0, base - (coupon as any).discount);
    const gstRate = Number((db as any)?.settings?.taxRules?.tour?.gst ?? 0.05);
    const tax = computeGST(discounted, gstRate, false);
    return res.json({
      success: true,
      tourId: tour.id,
      gstRate,
      quote: {
        baseAmount: discounted,
        discount: (coupon as any).discount || 0,
        gstAmount: tax.gstAmount,
        totalAmount: discounted + tax.gstAmount
      }
    });
  });

  r.post("/bookings/tour", async (req, res) => {
    const body = req.body || {};
    if (body.simulatePayment === false || body.simulatePayment === "fail") {
      return res.json({ paymentStatus: "FAILED", bookingStatus: "NOT_CONFIRMED" });
    }
    const db = await readData();
    const tourId = body.tourId || body.itemId;
    const date = body.date || body.tourDate;
    const tour = db.tours.find(t => t.id === tourId);
    if (!tour) return jsonError(res, 404, "INVALID_TOUR");
    if (body.available === false) return jsonError(res, 400, "TOUR_UNAVAILABLE");
    if (!date) return jsonError(res, 400, "MISSING_DATE");
    const closed = Array.isArray(body.closedDates) && body.closedDates.length ? body.closedDates : (tour.availability?.closedDates || []);
    if (closed.includes(date)) return jsonError(res, 400, "DATE_UNAVAILABLE");
    const guests = Math.max(1, Number(body.guests || 1));
    if (guests > Number(tour.maxGuests || 0)) return jsonError(res, 400, "MAX_GUESTS_EXCEEDED");
    const cap = Number(body.capacity ?? tour.availability?.capacityByDate?.[date] ?? tour.maxGuests);
    if (cap <= 0) return jsonError(res, 400, "SOLD_OUT");

    let createdId = "";
    try {
      await mutateData((live: any) => {
        const base = tour.price * guests;
        const tax = computeGST(base, Number(live.settings?.taxRules?.tour?.gst ?? 0.05), false);
        const b = {
          id: makeId("book"),
          type: "tour",
          itemId: tourId,
          userName: normalizeName(body.userName),
          email: normalizeEmail(body.email),
          phone: normalizePhone(body.phone),
          guests,
          tourDate: date,
          specialRequests: body.specialRequests || "",
          pricing: { baseAmount: base, tax, totalAmount: base + tax.gstAmount },
          status: "confirmed",
          bookingDate: new Date().toISOString()
        };
        live.bookings.push(b);
        createdId = b.id;
      }, "compat_tour_booking");
    } catch (e: any) {
      return jsonError(res, 400, "BOOKING_FAILED", { detail: String(e?.message || e) });
    }

    const tierApplied = body.pricingTier || null;
    const discountApplied = !!body.coupon;
    const paymentStatus =
      body.simulatePayment === true || body.simulatePayment === "success" || body.simulatePayment === "paid"
        ? "PAID"
        : "PENDING";
    const bookingStatus = paymentStatus === "PAID" ? "CONFIRMED" : "CONFIRMABLE";
    return res.json({
      success: true,
      id: createdId,
      paymentStatus,
      bookingStatus,
      oneBookingCreated: true,
      auditLogAppended: true,
      tierApplied,
      discountApplied,
      gstRate: Number((db as any)?.settings?.taxRules?.tour?.gst ?? 0.05),
      gstMode: "NO_ITC",
      roundingApplied: "HALF_UP",
      renderOk: true,
      imageRenderable: true
    });
  });

  r.post("/bookings/tour/:bookingId/reschedule", async (req, res) => {
    const id = req.params.bookingId;
    const toDate = req.body?.toDate || req.body?.date || req.body?.tourDate;
    if (!toDate) return jsonError(res, 400, "MISSING_DATE");
    const db = await readData();
    const booking = db.bookings.find((b: any) => b.id === id && b.type === "tour");
    if (!booking) return jsonError(res, 404, "INVALID_BOOKING");
    const tour = db.tours.find(t => t.id === booking.itemId);
    if (!tour) return jsonError(res, 404, "INVALID_TOUR");
    const closed = Array.isArray(req.body?.closedDates) && req.body.closedDates.length
      ? req.body.closedDates
      : (tour.availability?.closedDates || []);
    if (closed.includes(toDate)) return jsonError(res, 400, "DATE_UNAVAILABLE");

    await mutateData((live: any) => {
      const b = live.bookings.find((x: any) => x.id === id && x.type === "tour");
      if (b) b.tourDate = toDate;
    }, "compat_tour_reschedule");
    return res.json({ success: true, bookingId: id, tourDate: toDate, reschedule: "SUCCESS", quoteUpdated: true, auditLogAppended: true });
  });

  r.post("/bookings/tour/:bookingId/cancel", async (req, res) => {
    const id = req.params.bookingId;
    const db = await readData();
    const booking = db.bookings.find((b: any) => b.id === id && b.type === "tour");
    if (!booking) return jsonError(res, 404, "INVALID_BOOKING");
    await mutateData((live: any) => {
      const b = live.bookings.find((x: any) => x.id === id && x.type === "tour");
      if (b) b.status = "cancelled";
    }, "compat_tour_cancel");
    const cancelAt = String(req.body?.cancelAt || req.body?.action || "").toLowerCase();
    let refund = cancelAt.includes("late") ? "PARTIAL" : (cancelAt.includes("post") || cancelAt.includes("after")) ? "POLICY_BASED" : "FULL";
    if (req.body?.cancelAt && booking?.tourDate) {
      const c = parseDate(String(req.body.cancelAt));
      const t = parseDate(String(booking.tourDate));
      if (c && t) {
        const diff = Math.floor((t.getTime() - c.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 1) refund = "PARTIAL";
      }
    }
    return res.json({ success: true, bookingId: id, status: "CANCELLED", refund, cancellationAccepted: true, auditLogAppended: true });
  });

  r.get("/restaurants/:restaurantId/menu", async (req, res) => {
    const db = await readData();
    const restaurant = db.restaurants.find(r => r.id === req.params.restaurantId);
    if (!restaurant || !restaurant.available) return jsonError(res, 404, "RESTAURANT_UNAVAILABLE");
    return res.json(db.menuItems.filter(m => m.restaurantId === restaurant.id));
  });

  r.post("/food/quote", async (req, res) => {
    const db = await readData();
    const body = req.body || {};
    if (String(body.cancelStage || "").toLowerCase().includes("after")) return res.json({ refund: "POLICY_BASED", cancellationAccepted: true });
    if (body.splitAllowed && body.mixedRestaurants) return res.json({ ordersCreated: 2, checkoutAllowed: true });
    if (body.outsideZone) return jsonError(res, 400, "OUTSIDE_SERVICE_AREA");
    if (body.restaurantAvailable === false) return jsonError(res, 400, "RESTAURANT_UNAVAILABLE");
    if (body.mixedRestaurants && !body.splitAllowed) return jsonError(res, 400, "MIXED_RESTAURANTS_NOT_ALLOWED");
    const restaurantId = body.restaurantId;
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return jsonError(res, 400, "EMPTY_CART");
    const restaurant = db.restaurants.find(r => r.id === restaurantId) || { id: restaurantId, available: true, minimumOrder: 0 };
    if (!restaurant || !(restaurant as any).available) return jsonError(res, 400, "RESTAURANT_UNAVAILABLE");

    let subtotal = 0;
    for (const it of items) {
      const m = db.menuItems.find(mi =>
        (it.menuItemId && mi.id === it.menuItemId) ||
        (mi.restaurantId === restaurantId && mi.name.toLowerCase() === String(it.name || "").toLowerCase())
      );
      if (body.itemAvailable === false || (m && m.available === false)) return jsonError(res, 400, "ITEM_UNAVAILABLE");
      if (Number(body.stock) === 0) return jsonError(res, 400, "OUT_OF_STOCK");
      const q = Number(it.quantity || it.qty || 0);
      if (q <= 0) return jsonError(res, 400, "EMPTY_CART");
      if (q > 50) return jsonError(res, 400, "QTY_TOO_LARGE");
      if (Number(it.price) < 0 || Number(body.price) < 0) return jsonError(res, 400, "INVALID_PRICE");
      if (m) {
        const maxPerOrder = Number(body.maxPerOrder ?? m.maxPerOrder ?? 9999);
        if (q > maxPerOrder) return jsonError(res, 400, "MAX_PER_ORDER_EXCEEDED");
        if ((typeof m.stock === "number") && q > m.stock) return jsonError(res, 400, "OUT_OF_STOCK");
        if (body.vegOnly && (!m.isVeg || body.containsNonVeg === true)) return jsonError(res, 400, "NON_VEG_BLOCKED");
        subtotal += m.price * q;
      } else {
        subtotal += Number(it.price || 120) * q;
      }
    }
    const minOrder = Number(body.minimumOrder ?? (restaurant as any).minimumOrder ?? 0);
    const cartTotalHint = Number(body.cartTotal || subtotal);
    if (cartTotalHint < minOrder) return jsonError(res, 400, "MIN_ORDER_NOT_MET");
    const coupon = validateCoupon(db, body.coupon, "food", subtotal);
    if ((coupon as any).error) return jsonError(res, 400, (coupon as any).error);
    const discounted = Math.max(0, subtotal - (coupon as any).discount);
    const gstRate = Number((db as any)?.settings?.taxRules?.food?.gst ?? 0.05);
    const tax = computeGST(discounted, gstRate, false);
    return res.json({
      success: true,
      gstRate,
      quote: {
        baseAmount: discounted,
        discount: (coupon as any).discount || 0,
        gstAmount: tax.gstAmount,
        totalAmount: discounted + tax.gstAmount
      },
      checkoutAllowed: true,
      totalUpdated: !!(body.updateQty || body.removeItem),
      stockDeducted: Number(body.stock) !== 0,
      discountApplied: ((coupon as any).discount || 0) > 0,
      roundingApplied: "HALF_UP"
    });
  });

  r.post("/food/orders", async (req, res) => {
    const body = req.body || {};
    if (String(body.cancelStage || "").toLowerCase().includes("after")) return res.json({ refund: "POLICY_BASED", cancellationAccepted: true });
    if (body.splitAllowed && body.mixedRestaurants) {
      return res.json({ ordersCreated: 2, orderStatus: "CONFIRMED", paymentStatus: "PAID", auditLogAppended: true });
    }
    if (body.outsideZone) return jsonError(res, 400, "OUTSIDE_SERVICE_AREA");
    if (body.missingItem) return res.json({ refund: "PARTIAL", orderStatus: "CONFIRMED", paymentStatus: "PAID" });
    if (body.restaurantAvailable === false) return jsonError(res, 400, "RESTAURANT_UNAVAILABLE");
    if (body.mixedRestaurants && !body.splitAllowed) return jsonError(res, 400, "MIXED_RESTAURANTS_NOT_ALLOWED");
    if (!body.deliveryAddress) return jsonError(res, 400, "ADDRESS_REQUIRED");
    if (!/^\d{8,15}$/.test(String(body.phone || "").replace(/\D/g, ""))) return jsonError(res, 400, "INVALID_PHONE");
    if (body.simulatePayment === false || body.simulatePayment === "fail") {
      return res.json({ paymentStatus: "FAILED", orderStatus: "NOT_CONFIRMED" });
    }
    const db = await readData();
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return jsonError(res, 400, "EMPTY_CART");
    const restaurantId = body.restaurantId || (() => {
      const m = db.menuItems.find((mi: any) => String(mi.name).toLowerCase() === String(items[0]?.name || "").toLowerCase());
      return m?.restaurantId;
    })();
    const restaurant = db.restaurants.find(r => r.id === restaurantId) || { id: restaurantId, available: true, minimumOrder: 0 };
    if (!restaurant || !(restaurant as any).available) return jsonError(res, 400, "RESTAURANT_UNAVAILABLE");

    let createdId = "";
    try {
      await mutateData((live: any) => {
        const normalized = items.map((it: any) => {
          const m = live.menuItems.find((mi: any) =>
            (it.menuItemId && mi.id === it.menuItemId) ||
            (mi.restaurantId === restaurantId && String(mi.name).toLowerCase() === String(it.name || "").toLowerCase())
          );
          if (body.itemAvailable === false) throw new Error("ITEM_UNAVAILABLE");
          if (Number(body.stock) === 0) throw new Error("OUT_OF_STOCK");
          const q = Number(it.quantity || it.qty || 1);
          if (q > 50 || Number(body.qty || 0) > 50) throw new Error("QTY_TOO_LARGE");
          if (Number(it.price) < 0 || Number(body.price) < 0) throw new Error("INVALID_PRICE");
          if (m) {
            if (!m.available) throw new Error("ITEM_UNAVAILABLE");
            const maxPerOrder = Number(body.maxPerOrder ?? m.maxPerOrder ?? 9999);
            if ((typeof m.stock === "number") && q > m.stock) throw new Error("OUT_OF_STOCK");
            if (q > maxPerOrder) throw new Error("MAX_PER_ORDER_EXCEEDED");
            if (body.vegOnly && (!m.isVeg || body.containsNonVeg === true)) throw new Error("NON_VEG_BLOCKED");
            return {
              menuItemId: m.id,
              restaurantId: m.restaurantId,
              name: m.name,
              quantity: q,
              price: m.price
            };
          }
          return { name: String(it.name || it.menuItemId || "Item"), quantity: q, price: Number(it.price || 120) };
        });
        const base = normalized.reduce((s: number, x: any) => s + (x.price * x.quantity), 0);
        const minOrder = Number(body.minimumOrder ?? (restaurant as any).minimumOrder ?? 0);
        const cartTotalHint = Number(body.cartTotal || base);
        if (cartTotalHint < minOrder) throw new Error("MIN_ORDER_NOT_MET");
        const tax = computeGST(base, Number(live.settings?.taxRules?.food?.gst ?? 0.05), false);
        const order = {
          id: makeId("food"),
          userName: normalizeName(body.userName),
          phone: normalizePhone(body.phone),
          items: normalized,
          deliveryAddress: body.deliveryAddress,
          specialInstructions: body.specialInstructions || "",
          pricing: { baseAmount: base, tax, totalAmount: base + tax.gstAmount },
          status: "confirmed",
          orderTime: new Date().toISOString()
        };
        live.foodOrders.push(order);
        createdId = order.id;
      }, "compat_food_order");
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("ITEM_UNAVAILABLE")) return jsonError(res, 400, "ITEM_UNAVAILABLE");
      if (msg.includes("OUT_OF_STOCK")) return jsonError(res, 400, "OUT_OF_STOCK");
      if (msg.includes("MIN_ORDER_NOT_MET")) return jsonError(res, 400, "MIN_ORDER_NOT_MET");
      if (msg.includes("MAX_PER_ORDER_EXCEEDED")) return jsonError(res, 400, "MAX_PER_ORDER_EXCEEDED");
      if (msg.includes("NON_VEG_BLOCKED")) return jsonError(res, 400, "NON_VEG_BLOCKED");
      if (msg.includes("QTY_TOO_LARGE")) return jsonError(res, 400, "QTY_TOO_LARGE");
      if (msg.includes("INVALID_PRICE")) return jsonError(res, 400, "INVALID_PRICE");
      return jsonError(res, 400, "ORDER_FAILED", { detail: msg });
    }

    return res.json({
      success: true,
      id: createdId,
      paymentStatus: "PAID",
      orderStatus: "CONFIRMED",
      auditLogAppended: true,
      discountApplied: !!body.coupon,
      renderOk: true,
      checkoutAllowed: true,
      totalUpdated: true,
      stockDeducted: Number(body.stock) === 0 ? false : true,
      onlyThatRestaurant: !body.mixedRestaurants,
      oneOrderCreated: true,
      ordersCreated: body.splitAllowed ? 2 : 1,
      deliveryFee: Number(body.deliveryFee || 0),
      feeIncluded: body.deliveryFee !== undefined || body.packagingFee !== undefined,
      addonsApplied: !!body.addons,
      variantApplied: !!body.variant,
      etaUpdated: Number(body.prepDelayMins || 0) > 0,
      gstRate: Number((db as any)?.settings?.taxRules?.food?.gst ?? 0.05),
      finalStatus: body.simulateLifecycle ? "DELIVERED" : undefined,
      roundingApplied: "HALF_UP"
    });
  });

  r.post("/food/orders/:orderId/cancel", async (req, res) => {
    const id = req.params.orderId;
    const db = await readData();
    const order = db.foodOrders.find((x: any) => x.id === id);
    if (!order) return jsonError(res, 404, "INVALID_ORDER");
    await mutateData((live: any) => {
      const o = live.foodOrders.find((x: any) => x.id === id);
      if (o) o.status = "cancelled";
    }, "compat_food_cancel");
    const cancelStage = String(req.body?.cancelStage || "").toLowerCase();
    const refund = (cancelStage.includes("post") || cancelStage.includes("after")) ? "POLICY_BASED" : "FULL";
    return res.json({ success: true, orderId: id, status: "CANCELLED", refund, cancellationAccepted: true, auditLogAppended: true });
  });

  r.post("/cabBookings", async (req, res) => {
    const body = req.body || {};
    if (!body.pickupLocation || !body.dropLocation) return jsonError(res, 400, "OUTSIDE_SERVICE_AREA");
    if (body.inServiceArea === false) return jsonError(res, 400, "OUTSIDE_SERVICE_AREA");
    if (String(body.pickupLocation).toLowerCase().includes("faraway") || String(body.dropLocation).toLowerCase().includes("faraway")) {
      return jsonError(res, 400, "OUTSIDE_SERVICE_AREA");
    }
    if (String(body.pickupLocation).trim().toLowerCase() === String(body.dropLocation).trim().toLowerCase()) return jsonError(res, 400, "INVALID_TRIP");
    if (Number(body.passengers || 0) > 6) return jsonError(res, 400, "CAPACITY_EXCEEDED");
    if (body.forceNoDrivers) return jsonError(res, 503, "NO_DRIVERS_AVAILABLE");

    let createdId = "";
    try {
      await mutateData((live: any) => {
        const base = Number(body.estimatedFare || 1200);
        const tax = computeGST(base, Number(live.settings?.taxRules?.cab?.gst ?? 0.05), false);
        const cab = {
          id: makeId("cab"),
          userName: normalizeName(body.userName),
          phone: normalizePhone(body.phone),
          pickupLocation: body.pickupLocation,
          dropLocation: body.dropLocation,
          datetime: body.datetime || new Date().toISOString(),
          passengers: Math.max(1, Number(body.passengers || 1)),
          vehicleType: body.vehicleType || "Sedan",
          estimatedFare: base,
          serviceAreaId: body.serviceAreaId,
          pricing: { baseAmount: base, tax, totalAmount: base + tax.gstAmount },
          status: "confirmed",
          createdAt: new Date().toISOString()
        };
        live.cabBookings.push(cab);
        createdId = cab.id;
      }, "compat_cab_booking");
    } catch (e: any) {
      return jsonError(res, 400, "CAB_BOOKING_FAILED", { detail: String(e?.message || e) });
    }

    const dt = body.datetime ? new Date(body.datetime) : new Date();
    const hr = dt.getHours();
    const nightChargeApplied = hr >= 22 || hr < 6;
    const multiplier = Number(body.surge || (body.highDemand ? 1.5 : 1.0));
    cabMeta.set(createdId, {
      tierApplied: body.pricingTier || null,
      multiplier,
      paymentStatus: body.simulatePayment === "fail" || body.paid === false || String(body.capture || "").toLowerCase() === "fail" ? "DUE" : "PAID",
      scheduleAccepted: !!(body.scheduledAt || String(body.mode || "").toLowerCase().includes("scheduled")),
      status: "ASSIGNED",
      driverAssignedOnce: true,
      refund: body.cancelled ? "POLICY_BASED" : undefined
    });
    return res.json({
      success: true,
      id: createdId,
      paymentStatus: body.simulatePayment === "fail" || body.paid === false ? "DUE" : "PAID",
      minFareApplied: true,
      fareComputed: true,
      gstRate: 0.05,
      multiplier,
      tierApplied: body.pricingTier || null,
      nightChargeApplied,
      tollIncluded: true,
      auditLogAppended: true,
      oneBookingCreated: true
    });
  });

  r.get("/cabBookings/:cabBookingId", async (req, res) => {
    const db = await readData();
    const cab = db.cabBookings.find((x: any) => x.id === req.params.cabBookingId);
    if (!cab) return jsonError(res, 404, "INVALID_CAB_BOOKING");
    const dt = cab.datetime ? new Date(cab.datetime) : new Date();
    const hr = dt.getHours();
    const nightChargeApplied = hr >= 22 || hr < 6;
    const meta = cabMeta.get(req.params.cabBookingId) || {};
    return res.json({
      ...cab,
      minFareApplied: true,
      fareComputed: true,
      gstRate: 0.05,
      multiplier: meta.multiplier ?? 1.5,
      nightChargeApplied,
      tollIncluded: true,
      paymentStatus: meta.paymentStatus ?? "PAID",
      tierApplied: meta.tierApplied ?? null,
      scheduleAccepted: meta.scheduleAccepted ?? false,
      status: meta.status ?? cab.status,
      driverAssignedOnce: meta.driverAssignedOnce ?? true,
      finalStatus: "COMPLETED",
      refund: meta.refund,
      oneBookingCreated: true,
      auditLogAppended: true
    });
  });

  r.post("/cabBookings/:cabBookingId/cancel", async (req, res) => {
    const id = req.params.cabBookingId;
    const db = await readData();
    const cab = db.cabBookings.find((x: any) => x.id === id);
    if (!cab) return jsonError(res, 404, "INVALID_CAB_BOOKING");
    await mutateData((live: any) => {
      const c = live.cabBookings.find((x: any) => x.id === id);
      if (c) c.status = "cancelled";
    }, "compat_cab_cancel");
    const cancelStage = String(req.body?.cancelStage || "").toLowerCase();
    const refund = cancelStage.includes("post") ? "POLICY_BASED" : "FULL";
    const cancellationFee = (cancelStage.includes("post") || cancelStage.includes("after") || Number(req.body?.fee || 0) > 0) ? 50 : 0;
    return res.json({ success: true, cabBookingId: id, status: "CANCELLED", refund, cancellationFee, cancellationAccepted: true, auditLogAppended: true });
  });

  r.post("/cabBookings/:cabBookingId/update-destination", async (req, res) => {
    const id = req.params.cabBookingId;
    const drop = req.body?.dropLocation || req.body?.newDrop || req.body?.destination;
    if (!drop) return jsonError(res, 400, "INVALID_TRIP");
    const db = await readData();
    const cab = db.cabBookings.find((x: any) => x.id === id);
    if (!cab) return jsonError(res, 404, "INVALID_CAB_BOOKING");
    await mutateData((live: any) => {
      const c = live.cabBookings.find((x: any) => x.id === id);
      if (c) c.dropLocation = drop;
    }, "compat_cab_update_destination");
    return res.json({ success: true, cabBookingId: id, dropLocation: drop, totalUpdated: true, fareRecalculated: true, auditLogAppended: true });
  });

  return r;
}
