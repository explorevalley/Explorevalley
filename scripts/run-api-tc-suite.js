/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.TC_BASE_URL || "http://localhost:8082";
const OUT_DIR = process.env.TC_OUT_DIR || path.join(process.cwd(), "reports");

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function http(method, urlPath, body, headers = {}) {
  const hasBody = body !== undefined;
  const resp = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: hasBody ? JSON.stringify(body) : undefined
  });
  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: resp.status, text, json };
}

function expectStatus(res, allowed) {
  return allowed.includes(res.status);
}

async function run() {
  const tests = [
    { id: "TC-0001", title: "GET /tours without token returns 200", run: () => http("GET", "/api/tours"), check: (r) => expectStatus(r, [200]) },
    { id: "TC-0002", title: "GET /hotels without token returns 200", run: () => http("GET", "/api/hotels"), check: (r) => expectStatus(r, [200]) },
    { id: "TC-0003", title: "GET /restaurants without token returns 200", run: () => http("GET", "/api/restaurants"), check: (r) => expectStatus(r, [200]) },
    { id: "TC-0004", title: "GET /festivals without token returns 200", run: () => http("GET", "/api/festivals"), check: (r) => expectStatus(r, [200]) },
    { id: "TC-0005", title: "GET /pages/privacy-policy without token returns 200/404", run: () => http("GET", "/api/pages/privacy-policy"), check: (r) => expectStatus(r, [200, 404]) },

    { id: "TC-0028", title: "GET /admin/data without admin key returns 401", run: () => http("GET", "/api/admin/data"), check: (r) => expectStatus(r, [401]) },
    { id: "TC-0030", title: "Malformed bearer token returns 401", run: () => http("POST", "/api/bookings", { type: "tour" }, { Authorization: "Bearer not-a-jwt" }), check: (r) => expectStatus(r, [401]) },
    { id: "TC-0057", title: "Protected booking endpoint without token returns 401", run: () => http("POST", "/api/bookings", { type: "tour" }), check: (r) => expectStatus(r, [401]) },
    { id: "TC-0079", title: "Authorization header requires bearer format", run: () => http("POST", "/api/bookings", { type: "tour" }, { Authorization: "Token abc" }), check: (r) => expectStatus(r, [401]) },

    { id: "TC-0104", title: "Invalid booking payload rejected", run: () => http("POST", "/api/bookings", { bad: "payload" }, { Authorization: "Bearer x.y.z" }), check: (r) => expectStatus(r, [400, 401]) },
    { id: "TC-0118", title: "Failed auth attempts tracked with 401", run: () => http("POST", "/api/auth/password-login", { email: "bad", password: "short" }), check: (r) => expectStatus(r, [400, 401]) },

    { id: "TC-0143", title: "GET /tours returns array", run: () => http("GET", "/api/tours"), check: (r) => Array.isArray(r.json) },
    { id: "TC-0231", title: "GET /festivals returns array", run: () => http("GET", "/api/festivals"), check: (r) => Array.isArray(r.json) },
    { id: "TC-0341", title: "GET /hotels returns array", run: () => http("GET", "/api/hotels"), check: (r) => Array.isArray(r.json) },
    { id: "TC-0535", title: "GET /restaurants returns array", run: () => http("GET", "/api/restaurants"), check: (r) => Array.isArray(r.json) },

    { id: "TC-0673", title: "POST /food-orders requires auth", run: () => http("POST", "/api/food-orders", { userName: "T", phone: "9999999999", items: [{ name: "X", quantity: 1 }], deliveryAddress: "A" }), check: (r) => expectStatus(r, [401]) },
    { id: "TC-1020", title: "food order invalid input with auth token returns 400/403/401", run: () => http("POST", "/api/food-orders", { bad: true }, { Authorization: "Bearer x.y.z" }), check: (r) => expectStatus(r, [400, 401, 403]) },

    { id: "TC-0921", title: "POST /cab-bookings requires auth", run: () => http("POST", "/api/cab-bookings", { userName: "A" }), check: (r) => expectStatus(r, [401]) },
    { id: "TC-0960", title: "cab invalid payload with auth token returns 400/401/403", run: () => http("POST", "/api/cab-bookings", { bad: true }, { Authorization: "Bearer x.y.z" }), check: (r) => expectStatus(r, [400, 401, 403]) },

    { id: "TC-1139", title: "POST /queries valid-ish payload returns 200", run: () => http("POST", "/api/queries", { userName: "Tester", email: "tester@example.com", phone: "9999999999", subject: "Hello", message: "Need info" }), check: (r) => expectStatus(r, [200]) },
    { id: "TC-1140", title: "POST /queries missing subject rejected", run: () => http("POST", "/api/queries", { userName: "Tester", email: "tester@example.com", phone: "9999999999", message: "Need info" }), check: (r) => expectStatus(r, [400]) },
    { id: "TC-1142", title: "POST /queries invalid email rejected", run: () => http("POST", "/api/queries", { userName: "Tester", email: "invalid", phone: "9999999999", subject: "Hi", message: "Need info" }), check: (r) => expectStatus(r, [400]) },

    { id: "TC-1135", title: "POST /analytics/track missing type rejected", run: () => http("POST", "/api/analytics/track", { category: "test" }), check: (r) => expectStatus(r, [400]) },
    { id: "TC-1134", title: "POST /analytics/track valid payload accepted", run: () => http("POST", "/api/analytics/track", { type: "ui_test", category: "test", meta: { source: "tc-runner" } }), check: (r) => expectStatus(r, [200]) },

    { id: "TC-1051", title: "GET /meta works", run: () => http("GET", "/api/meta"), check: (r) => expectStatus(r, [200]) },
    { id: "TC-0671", title: "GET /menu works", run: () => http("GET", "/api/menu"), check: (r) => expectStatus(r, [200]) },

    { id: "TC-1090", title: "Compat food quote empty cart rejected", run: () => http("POST", "/api/food/quote", { restaurantId: "rest_mountain_cafe", items: [] }), check: (r) => expectStatus(r, [400]) },
    { id: "TC-0841", title: "Compat tour quote missing date rejected", run: () => http("POST", "/api/tours/quote", { tourId: "tour_goa_beach_paradise", guests: 2 }), check: (r) => expectStatus(r, [400]) },
    { id: "TC-0834", title: "Compat hotel quote missing check_in rejected", run: () => http("POST", "/api/hotels/quote", { hotelId: "hotel_mountain_view_resort_manali", checkOut: "2026-03-10", guests: 2, roomType: "Deluxe Room" }), check: (r) => expectStatus(r, [400]) },

    { id: "TC-0320", title: "Server survives invalid query payload", run: async () => {
      await http("POST", "/api/queries", { invalid: true });
      return http("GET", "/health");
    }, check: (r) => expectStatus(r, [200]) },
    { id: "TC-1200", title: "Server survives invalid food payload", run: async () => {
      await http("POST", "/api/food-orders", { invalid: true }, { Authorization: "Bearer x.y.z" });
      return http("GET", "/health");
    }, check: (r) => expectStatus(r, [200]) }
  ];

  const results = [];
  for (const t of tests) {
    const started = Date.now();
    let pass = false;
    let res = null;
    let error = null;
    try {
      res = await t.run();
      pass = !!t.check(res);
    } catch (e) {
      error = String(e && e.message ? e.message : e);
      pass = false;
    }
    results.push({
      id: t.id,
      title: t.title,
      pass,
      status: res?.status ?? 0,
      durationMs: Date.now() - started,
      response: res?.json ?? res?.text ?? null,
      error
    });
  }

  const totals = {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `api_tc_subset_${stamp()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ baseUrl: BASE_URL, totals, results }, null, 2), "utf8");
  console.log(JSON.stringify({ outPath, totals }, null, 2));

  if (totals.failed > 0) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
