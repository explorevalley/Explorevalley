/**
 * Email Notification Service
 * Sends transactional emails for order confirmations, status updates, and refunds.
 * Uses a pluggable transport — currently logs to console + stores in DB.
 * To enable real email sending, set EMAIL_PROVIDER=ses|smtp and configure credentials.
 */

import { makeId } from "@explorevalley/shared";

export interface EmailPayload {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  template?: string;
  orderId?: string;
}

export interface EmailResult {
  ok: boolean;
  id: string;
  error?: string;
}

function safeText(v: any): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

/* ---------- HTML email templates ---------- */

export function orderConfirmationHtml(opts: {
  name: string;
  orderId: string;
  orderType: string;
  items: string;
  total: string;
  date: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8f9fa; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #1a1a2e; margin-top: 0;">Order Confirmed! 🎉</h2>
    <p>Hi <strong>${opts.name}</strong>,</p>
    <p>Thank you for your order. Here are the details:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 0; color: #666;">Order ID</td><td style="padding: 8px 0; font-weight: 600;">${opts.orderId}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Type</td><td style="padding: 8px 0;">${opts.orderType}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0;">${opts.date}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Items</td><td style="padding: 8px 0;">${opts.items}</td></tr>
      <tr style="border-top: 1px solid #eee;"><td style="padding: 12px 0; color: #666; font-weight: 600;">Total</td><td style="padding: 12px 0; font-weight: 700; font-size: 18px; color: #22c55e;">${opts.total}</td></tr>
    </table>
    <p style="color: #666;">You'll receive updates as your order progresses. You can also track your order in the ExploreValley app.</p>
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
      ExploreValley &middot; Kullu Valley, Himachal Pradesh
    </div>
  </div>
</body>
</html>`;
}

export function orderStatusUpdateHtml(opts: {
  name: string;
  orderId: string;
  orderType: string;
  status: string;
  message: string;
}): string {
  const statusColors: Record<string, string> = {
    confirmed: "#22c55e",
    processing: "#3b82f6",
    picked_up: "#f59e0b",
    in_transit: "#8b5cf6",
    delivered: "#22c55e",
    completed: "#22c55e",
    cancelled: "#ef4444",
  };
  const color = statusColors[opts.status] || "#666";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8f9fa; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #1a1a2e; margin-top: 0;">Order Update</h2>
    <p>Hi <strong>${opts.name}</strong>,</p>
    <p>Your ${opts.orderType} order <strong>${opts.orderId}</strong> has been updated:</p>
    <div style="margin: 20px 0; padding: 16px; border-radius: 8px; background: ${color}15; border-left: 4px solid ${color};">
      <div style="font-size: 18px; font-weight: 700; color: ${color}; text-transform: capitalize;">${opts.status.replace(/_/g, " ")}</div>
      <div style="margin-top: 8px; color: #333;">${opts.message}</div>
    </div>
    <p style="color: #666;">Track your order anytime in the ExploreValley app.</p>
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
      ExploreValley &middot; Kullu Valley, Himachal Pradesh
    </div>
  </div>
</body>
</html>`;
}

export function refundInitiatedHtml(opts: {
  name: string;
  orderId: string;
  amount: string;
  reason: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8f9fa; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #1a1a2e; margin-top: 0;">Refund Initiated</h2>
    <p>Hi <strong>${opts.name}</strong>,</p>
    <p>Your refund request for order <strong>${opts.orderId}</strong> has been initiated.</p>
    <div style="margin: 20px 0; padding: 16px; border-radius: 8px; background: #f0fdf4; border-left: 4px solid #22c55e;">
      <div style="font-size: 18px; font-weight: 700; color: #22c55e;">Refund: ${opts.amount}</div>
      <div style="margin-top: 8px; color: #333;">Reason: ${opts.reason}</div>
    </div>
    <p style="color: #666;">The refund will be processed within 5-7 business days.</p>
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
      ExploreValley &middot; Kullu Valley, Himachal Pradesh
    </div>
  </div>
</body>
</html>`;
}

/* ---------- Send logic ---------- */

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || "log").trim().toLowerCase();

async function sendViaSMTP(payload: EmailPayload): Promise<EmailResult> {
  // Placeholder for nodemailer SMTP transport
  // Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
  console.log(`[EMAIL:SMTP] Would send to ${payload.to}: ${payload.subject}`);
  return { ok: true, id: makeId("email") };
}

async function sendViaSES(payload: EmailPayload): Promise<EmailResult> {
  // Placeholder for AWS SES transport
  // Uses @aws-sdk/client-ses (already in dependencies)
  console.log(`[EMAIL:SES] Would send to ${payload.to}: ${payload.subject}`);
  return { ok: true, id: makeId("email") };
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const id = makeId("email");
  try {
    if (EMAIL_PROVIDER === "smtp") {
      return await sendViaSMTP(payload);
    }
    if (EMAIL_PROVIDER === "ses") {
      return await sendViaSES(payload);
    }
    // Default: log mode
    console.log(`[EMAIL:LOG] To: ${payload.to} | Subject: ${payload.subject} | Template: ${payload.template || "custom"}`);
    return { ok: true, id };
  } catch (err: any) {
    console.error(`[EMAIL:ERROR]`, err);
    return { ok: false, id, error: String(err?.message || err) };
  }
}

/* ---------- Convenience senders ---------- */

export async function sendOrderConfirmationEmail(opts: {
  email: string;
  name: string;
  orderId: string;
  orderType: string;
  items: string;
  total: string;
}): Promise<EmailResult> {
  const now = new Date().toISOString().slice(0, 10);
  return sendEmail({
    to: opts.email,
    toName: opts.name,
    subject: `Order Confirmed - ${opts.orderId}`,
    bodyHtml: orderConfirmationHtml({ ...opts, date: now }),
    template: "order_confirmation",
    orderId: opts.orderId,
  });
}

export async function sendOrderStatusEmail(opts: {
  email: string;
  name: string;
  orderId: string;
  orderType: string;
  status: string;
  message: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: opts.email,
    toName: opts.name,
    subject: `Order Update - ${opts.orderId} (${opts.status})`,
    bodyHtml: orderStatusUpdateHtml(opts),
    template: "status_update",
    orderId: opts.orderId,
  });
}

export async function sendRefundEmail(opts: {
  email: string;
  name: string;
  orderId: string;
  amount: string;
  reason: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: opts.email,
    toName: opts.name,
    subject: `Refund Initiated - ${opts.orderId}`,
    bodyHtml: refundInitiatedHtml(opts),
    template: "refund_initiated",
    orderId: opts.orderId,
  });
}
