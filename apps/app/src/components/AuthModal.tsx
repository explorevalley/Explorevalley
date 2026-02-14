import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, Platform, TextInput } from "react-native";
import { apiPost } from "../lib/api";
import { getSupabaseAccessToken, setAuthMode, setAuthToken, setAuthUser, setSupabaseAccessToken } from "../lib/auth";
import { trackEvent } from "../lib/api";

const SUPABASE_URL = "https://pmqlpbqwyxmfuvcrwoan.supabase.co";

function friendlyAuthError(input: any) {
  const raw = String(input?.message || input || "");
  const upper = raw.toUpperCase();
  if (upper.includes("SUPABASE_NOT_CONFIGURED")) return "Server auth is not configured yet. Add Supabase URL and publishable key in server .env.";
  if (upper.includes("INVALID_SUPABASE_SESSION")) return "Login session is invalid. Please sign in with Google again.";
  if (upper.includes("PASSWORD_LOGIN_FAILED")) return "Email or password is invalid.";
  if (upper.includes("PASSWORD_SET_FAILED")) return "Could not set password. Please retry.";
  if (upper.includes("REDIRECT_URI_MISMATCH")) return "Google sign-in redirect is misconfigured. Please check OAuth redirect URLs.";
  if (upper.includes("FAILED TO FETCH")) return "Could not reach auth service. Check server and internet, then try again.";
  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      const msg = parsed?.error_description || parsed?.error || parsed?.message;
      if (msg) return String(msg);
    } catch {
      // ignore json parse failure
    }
  }
  return "Sign in failed. Please try again.";
}

type PendingGoogleSession = {
  token: string;
  accessToken: string;
  user?: any;
};

export default function AuthModal({ visible, onClose, onAuthed }: any) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [setupPassword, setSetupPassword] = useState("");
  const [setupPassword2, setSetupPassword2] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needSetupPassword, setNeedSetupPassword] = useState(false);
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogleSession | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (visible) return;
    setNeedSetupPassword(false);
    setPendingGoogle(null);
    setSetupPassword("");
    setSetupPassword2("");
    setErr(null);
    setMsg(null);
  }, [visible]);

  function finalizeAuth(payload: { token: string; user?: any; accessToken?: string | null }) {
    setAuthToken(payload.token);
    setSupabaseAccessToken(payload.accessToken || null);
    setAuthUser({
      id: payload.user?.id || null,
      email: payload.user?.email || null,
      phone: payload.user?.phone || null,
      name: payload.user?.name || payload.user?.email || payload.user?.phone || "User"
    });
    setAuthMode("authenticated");
    trackEvent({
      type: "auth_login",
      category: "core",
      name: payload.user?.name,
      email: payload.user?.email,
      phone: payload.user?.phone,
      meta: {
        method: payload.accessToken ? "google" : "password",
        path: typeof window !== "undefined" ? String(window.location.pathname || "") : "",
        url: typeof window !== "undefined" ? String(window.location.href || "") : ""
      }
    });
    onAuthed?.("authenticated");
  }

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const accessToken = params.get("access_token");
    if (!accessToken || syncingRef.current) return;
    syncingRef.current = true;

    (async () => {
      setErr(null);
      setMsg(null);
      setNeedSetupPassword(false);
      setPendingGoogle(null);
      setBusy(true);
      try {
        const r = await apiPost<{ token: string; user?: any; requirePasswordSetup?: boolean; accessToken?: string }>("/api/auth/session-sync", { accessToken });
        if (r.requirePasswordSetup) {
          setNeedSetupPassword(true);
          setPendingGoogle({
            token: r.token,
            user: r.user,
            accessToken: r.accessToken || accessToken
          });
          setMsg("First-time sign in detected. Please set a password for future email login.");
          if (r.user?.email) setEmail(String(r.user.email));
        } else {
          finalizeAuth({ token: r.token, user: r.user, accessToken: r.accessToken || accessToken });
          setMsg("Logged in.");
          if (visible) onClose?.();
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e: any) {
        setErr(friendlyAuthError(e));
      } finally {
        setBusy(false);
        syncingRef.current = false;
      }
    })();
  }, [visible, onAuthed, onClose]);

  function loginWithGoogle() {
    setErr(null);
    if (Platform.OS !== "web") {
      setErr("Google login is currently enabled for web in this build.");
      return;
    }
    // Use the current page as the redirect target for both local and production web.
    // This must be added to Supabase Auth Redirect URLs.
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const url = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&response_type=token`;
    window.location.href = url;
  }

  async function loginWithEmailPassword() {
    setErr(null);
    setMsg(null);
    if (!email || !password) {
      setErr("Enter email and password.");
      return;
    }
    setBusy(true);
    try {
      const r = await apiPost<{ token: string; user?: any; accessToken?: string | null }>("/api/auth/password-login", {
        email: email.trim(),
        password
      });
      finalizeAuth({ token: r.token, user: r.user, accessToken: r.accessToken || null });
      setMsg("Logged in.");
      onClose?.();
    } catch (e: any) {
      setErr(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitPasswordSetup() {
    setErr(null);
    setMsg(null);
    const accessToken = pendingGoogle?.accessToken || getSupabaseAccessToken();
    if (!accessToken) {
      setErr("Missing auth session. Please sign in with Google again.");
      return;
    }
    if (setupPassword.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (setupPassword !== setupPassword2) {
      setErr("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await apiPost("/api/auth/set-password", {
        accessToken,
        email: pendingGoogle?.user?.email || email || undefined,
        password: setupPassword
      });
      if (pendingGoogle) {
        finalizeAuth({
          token: pendingGoogle.token,
          user: pendingGoogle.user,
          accessToken: pendingGoogle.accessToken
        });
      }
      setNeedSetupPassword(false);
      setPendingGoogle(null);
      setSetupPassword("");
      setSetupPassword2("");
      setMsg("Password set. You can now login using Google or email/password.");
      onClose?.();
    } catch (e: any) {
      setErr(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.58)",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 440,
            backgroundColor: "#111214",
            borderWidth: 1,
            borderColor: "#2a2a2a",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{needSetupPassword ? "Set Password" : "Login"}</Text>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>

          {needSetupPassword ? (
            <View style={{ marginTop: 10, gap: 10 }}>
              <Text style={{ color: "#bbb" }}>
                Set your password once. Next time you can log in with either Google or email/password.
              </Text>
              <TextInput
                value={setupPassword}
                onChangeText={setSetupPassword}
                secureTextEntry
                placeholder="New password"
                placeholderTextColor="#7a7a7a"
                style={{ borderWidth: 1, borderColor: "#333", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
              />
              <TextInput
                value={setupPassword2}
                onChangeText={setSetupPassword2}
                secureTextEntry
                placeholder="Confirm password"
                placeholderTextColor="#7a7a7a"
                style={{ borderWidth: 1, borderColor: "#333", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
              />
              <Pressable
                disabled={busy}
                onPress={submitPasswordSetup}
                style={{
                  backgroundColor: "#fff",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: busy ? 0.75 : 1,
                }}
              >
                <Text style={{ fontWeight: "800" }}>{busy ? "Please wait..." : "Save Password"}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ marginTop: 10, gap: 10 }}>
              <Text style={{ color: "#bbb" }}>Continue with Google or use email/password.</Text>
              <Pressable
                disabled={busy}
                onPress={loginWithGoogle}
                style={{
                  backgroundColor: "#fff",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: busy ? 0.75 : 1,
                }}
              >
                <Text style={{ fontWeight: "800" }}>{busy ? "Please wait..." : "Continue with Google"}</Text>
              </Pressable>

              <View style={{ height: 1, backgroundColor: "#2a2a2a", marginVertical: 2 }} />

              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#7a7a7a"
                style={{ borderWidth: 1, borderColor: "#333", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor="#7a7a7a"
                style={{ borderWidth: 1, borderColor: "#333", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
              />
              <Pressable
                disabled={busy}
                onPress={loginWithEmailPassword}
                style={{
                  borderWidth: 1,
                  borderColor: "#5b5b5b",
                  paddingVertical: 11,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: busy ? 0.75 : 1
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>{busy ? "Please wait..." : "Login with Email & Password"}</Text>
              </Pressable>
            </View>
          )}

          {msg ? <Text style={{ color: "#9ef1a6", marginTop: 10 }}>{msg}</Text> : null}
          {err ? <Text style={{ color: "#ff6b6b", marginTop: 10 }}>{err}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}
