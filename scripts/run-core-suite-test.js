/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.CORE_SUITE_BASE_URL || "http://localhost:8082";
const SUITE_PATH = process.argv[2] || "C:/Users/Bharat/Downloads/core_suite_720.json";
const OUT_DIR = process.argv[3] || path.join(process.cwd(), "reports");
const DATA_PATH = path.join(process.cwd(), "data", "data.json");

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function loadDefaults() {
  try {
    const db = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    const hotel = Array.isArray(db.hotels) && db.hotels.length ? db.hotels[0] : null;
    const tour = Array.isArray(db.tours) && db.tours.length ? db.tours[0] : null;
    const restaurant = Array.isArray(db.restaurants) && db.restaurants.length ? db.restaurants[0] : null;
    const menu = Array.isArray(db.menuItems) && db.menuItems.length
      ? db.menuItems.find((m) => !restaurant || m.restaurantId === restaurant.id) || db.menuItems[0]
      : null;
    const menuById = {};
    (db.menuItems || []).forEach((m) => { menuById[m.id] = m; });
    return { hotel, tour, restaurant, menu, menuById };
  } catch {
    return { hotel: null, tour: null, restaurant: null, menu: null, menuById: {} };
  }
}

function getField(pre, key, fallback) {
  return Object.prototype.hasOwnProperty.call(pre, key) ? pre[key] : fallback;
}

function deriveSimulatePayment(pre) {
  const raw = pre.simulatePayment;
  if (raw === undefined || raw === null) return undefined;
  if (raw === false) return "fail";
  const s = String(raw).toLowerCase();
  if (s.includes("fail")) return "fail";
  if (s.includes("success") || s.includes("paid")) return "success";
  return raw;
}

function replaceParams(routePath, pre, ids, defaults) {
  const hotelId = pre.hotelId || defaults.hotel?.id || "hotel_mountain_view_resort_manali";
  const tourId = pre.tourId || defaults.tour?.id || "tour_goa_beach_paradise";
  const restaurantId = pre.restaurantId || defaults.restaurant?.id || "rest_mountain_cafe";
  return routePath
    .replace("{hotelId}", hotelId)
    .replace("{tourId}", tourId)
    .replace("{restaurantId}", restaurantId)
    .replace("{bookingId}", ids.bookingId || pre.bookingId || "book_dummy")
    .replace("{orderId}", ids.orderId || pre.orderId || "food_dummy")
    .replace("{cabBookingId}", ids.cabBookingId || pre.cabBookingId || "cab_dummy");
}

function bodyForTest(test, defaults) {
  const pre = test.preconditions || {};
  if (test.module === "HOTEL") {
    const roomType = pre.roomType || defaults.hotel?.roomTypes?.[0]?.type || "Standard Room";
    return {
      ...pre,
      hotelId: pre.hotelId || defaults.hotel?.id || "hotel_mountain_view_resort_manali",
      itemId: pre.hotelId || defaults.hotel?.id || "hotel_mountain_view_resort_manali",
      roomType,
      guests: Number(pre.guests ?? 2),
      checkIn: getField(pre, "checkIn", "2026-03-10"),
      checkOut: getField(pre, "checkOut", "2026-03-12"),
      numRooms: Number(pre.numRooms || 1),
      userName: "Test User",
      email: "test@example.com",
      phone: "9999999999",
      coupon: pre.coupon,
      pricingTier: pre.pricingTier,
      simulatePayment: deriveSimulatePayment(pre)
    };
  }
  if (test.module === "TOUR") {
    return {
      ...pre,
      tourId: pre.tourId || defaults.tour?.id || "tour_goa_beach_paradise",
      itemId: pre.tourId || defaults.tour?.id || "tour_goa_beach_paradise",
      date: getField(pre, "date", "2026-03-12"),
      tourDate: getField(pre, "date", "2026-03-12"),
      guests: Number(pre.guests ?? 2),
      userName: "Test User",
      email: "test@example.com",
      phone: "9999999999",
      coupon: pre.coupon,
      pricingTier: pre.pricingTier,
      simulatePayment: deriveSimulatePayment(pre),
      toDate: pre.toDate || "2026-03-13"
    };
  }
  if (test.module === "FOOD") {
    const restaurantId = pre.restaurantId || defaults.restaurant?.id || "rest_mountain_cafe";
    const defaultItemName = defaults.menu?.name || "Paneer Tikka";
    const mappedItems = Array.isArray(pre.items)
      ? pre.items.map((it) => {
          const qty = Number(pre.qty ?? it.qty ?? it.quantity ?? 1);
          if (it && it.menuItemId && defaults.menuById[it.menuItemId]) {
            return {
              menuItemId: it.menuItemId,
              name: defaults.menuById[it.menuItemId].name,
              quantity: qty,
              price: pre.price
            };
          }
          return {
            menuItemId: it.menuItemId,
            name: it.name || defaultItemName,
            quantity: qty,
            price: pre.price
          };
        })
      : [{ name: defaultItemName, quantity: 1 }];
    return {
      ...pre,
      restaurantId,
      items: mappedItems,
      userName: "Test User",
      phone: getField(pre, "phone", "9999999999"),
      deliveryAddress: getField(pre, "address", "Test delivery address"),
      paymentMode: pre.paymentMode || "COD",
      coupon: pre.coupon,
      vegOnly: pre.vegOnly,
      simulatePayment: deriveSimulatePayment(pre)
    };
  }
  if (test.module === "CAB") {
    return {
      ...pre,
      pickupLocation: pre.pickupLocation || pre.pickup || "Manali",
      dropLocation: pre.dropLocation || pre.drop || "Goa",
      datetime: pre.datetime || pre.requestDate || pre.scheduledAt || "2026-03-12T10:00:00.000Z",
      passengers: Number(pre.passengers ?? 2),
      vehicleType: pre.vehicleType || pre.mode || "Sedan",
      estimatedFare: Number(pre.estimatedFare || pre.baseFare || 1200),
      highDemand: pre.highDemand ?? (Number(pre.surge || 1) > 1),
      forceNoDrivers: pre.driversFree === 0 || pre.forceNoDrivers,
      simulatePayment: deriveSimulatePayment(pre)
    };
  }
  return {};
}

function isMatch(expected, actual) {
  if (!expected || typeof expected !== "object") return true;
  if (!actual || typeof actual !== "object") return false;
  for (const [k, v] of Object.entries(expected)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (!isMatch(v, actual[k])) return false;
    } else if (Array.isArray(v)) {
      if (!Array.isArray(actual[k])) return false;
    } else if (actual[k] !== v) {
      return false;
    }
  }
  return true;
}

async function run() {
  const suiteRaw = fs.readFileSync(SUITE_PATH, "utf8");
  const suite = JSON.parse(suiteRaw);
  const testCases = suite.testCases || [];
  const defaults = loadDefaults();
  const ids = { bookingId: null, orderId: null, cabBookingId: null };
  const results = [];

  for (const test of testCases) {
    const apiSteps = test.api || [];
    if (!apiSteps.length) {
      results.push({ ...test, pass: true, skipped: true, reason: "No API mapping" });
      continue;
    }
    const started = Date.now();
    let httpStatus = 0;
    let responseText = "";
    let pass = false;
    let error = null;
    let endpoint = null;

    try {
      let finalJson = null;
      for (const step of apiSteps) {
        const method = step.method;
        const relPath = replaceParams(step.path, test.preconditions || {}, ids, defaults);
        const url = `${BASE_URL}${relPath}`;
        const requestBody = method === "GET" ? undefined : bodyForTest(test, defaults);
        endpoint = { method, path: relPath, url };
        const resp = await fetch(url, {
          method,
          headers: requestBody ? { "Content-Type": "application/json" } : undefined,
          body: requestBody ? JSON.stringify(requestBody) : undefined
        });
        httpStatus = resp.status;
        responseText = await resp.text();
        const responseJson = safeJsonParse(responseText);
        finalJson = responseJson;

        if (responseJson) {
          const newId = responseJson.id || responseJson.bookingId || responseJson.orderId || responseJson.cabBookingId;
          if (newId && (relPath.includes("/bookings/hotel") || relPath.includes("/bookings/tour"))) ids.bookingId = newId;
          if (newId && relPath.includes("/food/orders")) ids.orderId = newId;
          if (newId && relPath.includes("/cabBookings")) ids.cabBookingId = newId;
        }
        if (httpStatus >= 400 || (responseJson && typeof responseJson === "object" && responseJson.error)) {
          break;
        }
      }
      pass = isMatch(test.expected || {}, finalJson || {});
    } catch (e) {
      error = String(e && e.message ? e.message : e);
    }

    results.push({
      id: test.id,
      module: test.module,
      category: test.category,
      title: test.title,
      endpoint,
      httpStatus,
      durationMs: Date.now() - started,
      pass,
      expected: test.expected,
      response: responseText,
      error
    });
  }

  const totals = {
    total: results.length,
    passed: results.filter(r => r.pass && !r.skipped).length,
    failed: results.filter(r => !r.pass && !r.skipped).length,
    skipped: results.filter(r => r.skipped).length
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `core_suite_run_${nowStamp()}.json`);
  const out = {
    meta: suite.meta || { suite: "Core Suite 720" },
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    totals,
    results
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

  console.log(JSON.stringify({ outPath, totals }, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
