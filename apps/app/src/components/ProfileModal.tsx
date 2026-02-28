import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { apiGet, apiPost } from "../lib/api";
import { profileModalColors, profileModalDynamicStyles, profileModalStyles as styles } from "../styles/ProfileModal.styles";
import { profileModalData as t } from "../staticData/profileModal.staticData";

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
    apiGet<any>(t.api.profile)
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

  const overlayStyle: any = [styles.overlay, profileModalDynamicStyles.overlayPlatform()];

  async function save() {
    setError("");
    if (!safeText(name)) {
      setError(t.requiredName);
      return;
    }
    setBusy(true);
    try {
      const next = await apiPost<any>(t.api.profile, {
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
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{t.kicker}</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        <View style={styles.body}>
          <Field label={t.nameLabel} value={name} onChangeText={setName} placeholder={t.namePlaceholder} />
          <Field label={t.phoneLabel} value={phone} onChangeText={setPhone} placeholder={t.phonePlaceholder} keyboardType="phone-pad" />
          <Field label={t.emailLabel} value={email} onChangeText={setEmail} placeholder={t.emailPlaceholder} keyboardType="email-address" />

          {error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <Pressable onPress={onClose} disabled={busy} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{t.cancel}</Text>
            </Pressable>
            <Pressable onPress={save} disabled={busy} style={[styles.saveBtn, profileModalDynamicStyles.saveButtonState(busy)]}>
              <Text style={styles.saveText}>{busy ? t.saving : t.save}</Text>
            </Pressable>
          </View>

          <Text style={styles.idText}>
            {t.idPrefix} {safeText(profile?.id || "")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: any) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={profileModalColors.placeholder}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}
