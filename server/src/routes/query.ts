import { Router } from "express";
import { mutateData } from "../services/jsondb";
import { makeId, QuerySchema } from "@explorevalley/shared";
import { z } from "zod";
import type TelegramBot from "node-telegram-bot-api";

export function queryRouter(bot: TelegramBot, adminChatIds: number[]) {
  const r = Router();

  const CreateQuery = z.object({
    userName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    subject: z.string(),
    message: z.string()
  });

  r.post("/", async (req, res) => {
    const body = CreateQuery.parse(req.body);
    let createdId = "";
    let notifyMsg = "";

    await mutateData((db) => {
      const now = new Date().toISOString();
      const q = QuerySchema.parse({
        id: makeId("query"),
        ...body,
        status: "pending",
        submittedAt: now,
        respondedAt: null,
        response: null
      });
      db.queries.push(q);
      db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_QUERY", entity: "query", entityId: q.id });
      createdId = q.id;

      notifyMsg =
        `💬 NEW CUSTOMER QUERY\n\nFrom: ${q.userName}\nEmail: ${q.email}\nPhone: ${q.phone}\nSubject: ${q.subject}\n\n${q.message}\n\nID: ${q.id}`;
    }, "query");

    for (const adminId of adminChatIds) bot.sendMessage(adminId, notifyMsg);
    res.json({ success: true, id: createdId });
  });

  return r;
}
