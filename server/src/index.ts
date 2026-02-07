import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { makeBot } from "./services/notify";
import { parseAdminChatIds } from "./bot/acl";
import { registerBot } from "./bot/bot";
import { rateLimit } from "./services/ratelimit";
import { publicRouter } from "./routes/public";
import { bookingRouter } from "./routes/booking";
import { cabRouter } from "./routes/cab";
import { foodRouter } from "./routes/food";
import { queryRouter } from "./routes/query";

const PORT = Number(process.env.PORT || 8080);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_IDS = parseAdminChatIds(process.env.ADMIN_CHAT_IDS);

if (!BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN in .env");
  process.exit(1);
}
if (ADMIN_CHAT_IDS.length === 0) {
  console.error("Missing ADMIN_CHAT_IDS (comma-separated numeric chat ids) in .env");
  process.exit(1);
}

const bot = makeBot(BOT_TOKEN);
registerBot(bot, ADMIN_CHAT_IDS);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit);

// serve uploads
app.use("/uploads", express.static(path.join(process.cwd(), "..", "public", "uploads")));

// public content
app.use("/api", publicRouter);

// actions
app.use("/api/bookings", bookingRouter(bot, ADMIN_CHAT_IDS));
app.use("/api/cab-bookings", cabRouter(bot, ADMIN_CHAT_IDS));
app.use("/api/food-orders", foodRouter(bot, ADMIN_CHAT_IDS));
app.use("/api/queries", queryRouter(bot, ADMIN_CHAT_IDS));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`ExploreValley server running on http://localhost:${PORT}`);
});
