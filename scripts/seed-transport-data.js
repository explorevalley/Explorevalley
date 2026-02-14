#!/usr/bin/env node
/* eslint-disable no-console */
require("dotenv").config();
require("dotenv").config({ path: "server/.env" });

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

function headers(prefer) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: prefer || "resolution=merge-duplicates,return=minimal"
  };
}

function nextDates(days) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < days; i += 1) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function makeSeatLayout(total) {
  const letters = ["A", "B", "C", "D"];
  const rows = Math.ceil(total / 4);
  const out = [];
  for (let r = 1; r <= rows; r += 1) {
    for (const l of letters) out.push({ code: `${l}${r}`, seatType: "regular" });
  }
  return out.slice(0, total);
}

async function upsert(table, rows, onConflict = "id") {
  if (!rows.length) return;
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
  const r = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(rows) });
  if (!r.ok) throw new Error(`${table} upsert failed: ${r.status} ${await r.text()}`);
}

function isMissingTableErrorText(text) {
  return String(text || "").includes("PGRST205") || String(text || "").includes("Could not find the table");
}

async function run() {
  const now = new Date().toISOString();
  const dates = nextDates(10);

  const serviceAreas = [
    { id: "area_manali", name: "Manali", city: "Manali", enabled: true },
    { id: "area_kullu", name: "Kullu", city: "Kullu", enabled: true },
    { id: "area_chandigarh", name: "Chandigarh", city: "Chandigarh", enabled: true },
    { id: "area_dallas", name: "Dallas", city: "Dallas", enabled: true },
    { id: "area_chicago", name: "Chicago", city: "Chicago", enabled: true }
  ];

  const cabProviders = [
    {
      id: "cab_bolt_01",
      name: "Bolt Cabs",
      vehicle_type: "Sedan",
      plate_number: "DL01AB1001",
      capacity: 4,
      vendor_mobile: "+911111111111",
      additional_comments: "Fast city rides",
      price_dropped: true,
      price_drop_percent: 12,
      hero_image: "",
      active: true,
      service_area_id: "area_chandigarh"
    },
    {
      id: "cab_red_02",
      name: "Red Coach Cabs",
      vehicle_type: "SUV",
      plate_number: "DL01AB2002",
      capacity: 6,
      vendor_mobile: "+912222222222",
      additional_comments: "Intercity and hills",
      price_dropped: false,
      price_drop_percent: 0,
      hero_image: "",
      active: true,
      service_area_id: "area_manali"
    },
    {
      id: "cab_hill_03",
      name: "Hill Drive",
      vehicle_type: "Sedan",
      plate_number: "HP01AB3003",
      capacity: 4,
      vendor_mobile: "+913333333333",
      additional_comments: "Airport pickup",
      price_dropped: true,
      price_drop_percent: 8,
      hero_image: "",
      active: true,
      service_area_id: "area_kullu"
    }
  ];

  const buses = [
    {
      id: "bus_bolt_chi_dal",
      operator_name: "Bolt Bus",
      operator_code: "1009-CHP-DHA-3",
      from_city: "Chicago",
      from_code: "CHI",
      to_city: "Dallas",
      to_code: "DAL",
      departure_time: "3:00 pm",
      arrival_time: "10:00 pm",
      duration_text: "7 H 0 M",
      bus_type: "Non AC",
      fare: 8,
      total_seats: 26,
      seat_layout: makeSeatLayout(26),
      service_dates: dates,
      seats_booked_by_date: {},
      hero_image: "",
      active: true,
      created_at: now
    },
    {
      id: "bus_red_chi_dal",
      operator_name: "Red Coach",
      operator_code: "1009-CHP-DHA",
      from_city: "Chicago",
      from_code: "CHI",
      to_city: "Dallas",
      to_code: "DAL",
      departure_time: "3:30 pm",
      arrival_time: "10:30 pm",
      duration_text: "7 H 0 M",
      bus_type: "Non AC",
      fare: 8,
      total_seats: 18,
      seat_layout: makeSeatLayout(18),
      service_dates: dates,
      seats_booked_by_date: {},
      hero_image: "",
      active: true,
      created_at: now
    }
  ];

  await upsert("ev_service_areas", serviceAreas);
  await upsert("ev_cab_providers", cabProviders);
  try {
    await upsert("ev_buses", buses);
  } catch (e) {
    if (isMissingTableErrorText(e.message || e)) {
      console.error("ev_buses table is missing. Run server/sql/supabase_relational.sql migration first, then rerun this script.");
      return;
    }
    throw e;
  }

  console.log("Seeded transport data into Supabase (cabs + buses).");
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
