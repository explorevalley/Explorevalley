/**
 * Refund Route — Customer refund request management
 * Escalates to manager Telegram channel automatically.
 */
import { Router } from "express";
import { z } from "zod";
import { readData, mutateData } from "../services/jsondb";
import { makeId } from "@explorevalley/shared";
import { sendRefundEmail } from "../services/email";
import { getAuthClaims, requireAuth } from "../middleware/auth";
import { formatMoney } from "../services/notify";

type BotLike = any;

function safeText(v: any): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

export function refundRouter(bot: BotLike, adminChatIds: number[]) {
  const r = Router();

  const RefundRequest = z.object({
    orderId: z.string().min(1),
    reason: z.string().min(1).max(1000),
  });

  // Customer requests a refund
  r.post("/request", requireAuth, async (req, res) => {
    const parsed = RefundRequest.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

    const claims = getAuthClaims(req);
    const { orderId, reason } = parsed.data;

    const db = await readData();
    const order: any = [...db.bookings, ...db.foodOrders, ...db.cabBookings]
      .find((o: any) => o.id === orderId);

    if (!order) return res.status(404).json({ error: "ORDER_NOT_FOUND" });

    // Verify ownership
    const userPhone = String(claims?.phone || "").trim();
    const userEmail = String(claims?.email || "").trim().toLowerCase();
    if (userPhone && String(order.phone || "").trim() !== userPhone) {
      if (!userEmail || String(order.email || "").trim().toLowerCase() !== userEmail) {
        return res.status(403).json({ error: "NOT_YOUR_ORDER" });
      }
    }

    const refundAmount = Number(order.pricing?.totalAmount || order.estimatedFare || 0);
    const refundId = makeId("ref");
    const now = new Date().toISOString();

    try {
      await mutateData((dbw) => {
        dbw.auditLog.push({
          id: makeId("audit"),
          at: now,
          action: "REFUND_REQUESTED",
          entity: "refund",
          entityId: refundId,
          meta: { orderId, reason, amount: refundAmount },
        } as any);
      }, "refund_request");
    } catch (err: any) {
      return res.status(500).json({ error: "REFUND_FAILED", message: String(err?.message || err) });
    }

    // Send email
    const email = order.email || safeText(claims?.email);
    const name = order.userName || safeText(claims?.name);
    if (email) {
      sendRefundEmail({
        email,
        name,
        orderId,
        amount: formatMoney(refundAmount),
        reason,
      }).catch(err => console.error("[REFUND:EMAIL]", err));
    }

    // Notify managers via Telegram
    const telegramMsg =
      `💰 REFUND REQUEST\n\n` +
      `Refund ID: ${refundId}\n` +
      `Order: ${orderId}\n` +
      `Customer: ${name}\n` +
      `Phone: ${order.phone || "N/A"}\n` +
      `Amount: ${formatMoney(refundAmount)}\n` +
      `Reason: ${reason}\n\n` +
      `Reply in admin dashboard to process.`;

    for (const chatId of adminChatIds) {
      bot.sendMessage(chatId, telegramMsg).catch(() => {});
    }

    return res.json({
      ok: true,
      refundId,
      orderId,
      amount: refundAmount,
      status: "requested",
    });
  });

  return r;
}
