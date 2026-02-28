import React, { useEffect, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { apiGet } from "../lib/api";
import { cookieConsentStyles as styles } from "../styles/CookieConsentGate.styles";
import { cookieConsentData as t } from "../staticData/cookieConsentGate.staticData";

const CONSENT_COOKIE_KEY = t.consentCookieKey;
const CONSENT_VALUE = t.consentValue;

function hasCookieConsent() {
  if (typeof window === "undefined") return true;
  try {
    const local = window.localStorage.getItem(CONSENT_COOKIE_KEY);
    if (local === CONSENT_VALUE) return true;
  } catch {}
  try {
    const hit = document.cookie
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${CONSENT_COOKIE_KEY}=`));
    return (hit || "").split("=")[1] === CONSENT_VALUE;
  } catch {
    return false;
  }
}

function persistCookieConsent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_COOKIE_KEY, CONSENT_VALUE);
  } catch {}
  try {
    document.cookie = `${CONSENT_COOKIE_KEY}=${CONSENT_VALUE}; Path=/; Max-Age=63072000; SameSite=Lax`;
  } catch {}
}

async function openPolicyPage(slug: string) {
  try {
    const page: any = await apiGet(t.api.pages(slug));
    const title = String(page?.title || slug);
    const content = String(page?.content || "");
    const html = t.htmlTemplate(title, content);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (w) {
        w.document.write(html);
        w.document.close();
      }
      return;
    }
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    Linking.openURL(dataUrl);
  } catch {
    // ignore failures
  }
}

export default function CookieConsentGate() {
  const [ready, setReady] = useState(Platform.OS !== "web");
  const [accepted, setAccepted] = useState(Platform.OS !== "web");
  const [slugs, setSlugs] = useState<{
    affiliate?: string;
    contact?: string;
    privacy?: string;
    refund?: string;
    terms?: string;
    emergency?: string;
  }>({});

  useEffect(() => {
    if (Platform.OS !== "web") return;
    setAccepted(hasCookieConsent());
    setReady(true);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    (async () => {
      try {
        const meta: any = await apiGet(t.api.meta);
        const ps = meta?.settings?.pageSlugs || meta?.settings?.page_slugs || {};
        setSlugs({
          affiliate: typeof ps.affiliateProgram === "string" ? ps.affiliateProgram : t.fallbackSlugs.affiliate,
          contact: typeof ps.contactUs === "string" ? ps.contactUs : t.fallbackSlugs.contact,
          privacy: typeof ps.privacyPolicy === "string" ? ps.privacyPolicy : t.fallbackSlugs.privacy,
          refund: typeof ps.refundPolicy === "string" ? ps.refundPolicy : t.fallbackSlugs.refund,
          terms: typeof ps.termsAndConditions === "string" ? ps.termsAndConditions : t.fallbackSlugs.terms,
          emergency: typeof ps.emergency === "string" ? ps.emergency : t.fallbackSlugs.emergency,
        });
      } catch {
        // Fallback to defaults.
      }
    })();
  }, []);

  if (!ready || accepted) return null;

  return (
      <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.body}>
          {t.body}
        </Text>
        <View style={styles.linksRow}>
          <Pressable onPress={() => openPolicyPage(slugs.affiliate || t.fallbackSlugs.affiliate)}>
            <Text style={styles.linkText}>{t.linkLabels.affiliate}</Text>
          </Pressable>
          <Text style={styles.dot}>{t.dot}</Text>
          <Pressable onPress={() => openPolicyPage(slugs.contact || t.fallbackSlugs.contact)}>
            <Text style={styles.linkText}>{t.linkLabels.contact}</Text>
          </Pressable>
          <Text style={styles.dot}>{t.dot}</Text>
          <Pressable onPress={() => openPolicyPage(slugs.privacy || t.fallbackSlugs.privacy)}>
            <Text style={styles.linkText}>{t.linkLabels.privacy}</Text>
          </Pressable>
          <Text style={styles.dot}>{t.dot}</Text>
          <Pressable onPress={() => openPolicyPage(slugs.refund || t.fallbackSlugs.refund)}>
            <Text style={styles.linkText}>{t.linkLabels.refund}</Text>
          </Pressable>
          <Text style={styles.dot}>{t.dot}</Text>
          <Pressable onPress={() => openPolicyPage(slugs.terms || t.fallbackSlugs.terms)}>
            <Text style={styles.linkText}>{t.linkLabels.terms}</Text>
          </Pressable>
          <Text style={styles.dot}>{t.dot}</Text>
          <Pressable onPress={() => openPolicyPage(slugs.emergency || t.fallbackSlugs.emergency)}>
            <Text style={styles.linkText}>{t.linkLabels.emergency}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            persistCookieConsent();
            setAccepted(true);
          }}
          style={styles.acceptBtn}
        >
          <Text style={styles.acceptText}>{t.acceptLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
