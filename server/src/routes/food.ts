import { Router } from "express";
import { mutateData } from "../services/jsondb";
import { makeId, FoodOrderSchema } from "@explorevalley/shared";
import { computeGST } from "../services/pricing";
import { z } from "zod";
type BotLike = any;
import { formatMoney } from "../services/notify";
import { getAuthClaims, requireAuth } from "../middleware/auth";
import { applyAnalyticsEvent, requestBrowser, requestIp, upsertUserFromSubmission, userIdFromPhone } from "../services/userProfiles";
import { sendOrderConfirmationEmail } from "../services/email";
import { notifyVendorNewOrder } from "../services/vendorMessaging";

export function foodRouter(bot: BotLike, adminChatIds: number[]) {
  const r = Router();

  const safeText = (value: any) => value === undefined || value === null ? "" : String(value).trim();

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

  const CreateFood = z.object({
    userName: z.string(),
    phone: z.string(),
    items: z.array(z.object({ name: z.string(), quantity: z.number().int().positive() })).min(1),
    deliveryAddress: z.string(),
    specialInstructions: z.string().optional()
  });

  r.post("/", requireAuth, async (req, res) => {
    const parsed = CreateFood.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const body = parsed.data;

    const claims = getAuthClaims(req);
    const ipAddress = requestIp(req);
    const browser = requestBrowser(req);
    if (claims?.phone && String(claims.phone) !== String(body.phone)) {
      await mutateData((db) => {
        const now = new Date().toISOString();
        appendAnalyticsEvent(db, {
          type: "auth_identity_mismatch",
          category: "trust",
          phone: safeText(body?.phone || claims?.phone || ""),
          name: safeText(body?.userName || claims?.name || ""),
          email: safeText(claims?.email || ""),
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
        const MAX_ITEMS = 50;
        if (body.items.length > MAX_ITEMS) throw new Error("MAX_ITEMS_EXCEEDED");

        const items = body.items.map((i) => {
          const q = Number(i.quantity);
          if (!Number.isSafeInteger(q) || q <= 0 || q > 1000) throw new Error("INVALID_QUANTITY");

          const menu = db.menuItems.find((m) => m.available && String(m.name || "").toLowerCase() === String(i.name || "").toLowerCase());
          if (!menu) throw new Error(`Menu item not found: ${i.name}`);
          if (Number(menu.stock || 0) <= 0) throw new Error("OUT_OF_STOCK");
          if (q > Number(menu.maxPerOrder || 10)) throw new Error("MAX_PER_ORDER_EXCEEDED");
          if (q > Number(menu.stock || 0)) throw new Error("OUT_OF_STOCK");

          return {
            menuItemId: menu.id,
            restaurantId: menu.restaurantId,
            name: menu.name,
            quantity: q,
            price: menu.price
          };
        });

        const restaurantId = String(items[0]?.restaurantId || "");
        if (!restaurantId) throw new Error("RESTAURANT_REQUIRED");
        if (items.some((x) => String(x.restaurantId || "") !== restaurantId)) throw new Error("MIXED_RESTAURANTS_NOT_ALLOWED");

        const restaurant = db.restaurants.find((x) => x.available && String(x.id) === restaurantId);
        if (!restaurant) throw new Error("RESTAURANT_NOT_AVAILABLE");

        const toMins = (s: string) => {
          const parts = String(s || "").split(":");
          const h = Number(parts[0] || 0);
          const m = Number(parts[1] || 0);
          if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
          if (h < 0 || h > 23 || m < 0 || m > 59) return null;
          return h * 60 + m;
        };
        const openM = toMins((restaurant as any).openHours || "09:00");
        const closeM = toMins((restaurant as any).closingHours || "22:00");
        if (openM === null || closeM === null) throw new Error("INVALID_OPEN_HOURS");
        const nowM = new Date().getHours() * 60 + new Date().getMinutes();
        const isOpen = openM <= closeM ? (nowM >= openM && nowM <= closeM) : (nowM >= openM || nowM <= closeM);
        if (!isOpen) throw new Error("RESTAURANT_CLOSED");

        const base = items.reduce((s, x) => s + x.price * x.quantity, 0);
        const minOrder = Number((restaurant as any).minimumOrder || 0);
        if (base < minOrder) throw new Error("MINIMUM_ORDER_NOT_MET");
        const gstRate = db.settings.taxRules.food.gst;
        const tax = computeGST(base, gstRate, false);
        const total = base + tax.gstAmount;

        // Decrement stock atomically within this single mutateData transaction.
        for (const it of items) {
          const idx = db.menuItems.findIndex((m) => String(m.id) === String(it.menuItemId));
          if (idx >= 0) {
            const current = Number(db.menuItems[idx].stock || 0);
            const next = current - Number(it.quantity || 0);
            if (next < 0) throw new Error("OUT_OF_STOCK");
            db.menuItems[idx].stock = next;
          }
        }

        const userId = String((claims as any)?.sub || userIdFromPhone(body.phone) || "");
        const order = FoodOrderSchema.parse({
          id: makeId("food"),
          userId,
          restaurantId,
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
        upsertUserFromSubmission(db, {
          phone: order.phone,
          name: order.userName,
          email: claims?.email || undefined,
          ipAddress,
          browser,
          orderType: "food",
          orderId: order.id,
          orderStatus: order.status,
          orderAt: order.orderTime,
          orderAmount: Number(order?.pricing?.totalAmount || 0)
        }, now);

        appendAnalyticsEvent(db, {
          type: "food_order_created",
          category: "transaction",
          phone: order.phone,
          name: order.userName,
          email: claims?.email || "",
          at: now,
          meta: {
            orderId: order.id,
            orderType: "food",
            totalAmount: order.pricing?.totalAmount || 0,
            itemCount: items.reduce((sum, x) => sum + Number(x.quantity || 0), 0),
            paymentMethod: "pending",
            ipAddress,
            browser
          }
        });

        appendAnalyticsEvent(db, {
          type: "delivery_address",
          category: "location",
          phone: order.phone,
          name: order.userName,
          email: claims?.email || "",
          at: now,
          meta: {
            savedAddresses: [order.deliveryAddress].filter(Boolean),
            ipAddress,
            browser
          }
        });

        createdId = order.id;

        const lines = items.map(x => `- ${x.name} x${x.quantity} (${formatMoney(x.price)})`).join("\n");
        notifyMsg =
          `NEW FOOD ORDER\n\nGuest: ${order.userName}\nPhone: ${order.phone}\nAddress: ${order.deliveryAddress}\n\nItems:\n${lines}\n\n` +
          `Base: ${formatMoney(base)}\nGST @ ${(tax.gstRate * 100).toFixed(0)}%: ${formatMoney(tax.gstAmount)}\nTotal: ${formatMoney(total)}\n\nID: ${order.id}`;
      }, "food");
    } catch (err: any) {
      const message = String(err?.message || err || "");
      if (message.toLowerCase().includes("menu item not found")) {
        return res.status(400).json({ error: "INVALID_MENU_ITEM", message });
      }
      if (message === "MIXED_RESTAURANTS_NOT_ALLOWED") return res.status(400).json({ error: "MIXED_RESTAURANTS_NOT_ALLOWED" });
      if (message === "OUT_OF_STOCK") return res.status(409).json({ error: "OUT_OF_STOCK" });
      if (message === "MINIMUM_ORDER_NOT_MET") return res.status(400).json({ error: "MINIMUM_ORDER_NOT_MET" });
      if (message === "RESTAURANT_CLOSED") return res.status(400).json({ error: "RESTAURANT_CLOSED" });
      return res.status(400).json({ error: "FOOD_ORDER_CREATE_FAILED", message });
    }

    for (const adminId of adminChatIds) bot.sendMessage(adminId, notifyMsg);

    // Send confirmation email + vendor WhatsApp (fire-and-forget)
    try {
      const data = await (await import("../services/jsondb")).readData();
      const order = data.foodOrders?.find((o: any) => o.id === createdId) || {} as any;
      const email = order.email || order.userEmail;
      if (email) {
        sendOrderConfirmationEmail({
          email,
          name: order.userName || order.user_name || "Guest",
          orderId: createdId,
          orderType: "food",
          items: (order.items || []).map((it: any) => `${it.name} x${it.quantity}`).join(", ") || "Food Order",
          total: String(order.pricing?.totalAmount || order.pricing?.total_amount || ""),
        }).catch(() => {});
      }
      // Notify vendor via WhatsApp
      const vendorId = order.restaurant_id || order.restaurantId;
      if (vendorId) {
        notifyVendorNewOrder({
          vendorMobile: "",
          vendorName: vendorId,
          orderId: createdId,
          customerName: order.userName || order.user_name || "Guest",
          items: (order.items || []).map((it: any) => `${it.name} x${it.quantity}`).join(", "),
          total: String(order.pricing?.totalAmount || order.pricing?.total_amount || ""),
          deliveryAddress: order.deliveryAddress || order.delivery_address || "",
        }).catch(() => {});
      }
    } catch {}

    res.json({ success: true, id: createdId });
  });

  return r;
}
