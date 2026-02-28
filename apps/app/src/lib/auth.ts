import { Platform } from "react-native";

type AuthMode = "authenticated" | "none";
type AuthUser = {
  id?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
};

let token: string | null = null;
let supabaseAccessToken: string | null = null;
let mode: AuthMode = "none";
let user: AuthUser | null = null;

const TOKEN_KEY = "explorevalley_token";
const SUPABASE_ACCESS_TOKEN_KEY = "explorevalley_supabase_access_token";
const MODE_KEY = "explorevalley_auth_mode";
const USER_KEY = "explorevalley_auth_user";

function isWeb() {
  return Platform.OS === "web";
}

function isJwt(value: string | null) {
  if (!value) return false;
  const parts = value.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

export function loadAuth() {
  if (!isWeb()) return;
  token = localStorage.getItem(TOKEN_KEY);
  supabaseAccessToken = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY);
  if (token && !isJwt(token)) {
    token = null;
    supabaseAccessToken = null;
    mode = "none";
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SUPABASE_ACCESS_TOKEN_KEY);
  } else {
    mode = token ? "authenticated" : "none";
  }
  try {
    const raw = localStorage.getItem(USER_KEY);
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }
  if (token && !user) {
    try {
      if (typeof atob === "function") {
        const payloadRaw = token.split(".")[1] || "";
        const payloadJson = atob(payloadRaw.replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadJson);
        user = {
          id: payload?.sub || null,
          email: payload?.email || null,
          phone: payload?.phone || null,
          name: payload?.name || payload?.email || payload?.phone || null
        };
      }
    } catch {
      // ignore decode failures
    }
  }
}

export function setAuthToken(next: string | null) {
  token = next;
  if (!next) {
    supabaseAccessToken = null;
    user = null;
    if (isWeb()) localStorage.removeItem(USER_KEY);
  } else if (!user) {
    // Fallback user extraction from JWT payload when explicit user object is not set.
    try {
      if (typeof atob !== "function") return;
      const payloadRaw = next.split(".")[1] || "";
      const payloadJson = atob(payloadRaw.replace(/-/g, "+").replace(/_/g, "/"));
      const payload = JSON.parse(payloadJson);
      user = {
        id: payload?.sub || null,
        email: payload?.email || null,
        phone: payload?.phone || null,
        name: payload?.name || payload?.email || payload?.phone || null
      };
      if (isWeb()) localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore decode failures
    }
  }
  if (isWeb()) {
    if (next) localStorage.setItem(TOKEN_KEY, next);
    else localStorage.removeItem(TOKEN_KEY);
    if (!next) localStorage.removeItem(SUPABASE_ACCESS_TOKEN_KEY);
  }
}

export function getAuthToken() {
  return token;
}

export function setSupabaseAccessToken(next: string | null) {
  supabaseAccessToken = next;
  if (!isWeb()) return;
  if (next) localStorage.setItem(SUPABASE_ACCESS_TOKEN_KEY, next);
  else localStorage.removeItem(SUPABASE_ACCESS_TOKEN_KEY);
}

export function getSupabaseAccessToken() {
  return supabaseAccessToken;
}

export function setAuthMode(next: AuthMode) {
  mode = next;
  if (isWeb()) localStorage.setItem(MODE_KEY, next);
}

export function getAuthMode() {
  return mode;
}

export function setAuthUser(next: AuthUser | null) {
  user = next;
  if (!isWeb()) return;
  if (next) localStorage.setItem(USER_KEY, JSON.stringify(next));
  else localStorage.removeItem(USER_KEY);
}

export function getAuthUser() {
  return user;
}
