import fs from "fs-extra";
import lockfile from "proper-lockfile";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "..", "data", "auth-logins.json");

type AuthEvent = {
  at: string;
  event: "otp_request" | "otp_verify" | "session_sync" | "password_login" | "password_set" | "logout";
  ok: boolean;
  provider: "supabase_phone" | "supabase_oauth" | "supabase_password" | "anonymous";
  userId?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  browser?: string;
  platform?: string;
  error?: string;
};

function detectBrowser(ua: string) {
  const s = ua.toLowerCase();
  if (s.includes("edg/")) return "Edge";
  if (s.includes("chrome/")) return "Chrome";
  if (s.includes("firefox/")) return "Firefox";
  if (s.includes("safari/") && !s.includes("chrome/")) return "Safari";
  return "Unknown";
}

function detectPlatform(ua: string) {
  const s = ua.toLowerCase();
  if (s.includes("android")) return "Android";
  if (s.includes("iphone") || s.includes("ipad")) return "iOS";
  if (s.includes("mac os")) return "macOS";
  if (s.includes("windows")) return "Windows";
  if (s.includes("linux")) return "Linux";
  return "Unknown";
}

export function getRequestMeta(req: any) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = xff || req.ip || req.socket?.remoteAddress || "";
  const userAgent = String(req.headers["user-agent"] || "");
  return {
    ip,
    userAgent,
    browser: detectBrowser(userAgent),
    platform: detectPlatform(userAgent)
  };
}

export async function writeAuthEvent(event: AuthEvent) {
  await fs.ensureDir(path.dirname(LOG_PATH));
  if (!(await fs.pathExists(LOG_PATH))) {
    await fs.writeJson(LOG_PATH, [], { spaces: 2 });
  }

  const release = await lockfile.lock(LOG_PATH, { retries: 5, stale: 10000 });
  try {
    const list = await fs.readJson(LOG_PATH).catch(() => []);
    const arr = Array.isArray(list) ? list : [];
    arr.push(event);
    await fs.writeJson(LOG_PATH, arr, { spaces: 2 });
  } finally {
    await release();
  }
}
