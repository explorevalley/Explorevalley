import PDFDocument from "pdfkit";
import fs from "fs-extra";
import path from "path";
import type { Database } from "@explorevalley/shared";

const OUT_DIR = path.join(process.cwd(), "..", "public", "uploads", "pdf");
const OUT_FILE = path.join(OUT_DIR, "menu.pdf");

export async function generateMenuPDF(db: Database) {
  await fs.ensureDir(OUT_DIR);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const stream = fs.createWriteStream(OUT_FILE);
  doc.pipe(stream);

  doc.fontSize(22).text("ExploreValley Menu", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString("en-IN")}`, { align: "center" });
  doc.moveDown(1);

  const byCat = new Map<string, any[]>();
  for (const item of db.menuItems.filter(m => m.available)) {
    if (!byCat.has(item.category)) byCat.set(item.category, []);
    byCat.get(item.category)!.push(item);
  }

  for (const [cat, items] of byCat.entries()) {
    doc.fontSize(16).text(cat);
    doc.moveDown(0.25);

    for (const it of items) {
      doc.fontSize(12).text(`${it.name} ${it.isVeg ? "(Veg)" : ""} - ₹${it.price}`);
      if (it.description) doc.fontSize(10).fillColor("gray").text(it.description).fillColor("black");
      doc.moveDown(0.4);
    }
    doc.moveDown(0.6);
  }

  doc.end();
  await new Promise<void>((res) => stream.on("finish", () => res()));
  return OUT_FILE;
}
