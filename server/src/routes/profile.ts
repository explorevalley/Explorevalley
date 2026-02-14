import { Router } from "express";
import { z } from "zod";
import { getAuthClaims, requireAuth } from "../middleware/auth";
import { mutateData, readData } from "../services/jsondb";
import { normalizeEmail, normalizePhone } from "../services/userProfiles";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function sameText(a: any, b: any) {
  return safeText(a).toLowerCase() === safeText(b).toLowerCase();
}

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  email: z.string().trim().email().max(120).optional(),
  profilePhoto: z.string().trim().max(500).optional(),
});

export function profileRouter() {
  const r = Router();
  r.use(requireAuth);

  // Read or create a lightweight profile record for the authenticated user.
  r.get("/", async (req, res) => {
    const claims = getAuthClaims(req);
    if (!claims?.sub) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const db = await readData();
    const list = Array.isArray((db as any).userProfiles) ? (db as any).userProfiles : [];
    const sub = safeText(claims.sub);
    const email = normalizeEmail(safeText(claims.email || ""));
    const phone = normalizePhone(safeText(claims.phone || ""));

    const found =
      list.find((u: any) => sameText(u?.id, sub)) ||
      (email ? list.find((u: any) => normalizeEmail(safeText(u?.email)) === email) : null) ||
      (phone ? list.find((u: any) => normalizePhone(safeText(u?.phone)) === phone) : null) ||
      null;

    if (found) return res.json(found);

    const now = new Date().toISOString();
    const created = await mutateData((draft) => {
      const arr = Array.isArray((draft as any).userProfiles) ? (draft as any).userProfiles : [];
      const next = {
        id: sub,
        phone: safeText(claims.phone || ""),
        name: safeText(claims.name || claims.email || claims.phone || "User"),
        email: safeText(claims.email || ""),
        ipAddress: "",
        browser: "",
        createdAt: now,
        updatedAt: now,
        orders: [],
      };
      (draft as any).userProfiles = [next, ...arr];
    }, "profile_get_create");

    const out = ((created as any).userProfiles || []).find((u: any) => sameText(u?.id, sub)) || null;
    return res.json(out || { id: sub, name: safeText(claims.name || "User") });
  });

  // Update the authenticated user's profile.
  r.post("/", async (req, res) => {
    const claims = getAuthClaims(req);
    if (!claims?.sub) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const parsed = UpdateSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

    const sub = safeText(claims.sub);
    const now = new Date().toISOString();

    const updated = await mutateData((draft) => {
      if (!Array.isArray((draft as any).userProfiles)) (draft as any).userProfiles = [];
      const list = (draft as any).userProfiles as any[];

      const emailKey = normalizeEmail(safeText(claims.email || ""));
      const phoneKey = normalizePhone(safeText(claims.phone || ""));

      const idx =
        list.findIndex((u: any) => sameText(u?.id, sub)) >= 0
          ? list.findIndex((u: any) => sameText(u?.id, sub))
          : (emailKey ? list.findIndex((u: any) => normalizeEmail(safeText(u?.email)) === emailKey) : -1);

      const existing = idx >= 0 ? list[idx] : null;
      const next = {
        id: sub,
        phone: parsed.data.phone !== undefined ? safeText(parsed.data.phone) : safeText(existing?.phone || claims.phone || ""),
        name: parsed.data.name !== undefined ? safeText(parsed.data.name) : safeText(existing?.name || claims.name || ""),
        email: parsed.data.email !== undefined ? safeText(parsed.data.email) : safeText(existing?.email || claims.email || ""),
        profilePhoto: parsed.data.profilePhoto !== undefined ? safeText(parsed.data.profilePhoto) : safeText(existing?.profilePhoto || ""),
        ipAddress: safeText(existing?.ipAddress || ""),
        browser: safeText(existing?.browser || ""),
        createdAt: safeText(existing?.createdAt || now),
        updatedAt: now,
        orders: Array.isArray(existing?.orders) ? existing.orders : [],
      };

      if (idx >= 0) list[idx] = { ...existing, ...next };
      else list.unshift(next);

      // Also best-effort align any phone-based profile row (created from orders) to avoid duplicated names.
      if (phoneKey) {
        const pIdx = list.findIndex((u: any) => normalizePhone(safeText(u?.phone)) === phoneKey);
        if (pIdx >= 0 && pIdx !== idx) {
          list[pIdx] = { ...list[pIdx], name: next.name, email: next.email, phone: next.phone, updatedAt: now };
        }
      }
    }, "profile_update");

    const out = ((updated as any).userProfiles || []).find((u: any) => sameText(u?.id, sub)) || null;
    return res.json(out || { ok: true });
  });

  return r;
}

