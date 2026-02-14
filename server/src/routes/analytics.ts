import { Router } from "express";
import { mutateData } from "../services/jsondb";
import { applyAnalyticsEvent, requestBrowser, requestIp, userIdFromEmail, userIdFromIp, userIdFromPhone } from "../services/userProfiles";

export const analyticsRouter = Router();

type QueuedEvent = {
  payload: any;
  attempts: number;
  nextRetryAt: number;
};

const pendingEvents: QueuedEvent[] = [];
let flushTimer: any = null;
let flushRunning = false;
const MAX_QUEUE = 5000;
const MAX_ATTEMPTS = 12;
const BATCH_SIZE = 120;

function queueAnalyticsEvent(event: any) {
  pendingEvents.push({
    payload: event,
    attempts: 0,
    nextRetryAt: Date.now()
  });
  if (pendingEvents.length > MAX_QUEUE) {
    pendingEvents.splice(0, pendingEvents.length - MAX_QUEUE);
  }
  scheduleFlush();
}

function scheduleFlush(delayMs = 700) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueuedEvents();
  }, delayMs);
}

async function flushQueuedEvents() {
  if (flushRunning) return;
  if (!pendingEvents.length) return;
  flushRunning = true;
  const now = Date.now();
  const due = pendingEvents
    .filter((x) => x.nextRetryAt <= now)
    .slice(0, BATCH_SIZE);
  if (!due.length) {
    flushRunning = false;
    scheduleFlush(1200);
    return;
  }

  try {
    await mutateData((db) => {
      if (!Array.isArray((db as any).analyticsEvents)) (db as any).analyticsEvents = [];
      const list = (db as any).analyticsEvents as any[];
      for (const wrap of due) {
        const event = wrap.payload;
        list.push(event);
        applyAnalyticsEvent(db, {
          id: event.id,
          type: event.type,
          category: event.category,
          userId: event.userId,
          phone: event.phone,
          name: safeText((event as any).name || ""),
          email: event.email,
          at: event.at,
          meta: event.meta
        });
      }
      if (list.length > 5000) list.splice(0, list.length - 5000);
    }, "analytics_batch");
    for (const wrap of due) {
      const idx = pendingEvents.indexOf(wrap);
      if (idx >= 0) pendingEvents.splice(idx, 1);
    }
  } catch {
    for (const wrap of due) {
      wrap.attempts += 1;
      if (wrap.attempts >= MAX_ATTEMPTS) {
        const idx = pendingEvents.indexOf(wrap);
        if (idx >= 0) pendingEvents.splice(idx, 1);
        continue;
      }
      const backoffMs = Math.min(30000, 500 * Math.pow(2, wrap.attempts));
      wrap.nextRetryAt = Date.now() + backoffMs;
    }
  } finally {
    flushRunning = false;
    if (pendingEvents.length) scheduleFlush();
  }
}

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function jsonDepth(value: any, maxNodes = 10_000) {
  // Defensive depth check to avoid pathological nested payloads.
  const seen = new Set<any>();
  const stack: Array<{ v: any; d: number }> = [{ v: value, d: 0 }];
  let nodes = 0;
  let max = 0;
  while (stack.length) {
    const { v, d } = stack.pop() as any;
    nodes += 1;
    if (nodes > maxNodes) return max; // treat as deep enough; caller will size-limit anyway
    if (d > max) max = d;
    if (!v || typeof v !== "object") continue;
    if (seen.has(v)) continue;
    seen.add(v);
    if (Array.isArray(v)) {
      for (const x of v) stack.push({ v: x, d: d + 1 });
    } else {
      for (const x of Object.values(v)) stack.push({ v: x, d: d + 1 });
    }
  }
  return max;
}

function buildEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isSecurityEvent(typeRaw: any, categoryRaw: any, meta: any) {
  const type = safeText(typeRaw).toLowerCase();
  const category = safeText(categoryRaw).toLowerCase();
  const flagged = meta?.malicious === true || meta?.suspicious === true;
  const securityCategory = category === "security" || category === "trust" || category === "fraud";
  const securityType =
    type.includes("malicious") ||
    type.includes("suspicious") ||
    type.includes("fraud") ||
    type.includes("abuse") ||
    type.includes("attack") ||
    type.includes("bot") ||
    type.includes("rate_limit") ||
    type.includes("blocked");
  return flagged || securityCategory || securityType;
}

analyticsRouter.post("/track", async (req, res) => {
  const body = req.body || {};
  const type = safeText(body.type || body.eventType);
  if (!type) return res.status(400).json({ error: "TYPE_REQUIRED" });

  const phone = safeText(body.phone || "");
  const email = safeText(body.email || "");
  const ipAddress = safeText((body.meta && body.meta.ipAddress) || requestIp(req));
  const userId = safeText(
    body.userId ||
    (phone ? userIdFromPhone(phone) : "") ||
    (email ? userIdFromEmail(email) : "") ||
    (ipAddress ? userIdFromIp(ipAddress) : "")
  );
  // Never trust client timestamps for security events; keep them as "clientAt" only.
  const serverAt = new Date().toISOString();
  const clientAt = safeText(body.at || "");
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
  const metaSize = (() => {
    try { return JSON.stringify(meta).length; } catch { return 0; }
  })();
  if (metaSize > 20_000) return res.status(400).json({ error: "META_TOO_LARGE" });
  if (jsonDepth(meta) > 50) return res.status(400).json({ error: "META_TOO_DEEP" });

  // Only accept events that represent malicious/security behavior.
  if (!isSecurityEvent(type, body.category, meta)) {
    return res.json({ ok: true, ignored: true });
  }
  // For account-targeted security events, require an account identity (email/phone/userId not derived from IP).
  const wantsAccount = String(meta?.scope || "").toLowerCase() === "account" || String(meta?.account || "").toLowerCase() === "true";
  if (wantsAccount && !safeText(body.userId) && !phone && !email) {
    return res.status(400).json({ error: "ACCOUNT_IDENTITY_REQUIRED" });
  }
  const event = {
    id: safeText(body.id || buildEventId()),
    type,
    category: safeText(body.category || ""),
    userId,
    phone,
    email,
    at: serverAt,
    meta: {
      ipAddress: meta.ipAddress || ipAddress,
      browser: meta.browser || requestBrowser(req),
      ...(clientAt ? { clientAt } : {}),
      ...meta
    }
  };

  queueAnalyticsEvent({ ...event, name: safeText(body.name || "") });

  res.json({ ok: true, eventId: event.id, at: serverAt });
});
