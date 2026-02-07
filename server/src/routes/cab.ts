import { Router } from "express";
import { mutateData } from "../services/jsondb";
import { makeId, CabBookingSchema } from "@explorevalley/shared";
import { computeGST } from "../services/pricing";
import { z } from "zod";
import type TelegramBot from "node-telegram-bot-api";
import { formatMoney } from "../services/notify";

export function cabRouter(bot: TelegramBot, adminChatIds: number[]) {
  const r = Router();

  const CreateCab = z.object({
    userName: z.string(),
    phone: z.string(),
    pickupLocation: z.string(),
    dropLocation: z.string(),
    datetime: z.string(),
    passengers: z.number().int().positive(),
    vehicleType: z.string(),
    estimatedFare: z.number().nonnegative()
  });

  r.post("/", async (req, res) => {
    const body = CreateCab.parse(req.body);
    let createdId = "";
    let notifyMsg = "";

    const out = await mutateData((db) => {
      const now = new Date().toISOString();
      const base = body.estimatedFare;
      const gstRate = db.settings.taxRules.cab.gst;
      const tax = computeGST(base, gstRate, false);
      const total = base + tax.gstAmount;

      const cab = CabBookingSchema.parse({
        id: makeId("cab"),
        ...body,
        pricing: { baseAmount: base, tax, totalAmount: total },
        status: "pending",
        createdAt: now
      });

      db.cabBookings.push(cab);
      db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_CAB", entity: "cab", entityId: cab.id });

      createdId = cab.id;
      notifyMsg =
        `🚖 NEW CAB BOOKING\n\nPassenger: ${cab.userName}\nPhone: ${cab.phone}\n` +
        `Pickup: ${cab.pickupLocation}\nDrop: ${cab.dropLocation}\nTime: ${cab.datetime}\nPassengers: ${cab.passengers}\nVehicle: ${cab.vehicleType}\n\n` +
        `Base: ${formatMoney(base)}\nGST @ ${(tax.gstRate * 100).toFixed(0)}%: ${formatMoney(tax.gstAmount)}\nTotal: ${formatMoney(total)}\n\nID: ${cab.id}`;
    }, "cab");

    for (const adminId of adminChatIds) bot.sendMessage(adminId, notifyMsg);
    res.json({ success: true, id: createdId });
  });

  return r;
}
