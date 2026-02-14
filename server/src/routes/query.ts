import { Router } from "express";
import { mutateData } from "../services/jsondb";
import { makeId, QuerySchema } from "@explorevalley/shared";
import { z } from "zod";
type BotLike = any;
import { requestBrowser, requestIp, upsertUserFromSubmission } from "../services/userProfiles";

export function queryRouter(bot: BotLike, adminChatIds: number[]) {
  const r = Router();

  const CreateQuery = z.object({
    userName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    subject: z.string(),
    message: z.string()
  });

  r.post("/", async (req, res) => {
    const parsed = CreateQuery.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

    const body = parsed.data;
    const ipAddress = requestIp(req);
    const browser = requestBrowser(req);
    let createdId = "";
    let notifyMsg = "";

    try {
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
        upsertUserFromSubmission(db, {
          phone: q.phone,
          name: q.userName,
          email: q.email,
          ipAddress,
          browser,
          orderType: "query",
          orderId: q.id,
          orderStatus: q.status,
          orderAt: q.submittedAt,
          orderAmount: 0
        }, now);
        createdId = q.id;

        notifyMsg =
          `NEW CUSTOMER QUERY\n\nFrom: ${q.userName}\nEmail: ${q.email}\nPhone: ${q.phone}\nSubject: ${q.subject}\n\n${q.message}\n\nID: ${q.id}`;
      }, "query");
    } catch (err: any) {
      return res.status(400).json({ error: "QUERY_CREATE_FAILED", message: String(err?.message || err) });
    }

    for (const adminId of adminChatIds) bot.sendMessage(adminId, notifyMsg);
    res.json({ success: true, id: createdId });
  });

  return r;
}
