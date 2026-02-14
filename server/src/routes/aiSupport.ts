/**
 * AI Support Route — Customer-facing AI chat endpoint
 * Provides recommendations, order tracking, and escalation for refunds.
 */
import { Router } from "express";
import { z } from "zod";
import { readData, mutateData } from "../services/jsondb";
import { makeId } from "@explorevalley/shared";
import { processUserMessage, escalateToManager } from "../services/aiSupport";
import { getAuthClaims, requireAuth } from "../middleware/auth";

type BotLike = any;

export function aiSupportRouter(bot: BotLike, adminChatIds: number[]) {
  const r = Router();

  const ChatMessage = z.object({
    message: z.string().min(1).max(2000),
    conversationId: z.string().optional(),
  });

  // Public AI chat endpoint (auth required)
  r.post("/chat", requireAuth, async (req, res) => {
    const parsed = ChatMessage.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

    const claims = getAuthClaims(req);
    const { message, conversationId } = parsed.data;
    const convId = conversationId || makeId("conv");

    try {
      const db = await readData();
      const userPhone = String(claims?.phone || "");
      const userName = String(claims?.name || "");
      const userEmail = String(claims?.email || "");

      const result = await processUserMessage(message, db, userPhone, userName, userEmail);

      // Store conversation in audit
      await mutateData((dbw) => {
        const now = new Date().toISOString();
        dbw.auditLog.push({
          id: makeId("audit"),
          at: now,
          action: "AI_CHAT",
          entity: "ai_conversation",
          entityId: convId,
          meta: {
            intent: result.intent,
            userMessage: message.slice(0, 200),
            userPhone,
            escalated: result.shouldEscalate,
          },
        } as any);
      }, "ai_chat");

      // Handle escalation (refund requests etc.)
      if (result.shouldEscalate && result.escalationData) {
        escalateToManager(bot, adminChatIds, {
          customerName: userName || userPhone || "Unknown",
          customerPhone: userPhone,
          orderId: result.escalationData.orderId,
          reason: result.escalationData.reason,
          conversationSummary: result.escalationData.conversationSummary,
          channel: "web_chat",
        }).catch((err: any) => console.error("[AI:ESCALATE]", err));
      }

      return res.json({
        ok: true,
        conversationId: convId,
        reply: result.reply,
        intent: result.intent,
        escalated: result.shouldEscalate,
      });
    } catch (err: any) {
      return res.status(500).json({ error: "AI_CHAT_FAILED", message: String(err?.message || err) });
    }
  });

  // Get customer's order history
  r.get("/my-orders", requireAuth, async (req, res) => {
    const claims = getAuthClaims(req);
    const phone = String(claims?.phone || "").trim();
    const email = String(claims?.email || "").trim().toLowerCase();

    if (!phone && !email) return res.status(400).json({ error: "IDENTITY_REQUIRED" });

    const db = await readData();
    const matchesUser = (rec: any) => {
      if (phone && String(rec.phone || "").trim() === phone) return true;
      if (email && String(rec.email || "").trim().toLowerCase() === email) return true;
      return false;
    };

    const bookings = db.bookings.filter(matchesUser).map((b: any) => ({
      id: b.id, type: b.type || "booking", status: b.status, itemId: b.itemId,
      date: b.bookingDate || b.tourDate || b.checkIn,
      total: b.pricing?.totalAmount || 0,
    }));

    const foodOrders = db.foodOrders.filter(matchesUser).map((f: any) => ({
      id: f.id, type: "food", status: f.status,
      items: (f.items || []).map((it: any) => it.name).join(", "),
      date: f.orderTime,
      total: f.pricing?.totalAmount || 0,
    }));

    const cabBookings = db.cabBookings.filter(matchesUser).map((c: any) => ({
      id: c.id, type: "cab", status: c.status,
      pickup: c.pickupLocation, drop: c.dropLocation,
      date: c.createdAt || c.datetime,
      total: c.estimatedFare || 0,
    }));

    return res.json({
      ok: true,
      orders: [...bookings, ...foodOrders, ...cabBookings]
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()),
    });
  });

  return r;
}
