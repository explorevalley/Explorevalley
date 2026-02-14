import { Router } from "express";
import { z } from "zod";
import { readData } from "../services/jsondb";
import { getAuthClaims, requireAuth } from "../middleware/auth";

const RequestSchema = z.object({
  bookings: z.array(z.string()).default([]),
  cabBookings: z.array(z.string()).default([]),
  foodOrders: z.array(z.string()).default([])
});

function sameText(a: any, b: any) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function ownsRecord(rec: any, claims: any) {
  let checked = false;
  if (claims?.email && rec?.email) {
    checked = true;
    if (sameText(rec.email, claims.email)) return true;
  }
  if (claims?.phone && rec?.phone) {
    checked = true;
    if (sameText(rec.phone, claims.phone)) return true;
  }
  if (claims?.name && rec?.userName) {
    checked = true;
    if (sameText(rec.userName, claims.name)) return true;
  }
  return !checked;
}

export function ordersRouter() {
  const r = Router();
  r.use(requireAuth);

  r.post("/status", async (req, res) => {
    const parsed = RequestSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

    const claims = getAuthClaims(req);
    const db = await readData();

    const bookingSet = new Set(parsed.data.bookings);
    const cabSet = new Set(parsed.data.cabBookings);
    const foodSet = new Set(parsed.data.foodOrders);

    const bookings = db.bookings
      .filter((x: any) => bookingSet.has(String(x.id)))
      .filter((x: any) => ownsRecord(x, claims))
      .map((x: any) => ({ id: x.id, type: "booking", status: x.status, at: x.bookingDate || null }));

    const cabBookings = db.cabBookings
      .filter((x: any) => cabSet.has(String(x.id)))
      .filter((x: any) => ownsRecord(x, claims))
      .map((x: any) => ({ id: x.id, type: "cab", status: x.status, at: x.createdAt || null }));

    const foodOrders = db.foodOrders
      .filter((x: any) => foodSet.has(String(x.id)))
      .filter((x: any) => ownsRecord(x, claims))
      .map((x: any) => ({ id: x.id, type: "food", status: x.status, at: x.orderTime || null }));

    return res.json({ ok: true, orders: [...bookings, ...cabBookings, ...foodOrders] });
  });

  return r;
}
