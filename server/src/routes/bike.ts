import { Router } from "express";
import { makeId } from "@explorevalley/shared";
import { mutateData, readData } from "../services/jsondb";
import { getAuthClaims, requireAuth } from "../middleware/auth";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function supabaseUrl() {
  return String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}

function supabaseServiceRoleKey() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
}

function supabaseHeaders() {
  const key = supabaseServiceRoleKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}

function normalizePricingHour(pricing: any, rates: any) {
  const candidates = [
    pricing?.perHour,
    pricing?.hourly,
    pricing?.hour,
    pricing?.per_hour,
    rates?.perHour,
    rates?.hourly,
    rates?.hour,
    rates?.per_hour
  ];
  const hit = candidates.find((x) => x !== undefined && x !== null && String(x).trim() !== "");
  return Number(hit || 0);
}

function normalizePricingDay(pricing: any, rates: any) {
  const candidates = [
    pricing?.perDay,
    pricing?.daily,
    pricing?.day,
    pricing?.per_day,
    rates?.perDay,
    rates?.daily,
    rates?.day,
    rates?.per_day
  ];
  const hit = candidates.find((x) => x !== undefined && x !== null && String(x).trim() !== "");
  return Number(hit || 0);
}

function normalizeAvailableQty(rates: any, vendor: any, available: any) {
  const candidates = [
    rates?.availableQty,
    rates?.available_qty,
    rates?.qty,
    rates?.stock,
    vendor?.availableQty,
    vendor?.available_qty,
    vendor?.qty,
    vendor?.stock
  ];
  const hit = candidates.find((x) => Number.isFinite(Number(x)));
  if (hit !== undefined) return Math.max(0, Number(hit));
  return available === false ? 0 : 1;
}

function mapRentalVehicle(row: any) {
  const rates = row?.availability_rates && typeof row.availability_rates === "object" ? row.availability_rates : {};
  const vendor = row?.vendor_details && typeof row.vendor_details === "object" ? row.vendor_details : {};
  const pricing = row?.pricing && typeof row.pricing === "object" ? row.pricing : {};
  const available = row?.available !== false;

  return {
    id: safeText(row?.id),
    name: safeText(row?.name),
    location: safeText(vendor?.location || vendor?.city || vendor?.area || row?.location || "Unknown"),
    bikeType: safeText(row?.bike_model || row?.bikeType || row?.category || "Bike"),
    maxDays: Math.max(0, Number(row?.max_days || row?.maxDays || 0)),
    pricePerHour: Math.max(0, normalizePricingHour(pricing, rates)),
    pricePerDay: Math.max(0, normalizePricingDay(pricing, rates)),
    availableQty: normalizeAvailableQty(rates, vendor, available),
    securityDeposit: Math.max(0, Number(pricing?.securityDeposit || pricing?.security_deposit || vendor?.securityDeposit || vendor?.security_deposit || 0)),
    helmetIncluded: vendor?.helmetIncluded !== false && vendor?.helmet_included !== false,
    vendorMobile: safeText(vendor?.phone || vendor?.mobile || vendor?.vendorMobile || ""),
    image: safeText(vendor?.image || vendor?.heroImage || vendor?.photo || ""),
    active: available,
    createdAt: safeText(row?.created_at || row?.createdAt || new Date().toISOString()),
    updatedAt: safeText(row?.updated_at || row?.updatedAt || new Date().toISOString()),
    availabilityRates: rates,
    _source: "ev_rental_vehicles"
  };
}

async function fetchRentalVehiclesFromSupabase() {
  if (!supabaseUrl() || !supabaseServiceRoleKey()) return [] as any[];
  const url = `${supabaseUrl()}/rest/v1/ev_rental_vehicles?select=*&order=updated_at.desc.nullslast`;
  const r = await fetch(url, { headers: supabaseHeaders() });
  if (!r.ok) {
    const msg = await r.text();
    throw new Error(msg || "RENTAL_VEHICLES_FETCH_FAILED");
  }
  const rows = (await r.json()) as any[];
  return (Array.isArray(rows) ? rows : [])
    .filter((x: any) => safeText(x?.category).toLowerCase() === "bike" && x?.available !== false)
    .map(mapRentalVehicle)
    .filter((x: any) => !!x.id);
}

export function bikeRouter() {
  const r = Router();

  r.get("/", async (_req, res) => {
    try {
      const fromSupabase = await fetchRentalVehiclesFromSupabase();
      if (fromSupabase.length > 0) return res.json(fromSupabase);
    } catch {
      // fallback below
    }

    const db = await readData();
    const rows = Array.isArray((db as any).bikeRentals) ? (db as any).bikeRentals : [];
    const active = rows.filter((x: any) => x && x.active !== false);
    return res.json(active);
  });

  r.post("/book", requireAuth, async (req, res) => {
    const bikeRentalId = safeText(req.body?.bikeRentalId);
    const userName = safeText(req.body?.userName);
    const phone = safeText(req.body?.phone);
    const startDateTime = safeText(req.body?.startDateTime);
    const days = Math.max(1, Number(req.body?.days || (Number(req.body?.hours || 24) / 24) || 1));
    const hours = days * 24;
    const qty = Math.max(1, Number(req.body?.qty || 1));

    if (!bikeRentalId || !userName || !phone || !startDateTime) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    const claims = getAuthClaims(req);
    if (claims?.phone && String(claims.phone) !== phone) return res.status(403).json({ error: "AUTH_IDENTITY_MISMATCH" });

    // Prefer Supabase source-of-truth table when configured.
    try {
      const rentals = await fetchRentalVehiclesFromSupabase();
      const bike = rentals.find((x: any) => safeText(x?.id) === bikeRentalId);
      if (bike) {
        const availableQty = Math.max(0, Number(bike.availableQty || 0));
        if (availableQty < qty) throw new Error("INSUFFICIENT_BIKE_STOCK");
        const maxDays = Math.max(0, Number((bike as any).maxDays || 0));
        if (maxDays > 0 && days > maxDays) throw new Error("MAX_DAYS_EXCEEDED");

        const perDay = Number(bike.pricePerDay || 0);
        const computedFare = Math.round((days * perDay * qty) * 100) / 100;

        const now = new Date().toISOString();
        const booking = {
          id: makeId("bike"),
          bike_rental_id: bikeRentalId,
          user_name: userName,
          phone,
          start_datetime: startDateTime,
          days,
          hours,
          qty,
          total_fare: computedFare,
          status: "pending",
          created_at: now
        };

        // Best effort booking write (if table exists).
        const bookingUrl = `${supabaseUrl()}/rest/v1/ev_bike_bookings`;
        const bookingRes = await fetch(bookingUrl, {
          method: "POST",
          headers: {
            ...supabaseHeaders(),
            Prefer: "return=minimal"
          },
          body: JSON.stringify([booking])
        });
        if (!bookingRes.ok) {
          const txt = await bookingRes.text();
          if (!txt.includes("does not exist") && !txt.includes("PGRST205")) {
            throw new Error(txt || "BIKE_BOOKING_FAILED");
          }
        }

        // Reduce available qty in ev_rental_vehicles.availability_rates.
        const nextRates = {
          ...((bike as any).availabilityRates || {}),
          available_qty: Math.max(0, availableQty - qty)
        };
        const updateUrl = `${supabaseUrl()}/rest/v1/ev_rental_vehicles?id=eq.${encodeURIComponent(bikeRentalId)}`;
        const updateRes = await fetch(updateUrl, {
          method: "PATCH",
          headers: {
            ...supabaseHeaders(),
            Prefer: "return=minimal"
          },
          body: JSON.stringify({ availability_rates: nextRates, updated_at: now })
        });
        if (!updateRes.ok) {
          const txt = await updateRes.text();
          throw new Error(txt || "RENTAL_STOCK_UPDATE_FAILED");
        }

        return res.json({ success: true, id: booking.id });
      }
    } catch (err: any) {
      if (String(err?.message || err).includes("INSUFFICIENT_BIKE_STOCK")) {
        return res.status(400).json({ error: "BIKE_BOOKING_FAILED", message: "INSUFFICIENT_BIKE_STOCK" });
      }
      // fallback below
    }

    let createdId = "";
    try {
      await mutateData((db: any) => {
        if (!Array.isArray(db.bikeRentals)) db.bikeRentals = [];
        if (!Array.isArray(db.bikeBookings)) db.bikeBookings = [];
        if (!Array.isArray(db.auditLog)) db.auditLog = [];

        const bike = db.bikeRentals.find((x: any) => safeText(x?.id) === bikeRentalId && x?.active !== false);
        if (!bike) throw new Error("BIKE_NOT_FOUND");

        const availableQty = Math.max(0, Number(bike.availableQty || 0));
        if (availableQty < qty) throw new Error("INSUFFICIENT_BIKE_STOCK");
        const maxDays = Math.max(0, Number(bike.maxDays || 0));
        if (maxDays > 0 && days > maxDays) throw new Error("MAX_DAYS_EXCEEDED");

        const perDay = Number(bike.pricePerDay || 0);
        const computedFare = Math.round((days * perDay * qty) * 100) / 100;

        bike.availableQty = Math.max(0, availableQty - qty);

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
          totalFare: computedFare,
          status: "pending",
          createdAt: now
        };
        db.bikeBookings.unshift(booking);
        db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_BIKE_BOOKING", entity: "bike", entityId: booking.id });
        createdId = booking.id;
      }, "bike_booking");
    } catch (err: any) {
      return res.status(400).json({ error: "BIKE_BOOKING_FAILED", message: String(err?.message || err) });
    }

    return res.json({ success: true, id: createdId });
  });

  return r;
}
