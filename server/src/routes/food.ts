import { Router } from "express";
import { mutateData } from "../services/jsondb";
import { makeId, FoodOrderSchema } from "@explorevalley/shared";
import { computeGST } from "../services/pricing";
import { z } from "zod";
import type TelegramBot from "node-telegram-bot-api";
import { formatMoney } from "../services/notify";

export function foodRouter(bot: TelegramBot, adminChatIds: number[]) {
  const r = Router();

  const CreateFood = z.object({
    userName: z.string(),
    phone: z.string(),
    items: z.array(z.object({ name: z.string(), quantity: z.number().int().positive() })).min(1),
    deliveryAddress: z.string(),
    specialInstructions: z.string().optional()
  });

  r.post("/", async (req, res) => {
    const body = CreateFood.parse(req.body);
    let createdId = "";
    let notifyMsg = "";

    await mutateData((db) => {
      const now = new Date().toISOString();

      const items = body.items.map(i => {
        const menu = db.menuItems.find(m => m.available && m.name.toLowerCase() === i.name.toLowerCase());
        if (!menu) throw new Error(`Menu item not found: ${i.name}`);
        return { name: menu.name, quantity: i.quantity, price: menu.price };
      });

      const base = items.reduce((s, x) => s + x.price * x.quantity, 0);
      const gstRate = db.settings.taxRules.food.gst;
      const tax = computeGST(base, gstRate, false);
      const total = base + tax.gstAmount;

      const order = FoodOrderSchema.parse({
        id: makeId("food"),
        userName: body.userName,
        phone: body.phone,
        items,
        deliveryAddress: body.deliveryAddress,
        specialInstructions: body.specialInstructions ?? "",
        pricing: { baseAmount: base, tax, totalAmount: total },
        status: "pending",
        orderTime: now
      });

      db.foodOrders.push(order);
      db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_FOOD", entity: "food", entityId: order.id });

      createdId = order.id;

      const lines = items.map(x => `- ${x.name} x${x.quantity} (${formatMoney(x.price)})`).join("\n");
      notifyMsg =
        `🍽️ NEW FOOD ORDER\n\nGuest: ${order.userName}\nPhone: ${order.phone}\nAddress: ${order.deliveryAddress}\n\nItems:\n${lines}\n\n` +
        `Base: ${formatMoney(base)}\nGST @ ${(tax.gstRate * 100).toFixed(0)}%: ${formatMoney(tax.gstAmount)}\nTotal: ${formatMoney(total)}\n\nID: ${order.id}`;
    }, "food");

    for (const adminId of adminChatIds) bot.sendMessage(adminId, notifyMsg);
    res.json({ success: true, id: createdId });
  });

  return r;
}
