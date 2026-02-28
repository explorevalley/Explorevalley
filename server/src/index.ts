import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { makeBot } from "./services/notify";
import { parseAdminChatIds } from "./bot/acl";
import { registerBot } from "./bot/bot";
import type { AgentRole } from "./services/agents";
import { rateLimit } from "./services/ratelimit";
import { publicRouter } from "./routes/public";
import { bookingRouter } from "./routes/booking";
import { cabRouter } from "./routes/cab";
import { busRouter } from "./routes/bus";
import { bikeRouter } from "./routes/bike";
import { foodRouter } from "./routes/food";
import { queryRouter } from "./routes/query";
import { authRouter } from "./routes/auth";
import { compatRouter } from "./routes/compat";
import { adminRouter } from "./routes/admin";
import { ordersRouter } from "./routes/orders";
import { analyticsRouter } from "./routes/analytics";
import { aiSupportRouter } from "./routes/aiSupport";
import { deliveryRouter } from "./routes/delivery";
import { refundRouter } from "./routes/refund";
import { cartRouter } from "./routes/cart";
import { profileRouter } from "./routes/profile";

// Load env from both project root and server/.env so runtime is stable regardless of cwd.
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

const PORT = Number(process.env.PORT || 8082);
const HOST = (process.env.HOST || "0.0.0.0").trim() || "0.0.0.0";

// Ensure preflight (OPTIONS) succeeds even when other middleware (rate limiting) is enabled.
const corsMiddleware = cors({
  origin: true, // reflect request origin
  credentials: true, // allow cookies/auth headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Content-Length", "Content-Type"],
  maxAge: 86400
});
// Long, unguessable default admin UI path (override via ADMIN_UI_PATH env).
// Keep this private; do not publish it in public docs.
const ADMIN_UI_PATH_RAW = process.env.ADMIN_UI_PATH || "/_ev_console_x9k2p7_9b3f21a7c4d8e0f6a1b5c7d9e2f4a6b8c0d1e3f5a7b9c2d4e6f8a0b1c3d5e7f9";
const ADMIN_UI_PATH = ADMIN_UI_PATH_RAW.startsWith("/") ? ADMIN_UI_PATH_RAW : `/${ADMIN_UI_PATH_RAW}`;
const ADMIN_CHAT_IDS = parseAdminChatIds(process.env.ADMIN_CHAT_IDS);
const TELEGRAM_MODE = (process.env.TELEGRAM_MODE || "").trim().toLowerCase(); // "polling" | "webhook" | "off"
const TELEGRAM_WEBHOOK_BASE_URL = (process.env.TELEGRAM_WEBHOOK_BASE_URL || "").trim();
const TELEGRAM_WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
const IS_PROD_RUNTIME = process.env.NODE_ENV === "production";

const receiverMode = TELEGRAM_MODE || (IS_PROD_RUNTIME ? "off" : "polling");
const enablePolling = receiverMode === "polling";
const enableWebhook = receiverMode === "webhook";

const botTokens = {
  admin: process.env.TELEGRAM_BOT_TOKEN || "",
  support: process.env.TELEGRAM_SUPPORT_BOT_TOKEN || "",
  sales: process.env.TELEGRAM_SALES_BOT_TOKEN || "",
  ops: process.env.TELEGRAM_OPS_BOT_TOKEN || "",
  finance: process.env.TELEGRAM_FINANCE_BOT_TOKEN || "",
};

const botNoop = { sendMessage: async () => undefined } as any;

const bots: Record<string, ReturnType<typeof makeBot> | typeof botNoop> = {};

function webhookPath(key: string) {
  const secret = TELEGRAM_WEBHOOK_SECRET ? `/${TELEGRAM_WEBHOOK_SECRET}` : "";
  return `/telegram/${key}${secret}`;
}

function createBot(key: keyof typeof botTokens, role: AgentRole, requireAdmin: boolean, enableAdminCommands: boolean) {
  const token = botTokens[key];
  if (!token) {
    console.warn(`Telegram bot disabled for ${key}. Missing token.`);
    return botNoop;
  }

  const bot = makeBot(token, { polling: enablePolling });
  registerBot(bot as ReturnType<typeof makeBot>, ADMIN_CHAT_IDS, {
    key,
    role,
    requireAdmin,
    enableAdminCommands,
  });
  bots[key] = bot;
  return bot;
}

const adminBot = createBot("admin", "manager", true, true);
createBot("support", "support", false, false);
createBot("sales", "sales", false, false);
createBot("ops", "ops", false, false);
createBot("finance", "finance", false, false);

if (ADMIN_CHAT_IDS.length === 0) {
  console.warn("Telegram admin receiver disabled. Missing ADMIN_CHAT_IDS.");
} else if (enablePolling) {
  console.warn("Telegram admin receiver enabled via polling.");
} else if (enableWebhook) {
  console.warn("Telegram receiver enabled via webhook.");
} else {
  console.warn(`Telegram admin receiver disabled (receiverMode=${receiverMode}). Set TELEGRAM_MODE=polling or webhook to enable updates.`);
}

const app = express();
// Reduce fingerprinting.
app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Prevent clickjacking by default; public/admin UIs do not require framing.
  frameguard: { action: "deny" },
  contentSecurityPolicy: false
}));
app.use(corsMiddleware);
app.options("*", corsMiddleware);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

if (enableWebhook) {
  if (!TELEGRAM_WEBHOOK_BASE_URL) {
    console.warn("Telegram webhook mode enabled, but TELEGRAM_WEBHOOK_BASE_URL is missing.");
  }

  for (const [key, bot] of Object.entries(bots)) {
    const path = webhookPath(key);
    if (typeof (bot as any).processUpdate === "function") {
      app.post(path, (req, res) => {
        try {
          (bot as any).processUpdate(req.body);
        } catch (err) {
          console.error(`[TELEGRAM:${key}] Failed to process update:`, err);
        }
        res.json({ ok: true });
      });
    }

    if (TELEGRAM_WEBHOOK_BASE_URL && typeof (bot as any).setWebHook === "function") {
      const url = `${TELEGRAM_WEBHOOK_BASE_URL}${path}`;
      (bot as any).setWebHook(url).catch((err: any) => {
        console.error(`[TELEGRAM:${key}] Failed to set webhook:`, err?.message || err);
      });
    }
  }
}

// serve uploads BEFORE rate limiting (static files shouldn't be rate limited)
const uploadsPath = path.join(process.cwd(), "..", "public", "uploads");
console.log("📁 Serving uploads from:", uploadsPath);
console.log("📁 Directory exists:", require("fs").existsSync(uploadsPath));
app.use("/uploads", cors(), express.static(uploadsPath));
const adminUiPath = path.join(process.cwd(), "..", "public", "admin");
app.use(ADMIN_UI_PATH, express.static(adminUiPath));
const customerUiPath = path.join(process.cwd(), "..", "public", "customer");
app.use("/customer", express.static(customerUiPath));
// Do not expose a short /admin alias; only ADMIN_UI_PATH should work.

// Apply rate limiting to API routes only
app.use(rateLimit);

// public content
app.use("/api", publicRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/orders", ordersRouter());
app.use("/api/analytics", analyticsRouter);
app.use("/api", compatRouter(adminBot, ADMIN_CHAT_IDS));

// actions
app.use("/api/bookings", bookingRouter(adminBot, ADMIN_CHAT_IDS));
app.use("/api/cab-bookings", cabRouter(adminBot, ADMIN_CHAT_IDS));
app.use("/api/cabs", cabRouter(adminBot, ADMIN_CHAT_IDS));
app.use("/api/buses", busRouter());
app.use("/api/bus-bookings", busRouter());
app.use("/api/bike-rentals", bikeRouter());
app.use("/api/bike-bookings", bikeRouter());
app.use("/api/food-orders", foodRouter(adminBot, ADMIN_CHAT_IDS));
app.use("/api/queries", queryRouter(adminBot, ADMIN_CHAT_IDS));
app.use("/api/ai", aiSupportRouter(adminBot, ADMIN_CHAT_IDS));
app.use("/api/delivery", deliveryRouter(adminBot, ADMIN_CHAT_IDS));
app.use("/api/refunds", refundRouter(adminBot, ADMIN_CHAT_IDS));
app.use("/api/cart", cartRouter());
app.use("/api/profile", profileRouter());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use((err: any, req: any, res: any, _next: any) => {
  // Ensure CORS headers are sent even for errors
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (err?.type === "entity.too.large" || err?.status === 413) {
    return res.status(413).json({
      error: "PAYLOAD_TOO_LARGE",
      message: "Request payload is too large. Reduce body size or upload files via /api/admin/upload-image."
    });
  }
  return res.status(err?.status || 500).json({
    error: "SERVER_ERROR",
    message: err?.message || "Unexpected server error"
  });
});

app.listen(PORT, HOST, async () => {
  // Log both the bind address and the typical local URL (0.0.0.0 is not directly browsable).
  console.log(`ExploreValley server listening on ${HOST}:${PORT}`);
  console.log(`ExploreValley server local URL: http://localhost:${PORT}`);

  // ── OpenAI diagnostic (remove after confirming access) ──
  const crypto = await import("crypto");
  const keyFp = (k: string) => crypto.createHash("sha256").update(k).digest("hex").slice(0, 12);
  const apiKey = process.env.OPENAI_API_KEY || "";
  console.log("[OPENAI] key_present:", !!apiKey);
  console.log("[OPENAI] key_fp:", apiKey ? keyFp(apiKey) : "none");
  console.log("[OPENAI] OPENAI_PROJECT_ID:", process.env.OPENAI_PROJECT_ID || "not-set");
  console.log("[OPENAI] OPENAI_ORG_ID:", process.env.OPENAI_ORG_ID || "not-set");
  console.log("[OPENAI] OPENAI_BASE_URL:", process.env.OPENAI_BASE_URL || "not-set");
  console.log("[OPENAI] TRANSCRIBE_MODEL:", process.env.OPENAI_TRANSCRIBE_MODEL || "not-set");

  if (apiKey) {
    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey });
      const models = await (client as any).models.list();
      const allModels = models?.data?.map((m: any) => m.id) || [];
      console.log("[OPENAI] models_count:", allModels.length);
      const audioModels = allModels.filter((id: string) =>
        /whisper|transcri|audio/i.test(id)
      );
      console.log("[OPENAI] audio/transcription models:", audioModels.length ? audioModels : "NONE FOUND");
      console.log("[OPENAI] first_30_models:", allModels.slice(0, 30));
    } catch (e: any) {
      console.error("[OPENAI] models.list failed:", e?.message || e);
    }
  }
});
