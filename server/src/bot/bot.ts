import type TelegramBot from "node-telegram-bot-api";
import path from "path";
import fs from "fs-extra";
import { userStates } from "./state";
import { isAdmin } from "./acl";
import { mutateData, readData } from "../services/jsondb";
import { makeId } from "@explorevalley/shared";
import { generateMenuPDF } from "../services/pdfMenu";

async function downloadPhoto(bot: TelegramBot, fileId: string, subdir: string) {
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

export function registerBot(bot: TelegramBot, adminChatIds: number[]) {
  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
`ExploreValley Admin Bot
Commands:
- /addtour
- /addhotel
- /addmenu
- /done (finish photo upload)
- /status
- /backup
`);
  });

  bot.onText(/\/status/, async (msg) => {
    if (!isAdmin(msg.chat.id, adminChatIds)) return;
    const db = await readData();
    await generateMenuPDF(db);
    bot.sendMessage(msg.chat.id,
`🌐 ExploreValley Status
Active Tours: ${db.tours.filter(t => t.available).length}
Active Hotels: ${db.hotels.filter(h => h.available).length}
Menu Items: ${db.menuItems.filter(m => m.available).length}
Pending Bookings: ${db.bookings.filter(b => b.status === "pending").length}
Pending Queries: ${db.queries.filter(q => q.status === "pending").length}
Pending Food Orders: ${db.foodOrders.filter(o => o.status === "pending").length}
Pending Cab Bookings: ${db.cabBookings.filter(c => c.status === "pending").length}
`);
  });

  bot.onText(/\/backup/, async (msg) => {
    if (!isAdmin(msg.chat.id, adminChatIds)) return;
    const db = await readData();
    const filePath = path.join(process.cwd(), "..", "data", "data.json");
    await bot.sendDocument(msg.chat.id, filePath, {}, { filename: `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json` });
    bot.sendMessage(msg.chat.id, "✅ Backup sent.");
  });

  bot.onText(/\/addtour/, (msg) => {
    if (!isAdmin(msg.chat.id, adminChatIds)) return;
    userStates.set(msg.chat.id, { kind: "addtour", step: 1, data: {} });
    bot.sendMessage(msg.chat.id, "Let’s create a new tour. Send the tour title.");
  });

  bot.onText(/\/addhotel/, (msg) => {
    if (!isAdmin(msg.chat.id, adminChatIds)) return;
    userStates.set(msg.chat.id, { kind: "addhotel", step: 1, data: { roomTypes: [] }, roomIndex: 0 });
    bot.sendMessage(msg.chat.id, "Let’s add a new hotel. Send the hotel name.");
  });

  bot.onText(/\/addmenu/, (msg) => {
    if (!isAdmin(msg.chat.id, adminChatIds)) return;
    userStates.set(msg.chat.id, { kind: "addmenu", step: 1, data: {} });
    bot.sendMessage(msg.chat.id, "Let’s add a menu item. Send the item name.");
  });

  bot.onText(/\/done/, async (msg) => {
    const state = userStates.get(msg.chat.id);
    if (!state) return;
    if (!isAdmin(msg.chat.id, adminChatIds)) return;

    if (state.kind === "addtour" && state.collectingPhotos) {
      await finalizeTour(msg.chat.id, bot, state.data);
      userStates.delete(msg.chat.id);
      return;
    }

    if (state.kind === "addhotel" && state.collectingPhotos) {
      await finalizeHotel(msg.chat.id, bot, state.data);
      userStates.delete(msg.chat.id);
      return;
    }

    if (state.kind === "addmenu" && state.collectingPhotos) {
      await finalizeMenu(msg.chat.id, bot, state.data);
      userStates.delete(msg.chat.id);
      return;
    }

    bot.sendMessage(msg.chat.id, "Nothing to finish right now.");
  });

  bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates.get(chatId);
    if (!state) return;
    if (!isAdmin(chatId, adminChatIds)) return;

    if (!("photo" in msg) || !msg.photo?.length) return;
    const fileId = msg.photo[msg.photo.length - 1].file_id;

    if (state.collectingPhotos) {
      const subdir = state.kind === "addmenu" ? "menu" : state.kind === "addhotel" ? "hotels" : "tours";
      const url = await downloadPhoto(bot, fileId, subdir);
      state.data.images = state.data.images || [];
      state.data.images.push(url);
      bot.sendMessage(chatId, `✅ Photo received (${state.data.images.length}). Send more or type /done`);
    }
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    if (!text || text.startsWith("/")) return;

    const state = userStates.get(chatId);
    if (!state) return;
    if (!isAdmin(chatId, adminChatIds)) return;

    if (state.kind === "addtour") {
      await handleAddTourFlow(bot, chatId, state, text);
      return;
    }
    if (state.kind === "addhotel") {
      await handleAddHotelFlow(bot, chatId, state, text);
      return;
    }
    if (state.kind === "addmenu") {
      await handleAddMenuFlow(bot, chatId, state, text);
      return;
    }
  });
}

async function handleAddTourFlow(bot: TelegramBot, chatId: number, state: any, text: string) {
  switch (state.step) {
    case 1: state.data.title = text; state.step = 2; return bot.sendMessage(chatId, "Send description.");
    case 2: state.data.description = text; state.step = 3; return bot.sendMessage(chatId, "Send price in ₹ (number).");
    case 3: state.data.price = Number(text); state.step = 4; return bot.sendMessage(chatId, "Send duration (e.g., 7 days 6 nights).");
    case 4: state.data.duration = text; state.step = 5; return bot.sendMessage(chatId, "Send highlights (comma-separated).");
    case 5: state.data.highlights = text.split(",").map((s) => s.trim()).filter(Boolean); state.step = 6; return bot.sendMessage(chatId, "Send itinerary (text).");
    case 6: state.data.itinerary = text; state.step = 7; return bot.sendMessage(chatId, "Send inclusions (comma-separated).");
    case 7: state.data.inclusions = text.split(",").map((s) => s.trim()).filter(Boolean); state.step = 8; return bot.sendMessage(chatId, "Send exclusions (comma-separated).");
    case 8: state.data.exclusions = text.split(",").map((s) => s.trim()).filter(Boolean); state.step = 9; return bot.sendMessage(chatId, "Max guests (number).");
    case 9: state.data.maxGuests = Number(text); state.step = 10; state.collectingPhotos = true; state.data.images = []; return bot.sendMessage(chatId, "Now send photos (multiple). Type /done when finished.");
    default: return;
  }
}

async function handleAddHotelFlow(bot: TelegramBot, chatId: number, state: any, text: string) {
  switch (state.step) {
    case 1: state.data.name = text; state.step = 2; return bot.sendMessage(chatId, "Send description.");
    case 2: state.data.description = text; state.step = 3; return bot.sendMessage(chatId, "Location (e.g., Goa, India).");
    case 3: state.data.location = text; state.step = 4; return bot.sendMessage(chatId, "Base price per night in ₹ (number).");
    case 4: state.data.pricePerNight = Number(text); state.step = 5; return bot.sendMessage(chatId, "Amenities (comma-separated).");
    case 5: state.data.amenities = text.split(",").map((s)=>s.trim()).filter(Boolean); state.step = 6; return bot.sendMessage(chatId, "How many room types? (number)");
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

async function handleAddMenuFlow(bot: TelegramBot, chatId: number, state: any, text: string) {
  switch (state.step) {
    case 1: state.data.name = text; state.step = 2; return bot.sendMessage(chatId, "Category (Appetizer/Main Course/Dessert/Beverage):");
    case 2: state.data.category = text; state.step = 3; return bot.sendMessage(chatId, "Description:");
    case 3: state.data.description = text; state.step = 4; return bot.sendMessage(chatId, "Price ₹ (number):");
    case 4: state.data.price = Number(text); state.step = 5; return bot.sendMessage(chatId, "Is veg? (yes/no):");
    case 5: state.data.isVeg = text.toLowerCase().startsWith("y"); state.step = 6; state.collectingPhotos = true; state.data.images = []; return bot.sendMessage(chatId, "Send 1 dish photo (or multiple). Type /done when finished.");
    default: return;
  }
}

async function finalizeTour(chatId: number, bot: TelegramBot, data: any) {
  const id = makeId("tour");
  const now = new Date().toISOString();

  await mutateData((db) => {
    db.tours.push({
      id,
      title: data.title,
      description: data.description,
      price: Number(data.price),
      duration: data.duration,
      images: data.images || [],
      highlights: data.highlights || [],
      itinerary: data.itinerary || "",
      inclusions: data.inclusions || [],
      exclusions: data.exclusions || [],
      maxGuests: Number(data.maxGuests || 10),
      available: true,
      createdAt: now,
      updatedAt: now
    } as any);
    db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: chatId, action: "ADD_TOUR", entity: "tour", entityId: id });
  }, "addtour");

  bot.sendMessage(chatId, `✅ Tour created!\nID: ${id}\nStatus: Active`);
}

async function finalizeHotel(chatId: number, bot: TelegramBot, data: any) {
  const id = makeId("hotel");
  const now = new Date().toISOString();

  await mutateData((db) => {
    db.hotels.push({
      id,
      name: data.name,
      description: data.description,
      location: data.location,
      pricePerNight: Number(data.pricePerNight),
      images: data.images || [],
      amenities: data.amenities || [],
      roomTypes: data.roomTypes || [],
      rating: Number(data.rating || 0),
      reviews: 0,
      checkInTime: data.checkInTime || "14:00",
      checkOutTime: data.checkOutTime || "11:00",
      available: true,
      createdAt: now
    } as any);
    db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: chatId, action: "ADD_HOTEL", entity: "hotel", entityId: id });
  }, "addhotel");

  bot.sendMessage(chatId, `✅ Hotel created!\nID: ${id}\nStatus: Active`);
}

async function finalizeMenu(chatId: number, bot: TelegramBot, data: any) {
  const id = makeId("menu");
  const now = new Date().toISOString();

  await mutateData((db) => {
    const image = (data.images && data.images[0]) ? data.images[0] : undefined;
    db.menuItems.push({
      id,
      category: data.category,
      name: data.name,
      description: data.description || "",
      price: Number(data.price),
      image,
      available: true,
      isVeg: !!data.isVeg
    } as any);
    db.auditLog.push({ id: makeId("audit"), at: now, adminChatId: chatId, action: "ADD_MENU_ITEM", entity: "menu", entityId: id });
  }, "addmenu");

  bot.sendMessage(chatId, `✅ Menu item created!\nID: ${id}`);
}
