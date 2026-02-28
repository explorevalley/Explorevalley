// Avoid depending on node-telegram-bot-api type declarations (they vary by TS/module settings).
// We only need a small subset of the bot API surface.
type BotLike = any;
import path from "path";
import fs from "fs-extra";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { userStates, type Flow } from "./state";
import { isAdmin } from "./acl";
import { mutateData, readData } from "../services/jsondb";
import { makeId } from "@explorevalley/shared";
import { generateMenuPDF } from "../services/pdfMenu";
import { escalateToManager } from "../services/aiSupport";
import {
  analyzeImage,
  extractHotelFromText,
  extractHotelFieldsFromImage,
  extractHotelPatchFromText,
  extractMenuFieldsFromImage,
  extractMenuFromText,
  extractMenuPatchFromText,
  extractTourFieldsFromImage,
  extractTourPackagesFromImage,
  extractTourPackagesFromText,
  extractRawTextFromImage,
  extractTourPatchFromText,
  runAgentMessage,
  transcribeAudio,
  type AgentMessage,
  type AgentRole
} from "../services/agents";
import { sendOrderStatusEmail } from "../services/email";
import { notifyVendorNewOrder } from "../services/vendorMessaging";
import { createDeliveryRecord, notifyFieldTeam, notifyDeliveryUpdate } from "../services/delivery";
import { formatMoney } from "../services/notify";

type RegisterOptions = {
  key?: string;
  role?: AgentRole;
  requireAdmin?: boolean;
  enableAdminCommands?: boolean;
};

function safeText(v: any): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

async function downloadPhoto(bot: BotLike, fileId: string, subdir: string) {
  const file = await bot.getFile(fileId);
  const urlPath = file.file_path!;
  const ext = path.extname(urlPath) || ".jpg";
  const outDir = path.join(process.cwd(), "..", "public", "uploads", subdir);
  await fs.ensureDir(outDir);
  const outName = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}${ext}`;
  const outPath = path.join(outDir, outName);
  const tmpDir = path.join(outDir, "_tmp");
  await fs.ensureDir(tmpDir);
  const tmp = await bot.downloadFile(fileId, tmpDir);
  await fs.move(tmp, outPath, { overwrite: true });
  await fs.remove(tmpDir);
  return `/uploads/${subdir}/${outName}`;
}

/* ---------- Field team chat IDs ---------- */
function parseFieldChatIds(): number[] {
  const raw = process.env.FIELD_TEAM_CHAT_IDS || "";
  if (!raw) return [];
  return raw.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n));
}

function makeStateKey(botKey: string, chatId: number) {
  return `${botKey}:${chatId}`;
}

function extractUserName(msg: any): string {
  const from = msg?.from || {};
  return String(from.first_name || from.username || "Telegram User").trim() || "Telegram User";
}

function normalizeList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeRoomTypes(value: any): Array<{ type: string; price: number; capacity: number }> {
  if (!Array.isArray(value)) return [];
  return value.map((r) => ({
    type: String(r?.type || "Standard").trim() || "Standard",
    price: Number(r?.price || 0),
    capacity: Number(r?.capacity || 2)
  }));
}

function shouldRescan(text: string): boolean {
  return /(rescan|scan again|read again|look more|more detail|zoom|details|recheck)/i.test(text || "");
}

function shouldMakeJson(text: string): boolean {
  return /(make|create|build|generate|extract|parse).*(json|package|packages|tour|hotel|menu)/i.test(text || "")
    || /json/i.test(text || "");
}

function mergeTourFields(target: any, incoming: any) {
  if (!incoming || typeof incoming !== "object") return;
  if (!target.title && incoming.title) target.title = String(incoming.title).trim();
  if (!target.description && incoming.description) target.description = String(incoming.description).trim();
  if (!target.price && Number.isFinite(Number(incoming.price))) target.price = Number(incoming.price);
  if (!target.duration && incoming.duration) target.duration = String(incoming.duration).trim();
  if (!target.highlights?.length && incoming.highlights) target.highlights = normalizeList(incoming.highlights);
  if (!target.itinerary && incoming.itinerary) target.itinerary = String(incoming.itinerary).trim();
  if (!target.inclusions?.length && incoming.inclusions) target.inclusions = normalizeList(incoming.inclusions);
  if (!target.exclusions?.length && incoming.exclusions) target.exclusions = normalizeList(incoming.exclusions);
  if (!target.maxGuests && Number.isFinite(Number(incoming.maxGuests))) target.maxGuests = Number(incoming.maxGuests);
}

function applyTourPatch(target: any, incoming: any) {
  if (!incoming || typeof incoming !== "object") return;
  if (Object.prototype.hasOwnProperty.call(incoming, "title")) target.title = String(incoming.title || "").trim() || target.title;
  if (Object.prototype.hasOwnProperty.call(incoming, "description")) target.description = String(incoming.description || "").trim() || target.description;
  if (Object.prototype.hasOwnProperty.call(incoming, "price")) target.price = Number(incoming.price || 0);
  if (Object.prototype.hasOwnProperty.call(incoming, "duration")) target.duration = String(incoming.duration || "").trim() || target.duration;
  if (Object.prototype.hasOwnProperty.call(incoming, "highlights")) target.highlights = normalizeList(incoming.highlights);
  if (Object.prototype.hasOwnProperty.call(incoming, "itinerary")) target.itinerary = String(incoming.itinerary || "").trim() || target.itinerary;
  if (Object.prototype.hasOwnProperty.call(incoming, "inclusions")) target.inclusions = normalizeList(incoming.inclusions);
  if (Object.prototype.hasOwnProperty.call(incoming, "exclusions")) target.exclusions = normalizeList(incoming.exclusions);
  if (Object.prototype.hasOwnProperty.call(incoming, "maxGuests")) target.maxGuests = Number(incoming.maxGuests || 0);
}

function mergeHotelFields(target: any, incoming: any) {
  if (!incoming || typeof incoming !== "object") return;
  if (!target.name && incoming.name) target.name = String(incoming.name).trim();
  if (!target.description && incoming.description) target.description = String(incoming.description).trim();
  if (!target.location && incoming.location) target.location = String(incoming.location).trim();
  if (!target.pricePerNight && Number.isFinite(Number(incoming.pricePerNight))) target.pricePerNight = Number(incoming.pricePerNight);
  if (!target.amenities?.length && incoming.amenities) target.amenities = normalizeList(incoming.amenities);
  if (!target.roomTypes?.length && incoming.roomTypes) target.roomTypes = normalizeRoomTypes(incoming.roomTypes);
  if (!target.rating && Number.isFinite(Number(incoming.rating))) target.rating = Number(incoming.rating);
  if (!target.checkInTime && incoming.checkInTime) target.checkInTime = String(incoming.checkInTime).trim();
  if (!target.checkOutTime && incoming.checkOutTime) target.checkOutTime = String(incoming.checkOutTime).trim();
}

function applyHotelPatch(target: any, incoming: any) {
  if (!incoming || typeof incoming !== "object") return;
  if (Object.prototype.hasOwnProperty.call(incoming, "name")) target.name = String(incoming.name || "").trim() || target.name;
  if (Object.prototype.hasOwnProperty.call(incoming, "description")) target.description = String(incoming.description || "").trim() || target.description;
  if (Object.prototype.hasOwnProperty.call(incoming, "location")) target.location = String(incoming.location || "").trim() || target.location;
  if (Object.prototype.hasOwnProperty.call(incoming, "pricePerNight")) target.pricePerNight = Number(incoming.pricePerNight || 0);
  if (Object.prototype.hasOwnProperty.call(incoming, "amenities")) target.amenities = normalizeList(incoming.amenities);
  if (Object.prototype.hasOwnProperty.call(incoming, "roomTypes")) target.roomTypes = normalizeRoomTypes(incoming.roomTypes);
  if (Object.prototype.hasOwnProperty.call(incoming, "rating")) target.rating = Number(incoming.rating || 0);
  if (Object.prototype.hasOwnProperty.call(incoming, "checkInTime")) target.checkInTime = String(incoming.checkInTime || "").trim() || target.checkInTime;
  if (Object.prototype.hasOwnProperty.call(incoming, "checkOutTime")) target.checkOutTime = String(incoming.checkOutTime || "").trim() || target.checkOutTime;
}

function mergeMenuFields(target: any, incoming: any) {
  if (!incoming || typeof incoming !== "object") return;
  if (!target.name && incoming.name) target.name = String(incoming.name).trim();
  if (!target.category && incoming.category) target.category = String(incoming.category).trim();
  if (!target.description && incoming.description) target.description = String(incoming.description).trim();
  if (!target.price && Number.isFinite(Number(incoming.price))) target.price = Number(incoming.price);
  if (target.isVeg === undefined && typeof incoming.isVeg === "boolean") target.isVeg = incoming.isVeg;
}

function applyMenuPatch(target: any, incoming: any) {
  if (!incoming || typeof incoming !== "object") return;
  if (Object.prototype.hasOwnProperty.call(incoming, "name")) target.name = String(incoming.name || "").trim() || target.name;
  if (Object.prototype.hasOwnProperty.call(incoming, "category")) target.category = String(incoming.category || "").trim() || target.category;
  if (Object.prototype.hasOwnProperty.call(incoming, "description")) target.description = String(incoming.description || "").trim() || target.description;
  if (Object.prototype.hasOwnProperty.call(incoming, "price")) target.price = Number(incoming.price || 0);
  if (Object.prototype.hasOwnProperty.call(incoming, "isVeg")) target.isVeg = Boolean(incoming.isVeg);
}

function applyTourDefaults(target: any) {
  if (!target.title) target.title = "Custom Tour Package";
  if (!target.description) target.description = "Curated ExploreValley tour package.";
  if (!Number.isFinite(Number(target.price)) || Number(target.price) <= 0) target.price = 999;
  if (!target.duration) target.duration = "1 day";
  if (!target.highlights?.length) target.highlights = ["Scenic views", "Local experiences", "Comfortable stays"];
  if (!target.itinerary) target.itinerary = "Day 1: Arrival and local sightseeing.";
  if (!target.inclusions?.length) target.inclusions = ["Accommodation", "Local transport"];
  if (!target.exclusions?.length) target.exclusions = ["Personal expenses", "Tips"];
  if (!Number.isFinite(Number(target.maxGuests))) target.maxGuests = 10;
}

function applyHotelDefaults(target: any) {
  if (!target.name) target.name = "ExploreValley Cottage";
  if (!target.description) target.description = "Cozy stay with scenic views.";
  if (!target.location) target.location = "Himachal Pradesh";
  if (!Number.isFinite(Number(target.pricePerNight))) target.pricePerNight = 1500;
  if (!target.amenities?.length) target.amenities = ["WiFi", "Hot water", "Parking"];
  if (!target.roomTypes?.length) target.roomTypes = [{ type: "Standard", price: 1500, capacity: 2 }];
  if (!Number.isFinite(Number(target.rating))) target.rating = 4.2;
  if (!target.checkInTime) target.checkInTime = "14:00";
  if (!target.checkOutTime) target.checkOutTime = "11:00";
}

function applyMenuDefaults(target: any) {
  if (!target.name) target.name = "Special Dish";
  if (!target.category) target.category = "Main Course";
  if (!target.description) target.description = "Chef's special item.";
  if (!Number.isFinite(Number(target.price))) target.price = 199;
  if (target.isVeg === undefined) target.isVeg = true;
}

function tourSummary(data: any): string {
  const payload = {
    title: data.title,
    description: data.description,
    price: Number(data.price || 0),
    duration: data.duration,
    highlights: data.highlights || [],
    itinerary: data.itinerary || "",
    inclusions: data.inclusions || [],
    exclusions: data.exclusions || [],
    maxGuests: Number(data.maxGuests || 0),
    images: data.images || [],
  };
  return JSON.stringify(payload, null, 2);
}

function toursSummary(list: any[]): string {
  const out = (list || []).map((item) => ({
    title: item.title,
    description: item.description,
    price: Number(item.price || 0),
    duration: item.duration,
    highlights: item.highlights || [],
    itinerary: item.itinerary || "",
    inclusions: item.inclusions || [],
    exclusions: item.exclusions || [],
    maxGuests: Number(item.maxGuests || 0),
    images: item.images || [],
  }));
  return JSON.stringify(out, null, 2);
}

function hotelSummary(data: any): string {
  const payload = {
    name: data.name,
    description: data.description,
    location: data.location,
    pricePerNight: Number(data.pricePerNight || 0),
    amenities: data.amenities || [],
    roomTypes: data.roomTypes || [],
    rating: Number(data.rating || 0),
    checkInTime: data.checkInTime,
    checkOutTime: data.checkOutTime,
    images: data.images || [],
  };
  return JSON.stringify(payload, null, 2);
}

function menuSummary(data: any): string {
  const payload = {
    name: data.name,
    category: data.category,
    description: data.description,
    price: Number(data.price || 0),
    isVeg: !!data.isVeg,
    images: data.images || [],
  };
  return JSON.stringify(payload, null, 2);
}


export function registerBot(bot: BotLike, adminChatIds: number[], opts: RegisterOptions = {}) {
  const botKey = (opts.key || "admin").trim() || "admin";
  const role: AgentRole = opts.role || "manager";
  const requireAdmin = opts.requireAdmin !== undefined ? opts.requireAdmin : true;
  const enableAdminCommands = opts.enableAdminCommands !== undefined ? opts.enableAdminCommands : true;
  const fieldChatIds = parseFieldChatIds();
  const isAllowed = (chatId: number) => !requireAdmin || isAdmin(chatId, adminChatIds);
  const stateKey = (chatId: number) => makeStateKey(botKey, chatId);
  const execFileAsync = promisify(execFile);

  async function handleAgentInput(chatId: number, text: string, msg: any) {
    if (requireAdmin && !isAllowed(chatId)) return;
    const key = stateKey(chatId);
    const now = new Date().toISOString();
    const existing = userStates.get(key);
    const state: Flow = existing?.kind === "agent_chat"
      ? existing
      : { kind: "agent_chat", data: { conversationId: makeId("conv"), messages: [] as AgentMessage[], role } };
    const history = (state.data.messages || []) as AgentMessage[];

    const db = await readData();
    const result = await runAgentMessage({
      role: (state.data.role as AgentRole) || role,
      message: text,
      db,
      user: { name: extractUserName(msg) },
      channel: "telegram",
      history,
    });

    history.push({ role: "user", content: text, timestamp: now });
    history.push({ role: "assistant", content: result.reply, timestamp: now });
    state.data.messages = history.slice(-20);
    userStates.set(key, state);

    try {
      await bot.sendMessage(chatId, result.reply, { parse_mode: "Markdown" });
    } catch {
      await bot.sendMessage(chatId, result.reply);
    }

    if (result.shouldEscalate && result.escalationData && adminChatIds.length) {
      escalateToManager(bot, adminChatIds, {
        customerName: extractUserName(msg),
        customerPhone: "",
        orderId: result.escalationData.orderId,
        reason: result.escalationData.reason,
        conversationSummary: result.escalationData.conversationSummary,
        channel: "telegram_bot",
      }).catch(err => console.error("[BOT:ESCALATE]", err));
    }
  }

  /* ========== HELP ========== */
  bot.onText(/\/help/, (msg: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    bot.sendMessage(msg.chat.id,
`🌄 ExploreValley Admin Bot

📦 Content Management:
/addtour — Add a new tour
/addhotel — Add a new hotel
/addmenu — Add a menu item
/done — Finish photo upload

📊 Operations:
/status — System overview
/orders — Pending orders summary
/order <id> — View specific order
/updateorder <id> <status> — Update order status
/assign <orderId> <name> <phone> — Assign delivery

💬 Customer Support:
/ai — Start AI assistant mode
/stopai — Exit AI assistant

🔧 System:
/backup — Download data backup
/vendormsg <orderId> — Send vendor notification
/broadcast <message> — Broadcast to all admin channels
`);
  });

  /* ========== STATUS ========== */
  bot.onText(/\/status/, async (msg: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    const db = await readData();
    try { await generateMenuPDF(db); } catch (_e) { /* ignore pdf errors */ }
    bot.sendMessage(msg.chat.id,
`🌐 ExploreValley Status

📊 Catalog:
  Tours: ${db.tours.filter((t: any) => t.available).length} active
  Hotels: ${db.hotels.filter((h: any) => h.available).length} active
  Menu Items: ${db.menuItems.filter((m: any) => m.available).length} active
  Restaurants: ${(db.restaurants || []).filter((r: any) => r.available).length} active

📦 Live Queue:
  Bookings: ${db.bookings.filter((b: any) => b.status === "pending").length} pending
  Food Orders: ${db.foodOrders.filter((o: any) => o.status === "pending").length} pending
  Cab Bookings: ${db.cabBookings.filter((c: any) => c.status === "pending").length} pending
  Queries: ${db.queries.filter((q: any) => q.status === "pending").length} pending

👥 Customers: ${(db.userProfiles || []).length} profiles
`);
  });

  /* ========== ORDERS SUMMARY ========== */
  bot.onText(/\/orders/, async (msg: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    const db = await readData();
    const pending = [
      ...db.bookings.filter((b: any) => b.status === "pending").map((b: any) => ({ id: b.id, type: b.type || "booking", name: b.userName, phone: b.phone, total: b.pricing?.totalAmount })),
      ...db.foodOrders.filter((o: any) => o.status === "pending").map((o: any) => ({ id: o.id, type: "food", name: o.userName, phone: o.phone, total: o.pricing?.totalAmount })),
      ...db.cabBookings.filter((c: any) => c.status === "pending").map((c: any) => ({ id: c.id, type: "cab", name: c.userName, phone: c.phone, total: c.estimatedFare })),
    ];
    if (!pending.length) return bot.sendMessage(msg.chat.id, "✅ No pending orders!");
    const lines = pending.slice(0, 20).map((o, i) =>
      `${i + 1}. ${o.id}\n   ${o.type} | ${o.name} | ${o.phone}${o.total ? ` | ${formatMoney(Number(o.total))}` : ""}`
    );
    bot.sendMessage(msg.chat.id, `📦 Pending Orders (${pending.length}):\n\n${lines.join("\n\n")}\n\nUse /order <id> for details\nUse /updateorder <id> <status> to update`);
  });

  /* ========== VIEW ORDER ========== */
  bot.onText(/\/order\s+(\S+)/, async (msg: any, match: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    const orderId = safeText(match[1]);
    const db = await readData();
    const order: any = [...db.bookings, ...db.foodOrders, ...db.cabBookings].find((o: any) => o.id === orderId);
    if (!order) return bot.sendMessage(msg.chat.id, `❌ Order ${orderId} not found.`);
    const lines = [
      `📋 Order: ${order.id}`,
      `Type: ${order.type || "N/A"}`,
      `Status: ${order.status}`,
      `Customer: ${order.userName || "N/A"}`,
      `Phone: ${order.phone || "N/A"}`,
      `Email: ${order.email || "N/A"}`,
    ];
    if (order.pricing) lines.push(`Total: ${formatMoney(Number(order.pricing.totalAmount || 0))}`);
    if (order.estimatedFare) lines.push(`Fare: ${formatMoney(Number(order.estimatedFare))}`);
    if (order.items) {
      const itemLines = order.items.map((it: any) => `  • ${it.name} x${it.quantity}`).join("\n");
      lines.push(`Items:\n${itemLines}`);
    }
    if (order.deliveryAddress) lines.push(`Address: ${order.deliveryAddress}`);
    if (order.checkIn) lines.push(`Check-in: ${order.checkIn}`);
    if (order.checkOut) lines.push(`Check-out: ${order.checkOut}`);
    if (order.tourDate) lines.push(`Tour Date: ${order.tourDate}`);
    if (order.bookingDate || order.orderTime || order.createdAt) {
      lines.push(`Created: ${order.bookingDate || order.orderTime || order.createdAt}`);
    }
    bot.sendMessage(msg.chat.id, lines.join("\n"));
  });

  /* ========== UPDATE ORDER STATUS ========== */
  bot.onText(/\/updateorder\s+(\S+)\s+(\S+)/, async (msg: any, match: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    const orderId = safeText(match[1]);
    const newStatus = safeText(match[2]).toLowerCase();
    const validStatuses = ["pending", "confirmed", "processing", "picked_up", "in_transit", "delivered", "completed", "cancelled"];
    if (!validStatuses.includes(newStatus)) {
      return bot.sendMessage(msg.chat.id, `❌ Invalid status. Valid: ${validStatuses.join(", ")}`);
    }
    let found = false;
    let orderEmail = "";
    let orderName = "";
    let orderType = "";
    try {
      await mutateData((db) => {
        const now = new Date().toISOString();
        for (const b of db.bookings) {
          if (b.id === orderId) {
            (b as any).status = newStatus;
            found = true; orderEmail = b.email || ""; orderName = b.userName || ""; orderType = b.type || "booking";
            db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: msg.chat.id, action: "UPDATE_ORDER_STATUS", entity: "booking", entityId: orderId } as any);
            return;
          }
        }
        for (const f of db.foodOrders) {
          if (f.id === orderId) {
            (f as any).status = newStatus;
            found = true; orderName = f.userName || ""; orderType = "food";
            db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: msg.chat.id, action: "UPDATE_ORDER_STATUS", entity: "food", entityId: orderId } as any);
            return;
          }
        }
        for (const c of db.cabBookings) {
          if (c.id === orderId) {
            (c as any).status = newStatus;
            found = true; orderName = c.userName || ""; orderType = "cab";
            db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: msg.chat.id, action: "UPDATE_ORDER_STATUS", entity: "cab", entityId: orderId } as any);
            return;
          }
        }
      }, "update_order");
    } catch (err: any) {
      return bot.sendMessage(msg.chat.id, `❌ Error: ${err?.message || err}`);
    }
    if (!found) return bot.sendMessage(msg.chat.id, `❌ Order ${orderId} not found.`);
    bot.sendMessage(msg.chat.id, `✅ Order ${orderId} updated to: ${newStatus}`);
    // Send email notification
    if (orderEmail) {
      const statusMessages: Record<string, string> = {
        confirmed: "Your order has been confirmed and is being prepared.",
        processing: "Your order is being processed.",
        picked_up: "Your order has been picked up and is on the way!",
        in_transit: "Your order is in transit.",
        delivered: "Your order has been delivered. Enjoy!",
        completed: "Your order is completed. Thank you!",
        cancelled: "Your order has been cancelled. Contact support for queries.",
      };
      sendOrderStatusEmail({
        email: orderEmail, name: orderName, orderId, orderType, status: newStatus,
        message: statusMessages[newStatus] || `Status updated to ${newStatus}`,
      }).catch(err => console.error("[BOT:EMAIL]", err));
    }
  });

  /* ========== ASSIGN DELIVERY ========== */
  bot.onText(/\/assign\s+(\S+)\s+(.+?)\s+(\d[\d\s+-]*)$/, async (msg: any, match: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    const orderId = safeText(match[1]);
    const driverName = safeText(match[2]);
    const driverPhone = safeText(match[3]).replace(/\s+/g, "");
    const db = await readData();
    const order: any = [...db.bookings, ...db.foodOrders, ...db.cabBookings].find((o: any) => o.id === orderId);
    if (!order) return bot.sendMessage(msg.chat.id, `❌ Order ${orderId} not found.`);
    const record = createDeliveryRecord(orderId, order.type || "food");
    record.assignedTo = driverName;
    record.assignedPhone = driverPhone;
    record.status = "assigned";
    record.updatedAt = new Date().toISOString();
    if (fieldChatIds.length) {
      notifyFieldTeam(bot, fieldChatIds, record, {
        name: order.userName || "", phone: order.phone || "", address: order.deliveryAddress || "",
      }).catch(err => console.error("[BOT:FIELD]", err));
    }
    notifyDeliveryUpdate(bot, adminChatIds, record).catch(err => console.error("[BOT:DELIVERY]", err));
    bot.sendMessage(msg.chat.id, `✅ Delivery assigned!\nOrder: ${orderId}\nDriver: ${driverName} (${driverPhone})\n\nField team notified via Telegram.`);
  });

  /* ========== AI ASSISTANT MODE ========== */
  bot.onText(/\/ai/, (msg: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    userStates.set(stateKey(msg.chat.id), { kind: "agent_chat", data: { conversationId: makeId("conv"), messages: [], role } });
    bot.sendMessage(msg.chat.id, "🤖 AI Assistant mode ON. Ask anything about orders, customers, data, or type /stopai to exit.\n\nI can:\n• Look up orders and customer data\n• Recommend tours/hotels/food\n• Handle refund escalations\n• Query your database");
  });

  bot.onText(/\/stopai/, (msg: any) => {
    if (!enableAdminCommands) return;
    const state = userStates.get(stateKey(msg.chat.id));
    if (state?.kind === "agent_chat") {
      userStates.delete(stateKey(msg.chat.id));
      bot.sendMessage(msg.chat.id, "🤖 AI Assistant mode OFF.");
    }
  });

  /* ========== VENDOR MESSAGE ========== */
  bot.onText(/\/vendormsg\s+(\S+)/, async (msg: any, match: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    const orderId = safeText(match[1]);
    const db = await readData();
    const foodOrder: any = db.foodOrders.find((o: any) => o.id === orderId);
    if (!foodOrder) return bot.sendMessage(msg.chat.id, `❌ Food order ${orderId} not found.`);
    const restaurantId = foodOrder.restaurantId || (foodOrder.items?.[0]?.restaurantId);
    const restaurant: any = (db.restaurants || []).find((r: any) => r.id === restaurantId);
    if (!restaurant?.vendorMobile) {
      return bot.sendMessage(msg.chat.id, `⚠️ No vendor mobile for restaurant ${restaurant?.name || restaurantId}. Set vendor_mobile in admin dashboard.`);
    }
    const items = (foodOrder.items || []).map((it: any) => `${it.name} x${it.quantity}`).join(", ");
    const total = formatMoney(Number(foodOrder.pricing?.totalAmount || 0));
    const result = await notifyVendorNewOrder({
      vendorMobile: restaurant.vendorMobile, vendorName: restaurant.name, orderId,
      customerName: foodOrder.userName, items, total, deliveryAddress: foodOrder.deliveryAddress,
    });
    bot.sendMessage(msg.chat.id, result.ok
      ? `✅ WhatsApp notification sent to ${restaurant.name} (${restaurant.vendorMobile})`
      : `❌ Failed to send: ${result.error}`
    );
  });

  /* ========== BROADCAST ========== */
  bot.onText(/\/broadcast\s+(.+)/, async (msg: any, match: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    const message = safeText(match[1]);
    if (!message) return;
    let sent = 0;
    for (const chatId of adminChatIds) {
      if (chatId === msg.chat.id) continue;
      try { await bot.sendMessage(chatId, `📢 BROADCAST:\n\n${message}`); sent++; } catch { /* skip */ }
    }
    bot.sendMessage(msg.chat.id, `✅ Broadcast sent to ${sent} admin channel(s).`);
  });

  /* ========== BACKUP ========== */
  bot.onText(/\/backup/, async (msg: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    const filePath = path.join(process.cwd(), "..", "data", "data.json");
    await bot.sendDocument(msg.chat.id, filePath, {}, { filename: `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json` });
    bot.sendMessage(msg.chat.id, "✅ Backup sent.");
  });

  /* ========== ADD TOUR ========== */
  bot.onText(/\/addtour/, (msg: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    userStates.set(stateKey(msg.chat.id), { kind: "addtour", step: 1, data: {} });
    bot.sendMessage(msg.chat.id, "Let's create a new tour. Send the tour title.");
  });

  /* ========== ADD HOTEL ========== */
  bot.onText(/\/addhotel/, (msg: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    userStates.set(stateKey(msg.chat.id), { kind: "addhotel", step: 1, data: { roomTypes: [] }, roomIndex: 0 });
    bot.sendMessage(msg.chat.id, "Let's add a new hotel. Send the hotel name.");
  });

  /* ========== ADD MENU ========== */
  bot.onText(/\/addmenu/, (msg: any) => {
    if (!enableAdminCommands) return;
    if (!isAllowed(msg.chat.id)) return;
    userStates.set(stateKey(msg.chat.id), { kind: "addmenu", step: 1, data: {} });
    bot.sendMessage(msg.chat.id, "Let's add a menu item. Send the item name.");
  });

  /* ========== DONE (finish photo upload) ========== */
  bot.onText(/\/done/, async (msg: any) => {
    if (!enableAdminCommands) return;
    const state = userStates.get(stateKey(msg.chat.id));
    if (!state) return;
    if (!isAllowed(msg.chat.id)) return;
    if (state.kind === "addtour" && state.collectingPhotos) {
      if (Array.isArray(state.data?.multiTours) && state.data.multiTours.length > 0) {
        await finalizeTours(msg.chat.id, bot, state.data.multiTours, state.data.images || []);
      } else {
        await finalizeTour(msg.chat.id, bot, state.data);
      }
      userStates.delete(stateKey(msg.chat.id)); return;
    }
    if (state.kind === "addhotel" && state.collectingPhotos) {
      await finalizeHotel(msg.chat.id, bot, state.data);
      userStates.delete(stateKey(msg.chat.id)); return;
    }
    if (state.kind === "addmenu" && state.collectingPhotos) {
      await finalizeMenu(msg.chat.id, bot, state.data);
      userStates.delete(stateKey(msg.chat.id)); return;
    }
    bot.sendMessage(msg.chat.id, "Nothing to finish right now.");
  });

  /* ========== PHOTO HANDLER ========== */
  const handleAddFlowImage = async (msg: any, fileId: string) => {
    const chatId = msg.chat.id;
    const key = stateKey(chatId);
    const state = userStates.get(key) as any;
    if (!state) return false;

    if ("collectingPhotos" in state && state.collectingPhotos) {
      const subdir = state.kind === "addmenu" ? "menu" : state.kind === "addhotel" ? "hotels" : "tours";
      const url = await downloadPhoto(bot, fileId, subdir);
      state.data.images = state.data.images || [];
      state.data.images.push(url);
      bot.sendMessage(chatId, `✅ Photo received (${state.data.images.length}). Send more or type /done`);
      return true;
    }

    const url = await downloadPhoto(bot, fileId, "bot-uploads");
    const localPath = path.join(process.cwd(), "..", "public", url);
    const rawText = await extractRawTextFromImage(localPath);
    state.data._lastImagePath = localPath;
    state.data._lastOcrText = rawText;
    state.awaitingJson = true;
    state.allowNaturalEdits = false;

    const label = state.kind === "addtour"
      ? "Tour OCR text"
      : state.kind === "addhotel"
        ? "Hotel OCR text"
        : "Menu OCR text";

    const suffix = rawText.trim()
      ? "\n\nSay \"make JSON\" when ready."
      : "\n\nNo text detected. Try sending the image as a document or a clearer photo, or say \"read again\".";

    await bot.sendMessage(
      chatId,
      `✅ ${label}:\n\n${rawText || "(No text detected)"}${suffix}`
    );
    return true;
  };

  bot.on("photo", async (msg: any) => {
    const chatId = msg.chat.id;
    if (requireAdmin && !isAllowed(chatId)) return;
    const key = stateKey(chatId);
    const state = userStates.get(key);
    if (enableAdminCommands && !isAllowed(chatId)) return;
    if (!("photo" in msg) || !msg.photo?.length) return;
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    if (state?.kind === "addtour" || state?.kind === "addhotel" || state?.kind === "addmenu") {
      await handleAddFlowImage(msg, fileId);
      return;
    }

    const url = await downloadPhoto(bot, fileId, "bot-uploads");
    const localPath = path.join(process.cwd(), "..", "public", url);
    const analysis = await analyzeImage(localPath);
    const prompt = analysis
      ? `Image analysis:\n${analysis}`
      : `User sent a photo: ${url}. Ask for details if needed.`;
    await handleAgentInput(chatId, prompt, msg);
    return;
  });

  /* ========== DOCUMENT IMAGE HANDLER ========== */
  bot.on("document", async (msg: any) => {
    const chatId = msg.chat.id;
    if (requireAdmin && !isAllowed(chatId)) return;
    if (enableAdminCommands && !isAllowed(chatId)) return;
    const doc = msg.document;
    if (!doc?.file_id) return;
    const mime = String(doc.mime_type || "").toLowerCase();

    // Handle audio documents (iPhone sometimes sends voice/audio as document)
    if (mime.startsWith("audio/") || mime === "video/ogg" || mime === "application/ogg") {
      console.log("[BOT:DOC] Audio document detected — mime:", mime, "file_name:", doc.file_name);
      try {
        const ext = path.extname(doc.file_name || "").toLowerCase() || ".ogg";
        await handleVoiceLike(chatId, doc.file_id, msg, ext.replace(".", ""));
      } catch (err: any) {
        bot.sendMessage(chatId, `❌ Failed to process audio document: ${err?.message || err}`);
      }
      return;
    }

    if (!mime.startsWith("image/")) return;
    const key = stateKey(chatId);
    const state = userStates.get(key);
    if (state?.kind === "addtour" || state?.kind === "addhotel" || state?.kind === "addmenu") {
      await handleAddFlowImage(msg, doc.file_id);
      return;
    }

    // Analyze document images just like photos (higher quality since documents preserve resolution)
    try {
      const url = await downloadPhoto(bot, doc.file_id, "bot-uploads");
      const localPath = path.join(process.cwd(), "..", "public", url);
      const analysis = await analyzeImage(localPath);
      const prompt = analysis
        ? `Image analysis (document):\n${analysis}`
        : `User sent a document image: ${url}. Ask for details if needed.`;
      await handleAgentInput(chatId, prompt, msg);
    } catch (err: any) {
      console.error("[BOT:DOC]", err?.message || err);
      bot.sendMessage(chatId, "Sorry, I couldn't process that document. Try sending it as a photo instead.");
    }
  });

  // (Audio format conversion now handled by transcribeAudio → ensureWavInTmp in agents.ts)

  async function handleVoiceLike(chatId: number, fileId: string, msg: any, formatHint?: string) {
    console.log("[BOT:VOICE] start — fileId:", fileId, "formatHint:", formatHint, "msgKeys:", Object.keys(msg || {}));
    const file = await bot.getFile(fileId);
    const urlPath = file.file_path || "";
    console.log("[BOT:VOICE] telegram file_path:", urlPath, "file_size:", file.file_size);
    const ext = path.extname(urlPath) || (formatHint ? `.${formatHint}` : ".ogg");

    // Download to /tmp (not public uploads) — temp processing only
    const tmpName = `tg_voice_${Date.now()}_${Math.random().toString(16).slice(2, 8)}${ext}`;
    const tmpPath = path.join("/tmp", tmpName);
    const tmpDir = path.join("/tmp", "_tg_dl");
    await fs.ensureDir(tmpDir);
    const tmp = await bot.downloadFile(fileId, tmpDir);
    await fs.move(tmp, tmpPath, { overwrite: true });
    try { await fs.remove(tmpDir); } catch {}

    const downloadedSize = (await fs.stat(tmpPath)).size;
    console.log("[BOT:VOICE] downloaded to /tmp:", tmpPath, "size:", downloadedSize);
    if (downloadedSize === 0) {
      bot.sendMessage(chatId, "❌ Downloaded audio file is empty. Please try again.");
      try { fs.unlinkSync(tmpPath); } catch {}
      return;
    }
    bot.sendMessage(chatId, "🎤 Processing your voice message...");

    // transcribeAudio handles format conversion internally (oga → wav in /tmp)
    try {
      const transcript = await transcribeAudio(tmpPath);
      console.log("[BOT:VOICE] transcript result length:", transcript.length);
      if (transcript) {
        await handleAgentInput(chatId, transcript, msg);
      } else {
        bot.sendMessage(chatId,
          "Sorry, I couldn't understand the audio. Please try again or type your message instead."
        );
      }
    } finally {
      // Clean up the downloaded file
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
    }
  }

  /* ========== VOICE MESSAGE HANDLER ========== */
  bot.on("voice", async (msg: any) => {
    const chatId = msg.chat.id;
    if (requireAdmin && !isAllowed(chatId)) return;
    if (enableAdminCommands && !isAllowed(chatId)) return;
    try {
      await handleVoiceLike(chatId, msg.voice.file_id, msg, "ogg");
    } catch (err: any) {
      bot.sendMessage(chatId, `❌ Failed to process voice message: ${err?.message || err}`);
    }
  });

  /* ========== AUDIO MESSAGE HANDLER ========== */
  bot.on("audio", async (msg: any) => {
    const chatId = msg.chat.id;
    if (requireAdmin && !isAllowed(chatId)) return;
    if (enableAdminCommands && !isAllowed(chatId)) return;
    try {
      const fileName = String(msg.audio?.file_name || "").toLowerCase();
      const formatHint = path.extname(fileName).replace(".", "") || undefined;
      await handleVoiceLike(chatId, msg.audio.file_id, msg, formatHint);
    } catch (err: any) {
      bot.sendMessage(chatId, `❌ Failed to process audio message: ${err?.message || err}`);
    }
  });

  /* ========== VIDEO NOTE (round video) HANDLER ========== */
  bot.on("video_note", async (msg: any) => {
    const chatId = msg.chat.id;
    if (requireAdmin && !isAllowed(chatId)) return;
    if (enableAdminCommands && !isAllowed(chatId)) return;
    try {
      await handleVoiceLike(chatId, msg.video_note.file_id, msg, "mp4");
    } catch (err: any) {
      bot.sendMessage(chatId, `❌ Failed to process video note: ${err?.message || err}`);
    }
  });

  /* ========== TEXT MESSAGE HANDLER (main router) ========== */
  bot.on("message", async (msg: any) => {
    const chatId = msg.chat.id;
    if (requireAdmin && !isAllowed(chatId)) return;
    const text = (msg.text || "").trim();
    if (!text || text.startsWith("/")) return;
    const key = stateKey(chatId);
    const state = userStates.get(key);

    if (!enableAdminCommands) {
      await handleAgentInput(chatId, text, msg);
      return;
    }

    if (!isAllowed(chatId)) return;

    /* --- Agent Chat Mode --- */
    if (state?.kind === "agent_chat") {
      await handleAgentInput(chatId, text, msg);
      return;
    }

    /* --- Natural edits after auto-fill --- */
    const isAddFlow = state && (state.kind === "addtour" || state.kind === "addhotel" || state.kind === "addmenu");
    if (isAddFlow && state.awaitingJson) {
      const lastPath = state.data?._lastImagePath;
      if (shouldRescan(text) && lastPath) {
        const rawText = await extractRawTextFromImage(lastPath);
        state.data._lastOcrText = rawText;
        await bot.sendMessage(chatId, `🔎 Re-read image text:\n\n${rawText || "(No text detected)"}`);
        return;
      }

      if (!shouldMakeJson(text)) {
        bot.sendMessage(chatId, "Say \"make JSON\" to build the package data, or \"read again\" to re-scan the image.");
        return;
      }

      const rawText = String(state.data?._lastOcrText || "").trim();
      if (state.kind === "addtour") {
        const extractedList = await extractTourPackagesFromText(rawText);
        if (extractedList.length > 1) {
          const normalized = extractedList.map((item) => {
            const copy = { ...(item || {}) };
            applyTourDefaults(copy);
            return copy;
          });
          state.data.multiTours = normalized;
          state.step = 10;
          state.collectingPhotos = true;
          state.allowNaturalEdits = true;
          state.awaitingJson = false;
          state.data.images = state.data.images || [];
          await bot.sendMessage(chatId, `✅ Tour packages auto-filled from OCR:\n\n${toursSummary(normalized)}`);
          bot.sendMessage(chatId, "Now send tour photos (multiple). Type /done when finished.");
          return;
        }

        const extracted = extractedList[0] || {};
        mergeTourFields(state.data, extracted);
        applyTourDefaults(state.data);
        state.step = 10;
        state.collectingPhotos = true;
        state.allowNaturalEdits = true;
        state.awaitingJson = false;
        state.data.images = state.data.images || [];
        await bot.sendMessage(chatId, `✅ Tour details auto-filled from OCR:\n\n${tourSummary(state.data)}`);
        bot.sendMessage(chatId, "Now send tour photos (multiple). Type /done when finished.");
        return;
      }

      if (state.kind === "addhotel") {
        const extracted = await extractHotelFromText(rawText);
        mergeHotelFields(state.data, extracted);
        applyHotelDefaults(state.data);
        state.step = 13;
        state.collectingPhotos = true;
        state.allowNaturalEdits = true;
        state.awaitingJson = false;
        state.data.images = state.data.images || [];
        await bot.sendMessage(chatId, `✅ Hotel details auto-filled from OCR:\n\n${hotelSummary(state.data)}`);
        bot.sendMessage(chatId, "Now send hotel photos (multiple). Type /done when finished.");
        return;
      }

      if (state.kind === "addmenu") {
        const extracted = await extractMenuFromText(rawText);
        mergeMenuFields(state.data, extracted);
        applyMenuDefaults(state.data);
        state.step = 6;
        state.collectingPhotos = true;
        state.allowNaturalEdits = true;
        state.awaitingJson = false;
        state.data.images = state.data.images || [];
        await bot.sendMessage(chatId, `✅ Menu details auto-filled from OCR:\n\n${menuSummary(state.data)}`);
        bot.sendMessage(chatId, "Now send dish photos (multiple). Type /done when finished.");
        return;
      }
    }

    if (isAddFlow && state.allowNaturalEdits) {
      const lastPath = state.data?._lastImagePath;
      if (shouldRescan(text) && lastPath) {
        if (state.kind === "addtour") {
          const extractedList = await extractTourPackagesFromImage(lastPath);
          if (extractedList.length > 1) {
            const normalized = extractedList.map((item) => {
              const copy = { ...(item || {}) };
              applyTourDefaults(copy);
              return copy;
            });
            state.data.multiTours = normalized;
            await bot.sendMessage(chatId, `🔎 Re-read image. Updated JSON:\n\n${toursSummary(normalized)}`);
            return;
          }

          const extracted = extractedList[0] || await extractTourFieldsFromImage(lastPath);
          applyTourPatch(state.data, extracted);
          applyTourDefaults(state.data);
          await bot.sendMessage(chatId, `🔎 Re-read image. Updated JSON:\n\n${tourSummary(state.data)}`);
          return;
        }
        if (state.kind === "addhotel") {
          const extracted = await extractHotelFieldsFromImage(lastPath);
          applyHotelPatch(state.data, extracted);
          applyHotelDefaults(state.data);
          await bot.sendMessage(chatId, `🔎 Re-read image. Updated JSON:\n\n${hotelSummary(state.data)}`);
          return;
        }
        if (state.kind === "addmenu") {
          const extracted = await extractMenuFieldsFromImage(lastPath);
          applyMenuPatch(state.data, extracted);
          applyMenuDefaults(state.data);
          await bot.sendMessage(chatId, `🔎 Re-read image. Updated JSON:\n\n${menuSummary(state.data)}`);
          return;
        }
      }

      if (state.kind === "addtour") {
        const patch = await extractTourPatchFromText(text, state.data || {});
        if (Array.isArray(state.data?.multiTours) && state.data.multiTours.length > 0) {
          state.data.multiTours = state.data.multiTours.map((item: any) => {
            const copy = { ...(item || {}) };
            applyTourPatch(copy, patch);
            applyTourDefaults(copy);
            return copy;
          });
          await bot.sendMessage(chatId, `✅ Updated JSON:\n\n${toursSummary(state.data.multiTours)}`);
          return;
        }

        applyTourPatch(state.data, patch);
        applyTourDefaults(state.data);
        await bot.sendMessage(chatId, `✅ Updated JSON:\n\n${tourSummary(state.data)}`);
        return;
      }

      if (state.kind === "addhotel") {
        const patch = await extractHotelPatchFromText(text, state.data || {});
        applyHotelPatch(state.data, patch);
        applyHotelDefaults(state.data);
        await bot.sendMessage(chatId, `✅ Updated JSON:\n\n${hotelSummary(state.data)}`);
        return;
      }

      if (state.kind === "addmenu") {
        const patch = await extractMenuPatchFromText(text, state.data || {});
        applyMenuPatch(state.data, patch);
        applyMenuDefaults(state.data);
        await bot.sendMessage(chatId, `✅ Updated JSON:\n\n${menuSummary(state.data)}`);
        return;
      }
    }

    /* --- Existing flows --- */
    if (state?.kind === "addtour") { await handleAddTourFlow(bot, chatId, state, text); return; }
    if (state?.kind === "addhotel") { await handleAddHotelFlow(bot, chatId, state, text); return; }
    if (state?.kind === "addmenu") { await handleAddMenuFlow(bot, chatId, state, text); return; }
  });
}

async function handleAddTourFlow(bot: BotLike, chatId: number, state: any, text: string) {
  switch (state.step) {
    case 1: state.data.title = text; state.step = 2; return bot.sendMessage(chatId, "Send description.");
    case 2: state.data.description = text; state.step = 3; return bot.sendMessage(chatId, "Send price in ₹ (number).");
    case 3: state.data.price = Number(text); state.step = 4; return bot.sendMessage(chatId, "Send duration (e.g., 7 days 6 nights).");
    case 4: state.data.duration = text; state.step = 5; return bot.sendMessage(chatId, "Send highlights (comma-separated).");
    case 5: state.data.highlights = text.split(",").map((s: string) => s.trim()).filter(Boolean); state.step = 6; return bot.sendMessage(chatId, "Send itinerary (text).");
    case 6: state.data.itinerary = text; state.step = 7; return bot.sendMessage(chatId, "Send inclusions (comma-separated).");
    case 7: state.data.inclusions = text.split(",").map((s: string) => s.trim()).filter(Boolean); state.step = 8; return bot.sendMessage(chatId, "Send exclusions (comma-separated).");
    case 8: state.data.exclusions = text.split(",").map((s: string) => s.trim()).filter(Boolean); state.step = 9; return bot.sendMessage(chatId, "Max guests (number).");
    case 9: state.data.maxGuests = Number(text); state.step = 10; state.collectingPhotos = true; state.data.images = []; return bot.sendMessage(chatId, "Now send photos (multiple). Type /done when finished.");
    default: return;
  }
}

async function handleAddHotelFlow(bot: BotLike, chatId: number, state: any, text: string) {
  switch (state.step) {
    case 1: state.data.name = text; state.step = 2; return bot.sendMessage(chatId, "Send description.");
    case 2: state.data.description = text; state.step = 3; return bot.sendMessage(chatId, "Location (e.g., Goa, India).");
    case 3: state.data.location = text; state.step = 4; return bot.sendMessage(chatId, "Base price per night in ₹ (number).");
    case 4: state.data.pricePerNight = Number(text); state.step = 5; return bot.sendMessage(chatId, "Amenities (comma-separated).");
    case 5: state.data.amenities = text.split(",").map((s: string)=>s.trim()).filter(Boolean); state.step = 6; return bot.sendMessage(chatId, "How many room types? (number)");
    case 6: state.roomCount = Number(text); state.roomIndex = 0; state.step = 7; return bot.sendMessage(chatId, "Room Type 1 name:");
    case 7:
      state.data.roomTypes = state.data.roomTypes || [];
      state.data.roomTypes[state.roomIndex] = state.data.roomTypes[state.roomIndex] || {};
      state.data.roomTypes[state.roomIndex].type = text;
      state.step = 8;
      return bot.sendMessage(chatId, `Price for ${text} (₹):`);
    case 8:
      state.data.roomTypes[state.roomIndex].price = Number(text);
      state.step = 9;
      return bot.sendMessage(chatId, "Capacity (guests):");
    case 9:
      state.data.roomTypes[state.roomIndex].capacity = Number(text);
      state.roomIndex++;
      if (state.roomIndex < state.roomCount) {
        state.step = 7;
        return bot.sendMessage(chatId, `Room Type ${state.roomIndex + 1} name:`);
      }
      state.step = 10;
      return bot.sendMessage(chatId, "Check-in time (HH:MM):");
    case 10: state.data.checkInTime = text; state.step = 11; return bot.sendMessage(chatId, "Check-out time (HH:MM):");
    case 11: state.data.checkOutTime = text; state.step = 12; return bot.sendMessage(chatId, "Rating out of 5 (e.g., 4.8):");
    case 12: state.data.rating = Number(text); state.step = 13; state.collectingPhotos = true; state.data.images = []; return bot.sendMessage(chatId, "Now send hotel photos. Type /done when finished.");
    default: return;
  }
}

async function handleAddMenuFlow(bot: BotLike, chatId: number, state: any, text: string) {
  switch (state.step) {
    case 1: state.data.name = text; state.step = 2; return bot.sendMessage(chatId, "Category (Appetizer/Main Course/Dessert/Beverage):");
    case 2: state.data.category = text; state.step = 3; return bot.sendMessage(chatId, "Description:");
    case 3: state.data.description = text; state.step = 4; return bot.sendMessage(chatId, "Price ₹ (number):");
    case 4: state.data.price = Number(text); state.step = 5; return bot.sendMessage(chatId, "Is veg? (yes/no):");
    case 5: state.data.isVeg = text.toLowerCase().startsWith("y"); state.step = 6; state.collectingPhotos = true; state.data.images = []; return bot.sendMessage(chatId, "Send 1 dish photo (or multiple). Type /done when finished.");
    default: return;
  }
}

async function finalizeTour(chatId: number, bot: BotLike, data: any) {
  const id = makeId("tour");
  const now = new Date().toISOString();
  await mutateData((db) => {
    db.tours.push({
      id, title: data.title, description: data.description, price: Number(data.price),
      duration: data.duration, images: data.images || [], highlights: data.highlights || [],
      itinerary: data.itinerary || "", inclusions: data.inclusions || [], exclusions: data.exclusions || [],
      maxGuests: Number(data.maxGuests || 10), available: true, createdAt: now, updatedAt: now
    } as any);
    db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: chatId, action: "ADD_TOUR", entity: "tour", entityId: id });
  }, "addtour");
  bot.sendMessage(chatId, `✅ Tour created!\nID: ${id}\nStatus: Active`);
}

async function finalizeTours(chatId: number, bot: BotLike, items: any[], sharedImages: string[] = []) {
  const now = new Date().toISOString();
  const rows = (items || []).map((item) => {
    const data = { ...(item || {}) };
    applyTourDefaults(data);
    data.images = (Array.isArray(data.images) && data.images.length > 0) ? data.images : sharedImages;
    const id = makeId("tour");
    return { id, data };
  });

  if (!rows.length) return;

  await mutateData((db) => {
    rows.forEach((row) => {
      db.tours.push({
        id: row.id, title: row.data.title, description: row.data.description, price: Number(row.data.price),
        duration: row.data.duration, images: row.data.images || [], highlights: row.data.highlights || [],
        itinerary: row.data.itinerary || "", inclusions: row.data.inclusions || [], exclusions: row.data.exclusions || [],
        maxGuests: Number(row.data.maxGuests || 10), available: true, createdAt: now, updatedAt: now
      } as any);
      db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: chatId, action: "ADD_TOUR", entity: "tour", entityId: row.id });
    });
  }, "addtour");

  bot.sendMessage(chatId, `✅ ${rows.length} tours created.`);
}

async function finalizeHotel(chatId: number, bot: BotLike, data: any) {
  const id = makeId("hotel");
  const now = new Date().toISOString();
  await mutateData((db) => {
    db.hotels.push({
      id, name: data.name, description: data.description, location: data.location,
      pricePerNight: Number(data.pricePerNight), images: data.images || [], amenities: data.amenities || [],
      roomTypes: data.roomTypes || [], rating: Number(data.rating || 0), reviews: 0,
      checkInTime: data.checkInTime || "14:00", checkOutTime: data.checkOutTime || "11:00",
      available: true, createdAt: now
    } as any);
    db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: chatId, action: "ADD_HOTEL", entity: "hotel", entityId: id });
  }, "addhotel");
  bot.sendMessage(chatId, `✅ Hotel created!\nID: ${id}\nStatus: Active`);
}

async function finalizeMenu(chatId: number, bot: BotLike, data: any) {
  const id = makeId("menu");
  const now = new Date().toISOString();
  await mutateData((db) => {
    const image = (data.images && data.images[0]) ? data.images[0] : undefined;
    db.menuItems.push({
      id, category: data.category, name: data.name, description: data.description || "",
      price: Number(data.price), image, available: true, isVeg: !!data.isVeg
    } as any);
    db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: chatId, action: "ADD_MENU_ITEM", entity: "menu", entityId: id });
  }, "addmenu");
  bot.sendMessage(chatId, `✅ Menu item created!\nID: ${id}`);
}
