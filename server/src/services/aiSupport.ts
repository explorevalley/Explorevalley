/**
 * AI Customer Support Service
 * Uses agent prompts for multilingual, data-grounded responses.
 * Escalates refund/sensitive queries to manager's Telegram channel.
 */

import { runAgentMessage, type AgentRunResult, type Intent } from "./agents";

type BotLike = any;

export interface AIProcessResult {
  reply: string;
  intent: Intent;
  shouldEscalate: boolean;
  escalationData?: {
    orderId: string;
    reason: string;
    conversationSummary: string;
  };
}

export async function processUserMessage(
  userMessage: string,
  db: any,
  userPhone?: string,
  userName?: string,
  userEmail?: string
): Promise<AIProcessResult> {
  const result: AgentRunResult = await runAgentMessage({
    role: "support",
    message: userMessage,
    db,
    user: { name: userName, phone: userPhone, email: userEmail },
    channel: "web_chat",
  });

  return {
    reply: result.reply,
    intent: result.intent || "general",
    shouldEscalate: Boolean(result.shouldEscalate),
    escalationData: result.escalationData,
  };
}

/* ---------- Escalation to Manager Telegram ---------- */

export async function escalateToManager(
  bot: BotLike,
  managerChatIds: number[],
  data: {
    customerName: string;
    customerPhone: string;
    orderId: string;
    reason: string;
    conversationSummary: string;
    channel: string;
  }
): Promise<void> {
  const msg =
    `⚠️ ESCALATION REQUIRED\n\n` +
    `Customer: ${data.customerName}\n` +
    `Phone: ${data.customerPhone}\n` +
    `Order: ${data.orderId || "N/A"}\n` +
    `Channel: ${data.channel}\n` +
    `Reason: ${data.reason}\n\n` +
    `Summary:\n${data.conversationSummary}`;

  for (const chatId of managerChatIds) {
    try {
      await bot.sendMessage(chatId, msg);
    } catch (err: any) {
      console.error(`[AI:ESCALATE] Failed to notify manager ${chatId}:`, err?.message);
    }
  }
}
