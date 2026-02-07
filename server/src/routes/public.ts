import { Router } from "express";
import { readData } from "../services/jsondb";
import path from "path";
import fs from "fs-extra";

export const publicRouter = Router();

publicRouter.get("/tours", async (_req, res) => {
  const db = await readData();
  res.json(db.tours.filter(t => t.available));
});

publicRouter.get("/hotels", async (_req, res) => {
  const db = await readData();
  res.json(db.hotels.filter(h => h.available));
});

publicRouter.get("/menu", async (_req, res) => {
  const db = await readData();
  res.json(db.menuItems.filter(m => m.available));
});

publicRouter.get("/menu.pdf", async (_req, res) => {
  const file = path.join(process.cwd(), "..", "public", "uploads", "pdf", "menu.pdf");
  if (!(await fs.pathExists(file))) return res.status(404).json({ error: "Menu PDF not found. Add menu items via bot then /status to regenerate." });
  res.sendFile(file);
});
