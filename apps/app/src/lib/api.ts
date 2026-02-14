import { getAuthToken } from "./auth";

function resolveBaseUrl() {
  const envBase = (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const host = window.location.hostname || "localhost";
    const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);

    // Local dev defaults.
    if (host === "localhost" || host === "127.0.0.1" || isIpv4) {
      // IP-based hosts typically do not have TLS configured. Force http to avoid mixed-content/SSL failures.
      return `http://${host}:8082`;
    }

    // App Engine pattern: frontend is typically `${project}.{region}.r.appspot.com`
    // and backend service is `api-dot-${project}.{region}.r.appspot.com`.
    if (host.startsWith("api-dot-")) {
      return `${protocol}//${host}`;
    }
    return `${protocol}//api-dot-${host}`;
  }

  return "http://localhost:8082";
}

const BASE_URL = resolveBaseUrl();
const ADMIN_UI_PATH = "/_ev_console_x9k2p7_9b3f21a7c4d8e0f6a1b5c7d9e2f4a6b8c0d1e3f5a7b9c2d4e6f8a0b1c3d5e7f9";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(url: string, init?: RequestInit, retries = 1): Promise<Response> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (err: any) {
      lastErr = err;
      if (attempt >= retries) break;
      await sleep(350);
    }
  }
  throw lastErr || new Error("Network request failed");
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const r = await requestWithRetry(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const token = getAuthToken();
  const r = await requestWithRetry(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function trackEvent(body: any): Promise<void> {
  // Only track security/malicious behavior. Everything else is ignored by design.
  // This keeps user privacy tighter and avoids noisy/expensive event spam.
  const type = String(body?.type || body?.eventType || "").toLowerCase();
  const category = String(body?.category || "").toLowerCase();
  const meta = body?.meta && typeof body.meta === "object" ? body.meta : {};
  const flagged = meta?.malicious === true || meta?.suspicious === true;
  const securityCategory = category === "security" || category === "trust" || category === "fraud";
  const securityType =
    type.includes("malicious") ||
    type.includes("suspicious") ||
    type.includes("fraud") ||
    type.includes("abuse") ||
    type.includes("attack") ||
    type.includes("bot") ||
    type.includes("rate_limit") ||
    type.includes("blocked");
  if (!flagged && !securityCategory && !securityType) return;

  try {
    await apiPost("/api/analytics/track", body);
  } catch (err) {
    // Ignore analytics failures to avoid blocking UX.
  }
}

export { BASE_URL, ADMIN_UI_PATH };
