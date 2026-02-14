import { Router } from "express";
import multer from "multer";
import { mutateData } from "../services/jsondb";
import { makeId, BookingSchema } from "@explorevalley/shared";
import { computeGST, hotelGstRate } from "../services/pricing";
type BotLike = any;
import { formatMoney } from "../services/notify";
import { z } from "zod";
import { getAuthClaims, requireAuth } from "../middleware/auth";
import { applyAnalyticsEvent, requestBrowser, requestIp, upsertUserFromSubmission, userIdFromPhone } from "../services/userProfiles";
import { sendOrderConfirmationEmail } from "../services/email";

export function bookingRouter(bot: BotLike, adminChatIds: number[]) {
  const r = Router();

  const safeText = (value: any) => value === undefined || value === null ? "" : String(value).trim();
  const nightsBetweenStrict = (checkIn: string, checkOut: string) => {
    const a = new Date(checkIn + "T00:00:00Z").getTime();
    const b = new Date(checkOut + "T00:00:00Z").getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("INVALID_STAY_RANGE");
    const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
    if (diff <= 0) throw new Error("INVALID_STAY_RANGE");
    return diff;
  };

  const appendAnalyticsEvent = (db: any, input: {
    type: string;
    category: string;
    phone?: string;
    name?: string;
    email?: string;
    at: string;
    meta?: Record<string, any>;
  }) => {
    if (!Array.isArray(db.analyticsEvents)) db.analyticsEvents = [];
    const phone = safeText(input.phone || "");
    const userId = phone ? userIdFromPhone(phone) : "";
    const event = {
      id: makeId("evt"),
      type: safeText(input.type),
      category: safeText(input.category),
      userId,
      phone,
      email: safeText(input.email || ""),
      at: safeText(input.at),
      meta: input.meta || {}
    };
    db.analyticsEvents.push(event);
    if (db.analyticsEvents.length > 5000) db.analyticsEvents.splice(0, db.analyticsEvents.length - 5000);
    applyAnalyticsEvent(db, {
      id: event.id,
      type: event.type,
      category: event.category,
      userId: event.userId,
      phone: event.phone,
      name: safeText(input.name || ""),
      email: event.email,
      at: event.at,
      meta: event.meta
    });
  };

  const CreateHotelBooking = z.object({
    type: z.literal("hotel"),
    itemId: z.string(),
    userName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    checkIn: z.string(),
    checkOut: z.string(),
    guests: z.number().int().positive(),
    roomType: z.string(),
    numRooms: z.number().int().positive().default(1),
    specialRequests: z.string().optional(),
    aadhaarUrl: z.string().min(1)
  });

  const CreateTourBooking = z.object({
    type: z.literal("tour"),
    itemId: z.string(),
    userName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    tourDate: z.string(),
    guests: z.number().int().positive(),
    specialRequests: z.string().optional(),
    aadhaarUrl: z.string().min(1)
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
  });

  const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  const SUPABASE_BUCKET = process.env.SUPABASE_AADHAAR_BUCKET || "aadhaar-docs";

  const assertSupabaseStorageConfigured = () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_NOT_CONFIGURED: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }
  };

  const detectImageType = (buffer: Buffer) => {
    if (buffer.length >= 8) {
      const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      if (pngSig.every((b, i) => buffer[i] === b)) return { ext: "png", contentType: "image/png" };
    }
    if (buffer.length >= 3) {
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
    }
    return null;
  };

  const encodePath = (value: string) => value.split("/").map(encodeURIComponent).join("/");

  const uploadAadhaarToSupabase = async (buffer: Buffer, contentType: string) => {
    assertSupabaseStorageConfigured();
    const objectPath = `aadhaar/${Date.now()}_${makeId("aadhaar")}.${contentType === "image/png" ? "png" : "jpg"}`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${encodePath(SUPABASE_BUCKET)}/${encodePath(objectPath)}`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": contentType
      },
      body: buffer as any
    });
    if (!response.ok) throw new Error(`SUPABASE_UPLOAD_FAILED:${response.status}:${await response.text()}`);
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodePath(SUPABASE_BUCKET)}/${encodePath(objectPath)}`;
    return { publicUrl, objectPath };
  };

  r.post("/aadhaar", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file || !file.buffer) return res.status(400).json({ error: "FILE_REQUIRED" });
      const detected = detectImageType(file.buffer);
      if (!detected) return res.status(400).json({ error: "INVALID_FILE_TYPE" });
      const uploaded = await uploadAadhaarToSupabase(file.buffer, detected.contentType);
      return res.json({ ok: true, url: uploaded.publicUrl, path: uploaded.objectPath });
    } catch (err: any) {
      return res.status(500).json({ error: "UPLOAD_FAILED", message: String(err?.message || err) });
    }
  });

  r.post("/", requireAuth, async (req, res) => {
    const body = req.body;
    const claims = getAuthClaims(req);
    const ipAddress = requestIp(req);
    const browser = requestBrowser(req);

    if (claims?.email && body?.email && String(claims.email).toLowerCase() !== String(body.email).toLowerCase()) {
      await mutateData((db) => {
        const now = new Date().toISOString();
        appendAnalyticsEvent(db, {
          type: "auth_identity_mismatch",
          category: "trust",
          phone: safeText(body?.phone || claims?.phone || ""),
          name: safeText(body?.userName || claims?.name || ""),
          email: safeText(body?.email || claims?.email || ""),
          at: now,
          meta: {
            reason: "email_mismatch",
            providedEmail: safeText(body?.email),
            expectedEmail: safeText(claims?.email)
          }
        });
      }, "analytics_event");
      return res.status(403).json({ error: "AUTH_IDENTITY_MISMATCH" });
    }
    if (claims?.phone && body?.phone && String(claims.phone) !== String(body.phone)) {
      await mutateData((db) => {
        const now = new Date().toISOString();
        appendAnalyticsEvent(db, {
          type: "auth_identity_mismatch",
          category: "trust",
          phone: safeText(body?.phone || claims?.phone || ""),
          name: safeText(body?.userName || claims?.name || ""),
          email: safeText(body?.email || claims?.email || ""),
          at: now,
          meta: {
            reason: "phone_mismatch",
            providedPhone: safeText(body?.phone),
            expectedPhone: safeText(claims?.phone)
          }
        });
      }, "analytics_event");
      return res.status(403).json({ error: "AUTH_IDENTITY_MISMATCH" });
    }

    let createdId = "";
    let notifyMsg = "";

    try {
      await mutateData((db) => {
      const now = new Date().toISOString();

      const isDateClosed = (date: string, closedDates: string[]) => closedDates.includes(date);
      const isOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
        const a0 = new Date(aStart + "T00:00:00Z").getTime();
        const a1 = new Date(aEnd + "T00:00:00Z").getTime();
        const b0 = new Date(bStart + "T00:00:00Z").getTime();
        const b1 = new Date(bEnd + "T00:00:00Z").getTime();
        return a0 < b1 && b0 < a1;
      };
      const eachDate = (start: string, end: string) => {
        const out: string[] = [];
        const startAt = new Date(start + "T00:00:00Z");
        const endAt = new Date(end + "T00:00:00Z");
        for (let d = new Date(startAt); d < endAt; d.setUTCDate(d.getUTCDate() + 1)) {
          out.push(d.toISOString().slice(0, 10));
        }
        return out;
      };

      if (body.type === "hotel") {
        const b = CreateHotelBooking.parse(body);
        const hotel = db.hotels.find(h => h.id === b.itemId && h.available);
        if (!hotel) throw new Error("Hotel not found");

        const rt = hotel.roomTypes.find(x => x.type === b.roomType);
        if (!rt) throw new Error("Room type not found");

        const nights = nightsBetweenStrict(b.checkIn, b.checkOut);
        if (typeof (hotel as any).minNights === "number" && nights < Number((hotel as any).minNights)) {
          throw new Error("MIN_NIGHTS_NOT_MET");
        }
        if (typeof (hotel as any).maxNights === "number" && nights > Number((hotel as any).maxNights)) {
          throw new Error("MAX_NIGHTS_EXCEEDED");
        }

        const availability = hotel.availability || { closedDates: [], roomsByType: {} };
        const stayDates = eachDate(b.checkIn, b.checkOut);
        if (stayDates.some(d => isDateClosed(d, availability.closedDates || []))) {
          throw new Error("Selected dates are closed for this hotel");
        }

        const totalRooms = availability.roomsByType?.[b.roomType];
        if (typeof totalRooms === "number") {
          const bookedRooms = db.bookings
            .filter(x => x.type === "hotel" && x.itemId === b.itemId && x.roomType === b.roomType)
            .filter(x => x.status !== "cancelled")
            .filter(x => x.checkIn && x.checkOut && isOverlap(x.checkIn, x.checkOut, b.checkIn, b.checkOut))
            .reduce((sum, x) => sum + (x.numRooms || 1), 0);
          if (bookedRooms + b.numRooms > totalRooms) {
            throw new Error("Rooms not available for selected dates");
          }
        }

        if (b.guests > rt.capacity * b.numRooms) {
          throw new Error("Guests exceed room capacity");
        }

        const base = rt.price * nights * b.numRooms;

        const gstRate = hotelGstRate(rt.price, db);
        const tax = computeGST(base, gstRate, false);
        const total = base + tax.gstAmount;

        const booking = BookingSchema.parse({
          id: makeId("book"),
          type: "hotel",
          itemId: b.itemId,
          userName: b.userName,
          email: b.email,
          phone: b.phone,
          aadhaarUrl: b.aadhaarUrl,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          guests: b.guests,
          roomType: b.roomType,
          numRooms: b.numRooms,
          specialRequests: b.specialRequests ?? "",
          pricing: { baseAmount: base, tax, totalAmount: total },
          status: "pending",
          bookingDate: now
        });

        db.bookings.push(booking);
        db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_BOOKING", entity: "booking", entityId: booking.id });
        upsertUserFromSubmission(db, {
          phone: booking.phone,
          name: booking.userName,
          email: booking.email || claims?.email || undefined,
          ipAddress,
          browser,
          orderType: "booking",
          orderId: booking.id,
          orderStatus: booking.status,
          orderAt: booking.bookingDate,
          orderAmount: Number(booking?.pricing?.totalAmount || 0)
        }, now);

        appendAnalyticsEvent(db, {
          type: "booking_created",
          category: "transaction",
          phone: booking.phone,
          name: booking.userName,
          email: booking.email,
          at: now,
          meta: {
            orderId: booking.id,
            orderType: "hotel",
            itemId: booking.itemId,
            guests: booking.guests,
            roomType: booking.roomType,
            numRooms: booking.numRooms,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            totalAmount: booking.pricing?.totalAmount || 0,
            paymentMethod: "pending",
            ipAddress,
            browser
          }
        });

        const locationLabel = safeText(hotel.location || (hotel as any).city || (hotel as any).region || (hotel as any).address || "");
        if (locationLabel) {
          appendAnalyticsEvent(db, {
            type: "booking_location",
            category: "location",
            phone: booking.phone,
            name: booking.userName,
            email: booking.email,
            at: now,
            meta: {
              savedAddresses: [locationLabel],
              localityPatterns: [locationLabel],
              ipAddress,
              browser
            }
          });
        }

        createdId = booking.id;
        notifyMsg =
          `🔔 NEW HOTEL BOOKING\n\n` +
          `Guest: ${booking.userName}\nPhone: ${booking.phone}\nHotel: ${hotel.name}\n` +
          `Check-in: ${booking.checkIn}\nCheck-out: ${booking.checkOut}\nRoom: ${booking.roomType}\nGuests: ${booking.guests}\n\n` +
          `Base: ${formatMoney(base)} (${nights} night(s))\nGST @ ${(tax.gstRate * 100).toFixed(0)}%: ${formatMoney(tax.gstAmount)} (CGST ${formatMoney(tax.cgst)} + SGST ${formatMoney(tax.sgst)})\n` +
          `Total: ${formatMoney(total)}\n\nID: ${booking.id}`;
        return;
      }

      if (body.type === "tour") {
        const b = CreateTourBooking.parse(body);
        const tour = db.tours.find(t => t.id === b.itemId && t.available);
        if (!tour) throw new Error("Tour not found");

        const availability = tour.availability || { closedDates: [], capacityByDate: {} };
        if (isDateClosed(b.tourDate, availability.closedDates || [])) {
          throw new Error("Tour is closed on selected date");
        }
        const capacity = availability.capacityByDate?.[b.tourDate] ?? tour.maxGuests;
        const bookedGuests = db.bookings
          .filter(x => x.type === "tour" && x.itemId === b.itemId && x.tourDate === b.tourDate)
          .filter(x => x.status !== "cancelled")
          .reduce((sum, x) => sum + (x.guests || 0), 0);
        if (bookedGuests + b.guests > capacity) throw new Error("Guests exceed availability");

        const base = tour.price * b.guests;
        const gstRate = db.settings.taxRules.tour.gst;
        const tax = computeGST(base, gstRate, false);
        const total = base + tax.gstAmount;

        const booking = BookingSchema.parse({
          id: makeId("book"),
          type: "tour",
          itemId: b.itemId,
          userName: b.userName,
          email: b.email,
          phone: b.phone,
          aadhaarUrl: b.aadhaarUrl,
          tourDate: b.tourDate,
          guests: b.guests,
          specialRequests: b.specialRequests ?? "",
          pricing: { baseAmount: base, tax, totalAmount: total },
          status: "pending",
          bookingDate: now
        });

        db.bookings.push(booking);
        db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_BOOKING", entity: "booking", entityId: booking.id });
        upsertUserFromSubmission(db, {
          phone: booking.phone,
          name: booking.userName,
          email: booking.email || claims?.email || undefined,
          ipAddress,
          browser,
          orderType: "booking",
          orderId: booking.id,
          orderStatus: booking.status,
          orderAt: booking.bookingDate,
          orderAmount: Number(booking?.pricing?.totalAmount || 0)
        }, now);

        appendAnalyticsEvent(db, {
          type: "booking_created",
          category: "transaction",
          phone: booking.phone,
          name: booking.userName,
          email: booking.email,
          at: now,
          meta: {
            orderId: booking.id,
            orderType: "tour",
            itemId: booking.itemId,
            guests: booking.guests,
            tourDate: booking.tourDate,
            totalAmount: booking.pricing?.totalAmount || 0,
            paymentMethod: "pending",
            ipAddress,
            browser
          }
        });

        const locationLabel = safeText((tour as any).location || (tour as any).region || "");
        if (locationLabel) {
          appendAnalyticsEvent(db, {
            type: "tour_location",
            category: "location",
            phone: booking.phone,
            name: booking.userName,
            email: booking.email,
            at: now,
            meta: {
              savedAddresses: [locationLabel],
              localityPatterns: [locationLabel],
              ipAddress,
              browser
            }
          });
        }

        createdId = booking.id;
        notifyMsg =
          `🔔 NEW TOUR BOOKING\n\n` +
          `Guest: ${booking.userName}\nPhone: ${booking.phone}\nTour: ${tour.title}\nDate: ${booking.tourDate}\nGuests: ${booking.guests}\n\n` +
          `Base: ${formatMoney(base)}\nGST @ ${(tax.gstRate * 100).toFixed(0)}%: ${formatMoney(tax.gstAmount)}\nTotal: ${formatMoney(total)}\n\nID: ${booking.id}`;
        return;
      }

      throw new Error("Invalid booking type");
      }, "booking");
    } catch (err: any) {
      return res.status(400).json({ error: "BOOKING_CREATE_FAILED", message: String(err?.message || err) });
    }

    for (const adminId of adminChatIds) {
      bot.sendMessage(adminId, notifyMsg);
    }

    // Send confirmation email to customer (fire-and-forget)
    try {
      const data = await (await import("../services/jsondb")).readData();
      const booking: any = data.bookings?.find((b: any) => b.id === createdId) || {};
      const email = booking?.email || booking?.userEmail;
      if (email) {
        sendOrderConfirmationEmail({
          email,
          name: booking?.userName || booking?.user_name || "Guest",
          orderId: createdId,
          orderType: "booking",
          items: booking?.tourDate ? `Tour booking for ${booking.guests || 1} guest(s) on ${booking.tourDate}` : "Hotel/Tour Booking",
          total: String(booking?.pricing?.totalAmount || booking?.pricing?.total_amount || ""),
        }).catch(() => {});
      }
    } catch {}

    res.json({ success: true, id: createdId });
  });

  return r;
}
