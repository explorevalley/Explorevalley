import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs-extra";
import jwt from "jsonwebtoken";
import { DatabaseSchema } from "@explorevalley/shared";
import { mutateData, readData, writeData } from "../services/jsondb";
import { applyOperationalRules } from "../services/operationalRules";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }
});

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function encodePath(value: string) {
  return String(value || "")
    .split("/")
    .map((x) => encodeURIComponent(x))
    .join("/");
}

function normalizeEmail(email: string) {
  return safeText(email).toLowerCase();
}

function normalizePhone(phone: string) {
  const raw = safeText(phone);
  const digits = raw.replace(/\D+/g, "");
  return digits || raw.toLowerCase();
}

function supabaseUrl() {
  return process.env.SUPABASE_URL || "";
}

function supabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
}

function jwtSecret() {
  return process.env.JWT_SECRET || "dev_jwt_secret";
}

function allowedAdminEmail() {
  return normalizeEmail(process.env.ADMIN_ALLOWED_EMAIL || "bharatkaistha007@gmail.com");
}

const ADMIN_SESSION_COOKIE = "ev_admin_session";
const ADMIN_PREAUTH_COOKIE = "ev_admin_google_preauth";

function parseCookies(cookieHeader: string) {
  const out: Record<string, string> = {};
  const raw = safeText(cookieHeader);
  if (!raw) return out;
  raw.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) return;
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function getBearerToken(req: any) {
  const auth = safeText(req?.headers?.authorization || req?.headers?.Authorization || "");
  if (!auth) return "";
  const m = auth.match(/^\s*Bearer\s+(.+)\s*$/i);
  return m ? safeText(m[1]) : "";
}

function getAdminSessionToken(req: any) {
  const bearer = getBearerToken(req);
  if (bearer) return bearer;
  const cookies = parseCookies(String(req?.headers?.cookie || ""));
  return safeText(cookies[ADMIN_SESSION_COOKIE] || "");
}

function verifyAdminSession(req: any) {
  const token = getAdminSessionToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as any;
    if (!payload || payload.role !== "admin") return null;
    const email = normalizeEmail(payload.email || "");
    if (!email || email !== allowedAdminEmail()) return null;
    if (payload.keyOk !== true) return null;
    return payload;
  } catch {
    return null;
  }
}

function verifyGooglePreauth(req: any) {
  const cookies = parseCookies(String(req?.headers?.cookie || ""));
  const token = safeText(cookies[ADMIN_PREAUTH_COOKIE] || "");
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as any;
    if (!payload || payload.role !== "admin_google_preauth") return null;
    const email = normalizeEmail(payload.email || "");
    if (!email || email !== allowedAdminEmail()) return null;
    if (payload.googleOk !== true) return null;
    return payload;
  } catch {
    return null;
  }
}

async function getSupabaseUser(accessToken: string) {
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  if (!url || !anon) throw new Error("SUPABASE_NOT_CONFIGURED");
  const r = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function isGoogleUser(user: any) {
  const appProvider = safeText(user?.app_metadata?.provider || "").toLowerCase();
  if (appProvider === "google") return true;
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  return identities.some((x: any) => safeText(x?.provider || "").toLowerCase() === "google");
}

function adminAuth(req: any, res: any, next: any) {
  const ok = verifyAdminSession(req);
  if (!ok) return res.status(401).json({ error: "ADMIN_AUTH_REQUIRED" });
  (req as any).admin = ok;
  next();
}

export const adminRouter = Router();

// Public config for Google OAuth start (safe to expose anon key/url).
adminRouter.get("/google/config", (_req, res) => {
  const url = supabaseUrl().replace(/\/+$/, "");
  const anon = supabaseAnonKey();
  if (!url || !anon) return res.status(500).json({ error: "SUPABASE_NOT_CONFIGURED" });
  return res.json({ supabaseUrl: url, supabaseAnonKey: anon, allowedEmail: allowedAdminEmail() });
});

// Step 1: Google (Supabase) verification only -> short-lived preauth cookie.
adminRouter.post("/google/verify", async (req, res) => {
  const accessToken = safeText(req?.body?.supabaseAccessToken || "");
  if (!accessToken) return res.status(400).json({ error: "SUPABASE_ACCESS_TOKEN_REQUIRED" });

  try {
    const user: any = await getSupabaseUser(accessToken);
    const email = normalizeEmail(user?.email || "");
    if (!email || email !== allowedAdminEmail()) {
      return res.status(403).json({ error: "ADMIN_EMAIL_NOT_ALLOWED" });
    }
    if (!isGoogleUser(user)) {
      return res.status(403).json({ error: "GOOGLE_SIGNIN_REQUIRED" });
    }
    const preauthToken = jwt.sign(
      { sub: safeText(user?.id || email), role: "admin_google_preauth", email, googleOk: true },
      jwtSecret(),
      { expiresIn: "10m" }
    );
    res.cookie(ADMIN_PREAUTH_COOKIE, preauthToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: !!req.secure,
      path: "/",
      maxAge: 10 * 60 * 1000
    });
    return res.json({ ok: true, email, googleVerified: true });
  } catch (e: any) {
    return res.status(401).json({ error: "SUPABASE_SESSION_INVALID", message: String(e?.message || e) });
  }
});

// Step 2: secret key unlock -> admin session cookie.
adminRouter.post("/login", async (req, res) => {
  const adminKey = safeText(req?.body?.adminKey || "");
  const expected = safeText(process.env.ADMIN_DASHBOARD_KEY || "");
  if (!expected) return res.status(500).json({ error: "ADMIN_DASHBOARD_KEY_NOT_CONFIGURED" });
  if (!adminKey || adminKey !== expected) return res.status(401).json({ error: "INVALID_SECRET_KEY" });

  const preauth = verifyGooglePreauth(req);
  if (!preauth) return res.status(401).json({ error: "GOOGLE_AUTH_REQUIRED" });

  const token = jwt.sign(
    { sub: safeText(preauth.sub || preauth.email), role: "admin", email: normalizeEmail(preauth.email || ""), keyOk: true, googleOk: true },
    jwtSecret(),
    { expiresIn: "12h" }
  );
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !!req.secure,
    path: "/",
    maxAge: 12 * 60 * 60 * 1000
  });
  res.cookie(ADMIN_PREAUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: !!req.secure, path: "/", maxAge: 0 });
  return res.json({ ok: true, email: normalizeEmail(preauth.email || "") });
});

adminRouter.get("/whoami", (req, res) => {
  const s = verifyAdminSession(req);
  if (!s) return res.status(401).json({ ok: false });
  return res.json({ ok: true, email: normalizeEmail(s.email || ""), sub: safeText(s.sub || "") });
});

adminRouter.post("/logout", (_req, res) => {
  res.cookie(ADMIN_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 0 });
  res.cookie(ADMIN_PREAUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 0 });
  return res.json({ ok: true });
});

// Everything below requires admin session.
adminRouter.use(adminAuth);

// Admin-only bot/agent status for dashboard visibility.
adminRouter.get("/bots/status", (_req, res) => {
  const mode = (process.env.TELEGRAM_MODE || "").trim().toLowerCase() || "off";
  const webhookBase = (process.env.TELEGRAM_WEBHOOK_BASE_URL || "").trim();
  const webhookSecretSet = Boolean((process.env.TELEGRAM_WEBHOOK_SECRET || "").trim());
  const botSuffix = webhookSecretSet ? "/<secret>" : "";

  const bots = {
    admin: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    support: Boolean(process.env.TELEGRAM_SUPPORT_BOT_TOKEN),
    sales: Boolean(process.env.TELEGRAM_SALES_BOT_TOKEN),
    ops: Boolean(process.env.TELEGRAM_OPS_BOT_TOKEN),
    finance: Boolean(process.env.TELEGRAM_FINANCE_BOT_TOKEN),
  };

  const agentModel = (process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini").trim();
  const transcribeModel = (process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1").trim();

  return res.json({
    mode,
    webhookBase,
    webhookSecretSet,
    bots,
    agentModel,
    transcribeModel,
    webhookPaths: {
      admin: `/telegram/admin${botSuffix}`,
      support: `/telegram/support${botSuffix}`,
      sales: `/telegram/sales${botSuffix}`,
      ops: `/telegram/ops${botSuffix}`,
      finance: `/telegram/finance${botSuffix}`,
    },
  });
});

function supabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

function assertSupabaseAdminConfigured() {
  const url = supabaseUrl().replace(/\/+$/, "");
  const key = supabaseServiceRoleKey();
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return { url, key };
}

function supabaseAdminHeaders(extra?: Record<string, string>) {
  const { key } = assertSupabaseAdminConfigured();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(extra || {})
  };
}

async function supabaseAdminFetchJson(routePath: string, init?: RequestInit) {
  const { url } = assertSupabaseAdminConfigured();
  const joinedPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
  const r = await fetch(`${url}${joinedPath}`, {
    ...(init || {}),
    headers: {
      ...supabaseAdminHeaders(),
      ...((init?.headers || {}) as Record<string, string>)
    }
  });
  if (!r.ok) {
    throw new Error(`SUPABASE_REQUEST_FAILED:${r.status}:${await r.text()}`);
  }
  return r.json();
}

async function supabaseSelectAllRaw(table: string, pageSize = 1000) {
  const out: any[] = [];
  let offset = 0;
  for (;;) {
    const query = `select=*&limit=${pageSize}&offset=${offset}`;
    const rows = await supabaseAdminFetchJson(`/rest/v1/${encodeURIComponent(table)}?${query}`);
    const arr = Array.isArray(rows) ? rows : [];
    out.push(...arr);
    if (arr.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

function defaultConflictColumnForTable(table: string) {
  if (table === "ev_coupons") return "code";
  if (table === "ev_site_pages") return "slug";
  if (table === "ev_vendor_menus") return "restaurant_id";
  return "id";
}

function getOpenApiSchemas(openApi: any) {
  if (openApi?.definitions && typeof openApi.definitions === "object") {
    return openApi.definitions;
  }
  return (openApi?.components?.schemas && typeof openApi.components.schemas === "object")
    ? openApi.components.schemas
    : {};
}

adminRouter.get("/supabase/snapshot", async (req, res) => {
  try {
    const openApi = await supabaseAdminFetchJson("/rest/v1/", {
      headers: { Accept: "application/openapi+json" }
    });
    const schemas = getOpenApiSchemas(openApi);
    const requestedTables = String(req.query.tables || "")
      .split(",")
      .map((x) => safeText(x))
      .filter(Boolean);

    const tableNames = Object.keys(schemas)
      .filter((name) => name.startsWith("ev_"))
      .filter((name) => !requestedTables.length || requestedTables.includes(name))
      .sort((a, b) => a.localeCompare(b));

    const tables = await Promise.all(tableNames.map(async (name) => {
      const schema = schemas[name] || {};
      const required = Array.isArray(schema.required) ? schema.required.map((x: any) => String(x)) : [];
      const props = (schema.properties && typeof schema.properties === "object") ? schema.properties : {};
      const rows = await supabaseSelectAllRaw(name);

      const schemaColumns = Object.entries(props).map(([colName, meta]: any) => ({
        name: String(colName),
        type: String(meta?.type || meta?.format || "unknown"),
        nullable: meta?.nullable === true,
        required: required.includes(String(colName))
      }));

      const inferredColumns = rows[0]
        ? Object.keys(rows[0]).map((colName) => ({
            name: String(colName),
            type: typeof rows[0][colName],
            nullable: rows[0][colName] === null,
            required: false
          }))
        : [];

      const columns = schemaColumns.length ? schemaColumns : inferredColumns;
      return {
        name,
        columns,
        rowCount: rows.length,
        rows
      };
    }));

    return res.json({
      source: "supabase",
      generatedAt: new Date().toISOString(),
      tables
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "SUPABASE_SNAPSHOT_FAILED",
      message: String(err?.message || err)
    });
  }
});

adminRouter.post("/supabase/upsert", async (req, res) => {
  try {
    const table = safeText(req.body?.table || "");
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const onConflict = safeText(req.body?.onConflict || defaultConflictColumnForTable(table));

    if (!table || !/^ev_[a-z0-9_]+$/i.test(table)) {
      return res.status(400).json({ error: "INVALID_TABLE_NAME" });
    }
    if (!/^[a-z0-9_]+$/i.test(onConflict)) {
      return res.status(400).json({ error: "INVALID_ON_CONFLICT_COLUMN" });
    }
    if (!rows.length) {
      return res.json({ ok: true, table, affected: 0 });
    }

    const { url } = assertSupabaseAdminConfigured();
    const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflict)}`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: supabaseAdminHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(rows)
    });
    if (!r.ok) {
      return res.status(500).json({
        error: "SUPABASE_UPSERT_FAILED",
        table,
        message: await r.text()
      });
    }
    const payload = await r.json().catch(() => []);
    return res.json({ ok: true, table, affected: Array.isArray(payload) ? payload.length : rows.length, rows: payload });
  } catch (err: any) {
    return res.status(500).json({
      error: "SUPABASE_UPSERT_FAILED",
      message: String(err?.message || err)
    });
  }
});

adminRouter.post("/supabase/delete", async (req, res) => {
  try {
    const table = safeText(req.body?.table || "");
    const id = safeText(req.body?.id || "");
    const keyColumn = safeText(req.body?.keyColumn || defaultConflictColumnForTable(table));
    const confirmText = safeText(req.body?.confirmText || "");

    if (!table || !/^ev_[a-z0-9_]+$/i.test(table)) {
      return res.status(400).json({ error: "INVALID_TABLE_NAME" });
    }
    if (!/^[a-z0-9_]+$/i.test(keyColumn)) {
      return res.status(400).json({ error: "INVALID_KEY_COLUMN" });
    }
    if (!id) {
      return res.status(400).json({ error: "ID_REQUIRED" });
    }
    if (confirmText !== "DELETE") {
      return res.status(400).json({
        error: "DELETE_CONFIRMATION_REQUIRED",
        message: "Deletion requires explicit confirmation text."
      });
    }

    const { url } = assertSupabaseAdminConfigured();
    const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?${encodeURIComponent(keyColumn)}=eq.${encodeURIComponent(id)}`;
    const r = await fetch(endpoint, {
      method: "DELETE",
      headers: supabaseAdminHeaders({ Prefer: "return=minimal" })
    });
    if (!r.ok) {
      return res.status(500).json({
        error: "SUPABASE_DELETE_FAILED",
        table,
        message: await r.text()
      });
    }
    return res.json({ ok: true, table, deleted: 1 });
  } catch (err: any) {
    return res.status(500).json({
      error: "SUPABASE_DELETE_FAILED",
      message: String(err?.message || err)
    });
  }
});

async function readJsonArraySafe(filePath: string) {
  try {
    if (!(await fs.pathExists(filePath))) return [];
    const raw = await fs.readJson(filePath).catch(() => []);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function patchCatalogRecord(type: string, id: string, patch: any) {
  let found = false;
  await mutateData((db) => {
    const findAndPatch = (arr: any[], key: "id" = "id") => {
      const idx = arr.findIndex((x) => String(x?.[key] || "") === id);
      if (idx < 0) return false;
      arr[idx] = { ...arr[idx], ...patch };
      return true;
    };

    if (type === "tour") found = findAndPatch(db.tours);
    else if (type === "festival") found = findAndPatch(db.festivals as any[]);
    else if (type === "hotel" || type === "cottage") found = findAndPatch(db.hotels);
    else if (type === "restaurant") {
      found = findAndPatch(db.restaurants);
      if (!found) {
        // Upsert behavior for vendor menu editor: create vendor if missing.
        const next = {
          id,
          name: String(patch?.name || id),
          description: String(patch?.description || ""),
          cuisine: Array.isArray(patch?.cuisine) ? patch.cuisine : [],
          rating: Number(patch?.rating || 0),
          reviewCount: Number(patch?.reviewCount || 0),
          deliveryTime: String(patch?.deliveryTime || ""),
          minimumOrder: Number(patch?.minimumOrder || 0),
          priceDropped: patch?.priceDropped === true,
          priceDropPercent: Number(patch?.priceDropPercent || 0),
          heroImage: String(patch?.heroImage || ""),
          images: Array.isArray(patch?.images) ? patch.images : [],
          imageTitles: Array.isArray(patch?.imageTitles) ? patch.imageTitles : [],
          imageDescriptions: Array.isArray(patch?.imageDescriptions) ? patch.imageDescriptions : [],
          imageMeta: Array.isArray(patch?.imageMeta) ? patch.imageMeta : [],
          available: patch?.available !== false,
          isVeg: patch?.isVeg === true,
          tags: Array.isArray(patch?.tags) ? patch.tags : [],
          location: String(patch?.location || ""),
          serviceRadiusKm: Number(patch?.serviceRadiusKm || 0),
          deliveryZones: Array.isArray(patch?.deliveryZones) ? patch.deliveryZones : [],
          openHours: String(patch?.openHours || "09:00"),
          closingHours: String(patch?.closingHours || "22:00"),
          menu: Array.isArray(patch?.menu) ? patch.menu : []
        };
        db.restaurants.push(next as any);
        found = true;
      }
    }
    else if (type === "food_item") found = findAndPatch(db.menuItems);
    else if (type === "cab") found = findAndPatch(db.cabProviders);
  }, `admin_patch_${type}_${id}`);
  return found;
}

adminRouter.get("/data", async (_req, res) => {
  const db = await readData();
  res.json(db);
});

// Admin-only auth metadata summary for UI (never includes passwords/tokens).
// Note: This data is sourced from local server logs, not Supabase.
adminRouter.get("/auth-summary", async (_req, res) => {
  const passwordProfilesPath = path.join(process.cwd(), "..", "data", "auth-password-profiles.json");
  const authLogPath = path.join(process.cwd(), "..", "data", "auth-logins.json");

  const passwordProfiles = await readJsonArraySafe(passwordProfilesPath);
  const authEvents = await readJsonArraySafe(authLogPath);

  type Summary = {
    userId?: string;
    email?: string;
    phone?: string;
    passwordSet?: boolean;
    passwordUpdatedAt?: string;
    lastAuthAt?: string;
    lastAuthProvider?: string;
    providers?: string[];
    lastOkEvent?: string;
  };

  const byUserId = new Map<string, Summary>();
  const byEmail = new Map<string, Summary>();
  const byPhone = new Map<string, Summary>();

  const touch = (target: Map<string, Summary>, key: string, patch: Partial<Summary>) => {
    const k = safeText(key);
    if (!k) return;
    const curr = target.get(k) || { ...patch };
    const next = { ...curr, ...patch };
    target.set(k, next);
  };

  for (const row of passwordProfiles) {
    const userId = safeText((row as any)?.userId);
    const email = normalizeEmail((row as any)?.email || "");
    const passwordSet = (row as any)?.passwordSet === true;
    const updatedAt = safeText((row as any)?.updatedAt);
    if (userId) touch(byUserId, userId, { userId, email: email || undefined, passwordSet, passwordUpdatedAt: updatedAt || undefined });
    if (email) touch(byEmail, email, { userId: userId || undefined, email, passwordSet, passwordUpdatedAt: updatedAt || undefined });
  }

  // Best-effort: compute last successful auth by userId/phone.
  const okEvents = new Set(["session_sync", "password_login", "otp_verify"]);
  for (const e of authEvents) {
    const ok = (e as any)?.ok === true;
    const ev = safeText((e as any)?.event);
    if (!ok || !okEvents.has(ev)) continue;
    const at = safeText((e as any)?.at);
    const provider = safeText((e as any)?.provider);
    const userId = safeText((e as any)?.userId);
    const phone = normalizePhone((e as any)?.phone || "");

    const patch: Partial<Summary> = {
      lastAuthAt: at || undefined,
      lastAuthProvider: provider || undefined,
      lastOkEvent: ev || undefined
    };

    const applyProvider = (m: Map<string, Summary>, k: string) => {
      const curr = m.get(k) || {};
      const providers = Array.isArray(curr.providers) ? curr.providers.slice() : [];
      if (provider && !providers.includes(provider)) providers.push(provider);
      // Keep lastAuthAt as max timestamp.
      const currAt = new Date(curr.lastAuthAt || 0).getTime();
      const nextAt = new Date(at || 0).getTime();
      const newer = Number.isFinite(nextAt) && nextAt >= currAt;
      m.set(k, {
        ...curr,
        ...(newer ? patch : {}),
        providers
      });
    };

    if (userId) applyProvider(byUserId, userId);
    if (phone) applyProvider(byPhone, phone);
  }

  const toObj = (m: Map<string, Summary>) => Object.fromEntries(Array.from(m.entries()));
  res.json({
    updatedAt: new Date().toISOString(),
    byUserId: toObj(byUserId),
    byEmail: toObj(byEmail),
    byPhone: toObj(byPhone)
  });
});

adminRouter.put("/data", async (req, res) => {
  const body = req.body;
  const allowEmpty = String(req.headers["x-allow-empty-catalog"] || "").toLowerCase() === "true";
  const catalogLooksEmpty =
    Array.isArray(body?.tours) && body.tours.length === 0 &&
    Array.isArray(body?.hotels) && body.hotels.length === 0 &&
    Array.isArray(body?.restaurants) && body.restaurants.length === 0 &&
    Array.isArray(body?.menuItems) && body.menuItems.length === 0;
  if (catalogLooksEmpty && !allowEmpty) {
    return res.status(400).json({
      error: "EMPTY_CATALOG_BLOCKED",
      message: "Catalog payload is empty. To intentionally clear it, send header x-allow-empty-catalog: true"
    });
  }
  const parsed = DatabaseSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_DATASET" });
  }
  const prev = await readData();
  const candidate = parsed.data;
  applyOperationalRules(prev, candidate);
  const saved = await writeData(candidate);
  res.json({
    ok: true,
    counts: {
      tours: saved.tours.length,
      festivals: (saved.festivals || []).length,
      hotels: saved.hotels.length,
      restaurants: saved.restaurants.length,
      menuItems: saved.menuItems.length
    }
  });
});

adminRouter.patch("/catalog/:type/:id", async (req, res) => {
  const type = String(req.params.type || "");
  const id = String(req.params.id || "");
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
  const saved = await patchCatalogRecord(type, id, patch);
  if (!saved) return res.status(404).json({ error: "RECORD_NOT_FOUND", type, id });
  res.json({ ok: true, type, id, saved: true });
});

// compatibility fallback where PATCH may be blocked by proxies/older setups
adminRouter.post("/catalog/:type/:id", async (req, res) => {
  const type = String(req.params.type || "");
  const id = String(req.params.id || "");
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
  const saved = await patchCatalogRecord(type, id, patch);
  if (!saved) return res.status(404).json({ error: "RECORD_NOT_FOUND", type, id });
  res.json({ ok: true, type, id, saved: true });
});

adminRouter.put("/catalog/:type/:id", async (req, res) => {
  const type = String(req.params.type || "");
  const id = String(req.params.id || "");
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
  const saved = await patchCatalogRecord(type, id, patch);
  if (!saved) return res.status(404).json({ error: "RECORD_NOT_FOUND", type, id });
  res.json({ ok: true, type, id, saved: true });
});

adminRouter.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "IMAGE_FILE_REQUIRED" });
    const folder = String(req.body?.folder || "admin").replace(/[^a-zA-Z0-9/_-]/g, "");
    const ts = Date.now();
    const filename = `${ts}_${Math.random().toString(36).slice(2, 8)}.webp`;
    const relDir = path.join("uploads", folder);
    const relPath = path.join(relDir, filename).replace(/\\/g, "/");
    const webp = await sharp(req.file.buffer).rotate().webp({ quality: 85 }).toBuffer();

    const supabaseUrlRaw = safeText(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
    const supabaseKey = safeText(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "");
    const supabaseBucket = safeText(process.env.SUPABASE_STORAGE_BUCKET || "explorevalley-uploads");

    if (supabaseUrlRaw && supabaseKey && supabaseBucket) {
      const objectPath = path.join(folder, filename).replace(/\\/g, "/");
      const uploadUrl = `${supabaseUrlRaw}/storage/v1/object/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
      const uploadResp = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "image/webp",
          "x-upsert": "true"
        },
        body: webp as any
      });
      if (!uploadResp.ok) {
        return res.status(500).json({
          error: "SUPABASE_UPLOAD_FAILED",
          message: await uploadResp.text()
        });
      }
      const publicUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
      return res.json({
        ok: true,
        path: `/${relPath}`,
        url: publicUrl,
        storage: "supabase",
        bucket: supabaseBucket,
        objectPath
      });
    }

    const outPath = path.join(process.cwd(), "..", "public", relPath);
    await fs.ensureDir(path.dirname(outPath));
    await fs.writeFile(outPath, webp);
    const proto = safeText(req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http")) || "http";
    const host = safeText(req.headers["x-forwarded-host"] || req.headers.host || "localhost");
    const absoluteUrl = `${proto}://${host}/${relPath}`.replace(/([^:]\/)\/+/g, "$1");
    return res.json({
      ok: true,
      path: `/${relPath}`,
      url: absoluteUrl,
      storage: "local"
    });
  } catch (err: any) {
    return res.status(500).json({ error: "UPLOAD_FAILED", message: String(err?.message || err) });
  }
});

async function supabaseAdminDeleteWhere(table: string, where: Record<string, string>, keyColumn = "id") {
  const { url } = assertSupabaseAdminConfigured();
  const parts = Object.entries(where).map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(String(v))}`);
  if (!parts.length) throw new Error("DELETE_WHERE_REQUIRED");
  const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?${parts.join("&")}`;
  const r = await fetch(endpoint, {
    method: "DELETE",
    headers: supabaseAdminHeaders({ Prefer: "return=minimal" })
  });
  if (!r.ok) throw new Error(`${table}_DELETE_FAILED:${r.status}:${await r.text()}`);
  return { ok: true, table, keyColumn };
}

// Purpose-built endpoints for Food Vendors workspace.
adminRouter.post("/food-vendors/delete-vendor", async (req, res) => {
  try {
    const restaurantId = safeText(req.body?.restaurantId || "");
    const confirmText = safeText(req.body?.confirmText || "");
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
    if (confirmText !== "DELETE_VENDOR") {
      return res.status(400).json({
        error: "DELETE_CONFIRMATION_REQUIRED",
        message: "Vendor deletion requires explicit confirmation text."
      });
    }

    // Cascade delete menu items + vendor menus, then vendor row itself.
    await supabaseAdminDeleteWhere("ev_menu_items", { restaurant_id: restaurantId }, "id");
    try { await supabaseAdminDeleteWhere("ev_vendor_menus", { restaurant_id: restaurantId }, "restaurant_id"); } catch { /* optional table */ }
    await supabaseAdminDeleteWhere("ev_restaurants", { id: restaurantId }, "id");
    return res.json({ ok: true, deleted: { restaurantId } });
  } catch (err: any) {
    return res.status(500).json({ error: "DELETE_VENDOR_FAILED", message: String(err?.message || err) });
  }
});

adminRouter.post("/food-vendors/replace-menu", async (req, res) => {
  try {
    const restaurantId = safeText(req.body?.restaurantId || "");
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
    if (!items.length) return res.status(400).json({ error: "ITEMS_REQUIRED" });

    // Non-destructive semantics: only upsert provided rows; never delete existing rows.
    const normalized = items.map((x: any) => ({
      ...x,
      id: safeText(x?.id || ""),
      restaurant_id: restaurantId
    })).filter((x: any) => x.id);
    if (!normalized.length) return res.status(400).json({ error: "ITEM_IDS_REQUIRED" });

    const { url } = assertSupabaseAdminConfigured();
    const endpoint = `${url}/rest/v1/ev_menu_items?on_conflict=id`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: supabaseAdminHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(normalized)
    });
    if (!r.ok) return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: await r.text() });
    return res.json({ ok: true, upserted: normalized.length });
  } catch (err: any) {
    return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: String(err?.message || err) });
  }
});
