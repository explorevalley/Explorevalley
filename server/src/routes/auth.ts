import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getRequestMeta, writeAuthEvent } from "../services/authlog";
import { hasPasswordSet, markPasswordSet } from "../services/authpassword";

const router = Router();

const phoneSchema = z.string().min(8).max(16).regex(/^\+?[0-9]{8,16}$/);
const otpSchema = z.string().length(6).regex(/^[0-9]{6}$/);

function normalizePhone(input: string) {
  const cleaned = input.trim();
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL || "";
}

function supabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
}

function supabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

function supabaseHeaders(accessToken?: string) {
  const key = supabaseAnonKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: key
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function supabaseAdminHeaders() {
  const key = supabaseServiceRoleKey();
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`
  };
}

async function getSupabaseUser(accessToken: string) {
  const url = `${supabaseUrl()}/auth/v1/user`;
  const r = await fetch(url, { headers: supabaseHeaders(accessToken) });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(txt || "SUPABASE_USER_FETCH_FAILED");
  }
  return r.json();
}

async function findSupabaseUserByEmail(email: string) {
  const key = supabaseServiceRoleKey();
  if (!supabaseUrl() || !key) return null;
  const url = `${supabaseUrl()}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  const r = await fetch(url, { headers: supabaseAdminHeaders() });
  if (!r.ok) return null;
  const out: any = await r.json();
  const users = Array.isArray(out?.users) ? out.users : [];
  return users[0] || null;
}

async function setSupabaseUserPasswordByAdmin(userId: string, password: string) {
  const key = supabaseServiceRoleKey();
  if (!supabaseUrl() || !key) throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  const url = `${supabaseUrl()}/auth/v1/admin/users/${encodeURIComponent(userId)}`;
  const r = await fetch(url, {
    method: "PUT",
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ password })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function getGoogleUser(accessToken: string) {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(txt || "GOOGLE_USER_FETCH_FAILED");
  }
  return r.json();
}

function signAppToken(payload: { sub: string; mode: string; email?: string | null; name?: string | null; phone?: string | null }) {
  const secret = process.env.JWT_SECRET || "dev_jwt_secret";
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function shouldRequirePasswordSetup(user: any, passwordSet: boolean) {
  if (passwordSet) return false;
  const createdAtRaw = String(user?.created_at || "");
  if (!createdAtRaw) return false;
  const createdAtMs = new Date(createdAtRaw).getTime();
  if (!Number.isFinite(createdAtMs)) return false;
  const ageMs = Date.now() - createdAtMs;
  // Prompt only for newly-created accounts to avoid forcing legacy users.
  return ageMs >= 0 && ageMs <= 15 * 60 * 1000;
}

router.post("/otp-request", async (req, res) => {
  const parsed = z.object({ phone: phoneSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_PHONE" });
  const phone = normalizePhone(parsed.data.phone);
  const meta = getRequestMeta(req);
  if (!supabaseUrl() || !supabaseAnonKey()) {
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "otp_request",
      ok: false,
      provider: "supabase_phone",
      phone,
      ...meta,
      error: "SUPABASE_NOT_CONFIGURED"
    });
    return res.status(500).json({ error: "SUPABASE_NOT_CONFIGURED" });
  }

  try {
    const r = await fetch(`${supabaseUrl()}/auth/v1/otp`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ phone, create_user: true })
    });
    if (!r.ok) {
      const txt = await r.text();
      await writeAuthEvent({
        at: new Date().toISOString(),
        event: "otp_request",
        ok: false,
        provider: "supabase_phone",
        phone,
        ...meta,
        error: txt || "SUPABASE_OTP_REQUEST_FAILED"
      });
      return res.status(400).json({ error: "OTP_REQUEST_FAILED" });
    }
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "otp_request",
      ok: true,
      provider: "supabase_phone",
      phone,
      ...meta
    });
    return res.json({ ok: true });
  } catch (e: any) {
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "otp_request",
      ok: false,
      provider: "supabase_phone",
      phone,
      ...meta,
      error: String(e?.message || e)
    });
    return res.status(500).json({ error: "OTP_REQUEST_FAILED" });
  }
});

router.post("/otp-verify", async (req, res) => {
  const parsed = z.object({ phone: phoneSchema, otp: otpSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const phone = normalizePhone(parsed.data.phone);
  const meta = getRequestMeta(req);
  if (!supabaseUrl() || !supabaseAnonKey()) return res.status(500).json({ error: "SUPABASE_NOT_CONFIGURED" });

  try {
    const r = await fetch(`${supabaseUrl()}/auth/v1/verify`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ type: "sms", phone, token: parsed.data.otp })
    });
    if (!r.ok) {
      const txt = await r.text();
      await writeAuthEvent({
        at: new Date().toISOString(),
        event: "otp_verify",
        ok: false,
        provider: "supabase_phone",
        phone,
        ...meta,
        error: txt || "OTP_VERIFY_FAILED"
      });
      return res.status(401).json({ error: "OTP_VERIFY_FAILED" });
    }
    const out = await r.json();
    const userId = out?.user?.id;
    const secret = process.env.JWT_SECRET || "dev_jwt_secret";
    const token = jwt.sign({ sub: userId || phone, mode: "supabase_phone", phone }, secret, { expiresIn: "7d" });
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "otp_verify",
      ok: true,
      provider: "supabase_phone",
      userId,
      phone,
      ...meta
    });
    return res.json({ token, accessToken: out?.session?.access_token || null, refreshToken: out?.session?.refresh_token || null });
  } catch (e: any) {
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "otp_verify",
      ok: false,
      provider: "supabase_phone",
      phone,
      ...meta,
      error: String(e?.message || e)
    });
    return res.status(500).json({ error: "OTP_VERIFY_FAILED" });
  }
});

router.post("/session-sync", async (req, res) => {
  const parsed = z.object({ accessToken: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const meta = getRequestMeta(req);
  if (!supabaseUrl() || !supabaseAnonKey()) {
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "session_sync",
      ok: false,
      provider: "supabase_oauth",
      ...meta,
      error: "SUPABASE_NOT_CONFIGURED"
    });
    return res.status(500).json({ error: "SUPABASE_NOT_CONFIGURED" });
  }

  try {
    let user: any;
    try {
      user = await getSupabaseUser(parsed.data.accessToken);
    } catch {
      // Fallback for direct Google access tokens from OAuth callback hash.
      user = await getGoogleUser(parsed.data.accessToken);
      if (!user?.sub && !user?.email) throw new Error("GOOGLE_USER_INVALID");
    }

    const userId = user.id || user.sub;
    const email = user.email || null;
    const token = signAppToken({ sub: userId, mode: "supabase_oauth", email, name: user.name || null, phone: user.phone || null });
    const passwordSet = await hasPasswordSet({ userId, email: email || "" });
    const requirePasswordSetup = shouldRequirePasswordSetup(user, passwordSet);
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "session_sync",
      ok: true,
      provider: "supabase_oauth",
      userId,
      ...meta
    });
    return res.json({
      token,
      user: { id: userId, email: user.email || null, phone: user.phone || null, name: user.name || null },
      requirePasswordSetup,
      accessToken: parsed.data.accessToken
    });
  } catch (e: any) {
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "session_sync",
      ok: false,
      provider: "supabase_oauth",
      ...meta,
      error: String(e?.message || e)
    });
    return res.status(401).json({ error: "INVALID_SUPABASE_SESSION" });
  }
});

router.post("/password-login", async (req, res) => {
  const parsed = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(72)
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const meta = getRequestMeta(req);
  if (!supabaseUrl() || !supabaseAnonKey()) return res.status(500).json({ error: "SUPABASE_NOT_CONFIGURED" });

  try {
    const r = await fetch(`${supabaseUrl()}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        email: parsed.data.email,
        password: parsed.data.password
      })
    });
    if (!r.ok) {
      const txt = await r.text();
      await writeAuthEvent({
        at: new Date().toISOString(),
        event: "password_login",
        ok: false,
        provider: "supabase_password",
        ...meta,
        error: txt || "PASSWORD_LOGIN_FAILED"
      });
      return res.status(401).json({ error: "PASSWORD_LOGIN_FAILED" });
    }
    const out = await r.json();
    const user = out?.user || {};
    const userId = user.id || parsed.data.email.toLowerCase();
    const token = signAppToken({
      sub: userId,
      mode: "supabase_password",
      email: user.email || parsed.data.email,
      name: user.user_metadata?.name || user.email || null,
      phone: user.phone || null
    });
    await markPasswordSet({ userId, email: user.email || parsed.data.email });
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "password_login",
      ok: true,
      provider: "supabase_password",
      userId,
      ...meta
    });
    return res.json({
      token,
      accessToken: out?.access_token || null,
      user: {
        id: userId,
        email: user.email || parsed.data.email,
        phone: user.phone || null,
        name: user.user_metadata?.name || user.email || parsed.data.email
      }
    });
  } catch (e: any) {
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "password_login",
      ok: false,
      provider: "supabase_password",
      ...meta,
      error: String(e?.message || e)
    });
    return res.status(500).json({ error: "PASSWORD_LOGIN_FAILED" });
  }
});

router.post("/set-password", async (req, res) => {
  const parsed = z.object({
    accessToken: z.string().min(10),
    email: z.string().email().optional(),
    password: z.string().min(8).max(72)
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const meta = getRequestMeta(req);
  if (!supabaseUrl() || !supabaseAnonKey()) return res.status(500).json({ error: "SUPABASE_NOT_CONFIGURED" });

  try {
    let user: any = null;
    try {
      user = await getSupabaseUser(parsed.data.accessToken);
    } catch {
      user = null;
    }
    if (!user?.id && parsed.data.email) {
      user = await findSupabaseUserByEmail(parsed.data.email);
    }
    if (!user?.id) {
      await writeAuthEvent({
        at: new Date().toISOString(),
        event: "password_set",
        ok: false,
        provider: "supabase_oauth",
        ...meta,
        error: "PASSWORD_SET_USER_NOT_FOUND"
      });
      return res.status(400).json({ error: "PASSWORD_SET_USER_NOT_FOUND" });
    }
    await setSupabaseUserPasswordByAdmin(String(user.id), parsed.data.password);
    const userId = String(user.id);
    await markPasswordSet({ userId, email: user?.email || "" });
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "password_set",
      ok: true,
      provider: "supabase_oauth",
      userId,
      ...meta
    });
    return res.json({ ok: true });
  } catch (e: any) {
    await writeAuthEvent({
      at: new Date().toISOString(),
      event: "password_set",
      ok: false,
      provider: "supabase_oauth",
      ...meta,
      error: String(e?.message || e)
    });
    return res.status(500).json({ error: "PASSWORD_SET_FAILED" });
  }
});

router.post("/logout", async (req, res) => {
  const meta = getRequestMeta(req);
  await writeAuthEvent({
    at: new Date().toISOString(),
    event: "logout",
    ok: true,
    provider: "anonymous",
    ...meta
  });
  return res.json({ ok: true });
});

export { router as authRouter };
