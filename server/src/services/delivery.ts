/**
 * Delivery Tracking Service
 * Manages order lifecycle: assignment → pickup → transit → delivery
 * Sends Telegram notifications to field team and admin
 */

import { makeId } from "@explorevalley/shared";

type BotLike = any;

function safeText(v: any): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

export type DeliveryStatus = "pending" | "assigned" | "picked_up" | "in_transit" | "delivered" | "cancelled";

export interface DeliveryTrackingRecord {
  id: string;
  orderId: string;
  orderType: string;
  status: DeliveryStatus;
  assignedTo: string;
  assignedPhone: string;
  pickupTime: string | null;
  deliveryTime: string | null;
  notes: string;
  telegramNotified: boolean;
  createdAt: string;
  updatedAt: string;
}

export function createDeliveryRecord(orderId: string, orderType: string): DeliveryTrackingRecord {
  const now = new Date().toISOString();
  return {
    id: makeId("dlv"),
    orderId,
    orderType,
    status: "pending",
    assignedTo: "",
    assignedPhone: "",
    pickupTime: null,
    deliveryTime: null,
    notes: "",
    telegramNotified: false,
    createdAt: now,
    updatedAt: now,
  };
}

/* ---------- Status transition messages ---------- */

function statusEmoji(status: DeliveryStatus): string {
  const map: Record<DeliveryStatus, string> = {
    pending: "⏳",
    assigned: "👤",
    picked_up: "📦",
    in_transit: "🚚",
    delivered: "✅",
    cancelled: "❌",
  };
  return map[status] || "📋";
}

export function deliveryStatusMessage(record: DeliveryTrackingRecord, extra?: string): string {
  const emoji = statusEmoji(record.status);
  const lines = [
    `${emoji} DELIVERY UPDATE`,
    ``,
    `Order: ${record.orderId}`,
    `Type: ${record.orderType}`,
    `Status: ${record.status.toUpperCase().replace(/_/g, " ")}`,
  ];

  if (record.assignedTo) lines.push(`Assigned to: ${record.assignedTo}`);
  if (record.assignedPhone) lines.push(`Driver Phone: ${record.assignedPhone}`);
  if (record.pickupTime) lines.push(`Picked up: ${new Date(record.pickupTime).toLocaleString()}`);
  if (record.deliveryTime) lines.push(`Delivered: ${new Date(record.deliveryTime).toLocaleString()}`);
  if (record.notes) lines.push(`Notes: ${record.notes}`);
  if (extra) lines.push(`\n${extra}`);

  return lines.join("\n");
}

/* ---------- Telegram notifications ---------- */

export async function notifyFieldTeam(
  bot: BotLike,
  fieldChatIds: number[],
  record: DeliveryTrackingRecord,
  customerInfo?: { name: string; phone: string; address?: string }
): Promise<void> {
  let extra = "";
  if (customerInfo) {
    extra = `Customer: ${customerInfo.name}\nPhone: ${customerInfo.phone}`;
    if (customerInfo.address) extra += `\nAddress: ${customerInfo.address}`;
  }
  const msg = deliveryStatusMessage(record, extra);

  for (const chatId of fieldChatIds) {
    try {
      await bot.sendMessage(chatId, msg);
    } catch (err: any) {
      console.error(`[DELIVERY:NOTIFY] Failed to send to ${chatId}:`, err?.message);
    }
  }
}

export async function notifyDeliveryUpdate(
  bot: BotLike,
  adminChatIds: number[],
  record: DeliveryTrackingRecord
): Promise<void> {
  const msg = deliveryStatusMessage(record);
  for (const chatId of adminChatIds) {
    try {
      await bot.sendMessage(chatId, msg);
    } catch (err: any) {
      console.error(`[DELIVERY:ADMIN] Failed to send to ${chatId}:`, err?.message);
    }
  }
}
