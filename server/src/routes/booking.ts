import { Router } from "express";
import { mutateData } from "../services/jsondb";
import { makeId, BookingSchema } from "@explorevalley/shared";
import { computeGST, hotelGstRate, daysBetween } from "../services/pricing";
import type TelegramBot from "node-telegram-bot-api";
import { formatMoney } from "../services/notify";
import { z } from "zod";

export function bookingRouter(bot: TelegramBot, adminChatIds: number[]) {
  const r = Router();

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
    specialRequests: z.string().optional()
  });

  const CreateTourBooking = z.object({
    type: z.literal("tour"),
    itemId: z.string(),
    userName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    tourDate: z.string(),
    guests: z.number().int().positive(),
    specialRequests: z.string().optional()
  });

  r.post("/", async (req, res) => {
    const body = req.body;

    let createdId = "";
    let notifyMsg = "";

    const db = await mutateData((db) => {
      const now = new Date().toISOString();

      if (body.type === "hotel") {
        const b = CreateHotelBooking.parse(body);
        const hotel = db.hotels.find(h => h.id === b.itemId && h.available);
        if (!hotel) throw new Error("Hotel not found");

        const rt = hotel.roomTypes.find(x => x.type === b.roomType);
        if (!rt) throw new Error("Room type not found");

        const nights = daysBetween(b.checkIn, b.checkOut);
        const base = rt.price * nights;

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
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          guests: b.guests,
          roomType: b.roomType,
          specialRequests: b.specialRequests ?? "",
          pricing: { baseAmount: base, tax, totalAmount: total },
          status: "pending",
          bookingDate: now
        });

        db.bookings.push(booking);
        db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_BOOKING", entity: "booking", entityId: booking.id });

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
        if (b.guests > tour.maxGuests) throw new Error("Guests exceed max limit");

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
          tourDate: b.tourDate,
          guests: b.guests,
          specialRequests: b.specialRequests ?? "",
          pricing: { baseAmount: base, tax, totalAmount: total },
          status: "pending",
          bookingDate: now
        });

        db.bookings.push(booking);
        db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_BOOKING", entity: "booking", entityId: booking.id });

        createdId = booking.id;
        notifyMsg =
          `🔔 NEW TOUR BOOKING\n\n` +
          `Guest: ${booking.userName}\nPhone: ${booking.phone}\nTour: ${tour.title}\nDate: ${booking.tourDate}\nGuests: ${booking.guests}\n\n` +
          `Base: ${formatMoney(base)}\nGST @ ${(tax.gstRate * 100).toFixed(0)}%: ${formatMoney(tax.gstAmount)}\nTotal: ${formatMoney(total)}\n\nID: ${booking.id}`;
        return;
      }

      throw new Error("Invalid booking type");
    }, "booking");

    for (const adminId of adminChatIds) {
      bot.sendMessage(adminId, notifyMsg);
    }

    res.json({ success: true, id: createdId });
  });

  return r;
}
