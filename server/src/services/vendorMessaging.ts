/**
 * WhatsApp / Vendor Messaging Service
 * Sends order confirmations and status updates to vendors via WhatsApp API.
 * Currently uses a log-based transport. Set WHATSAPP_PROVIDER=twilio|meta to enable.
 */

import { makeId } from "@explorevalley/shared";

function safeText(v: any): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

export interface VendorMessagePayload {
  vendorMobile: string;
  vendorName: string;
  orderId: string;
  messageType: "order_confirmation" | "status_update" | "query";
  content: string;
}

export interface VendorMessageResult {
  ok: boolean;
  id: string;
  error?: string;
}

const WHATSAPP_PROVIDER = (process.env.WHATSAPP_PROVIDER || "log").trim().toLowerCase();

async function sendViaTwilio(payload: VendorMessagePayload): Promise<VendorMessageResult> {
  // Placeholder: configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
  console.log(`[WHATSAPP:TWILIO] Would send to ${payload.vendorMobile}: ${payload.content.slice(0, 80)}...`);
  return { ok: true, id: makeId("vmsg") };
}

async function sendViaMeta(payload: VendorMessagePayload): Promise<VendorMessageResult> {
  // Placeholder: configure META_WHATSAPP_TOKEN, META_PHONE_NUMBER_ID
  console.log(`[WHATSAPP:META] Would send to ${payload.vendorMobile}: ${payload.content.slice(0, 80)}...`);
  return { ok: true, id: makeId("vmsg") };
}

export async function sendVendorWhatsApp(payload: VendorMessagePayload): Promise<VendorMessageResult> {
  const id = makeId("vmsg");
  try {
    if (WHATSAPP_PROVIDER === "twilio") return await sendViaTwilio(payload);
    if (WHATSAPP_PROVIDER === "meta") return await sendViaMeta(payload);
    // Log mode
    console.log(`[WHATSAPP:LOG] To: ${payload.vendorMobile} (${payload.vendorName}) | Type: ${payload.messageType} | Order: ${payload.orderId}`);
    console.log(`[WHATSAPP:LOG] Content: ${payload.content}`);
    return { ok: true, id };
  } catch (err: any) {
    console.error(`[WHATSAPP:ERROR]`, err);
    return { ok: false, id, error: String(err?.message || err) };
  }
}

/* ---------- Message Templates ---------- */

export function orderConfirmationMessage(opts: {
  vendorName: string;
  orderId: string;
  customerName: string;
  items: string;
  total: string;
  deliveryAddress?: string;
}): string {
  return `🔔 New Order for ${opts.vendorName}!

Order ID: ${opts.orderId}
Customer: ${opts.customerName}
Items: ${opts.items}
Total: ${opts.total}
${opts.deliveryAddress ? `Delivery: ${opts.deliveryAddress}` : ""}

Please confirm this order. Reply CONFIRM ${opts.orderId} or REJECT ${opts.orderId}`;
}

export function orderStatusMessage(opts: {
  orderId: string;
  status: string;
  notes?: string;
}): string {
  return `📋 Order Update: ${opts.orderId}
Status: ${opts.status.toUpperCase().replace(/_/g, " ")}
${opts.notes ? `Note: ${opts.notes}` : ""}`;
}

/* ---------- Notify vendor about new order ---------- */

export async function notifyVendorNewOrder(opts: {
  vendorMobile: string;
  vendorName: string;
  orderId: string;
  customerName: string;
  items: string;
  total: string;
  deliveryAddress?: string;
}): Promise<VendorMessageResult> {
  const content = orderConfirmationMessage(opts);
  return sendVendorWhatsApp({
    vendorMobile: opts.vendorMobile,
    vendorName: opts.vendorName,
    orderId: opts.orderId,
    messageType: "order_confirmation",
    content,
  });
}

/* ---------- Notify vendor about status change ---------- */

export async function notifyVendorStatusUpdate(opts: {
  vendorMobile: string;
  vendorName: string;
  orderId: string;
  status: string;
  notes?: string;
}): Promise<VendorMessageResult> {
  const content = orderStatusMessage({ orderId: opts.orderId, status: opts.status, notes: opts.notes });
  return sendVendorWhatsApp({
    vendorMobile: opts.vendorMobile,
    vendorName: opts.vendorName,
    orderId: opts.orderId,
    messageType: "status_update",
    content,
  });
}
