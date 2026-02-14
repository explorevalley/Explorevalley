import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Platform } from "react-native";
import { apiGet, apiPost } from "../lib/api";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

export default function ProfileModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved?: (profile: any) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setBusy(true);
    setError("");
    apiGet<any>("/api/profile")
      .then((p) => {
        if (!alive) return;
        setProfile(p || null);
        setName(safeText(p?.name));
        setPhone(safeText(p?.phone));
        setEmail(safeText(p?.email));
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(String(e?.message || e));
      })
      .finally(() => {
        if (!alive) return;
        setBusy(false);
      });
    return () => { alive = false; };
  }, [visible]);

  if (!visible) return null;

  const overlayStyle: any = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    zIndex: 9999
  };
  if (Platform.OS === "web") {
    overlayStyle.backdropFilter = "blur(10px)";
  }

  async function save() {
    setError("");
    if (!safeText(name)) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    try {
      const next = await apiPost<any>("/api/profile", {
        name: safeText(name),
        phone: safeText(phone),
        email: safeText(email) || undefined,
      });
      setProfile(next);
      onSaved?.(next);
      onClose();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={overlayStyle}>
      <View style={{ width: "100%", maxWidth: 520, backgroundColor: "#ffffff", borderRadius: 18, borderWidth: 1, borderColor: "#d5deeb", overflow: "hidden" }}>
        <View style={{ backgroundColor: "#0f1a2d", borderBottomWidth: 1, borderBottomColor: "#1d3258", padding: 14 }}>
          <Text style={{ color: "#eaf2ff", fontSize: 12, letterSpacing: 1.1, fontWeight: "800" }}>PROFILE</Text>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 }}>Edit Profile</Text>
          <Text style={{ color: "#9db0d6", fontSize: 12, marginTop: 4 }}>
            Update your display name and contact details.
          </Text>
        </View>

        <View style={{ padding: 14, gap: 10 }}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="Email (optional)" keyboardType="email-address" />

          {error ? (
            <View style={{ backgroundColor: "#fff5f5", borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, padding: 10 }}>
              <Text style={{ color: "#b91c1c", fontSize: 12, fontWeight: "700" }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 2 }}>
            <Pressable onPress={onClose} disabled={busy} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "#d5deeb", backgroundColor: "#f8fafc" }}>
              <Text style={{ color: "#334155", fontWeight: "800" }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={save} disabled={busy} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "#f4511e", backgroundColor: "#f4511e", opacity: busy ? 0.7 : 1 }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{busy ? "Saving..." : "Save"}</Text>
            </Pressable>
          </View>

          <Text style={{ color: "#7c8698", fontSize: 11, marginTop: 6 }}>
            ID: {safeText(profile?.id || "")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: any) {
  return (
    <View>
      <Text style={{ color: "#5f6b81", fontSize: 12, fontWeight: "700", marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#96a0b2"
        keyboardType={keyboardType}
        style={{ height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#d5deeb", backgroundColor: "#fff", paddingHorizontal: 12, fontSize: 14, color: "#111827" }}
      />
    </View>
  );
}

