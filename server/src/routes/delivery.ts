/**
 * Delivery Tracking Route — Order lifecycle management
 * Used by admin dashboard and field team to update delivery status.
 */
import { Router } from "express";
import { z } from "zod";
import { readData, mutateData } from "../services/jsondb";
import { makeId } from "@explorevalley/shared";
import { sendOrderStatusEmail } from "../services/email";
import { sendOrderConfirmationEmail } from "../services/email";
import { notifyVendorStatusUpdate } from "../services/vendorMessaging";
import { getAuthClaims, requireAuth } from "../middleware/auth";

type BotLike = any;

function safeText(v: any): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

export function deliveryRouter(bot: BotLike, adminChatIds: number[]) {
  const r = Router();

  const UpdateSchema = z.object({
    orderId: z.string().min(1),
    status: z.enum(["pending", "confirmed", "processing", "picked_up", "in_transit", "delivered", "completed", "cancelled"]),
    notes: z.string().optional(),
    assignedTo: z.string().optional(),
    assignedPhone: z.string().optional(),
  });

  // Update order status (admin/field team)
  r.post("/update-status", async (req, res) => {
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

    const { orderId, status: newStatus, notes, assignedTo, assignedPhone } = parsed.data;
    let found = false;
    let orderEmail = "";
    let orderName = "";
    let orderType = "";
    let orderPhone = "";
    let vendorMobile = "";
    let vendorName = "";

    try {
      await mutateData((db) => {
        const now = new Date().toISOString();

        // Search bookings
        for (const b of db.bookings) {
          if (b.id === orderId) {
            (b as any).status = newStatus;
            found = true;
            orderEmail = b.email || "";
            orderName = b.userName || "";
            orderType = b.type || "booking";
            orderPhone = b.phone || "";
            db.auditLog.push({
              id: makeId("audit"), at: now, action: "UPDATE_DELIVERY_STATUS",
              entity: "booking", entityId: orderId,
            } as any);
            return;
          }
        }

        // Search food orders
        for (const f of db.foodOrders) {
          if (f.id === orderId) {
            (f as any).status = newStatus;
            found = true;
            orderName = f.userName || "";
            orderType = "food";
            orderPhone = f.phone || "";
            // Find vendor info
            const restaurantId = (f as any).restaurantId;
            if (restaurantId) {
              const restaurant: any = (db.restaurants || []).find((r: any) => r.id === restaurantId);
              if (restaurant) {
                vendorMobile = restaurant.vendorMobile || "";
                vendorName = restaurant.name || "";
              }
            }
            db.auditLog.push({
              id: makeId("audit"), at: now, action: "UPDATE_DELIVERY_STATUS",
              entity: "food", entityId: orderId,
            } as any);
            return;
          }
        }

        // Search cab bookings
        for (const c of db.cabBookings) {
          if (c.id === orderId) {
            (c as any).status = newStatus;
            found = true;
            orderName = c.userName || "";
            orderType = "cab";
            orderPhone = c.phone || "";
            db.auditLog.push({
              id: makeId("audit"), at: now, action: "UPDATE_DELIVERY_STATUS",
              entity: "cab", entityId: orderId,
            } as any);
            return;
          }
        }
      }, "delivery_update");
    } catch (err: any) {
      return res.status(500).json({ error: "UPDATE_FAILED", message: String(err?.message || err) });
    }

    if (!found) return res.status(404).json({ error: "ORDER_NOT_FOUND" });

    // Send email notification
    if (orderEmail) {
      const statusMessages: Record<string, string> = {
        confirmed: "Your order has been confirmed.",
        processing: "Your order is being processed.",
        picked_up: "Your order has been picked up!",
        in_transit: "Your order is on its way!",
        delivered: "Your order has been delivered. Enjoy!",
        completed: "Your order is completed. Thank you!",
        cancelled: "Your order has been cancelled.",
      };
      sendOrderStatusEmail({
        email: orderEmail,
        name: orderName,
        orderId,
        orderType,
        status: newStatus,
        message: statusMessages[newStatus] || `Status: ${newStatus}`,
      }).catch(err => console.error("[DELIVERY:EMAIL]", err));
    }

    // Notify vendor
    if (vendorMobile) {
      notifyVendorStatusUpdate({
        vendorMobile, vendorName, orderId, status: newStatus, notes,
      }).catch(err => console.error("[DELIVERY:VENDOR]", err));
    }

    // Notify admin via Telegram
    const telegramMsg = `📋 Order ${orderId} → ${newStatus.toUpperCase().replace(/_/g, " ")}\nType: ${orderType}\nCustomer: ${orderName}${notes ? `\nNotes: ${notes}` : ""}`;
    for (const chatId of adminChatIds) {
      bot.sendMessage(chatId, telegramMsg).catch(() => {});
    }

    return res.json({ ok: true, orderId, status: newStatus });
  });

  // Get order tracking info (customer-facing)
  r.get("/track/:orderId", requireAuth, async (req, res) => {
    const orderId = safeText(req.params.orderId);
    if (!orderId) return res.status(400).json({ error: "ORDER_ID_REQUIRED" });

    const claims = getAuthClaims(req);
    const db = await readData();

    const order: any = [...db.bookings, ...db.foodOrders, ...db.cabBookings]
      .find((o: any) => o.id === orderId);

    if (!order) return res.status(404).json({ error: "ORDER_NOT_FOUND" });

    // Verify ownership
    const userPhone = String(claims?.phone || "").trim();
    const userEmail = String(claims?.email || "").trim().toLowerCase();
    const orderPhone = String(order.phone || "").trim();
    const orderEmailRaw = String(order.email || "").trim().toLowerCase();

    if (userPhone && orderPhone && userPhone !== orderPhone) {
      if (!userEmail || !orderEmailRaw || userEmail !== orderEmailRaw) {
        return res.status(403).json({ error: "NOT_YOUR_ORDER" });
      }
    }

    return res.json({
      ok: true,
      order: {
        id: order.id,
        type: order.type || "unknown",
        status: order.status,
        userName: order.userName,
        pricing: order.pricing,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        checkIn: order.checkIn,
        checkOut: order.checkOut,
        tourDate: order.tourDate,
        date: order.bookingDate || order.orderTime || order.createdAt,
      },
    });
  });

  return r;
}
