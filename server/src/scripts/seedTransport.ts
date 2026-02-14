import "dotenv/config";
import { mutateData } from "../services/jsondb";

function nowISO() {
  return new Date().toISOString();
}

function nextDates(days: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < days; i += 1) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function makeSeatLayout(total = 26) {
  const letters = ["A", "B", "C", "D"];
  const rows = Math.ceil(total / 4);
  const out: Array<{ code: string; seatType: string }> = [];
  for (let r = 1; r <= rows; r += 1) {
    for (const l of letters) out.push({ code: `${l}${r}`, seatType: "regular" });
  }
  return out.slice(0, total);
}

function upsertById<T extends { id: string }>(list: T[], rows: T[]) {
  const byId = new Map(list.map((x) => [String(x.id), x]));
  rows.forEach((r) => byId.set(String(r.id), r));
  return Array.from(byId.values());
}

async function run() {
  const dates = nextDates(10);
  await mutateData((db: any) => {
    const now = nowISO();

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
        vehicleType: "Sedan",
        plateNumber: "DL01AB1001",
        capacity: 4,
        vendorMobile: "+911111111111",
        additionalComments: "Fast city rides",
        priceDropped: true,
        priceDropPercent: 12,
        heroImage: "",
        active: true,
        serviceAreaId: "area_chandigarh"
      },
      {
        id: "cab_red_02",
        name: "Red Coach Cabs",
        vehicleType: "SUV",
        plateNumber: "DL01AB2002",
        capacity: 6,
        vendorMobile: "+912222222222",
        additionalComments: "Intercity and hills",
        priceDropped: false,
        priceDropPercent: 0,
        heroImage: "",
        active: true,
        serviceAreaId: "area_manali"
      },
      {
        id: "cab_hill_03",
        name: "Hill Drive",
        vehicleType: "Sedan",
        plateNumber: "HP01AB3003",
        capacity: 4,
        vendorMobile: "+913333333333",
        additionalComments: "Airport pickup",
        priceDropped: true,
        priceDropPercent: 8,
        heroImage: "",
        active: true,
        serviceAreaId: "area_kullu"
      }
    ];

    const busRoutes = [
      {
        id: "bus_bolt_chi_dal",
        operatorName: "Bolt Bus",
        operatorCode: "1009-CHP-DHA-3",
        fromCity: "Chicago",
        fromCode: "CHI",
        toCity: "Dallas",
        toCode: "DAL",
        departureTime: "3:00 pm",
        arrivalTime: "10:00 pm",
        durationText: "7 H 0 M",
        busType: "Non AC",
        fare: 8,
        totalSeats: 26,
        seatLayout: makeSeatLayout(26),
        serviceDates: dates,
        seatsBookedByDate: {},
        heroImage: "",
        active: true,
        createdAt: now
      },
      {
        id: "bus_red_chi_dal",
        operatorName: "Red Coach",
        operatorCode: "1009-CHP-DHA",
        fromCity: "Chicago",
        fromCode: "CHI",
        toCity: "Dallas",
        toCode: "DAL",
        departureTime: "3:30 pm",
        arrivalTime: "10:30 pm",
        durationText: "7 H 0 M",
        busType: "Non AC",
        fare: 8,
        totalSeats: 18,
        seatLayout: makeSeatLayout(18),
        serviceDates: dates,
        seatsBookedByDate: {},
        heroImage: "",
        active: true,
        createdAt: now
      }
    ];

    db.serviceAreas = upsertById(Array.isArray(db.serviceAreas) ? db.serviceAreas : [], serviceAreas);
    db.cabProviders = upsertById(Array.isArray(db.cabProviders) ? db.cabProviders : [], cabProviders);
    db.busRoutes = upsertById(Array.isArray(db.busRoutes) ? db.busRoutes : [], busRoutes);
    if (!Array.isArray(db.busBookings)) db.busBookings = [];
    db.cabPricing = {
      ...(db.cabPricing || {}),
      baseFare: 90,
      perKm: 16,
      perMin: 2,
      tolls: { enabled: true, defaultFee: 50 }
    };
  }, "seed_transport_data");

  console.log("Seeded transport data: service areas, cab providers, bus routes.");
}

run().catch((err) => {
  console.error("seedTransport failed:", err?.message || err);
  process.exit(1);
});

