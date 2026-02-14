import type { Database } from "@explorevalley/shared";

function round2(n: number) { return Math.round(n * 100) / 100; }

export function computeGST(taxableValue: number, gstRate: number, interstate = false) {
  const gstAmount = round2(taxableValue * gstRate);
  if (interstate) {
    return { gstRate, taxableValue: round2(taxableValue), gstAmount, cgst: 0, sgst: 0, igst: gstAmount };
  }
  const half = round2(gstAmount / 2);
  return { gstRate, taxableValue: round2(taxableValue), gstAmount, cgst: half, sgst: round2(gstAmount - half), igst: 0 };
}

export function hotelGstRate(perNight: number, db: Database) {
  const slabs = db.settings.taxRules.hotel.slabs;
  const slab = slabs.find(s => perNight >= s.min && (s.max === null || perNight <= s.max));
  return slab?.gst ?? 0;
}

export function daysBetween(checkIn: string, checkOut: string) {
  const a = new Date(checkIn + "T00:00:00Z").getTime();
  const b = new Date(checkOut + "T00:00:00Z").getTime();
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}
