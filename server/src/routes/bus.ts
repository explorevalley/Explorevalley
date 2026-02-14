import { Router } from "express";
import { makeId } from "@explorevalley/shared";
import { mutateData, readData } from "../services/jsondb";
import { getAuthClaims, requireAuth } from "../middleware/auth";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function same(a: any, b: any) {
  return safeText(a).toLowerCase() === safeText(b).toLowerCase();
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

export function busRouter() {
  const r = Router();

  r.get("/search", async (req, res) => {
    const from = safeText(req.query.from || req.query.fromCity);
    const to = safeText(req.query.to || req.query.toCity);
    const journeyDate = safeText(req.query.journeyDate || req.query.date);
    const passengers = Math.max(1, Number(req.query.passengers || 1));

    if (!from || !to || !journeyDate) return res.status(400).json({ error: "FROM_TO_DATE_REQUIRED" });
    if (same(from, to)) return res.status(400).json({ error: "INVALID_ROUTE" });

    const db = await readData();
    const routes = (db as any).busRoutes || [];
    const matches = routes
      .filter((x: any) => x?.active !== false)
      .filter((x: any) => same(x?.fromCity, from) && same(x?.toCity, to))
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
          heroImage: x.heroImage || ""
        };
      })
      .sort((a: any, b: any) => Number(a.fare || 0) - Number(b.fare || 0));

    return res.json({ success: true, count: matches.length, routes: matches });
  });

  r.get("/:routeId/seats", async (req, res) => {
    const routeId = safeText(req.params.routeId);
    const journeyDate = safeText(req.query.journeyDate || req.query.date);
    if (!routeId || !journeyDate) return res.status(400).json({ error: "ROUTE_DATE_REQUIRED" });

    const db = await readData();
    const route = ((db as any).busRoutes || []).find((x: any) => safeText(x?.id) === routeId);
    if (!route) return res.status(404).json({ error: "ROUTE_NOT_FOUND" });

    const totalSeats = Math.max(1, Number(route.totalSeats || 20));
    const seatLayout = Array.isArray(route.seatLayout) && route.seatLayout.length
      ? route.seatLayout
      : defaultSeatLayout(totalSeats);
    const bookedSeats = Array.isArray(route?.seatsBookedByDate?.[journeyDate]) ? route.seatsBookedByDate[journeyDate] : [];

    return res.json({
      success: true,
      routeId,
      journeyDate,
      fare: Number(route.fare || 0),
      totalSeats,
      bookedSeats,
      seatLayout
    });
  });

  r.post("/book", requireAuth, async (req, res) => {
    const routeId = safeText(req.body?.routeId);
    const journeyDate = safeText(req.body?.journeyDate);
    const seats = Array.isArray(req.body?.seats) ? req.body.seats.map((x: any) => safeText(x)).filter(Boolean) : [];
    const userName = safeText(req.body?.userName);
    const phone = safeText(req.body?.phone);

    if (!routeId || !journeyDate || !userName || !phone || !seats.length) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    const claims = getAuthClaims(req);
    if (claims?.phone && String(claims.phone) !== phone) return res.status(403).json({ error: "AUTH_IDENTITY_MISMATCH" });

    let createdId = "";
    try {
      await mutateData((db: any) => {
        if (!Array.isArray(db.busRoutes)) db.busRoutes = [];
        if (!Array.isArray(db.busBookings)) db.busBookings = [];

        const route = db.busRoutes.find((x: any) => safeText(x?.id) === routeId);
        if (!route) throw new Error("ROUTE_NOT_FOUND");
        const totalSeats = Math.max(1, Number(route.totalSeats || 20));
        const seatLayout = Array.isArray(route.seatLayout) && route.seatLayout.length
          ? route.seatLayout
          : defaultSeatLayout(totalSeats);
        const validSeats = new Set(seatLayout.map((x: any) => safeText(x?.code)));
        const invalidSeat = seats.find((s: string) => !validSeats.has(s));
        if (invalidSeat) throw new Error("INVALID_SEAT_SELECTION");

        if (!route.seatsBookedByDate || typeof route.seatsBookedByDate !== "object") route.seatsBookedByDate = {};
        const booked = Array.isArray(route.seatsBookedByDate[journeyDate]) ? route.seatsBookedByDate[journeyDate] : [];
        const overlap = seats.find((s: string) => booked.includes(s));
        if (overlap) throw new Error("SEAT_ALREADY_BOOKED");

        route.seatsBookedByDate[journeyDate] = [...booked, ...seats];
        const farePerSeat = Number(route.fare || 0);
        const totalFare = Math.round(farePerSeat * seats.length * 100) / 100;
        const now = new Date().toISOString();
        const booking = {
          id: makeId("bus"),
          routeId,
          userName,
          phone,
          fromCity: String(route.fromCity || ""),
          toCity: String(route.toCity || ""),
          travelDate: journeyDate,
          seats,
          farePerSeat,
          totalFare,
          status: "pending",
          createdAt: now
        };
        db.busBookings.push(booking);
        db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_BUS_BOOKING", entity: "bus", entityId: booking.id });
        createdId = booking.id;
      }, "bus_booking");
    } catch (err: any) {
      return res.status(400).json({ error: "BUS_BOOKING_FAILED", message: String(err?.message || err) });
    }

    return res.json({ success: true, id: createdId });
  });

  return r;
}

