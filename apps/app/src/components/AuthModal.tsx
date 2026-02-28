import React, { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { apiPost, supabaseGetUser, supabasePasswordLogin, supabaseUpdatePassword, trackEvent } from "../lib/api";
import { getSupabaseAccessToken, setAuthMode, setAuthToken, setAuthUser, setSupabaseAccessToken } from "../lib/auth";

type AuthModalProps = {
  visible: boolean;
  onClose?: () => void;
  onAuthed?: (mode: "authenticated" | "none") => void;
};

type AuthUserPayload = {
  id?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
};

type PendingGoogleState = {
  accessToken: string;
  user: AuthUserPayload;
  requirePasswordSetup?: boolean;
};

const SUPABASE_URL = String(
  process.env.SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    "https://pmqlpbqwyxmfuvcrwoan.supabase.co"
).replace(/\/+$/, "");

function formatAuthError(error: unknown) {
  const raw = String((error as any)?.message || error || "");
  const upper = raw.toUpperCase();

  if (upper.includes("SUPABASE_NOT_CONFIGURED")) return "Supabase is not configured.";
  if (upper.includes("PASSWORD_LOGIN_FAILED") || upper.includes("INVALID_LOGIN_CREDENTIALS")) {
    return "Invalid email or password.";
  }
  if (upper.includes("PASSWORD_SET_FAILED")) return "Failed to update password. Please try again.";
  if (upper.includes("PASSWORD_SET_INVALID_SESSION")) return "Session expired. Please login with Google again and retry password setup.";
  if (upper.includes("INVALID_INPUT")) return "Please check phone number and password fields.";
  if (upper.includes("REDIRECT_URI_MISMATCH")) return "Google redirect URL is not configured correctly.";
  if (upper.includes("BAD_OAUTH_CALLBACK")) return "Google callback failed. Please try login again.";
  if (upper.includes("OAUTH STATE PARAMETER MISSING")) return "OAuth state mismatch. Google callback is misconfigured.";
  if (upper.includes("INVALID_SUPABASE_SESSION")) return "Session expired. Please sign in again.";
  if (upper.includes("FAILED TO FETCH") || upper.includes("NETWORK")) return "Network error. Please retry.";

  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      const message = parsed?.error_description || parsed?.error || parsed?.message;
      if (message) return String(message);
    } catch {
      // ignore parse errors
    }
  }

  return "Login failed. Please try again.";
}

function passwordFlagKey(user: AuthUserPayload | null | undefined) {
  return `ev_pw_set_${String(user?.id || user?.email || "anon")}`;
}

function clearUrlHash() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search || "");
  params.delete("access_token");
  params.delete("refresh_token");
  params.delete("expires_in");
  params.delete("expires_at");
  params.delete("token_type");
  params.delete("error_code");
  params.delete("error");
  params.delete("error_description");
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
  window.history.replaceState({}, document.title, nextUrl);
}

export default function AuthModal({ visible, onClose, onAuthed }: AuthModalProps) {
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [setupPassword, setSetupPassword] = useState("");
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogleState | null>(null);
  const isPasswordSetupStep = !!pendingGoogle;

  const syncInProgressRef = useRef(false);

  const resetMessages = () => {
    setErrorText(null);
    setSuccessText(null);
  };

  const resetSensitiveState = () => {
    setSetupPassword("");
    setSetupPasswordConfirm("");
    setSetupPhone("");
    setPendingGoogle(null);
  };

  const finalizeAuth = (params: {
    token: string;
    accessToken: string;
    user: AuthUserPayload;
    method: "google" | "password";
  }) => {
    setAuthToken(params.token);
    setSupabaseAccessToken(params.accessToken);
    setAuthUser({
      id: params.user?.id || null,
      email: params.user?.email || null,
      phone: params.user?.phone || null,
      name: params.user?.name || params.user?.email || params.user?.phone || "User"
    });
    setAuthMode("authenticated");

    trackEvent({
      type: "auth_login",
      category: "core",
      name: params.user?.name,
      email: params.user?.email,
      phone: params.user?.phone,
      meta: {
        method: params.method,
        path: typeof window !== "undefined" ? String(window.location.pathname || "") : "",
        url: typeof window !== "undefined" ? String(window.location.href || "") : ""
      }
    });

    onAuthed?.("authenticated");
  };

  const syncSession = async (accessToken: string) => {
    try {
      const response = await apiPost<{
        token?: string;
        accessToken?: string | null;
        user?: AuthUserPayload;
        requirePasswordSetup?: boolean;
      }>("/api/auth/session-sync", { accessToken });
      return {
        token: String(response?.token || accessToken),
        accessToken: String(response?.accessToken || accessToken),
        user: response?.user || {},
        requirePasswordSetup: !!response?.requirePasswordSetup
      };
    } catch (err: any) {
      const msg = String(err?.message || err || "").toUpperCase();
      const canFallback =
        msg.includes("UNSUPPORTED_ENDPOINT") ||
        msg.includes("NOT FOUND") ||
        msg.includes("404") ||
        msg.includes("FAILED TO FETCH") ||
        msg.includes("NETWORK");
      if (!canFallback) throw err;
      const user = await supabaseGetUser(accessToken);
      return {
        token: accessToken,
        accessToken,
        user,
        requirePasswordSetup: false
      };
    }
  };

  useEffect(() => {
    if (visible) return;
    resetMessages();
    resetSensitiveState();
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== "web" || !visible) return;
    if (syncInProgressRef.current) return;

    const hash = String(window.location.hash || "");
    const search = String(window.location.search || "");
    if (!hash && !search) return;

    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const searchParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const accessToken = String(hashParams.get("access_token") || searchParams.get("access_token") || "").trim();
    const oauthError = String(
      hashParams.get("error_description") ||
        hashParams.get("error_code") ||
        searchParams.get("error_description") ||
        searchParams.get("error_code") ||
        hashParams.get("error") ||
        searchParams.get("error") ||
        ""
    ).trim();
    if (oauthError) {
      setErrorText(formatAuthError(oauthError));
      resetSensitiveState();
      clearUrlHash();
      return;
    }
    if (!accessToken) {
      return;
    }

    syncInProgressRef.current = true;
    setBusy(true);
    resetMessages();

    (async () => {
      try {
        const session = await syncSession(accessToken);
        clearUrlHash();

        if (session.requirePasswordSetup) {
          setPendingGoogle({
            accessToken: session.accessToken,
            user: session.user,
            requirePasswordSetup: session.requirePasswordSetup
          });
          setSuccessText("Set a password to complete login.");
          return;
        }

        finalizeAuth({
          token: session.token,
          accessToken: session.accessToken,
          user: session.user,
          method: "google"
        });
        setSuccessText("Logged in.");
        onClose?.();
      } catch (error) {
        setErrorText(formatAuthError(error));
      } finally {
        setBusy(false);
        syncInProgressRef.current = false;
      }
    })();
  }, [visible]);

  const handleGoogleLogin = () => {
    resetMessages();

    if (Platform.OS !== "web") {
      setErrorText("Google login is only available on web in this build.");
      return;
    }

    const redirectTo = `${window.location.origin}/`;
    const authUrl =
      `${SUPABASE_URL}/auth/v1/authorize` +
      `?provider=google` +
      `&redirect_to=${encodeURIComponent(redirectTo)}`;
    window.location.assign(authUrl);
  };

  const handleEmailPasswordLogin = async () => {
    resetMessages();

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setErrorText("Enter email and password.");
      return;
    }

    setBusy(true);
    try {
      let session: { access_token: string; user: AuthUserPayload };
      try {
        const response = await apiPost<{ token?: string; accessToken?: string | null; user?: AuthUserPayload }>(
          "/api/auth/password-login",
          { email: normalizedEmail, password }
        );
        session = {
          access_token: String(response?.accessToken || response?.token || ""),
          user: response?.user || {}
        };
      } catch {
        session = await supabasePasswordLogin(normalizedEmail, password);
      }
      if (!session.access_token) throw new Error("PASSWORD_LOGIN_FAILED");
      finalizeAuth({
        token: session.access_token,
        accessToken: session.access_token,
        user: session.user,
        method: "password"
      });
      setSuccessText("Logged in.");
      onClose?.();
    } catch (error) {
      setErrorText(formatAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSetup = async () => {
    resetMessages();

    const accessToken = pendingGoogle?.accessToken || getSupabaseAccessToken();
    if (!accessToken) {
      setErrorText("Session missing. Please sign in with Google again.");
      return;
    }

    if (setupPassword.length < 8) {
      setErrorText("Password must be at least 8 characters.");
      return;
    }

    if (setupPassword !== setupPasswordConfirm) {
      setErrorText("Passwords do not match.");
      return;
    }
    const normalizedPhone = setupPhone.trim();
    if (!/^\+?[0-9]{8,16}$/.test(normalizedPhone)) {
      setErrorText("Enter a valid phone number.");
      return;
    }

    setBusy(true);
    try {
      try {
        await apiPost("/api/auth/set-password", {
          accessToken,
          password: setupPassword,
          phone: normalizedPhone
        });
      } catch (apiErr: any) {
        const msg = String(apiErr?.message || apiErr || "").toUpperCase();
        const canFallback =
          msg.includes("UNSUPPORTED_ENDPOINT") ||
          msg.includes("NOT FOUND") ||
          msg.includes("404") ||
          msg.includes("FAILED TO FETCH") ||
          msg.includes("NETWORK");
        if (!canFallback) throw apiErr;
        await supabaseUpdatePassword(accessToken, setupPassword);
      }
      if (typeof window !== "undefined" && pendingGoogle?.user) {
        window.localStorage.setItem(passwordFlagKey(pendingGoogle.user), "1");
      }

      if (pendingGoogle) {
        finalizeAuth({
          token: accessToken,
          accessToken,
          user: { ...pendingGoogle.user, phone: normalizedPhone },
          method: "google"
        });
      }

      resetSensitiveState();
      setSuccessText("Password saved. Login complete.");
      onClose?.();
    } catch (error) {
      setErrorText(formatAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.58)",
          alignItems: "center",
          justifyContent: "center",
          padding: 16
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
            padding: 16
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
              {isPasswordSetupStep ? "Set Password" : "Login"}
            </Text>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>

          {isPasswordSetupStep ? (
            <View style={{ marginTop: 10, gap: 10 }}>
              <Text style={{ color: "#bbb" }}>
                Set your password once. Next time you can login with either Google or email/password.
              </Text>
              <TextInput
                value={setupPhone}
                onChangeText={setSetupPhone}
                keyboardType="phone-pad"
                placeholder="Phone number"
                placeholderTextColor="#7a7a7a"
                style={{
                  borderWidth: 1,
                  borderColor: "#333",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: "#fff"
                }}
              />
              <TextInput
                value={setupPassword}
                onChangeText={setSetupPassword}
                secureTextEntry
                placeholder="New password"
                placeholderTextColor="#7a7a7a"
                style={{
                  borderWidth: 1,
                  borderColor: "#333",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: "#fff"
                }}
              />
              <TextInput
                value={setupPasswordConfirm}
                onChangeText={setSetupPasswordConfirm}
                secureTextEntry
                placeholder="Confirm password"
                placeholderTextColor="#7a7a7a"
                style={{
                  borderWidth: 1,
                  borderColor: "#333",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: "#fff"
                }}
              />
              <Pressable
                disabled={busy}
                onPress={handlePasswordSetup}
                style={{
                  backgroundColor: "#fff",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: busy ? 0.75 : 1
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
                onPress={handleGoogleLogin}
                style={{
                  backgroundColor: "#fff",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: busy ? 0.75 : 1
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
                style={{
                  borderWidth: 1,
                  borderColor: "#333",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: "#fff"
                }}
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor="#7a7a7a"
                style={{
                  borderWidth: 1,
                  borderColor: "#333",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: "#fff"
                }}
              />

              <Pressable
                disabled={busy}
                onPress={handleEmailPasswordLogin}
                style={{
                  borderWidth: 1,
                  borderColor: "#5b5b5b",
                  paddingVertical: 11,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: busy ? 0.75 : 1
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>
                  {busy ? "Please wait..." : "Login with Email & Password"}
                </Text>
              </Pressable>
            </View>
          )}

          {successText ? <Text style={{ color: "#9ef1a6", marginTop: 10 }}>{successText}</Text> : null}
          {errorText ? <Text style={{ color: "#ff6b6b", marginTop: 10 }}>{errorText}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}
