import React, { useEffect, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { apiGet } from "../lib/api";

const CONSENT_COOKIE_KEY = "ev_cookie_consent_v1";
const CONSENT_VALUE = "accepted";

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
    const page: any = await apiGet(`/api/pages/${slug}`);
    const title = String(page?.title || slug);
    const content = String(page?.content || "");
    const html = `<!doctype html><html><head><meta charset=\"utf-8\" /><title>${title}</title></head><body>${content}</body></html>`;
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
        const meta: any = await apiGet("/api/meta");
        const ps = meta?.settings?.pageSlugs || meta?.settings?.page_slugs || {};
        setSlugs({
          affiliate: typeof ps.affiliateProgram === "string" ? ps.affiliateProgram : "affiliate-program",
          contact: typeof ps.contactUs === "string" ? ps.contactUs : "contact-us",
          privacy: typeof ps.privacyPolicy === "string" ? ps.privacyPolicy : "privacy-policy",
          refund: typeof ps.refundPolicy === "string" ? ps.refundPolicy : "refund-policy",
          terms: typeof ps.termsAndConditions === "string" ? ps.termsAndConditions : "terms-and-conditions",
          emergency: typeof ps.emergency === "string" ? ps.emergency : "emergency"
        });
      } catch {
        // Fallback to defaults.
      }
    })();
  }, []);

  if (!ready || accepted) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.75)",
        justifyContent: "flex-end",
        padding: 14
      }}
    >
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.16)",
          backgroundColor: "#0f1112",
          padding: 16
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>ExploreValley Cookie Consent</Text>
        <Text style={{ color: "#c6d1d9", marginTop: 8, lineHeight: 20 }}>
          We use cookies to keep the site secure, improve performance, and personalize your experience.
          By continuing, you must accept cookie consent.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <Pressable onPress={() => openPolicyPage(slugs.affiliate || "affiliate-program")}>
            <Text style={{ color: "#93c5fd", fontWeight: "700" }}>Affiliate Program</Text>
          </Pressable>
          <Text style={{ color: "#64748b" }}>•</Text>
          <Pressable onPress={() => openPolicyPage(slugs.contact || "contact-us")}>
            <Text style={{ color: "#93c5fd", fontWeight: "700" }}>Contact Us</Text>
          </Pressable>
          <Text style={{ color: "#64748b" }}>•</Text>
          <Pressable onPress={() => openPolicyPage(slugs.privacy || "privacy-policy")}>
            <Text style={{ color: "#93c5fd", fontWeight: "700" }}>Privacy Policy</Text>
          </Pressable>
          <Text style={{ color: "#64748b" }}>•</Text>
          <Pressable onPress={() => openPolicyPage(slugs.refund || "refund-policy")}>
            <Text style={{ color: "#93c5fd", fontWeight: "700" }}>Refund Policy</Text>
          </Pressable>
          <Text style={{ color: "#64748b" }}>•</Text>
          <Pressable onPress={() => openPolicyPage(slugs.terms || "terms-and-conditions")}>
            <Text style={{ color: "#93c5fd", fontWeight: "700" }}>Terms and Conditions</Text>
          </Pressable>
          <Text style={{ color: "#64748b" }}>•</Text>
          <Pressable onPress={() => openPolicyPage(slugs.emergency || "emergency")}>
            <Text style={{ color: "#93c5fd", fontWeight: "700" }}>Emergency</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            persistCookieConsent();
            setAccepted(true);
          }}
          style={{
            marginTop: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.2)",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 11
          }}
        >
          <Text style={{ color: "#dcfce7", fontWeight: "800", fontSize: 14 }}>Accept Consent</Text>
        </Pressable>
      </View>
    </View>
  );
}
