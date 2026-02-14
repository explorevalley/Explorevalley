import crypto from "crypto";

type OtpRecord = {
  hash: string;
  expiresAt: number;
  attempts: number;
  sendCount: number;
  lastSentAt: number;
};

const store = new Map<string, OtpRecord>();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MIN_INTERVAL_MS = 60 * 1000;
const OTP_MAX_SENDS_PER_HOUR = 5;

function now() {
  return Date.now();
}

function hashOtp(phone: string, otp: string) {
  const secret = process.env.OTP_SECRET || "dev_otp_secret";
  return crypto.createHash("sha256").update(`${phone}:${otp}:${secret}`).digest("hex");
}

export function canSendOtp(phone: string) {
  const rec = store.get(phone);
  if (!rec) return { ok: true as const };
  if (now() - rec.lastSentAt < OTP_MIN_INTERVAL_MS) {
    return { ok: false as const, reason: "TOO_SOON" as const };
  }
  if (rec.sendCount >= OTP_MAX_SENDS_PER_HOUR && now() - rec.lastSentAt < 60 * 60 * 1000) {
    return { ok: false as const, reason: "RATE_LIMIT" as const };
  }
  return { ok: true as const };
}

export function createOtp(phone: string) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const rec: OtpRecord = {
    hash: hashOtp(phone, otp),
    expiresAt: now() + OTP_TTL_MS,
    attempts: 0,
    sendCount: (store.get(phone)?.sendCount || 0) + 1,
    lastSentAt: now(),
  };
  store.set(phone, rec);
  return otp;
}

export function verifyOtp(phone: string, otp: string) {
  const rec = store.get(phone);
  if (!rec) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (now() > rec.expiresAt) return { ok: false as const, reason: "EXPIRED" as const };
  if (rec.attempts >= OTP_MAX_ATTEMPTS) return { ok: false as const, reason: "LOCKED" as const };

  const match = rec.hash === hashOtp(phone, otp);
  if (!match) {
    rec.attempts += 1;
    store.set(phone, rec);
    return { ok: false as const, reason: "INVALID" as const };
  }

  store.delete(phone);
  return { ok: true as const };
}
