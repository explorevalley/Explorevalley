import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView, useWindowDimensions, StyleSheet, ImageBackground, Image, Linking } from "react-native";
import { apiGet, apiPost, resolveAssetUrl, trackEvent } from "../lib/api";
import BookingModal from "../components/BookingModal";
import TopNav from "../components/TopNav";
import FilterModal from "../components/FilterModal";
import TaxiScreen from "./TaxiScreen";
import BikeRentalScreen from "./BikeRentalScreen";
import FoodOrderScreen from "./FoodOrderScreen";
import RescueScreen from "./RescueScreen";
import AIChatWidget from "../components/AIChatWidget";
import MyOrdersScreen from "./MyOrdersScreen";
import AuthModal from "../components/AuthModal";
import RefundRequestModal from "../components/RefundRequestModal";
import RateExperienceModal from "../components/RateExperienceModal";
import ProfileModal from "../components/ProfileModal";
import { getAuthMode, getAuthUser, loadAuth, setAuthMode, setAuthToken, setAuthUser } from "../lib/auth";
import { applyOrderStatuses, buildStatusPayload, getTrackedOrders } from "../lib/orders";
import { uiText } from "../lib/ui";


type Item = {
  kind: "tour" | "hotel";
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  images: string[];
  raw: any;
};

type FestivalItem = {
  id: string;
  title: string;
  location: string;
  month: string;
  vibe: string;
  ticket: string | number;
  color: string;
  image?: string;
};

const FESTIVAL_COLORS = ["#1f4a6b", "#4f3d2b", "#3a5d3f", "#5a3f46", "#2f425d", "#5b4a2f"];

type MartCategory = {
  id: string;
  label: string;
  image: string;
};

type MartProduct = {
  id: string;
  categoryId: string;
  categoryKey: string;
  name: string;
  price: number;
  mrp: number;
  image: string;
  martId?: string;
};

function normalizeMartCategoryId(value: any) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "uncategorized";
  return raw.replace(/\s+/g, " ");
}

const MART_CATEGORY_IMAGES: Record<string, string> = {
  healthy_picks: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=120&q=80",
  oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=120&q=80",
  atta: "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=120&q=80",
  dals_pulses: "https://images.unsplash.com/photo-1615485737651-e8f8e4e4d66c?auto=format&fit=crop&w=120&q=80",
  rice_more: "https://images.unsplash.com/photo-1586201375761-83865001e31b?auto=format&fit=crop&w=120&q=80",
  healthy_rice: "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=120&q=80",
  uncategorized: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80",
};

const FOOTER_NAV = [
  { key: "affiliate-program", label: "Affiliate Program", kind: "info" as const },
  { key: "contact-us", label: "Contact Us", kind: "info" as const },
  { key: "privacy-policy", label: "Privacy Policy", kind: "info" as const },
  { key: "refund-policy", label: "Refund Policy", kind: "info" as const },
  { key: "terms-and-conditions", label: "Terms and Conditions", kind: "info" as const },
  { key: "emergency", label: "Emergency", kind: "tab" as const },
];

function handleTabNavigation(
  key: string,
  authMode: string,
  setAuthOpen: (next: boolean) => void,
  setPendingTab: (next: string | null) => void,
  setPrimaryTab: (next: string) => void
) {
  if (authMode !== "authenticated") {
    setPendingTab(key);
    setAuthOpen(true);
    return;
  }
  setPrimaryTab(key);
}


async function openInfoPage(slug: string) {
  try {
    const page: any = await apiGet(`/api/pages/${slug}`);
    const title = String(page?.title || slug);
    const content = String(page?.content || "");
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title></head><body>${content}</body></html>`;
    if (typeof window !== "undefined") {
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


export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const [items, setItems] = useState<Item[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [primaryTab, setPrimaryTab] = useState("travel");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<any>({ type: "all", vegOnly: false });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthModeState] = useState(getAuthMode());
  const [authUser, setAuthUserState] = useState(getAuthUser());
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userNotice, setUserNotice] = useState<string | null>(null);
  const [refundOrder, setRefundOrder] = useState<any>(null);
  const [rateOrder, setRateOrder] = useState<any>(null);
  const [catalogCounts, setCatalogCounts] = useState({ restaurants: 0, buses: 0, cabProviders: 0 });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [festivals, setFestivals] = useState<FestivalItem[] | null>(null);
  const [martCategoryId, setMartCategoryId] = useState("");
  const [martProductsRaw, setMartProductsRaw] = useState<MartProduct[]>([]);
  const noticeTimerRef = useRef<any>(null);
  const attributionSentRef = useRef(false);
  const locale = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : "";
  const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const syncAuthState = React.useCallback(() => {
    loadAuth();
    setAuthModeState(getAuthMode());
    setAuthUserState(getAuthUser());
  }, []);

  const showNotice = React.useCallback((message: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setUserNotice(message);
    noticeTimerRef.current = setTimeout(() => setUserNotice(null), 5000);
  }, []);

  async function loadData() {
    setCatalogLoading(true);
    setLoadError(null);
    try {
      const configuredMartId = String((process as any)?.env?.EXPO_PUBLIC_MART_ID || "").trim();
      const martPath = configuredMartId ? `/api/mart-products?martId=${encodeURIComponent(configuredMartId)}` : "/api/mart-products";
      const [toursRes, hotelsRes, restaurantsRes, busesRes, metaRes, festivalsRes, martRes] = await Promise.allSettled([
        apiGet<any[]>("/api/tours"),
        apiGet<any[]>("/api/hotels"),
        apiGet<any[]>("/api/restaurants"),
        apiGet<any[]>("/api/buses"),
        apiGet<any>("/api/meta"),
        apiGet<any[]>("/api/festivals"),
        apiGet<any>(martPath)
      ]);

      const tours = toursRes.status === "fulfilled" ? toursRes.value : [];
      const hotels = hotelsRes.status === "fulfilled" ? hotelsRes.value : [];
      const restaurants = restaurantsRes.status === "fulfilled" ? restaurantsRes.value : [];
      const buses = busesRes.status === "fulfilled" ? busesRes.value : [];
      const meta = metaRes.status === "fulfilled" ? metaRes.value : {};
      const festivalsRaw = festivalsRes.status === "fulfilled" ? festivalsRes.value : [];
      const martRaw = martRes.status === "fulfilled" ? (Array.isArray(martRes.value?.items) ? martRes.value.items : []) : [];
      const cabProviders = Array.isArray(meta?.cabProviders) ? meta.cabProviders : [];

      const errors: string[] = [];
      if (toursRes.status === "rejected") errors.push(String(toursRes.reason?.message || toursRes.reason || "Tours unavailable"));
      if (hotelsRes.status === "rejected") errors.push(String(hotelsRes.reason?.message || hotelsRes.reason || "Hotels unavailable"));
      if (festivalsRes.status === "rejected") errors.push(String(festivalsRes.reason?.message || festivalsRes.reason || "Festivals unavailable"));
      if (martRes.status === "rejected") errors.push(String(martRes.reason?.message || martRes.reason || "Mart unavailable"));
      if (errors.length) setLoadError(errors.join(" | "));

      const merged: Item[] = [
        ...tours.map(t => {
          const pct = Math.max(0, Math.min(100, Number(t.priceDropPercent || (t.priceDropped ? 10 : 0))));
          const base = Number(t.price || 0);
          const nextPrice = pct > 0 ? Math.round((base * (100 - pct)) / 100) : base;
          const imageUrls = Array.from(new Set([
            ...(t.heroImage ? [t.heroImage] : []),
            ...((t.images || []) as string[]),
            ...(((t.imageMeta || []) as any[]).map((m: any) => m?.url).filter(Boolean))
          ]));
          return {
            kind: "tour" as const,
            id: t.id,
            title: t.title,
            description: t.description,
            priceLabel: pct > 0 ? `From INR ${nextPrice} (INR ${base})` : `From INR ${base}`,
            images: imageUrls.map((x: string) => resolveAssetUrl(x)),
            raw: t
          };
        }),
        ...hotels.map(h => {
          const pct = Math.max(0, Math.min(100, Number(h.priceDropPercent || (h.priceDropped ? 10 : 0))));
          const base = Number(h.pricePerNight || 0);
          const nextPrice = pct > 0 ? Math.round((base * (100 - pct)) / 100) : base;
          const imageUrls = Array.from(new Set([
            ...(h.heroImage ? [h.heroImage] : []),
            ...((h.images || []) as string[]),
            ...(((h.imageMeta || []) as any[]).map((m: any) => m?.url).filter(Boolean))
          ]));
          return {
            kind: "hotel" as const,
            id: h.id,
            title: h.name,
            description: `${h.location} - ${h.description}`,
            priceLabel: pct > 0 ? `From INR ${nextPrice}/night (INR ${base})` : `From INR ${base}/night`,
            images: imageUrls.map((x: string) => resolveAssetUrl(x)),
            raw: h
          };
        })
      ];

      setItems(merged.length ? merged : []);
      setFestivals(
        Array.isArray(festivalsRaw)
          ? festivalsRaw.map((f: any, idx: number) => {
              const month = f.month || (f.createdAt ? new Date(f.createdAt).toLocaleString("en-US", { month: "long" }) : "All Season");
              const image = Array.isArray(f.images) && f.images.length ? String(f.images[0]) : f.image;
              return {
                id: f.id || `festival_${idx}`,
                title: f.title || f.name || "Festival",
                location: f.location || f.destination || "Explore Valley",
                month,
                vibe: f.vibe || f.description || f.duration || "Live events and cultural experiences",
                ticket: f.ticket || f.price || f.starting_price || "On request",
                color: FESTIVAL_COLORS[idx % FESTIVAL_COLORS.length],
                image: image ? resolveAssetUrl(image) : undefined
              };
            })
          : []
      );
      setCatalogCounts({
        restaurants: restaurants.length,
        buses: buses.length,
        cabProviders: cabProviders.length
      });
      const normalizedMart: MartProduct[] = martRaw.map((x: any) => ({
        // Keep category_id stable so the category list matches DB values.
        // Use a normalized key for filtering to handle case/spacing inconsistencies.
        // categoryId remains the original DB label for display.
        id: String(x?.id || ""),
        martId: String(x?.martId || x?.mart_partner_id || x?.mart_id || ""),
        categoryId: String(x?.categoryId || x?.category_id || "").trim() || "uncategorized",
        categoryKey: normalizeMartCategoryId(x?.categoryId || x?.category_id),
        name: String(x?.name || "Product"),
        price: Math.max(0, Number(x?.price || 0)),
        mrp: Math.max(0, Number(x?.mrp || 0)),
        image: String(x?.image || "")
      })).filter((x: MartProduct) => !!x.id);
      setMartProductsRaw(normalizedMart);
      if (!martCategoryId && normalizedMart.length > 0) {
        setMartCategoryId(normalizedMart[0].categoryKey);
      }
    } catch (err: any) {
      setLoadError(String(err?.message || err));
      setItems([]);
      setFestivals([]);
      setCatalogCounts({ restaurants: 0, buses: 0, cabProviders: 0 });
      setMartProductsRaw([]);
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    syncAuthState();
    loadData();
  }, [syncAuthState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = String(window.location.hash || "");
    const search = String(window.location.search || "");
    if (!hash && !search) return;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const queryParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    if (
      params.get("access_token") ||
      queryParams.get("access_token") ||
      params.get("error") ||
      params.get("error_description") ||
      queryParams.get("error") ||
      queryParams.get("error_description")
    ) {
      setAuthOpen(true);
    }
  }, []);

  useEffect(() => {
    trackEvent({
      type: "app_open",
      category: "behavior",
      name: authUser?.name,
      email: authUser?.email,
      phone: authUser?.phone,
      meta: {
        screenSize: `${width}x${height}`,
        language: locale,
        timezone
      }
    });
    trackEvent({
      type: "device_snapshot",
      category: "device",
      name: authUser?.name,
      email: authUser?.email,
      phone: authUser?.phone,
      meta: {
        screenSize: `${width}x${height}`,
        language: locale,
        timezone
      }
    });
  }, [authUser?.email, authUser?.name, authUser?.phone, height, locale, timezone, width]);

  useEffect(() => {
    if (typeof window === "undefined" || attributionSentRef.current) return;
    const params = new URLSearchParams(window.location.search || "");
    const adSource = params.get("utm_source") || params.get("ref") || params.get("source") || "";
    const campaignId = params.get("utm_campaign") || params.get("campaign") || "";
    const medium = params.get("utm_medium") || "";
    const content = params.get("utm_content") || "";
    const term = params.get("utm_term") || "";
    const ab = params.get("ab") || params.get("variant") || "";
    if (adSource || campaignId || medium || content || term || ab) {
      trackEvent({
        type: "campaign_attribution",
        category: "marketing",
        name: authUser?.name,
        email: authUser?.email,
        phone: authUser?.phone,
        meta: {
          adSource,
          campaignId,
          medium,
          content,
          term,
          abTestGroups: ab ? [ab] : []
        }
      });
    }
    attributionSentRef.current = true;
  }, [authUser?.email, authUser?.name, authUser?.phone]);

  useEffect(() => {
    trackEvent({
      type: "screen_view",
      category: "behavior",
      name: authUser?.name,
      email: authUser?.email,
      phone: authUser?.phone,
      meta: {
        screen: primaryTab,
        path: typeof window !== "undefined" ? String(window.location.pathname || "") : "",
        url: typeof window !== "undefined" ? String(window.location.href || "") : ""
      }
    });
  }, [authUser?.email, authUser?.name, authUser?.phone, primaryTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => syncAuthState();
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncAuthState();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncAuthState]);

  useEffect(() => {
    if (authMode !== "authenticated") return;
    let alive = true;
    let hideTimer: any = null;
    const maybeNotify = (message: string) => {
      if (!alive) return;
      setUserNotice(message);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (alive) setUserNotice(null);
      }, 6000);
      if (typeof window !== "undefined" && "Notification" in window) {
        const N = (window as any).Notification;
        if (N?.permission === "granted") {
          new N("ExploreValley", { body: message });
        } else if (N?.permission !== "denied") {
          N.requestPermission().catch(() => undefined);
        }
      }
    };
    const poll = async () => {
      try {
        const tracked = getTrackedOrders().filter((x) => x.status !== "completed" && x.status !== "cancelled");
        if (!tracked.length) return;
        const payload = buildStatusPayload(tracked);
        const res = await apiPost<{ ok: boolean; orders: Array<{ id: string; type: "booking" | "cab" | "food"; status: string }> }>(
          "/api/orders/status",
          payload
        );
        const confirmed = applyOrderStatuses(res.orders || []);
        if (confirmed.length) {
          const names = confirmed.map((x) => `${x.type.toUpperCase()} ${x.id}`).join(", ");
          maybeNotify(`Order confirmed: ${names}`);
        }
      } catch {
        // silent on polling failures
      }
    };
    poll();
    const timer = setInterval(poll, 15000);
    return () => {
      alive = false;
      if (hideTimer) clearTimeout(hideTimer);
      clearInterval(timer);
    };
  }, [authMode]);

  // Pull server profile name (user-editable) and persist it in authUser storage.
  useEffect(() => {
    if (authMode !== "authenticated") return;
    let alive = true;
    (async () => {
      try {
        const p = await apiGet<any>("/api/profile");
        if (!alive) return;
        const nextName = String(p?.name || "").trim();
        if (!nextName) return;
        const curr = getAuthUser() || authUser || {};
        const merged = { ...curr, name: nextName };
        setAuthUser(merged as any);
        setAuthUserState(merged as any);
      } catch {
        // ignore profile fetch failures
      }
    })();
    return () => { alive = false; };
  }, [authMode]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    let out = items.slice();
    if (filters.type && filters.type !== "all") {
      if (filters.type === "cottages") {
        out = out.filter(i => i.kind === "hotel" && String(i.id || "").toLowerCase().startsWith("cottage"));
      } else if (filters.type === "hotel") {
        out = out.filter(i => i.kind === "hotel" && String(i.id || "").toLowerCase().startsWith("hotel"));
      } else {
        out = out.filter(i => i.kind === filters.type);
      }
    }
    if (filters.vegOnly) {
      out = out.filter(i => (i.raw?.isVeg ?? false));
    }
    if (filters.minPrice !== undefined) {
      out = out.filter(i => {
        const p = i.kind === "hotel" ? i.raw.pricePerNight : i.raw.price;
        return p >= filters.minPrice;
      });
    }
    if (filters.maxPrice !== undefined) {
      out = out.filter(i => {
        const p = i.kind === "hotel" ? i.raw.pricePerNight : i.raw.price;
        return p <= filters.maxPrice;
      });
    }
    if (q) out = out.filter(i => (i.title + " " + i.description).toLowerCase().includes(q));
    return out;
  }, [items, query, filters]);

  const active = useMemo(() => filtered?.[activeIndex] ?? filtered?.[0] ?? null, [filtered, activeIndex]);
  useEffect(() => {
    if (!active && bookingOpen) setBookingOpen(false);
  }, [active, bookingOpen]);

  const isCottage = React.useCallback((item: Item) => {
    if (item.kind !== "hotel") return false;
    const raw = item.raw || {};
    const hay = `${raw.name || ""} ${raw.title || ""} ${raw.category || ""} ${raw.type || ""} ${(raw.tags || []).join(" ")}`.toLowerCase();
    return hay.includes("cottage");
  }, []);

  const tourItems = useMemo(() => (filtered ? filtered.filter((i) => i.kind === "tour") : null), [filtered]);
  const hotelItems = useMemo(() => (filtered ? filtered.filter((i) => i.kind === "hotel") : null), [filtered]);
  const cottageItems = useMemo(() => (filtered ? filtered.filter((i) => isCottage(i)) : null), [filtered, isCottage]);
  const hotelOnlyItems = useMemo(() => {
    if (!hotelItems) return null;
    return hotelItems.filter((i) => String(i.id || "").toLowerCase().startsWith("hotel"));
  }, [hotelItems]);
  const cottageIdItems = useMemo(() => {
    if (!hotelItems) return null;
    return hotelItems.filter((i) => String(i.id || "").toLowerCase().startsWith("cottage"));
  }, [hotelItems]);
  const tourIdItems = useMemo(() => {
    if (!tourItems) return null;
    return tourItems.filter((i) => String(i.id || "").toLowerCase().startsWith("tour"));
  }, [tourItems]);
  const martCategories = useMemo<MartCategory[]>(() => {
    const byKey = new Map<string, string>();
    martProductsRaw.forEach((item) => {
      const key = normalizeMartCategoryId(item.categoryKey || item.categoryId);
      if (!byKey.has(key)) {
        byKey.set(key, String(item.categoryId || "uncategorized").trim() || "uncategorized");
      }
    });
    return Array.from(byKey.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => ({
        id: key,
        label,
        image: MART_CATEGORY_IMAGES[key] || MART_CATEGORY_IMAGES.uncategorized
      }));
  }, [martProductsRaw]);
  const martProducts = useMemo(
    () => {
      const selected = normalizeMartCategoryId(martCategoryId);
      if (!selected) return [];
      return martProductsRaw.filter(
        (item) => normalizeMartCategoryId(item.categoryKey || item.categoryId) === selected
      );
    },
    [martCategoryId, martProductsRaw]
  );
  const isMartDesktop = width >= 980;

  useEffect(() => {
    if (martCategories.length === 0) {
      if (martCategoryId) setMartCategoryId("");
      return;
    }
    const hit = martCategories.some((x) => x.id === martCategoryId);
    if (!hit) setMartCategoryId(martCategories[0].id);
  }, [martCategories, martCategoryId]);

  // Shared TopNav + Auth overlay factory for full-screen tab pages
  const tabOverlay = (tabContent: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      {tabContent}
      {renderFooter()}
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
        <TopNav
          query={query}
          setQuery={setQuery}
          onFilter={() => setFiltersOpen(true)}
          typeFilter={filters.type}
          onTypeChange={(t: string) => setFilters((prev: any) => ({ ...prev, type: t }))}
          primaryTab={primaryTab}
          onPrimaryChange={(next: string) => {
            if (authMode !== "authenticated") {
              setPendingTab(next);
              setAuthOpen(true);
              return;
            }
            setPrimaryTab(next);
          }}
          authMode={authMode}
          authUser={authUser}
          onProfilePress={() => setProfileOpen(true)}
          onAuthPress={() => setAuthOpen(true)}
          onLogout={() => {
            trackEvent({ type: "auth_logout", category: "core", name: authUser?.name, email: authUser?.email, phone: authUser?.phone, meta: { screen: primaryTab } });
            setAuthToken(null); setAuthUser(null); setAuthMode("none"); setAuthModeState("none"); setAuthUserState(null);
          }}
        />
      </View>
      <AuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={(mode: any) => {
          setAuthModeState(mode);
          setAuthUserState(getAuthUser());
          if (pendingTab) {
            setPrimaryTab(pendingTab);
            setPendingTab(null);
          }
        }}
      />
      <ProfileModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={(p: any) => {
          const nextName = String(p?.name || "").trim();
          if (!nextName) return;
          const curr = getAuthUser() || authUser || {};
          const merged = { ...curr, name: nextName };
          setAuthUser(merged as any);
          setAuthUserState(merged as any);
        }}
      />
      <RefundRequestModal visible={!!refundOrder} onClose={() => setRefundOrder(null)} order={refundOrder} onRequireAuth={() => setAuthOpen(true)} />
      <RateExperienceModal visible={!!rateOrder} onClose={() => setRateOrder(null)} order={rateOrder} onRequireAuth={() => setAuthOpen(true)} />
      <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
    </View>
  );

  const renderFooter = () => (
    null
  );

  const countLabel = (value: number, loading: boolean, fallback?: string) => {
    if (loading) return "Loading…";
    if (fallback) return fallback;
    return `${value} listed`;
  };

  const renderMartWindow = () => (
    <View style={styles.martRoot}>
      {isMartDesktop ? (
        <View style={styles.martDesktopLayout}>
          <View style={styles.martCategoryRail}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.martCategoryRailContent}>
              {martCategories.map((category) => {
                const active = category.id === martCategoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setMartCategoryId(normalizeMartCategoryId(category.id))}
                    style={[styles.martCategoryItem, active ? styles.martCategoryItemActive : null]}
                  >
                    <Image source={{ uri: category.image }} style={styles.martCategoryImage} resizeMode="cover" />
                    <Text style={[styles.martCategoryText, active ? styles.martCategoryTextActive : null]}>
                      {category.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <ScrollView style={styles.martProductsPane} contentContainerStyle={styles.martProductsPaneContent} showsVerticalScrollIndicator={false}>
            <View key={`mart-grid-${martCategoryId}`} style={styles.martGrid}>
              {martProducts.map((product) => {
                const discount = Math.max(0, product.mrp - product.price);
                const hasDiscount = product.price < product.mrp;
                return (
                  <View key={product.id} style={styles.martCard}>
                    <Image source={{ uri: product.image }} style={styles.martProductImage} resizeMode="cover" />
                    <Pressable style={styles.martAddButton}>
                      <Text style={styles.martAddButtonText}>ADD</Text>
                    </Pressable>
                    <View style={styles.martPriceRow}>
                      <Text style={styles.martPrice}>INR {product.price}</Text>
                      {hasDiscount ? <Text style={styles.martOriginalPrice}>INR {product.mrp}</Text> : null}
                    </View>
                    {hasDiscount ? <Text style={styles.martDiscount}>INR {discount} OFF</Text> : null}
                    <Text style={styles.martProductTitle} numberOfLines={2}>{product.name}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={styles.martMobileWrap} contentContainerStyle={styles.martMobileContent} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.martCategoryRow}>
            {martCategories.map((category) => {
              const active = category.id === martCategoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setMartCategoryId(normalizeMartCategoryId(category.id))}
                  style={[styles.martCategoryChip, active ? styles.martCategoryChipActive : null]}
                >
                  <Image source={{ uri: category.image }} style={styles.martCategoryChipImage} resizeMode="cover" />
                  <Text style={[styles.martCategoryChipText, active ? styles.martCategoryChipTextActive : null]}>
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View key={`mart-grid-mobile-${martCategoryId}`} style={styles.martGridMobile}>
            {martProducts.map((product) => {
              const discount = Math.max(0, product.mrp - product.price);
              const hasDiscount = product.price < product.mrp;
              return (
                <View key={product.id} style={styles.martCard}>
                  <Image source={{ uri: product.image }} style={styles.martProductImage} resizeMode="cover" />
                  <Pressable style={styles.martAddButton}>
                    <Text style={styles.martAddButtonText}>ADD</Text>
                  </Pressable>
                  <View style={styles.martPriceRow}>
                    <Text style={styles.martPrice}>INR {product.price}</Text>
                    {hasDiscount ? <Text style={styles.martOriginalPrice}>INR {product.mrp}</Text> : null}
                  </View>
                  {hasDiscount ? <Text style={styles.martDiscount}>INR {discount} OFF</Text> : null}
                  <Text style={styles.martProductTitle} numberOfLines={2}>{product.name}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );

  const travelContent = (
    <ImageBackground
      source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Chandrakhani_Pass_Malana_Kullu.jpg" }}
      style={styles.travelRoot}
      resizeMode="cover"
    >
      <View style={styles.travelOverlay} pointerEvents="none" />
      <ScrollView style={styles.travelContentWrap} contentContainerStyle={styles.travelContent}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>ExploreValley</Text>
        <Text style={styles.heroSub}>Plan trips, compare stays, and book local rides.</Text>
      </View>
      {loadError ? (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>We couldn't load everything.</Text>
          <Text style={styles.alertText}>{loadError}</Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Travel Highlights</Text>
        <Text style={styles.sectionSub}>Swipe through travel services and curated stays.</Text>

        {filters.type === "all" || filters.type === "tour" ? (
          <View style={styles.sliderSection}>
            <Text style={styles.sliderTitle}>Tours</Text>
            {tourIdItems === null ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#0f1a2d" />
                <Text style={styles.loadingText}>Loading tours…</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderRow}>
                {tourIdItems.length === 0 ? (
                  <View style={styles.sliderCard}>
                    <Text style={styles.sliderBadge}>Coming soon</Text>
                    <Text style={styles.sliderCardTitle}>No tours yet</Text>
                    <Text style={styles.sliderCardDesc}>Add tours from the admin panel or via Telegram.</Text>
                  </View>
                ) : (
                  tourIdItems.map((item) => {
                    const idx = filtered ? filtered.findIndex((i) => i.id === item.id && i.kind === item.kind) : -1;
                    return (
                      <Pressable
                        key={`tour-${item.id}`}
                        onPress={() => {
                          if (idx >= 0) setActiveIndex(idx);
                          setBookingOpen(true);
                        }}
                        style={styles.sliderCard}
                      >
                        {item.images?.[0] ? (
                          <Image
                            source={{ uri: item.images[0] }}
                            style={styles.sliderCardImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.sliderCardImagePlaceholder}>
                            <Text style={styles.sliderCardImagePlaceholderText}>No image</Text>
                          </View>
                        )}
                        <Text style={styles.sliderBadge}>Tour</Text>
                        <Text style={styles.sliderCardTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.sliderCardDesc} numberOfLines={2}>{item.description}</Text>
                        <Text style={styles.sliderCardPrice}>{item.priceLabel}</Text>
                        <View style={styles.sliderCta}><Text style={styles.sliderCtaText}>Book now</Text></View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        ) : null}

        {filters.type === "all" || filters.type === "hotel" ? (
          <View style={styles.sliderSection}>
            <Text style={styles.sliderTitle}>Hotels</Text>
            {hotelOnlyItems === null ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#0f1a2d" />
                <Text style={styles.loadingText}>Loading hotels…</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderRow}>
                {hotelOnlyItems.length === 0 ? (
                  <View style={styles.sliderCard}>
                    <Text style={styles.sliderBadge}>Coming soon</Text>
                    <Text style={styles.sliderCardTitle}>No hotels yet</Text>
                    <Text style={styles.sliderCardDesc}>Add stays from the admin panel or via Telegram.</Text>
                  </View>
                ) : (
                  hotelOnlyItems.map((item) => {
                    const idx = filtered ? filtered.findIndex((i) => i.id === item.id && i.kind === item.kind) : -1;
                    return (
                      <Pressable
                        key={`hotel-${item.id}`}
                        onPress={() => {
                          if (idx >= 0) setActiveIndex(idx);
                          setBookingOpen(true);
                        }}
                        style={styles.sliderCard}
                      >
                        {item.images?.[0] ? (
                          <Image
                            source={{ uri: item.images[0] }}
                            style={styles.sliderCardImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.sliderCardImagePlaceholder}>
                            <Text style={styles.sliderCardImagePlaceholderText}>No image</Text>
                          </View>
                        )}
                        <Text style={styles.sliderBadge}>Hotel</Text>
                        <Text style={styles.sliderCardTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.sliderCardDesc} numberOfLines={2}>{item.description}</Text>
                        <Text style={styles.sliderCardPrice}>{item.priceLabel}</Text>
                        <View style={styles.sliderCta}><Text style={styles.sliderCtaText}>Book stay</Text></View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        ) : null}

        {filters.type === "all" || filters.type === "cottages" ? (
          <View style={styles.sliderSection}>
            <Text style={styles.sliderTitle}>Cottages</Text>
            {cottageIdItems === null ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#0f1a2d" />
                <Text style={styles.loadingText}>Loading cottages…</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderRow}>
                {cottageIdItems.length === 0 ? (
                  <View style={styles.sliderCard}>
                    <Text style={styles.sliderBadge}>Sync pending</Text>
                    <Text style={styles.sliderCardTitle}>No cottages yet</Text>
                    <Text style={styles.sliderCardDesc}>Tag hotel listings with “cottage” to show them here.</Text>
                  </View>
                ) : (
                  cottageIdItems.map((item) => {
                    const idx = filtered ? filtered.findIndex((i) => i.id === item.id && i.kind === item.kind) : -1;
                    return (
                      <Pressable
                        key={`cottage-${item.id}`}
                        onPress={() => {
                          if (idx >= 0) setActiveIndex(idx);
                          setBookingOpen(true);
                        }}
                        style={styles.sliderCard}
                      >
                        {item.images?.[0] ? (
                          <Image
                            source={{ uri: item.images[0] }}
                            style={styles.sliderCardImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.sliderCardImagePlaceholder}>
                            <Text style={styles.sliderCardImagePlaceholderText}>No image</Text>
                          </View>
                        )}
                        <Text style={styles.sliderBadge}>Cottage</Text>
                        <Text style={styles.sliderCardTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.sliderCardDesc} numberOfLines={2}>{item.description}</Text>
                        <Text style={styles.sliderCardPrice}>{item.priceLabel}</Text>
                        <View style={styles.sliderCta}><Text style={styles.sliderCtaText}>Book cottage</Text></View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        ) : null}

        {filters.type === "all" ? (
          <View style={styles.sliderSection}>
            <Text style={styles.sliderTitle}>Festivals</Text>
            {festivals === null ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#0f1a2d" />
                <Text style={styles.loadingText}>Loading festivals…</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderRow}>
                {festivals.length === 0 ? (
                  <View style={[styles.sliderCard, styles.festivalCard]}>
                    <Text style={styles.sliderBadge}>Upcoming soon</Text>
                    <Text style={styles.sliderCardTitle}>No festivals yet</Text>
                    <Text style={styles.sliderCardDesc}>Add festival details from the admin panel or via Telegram.</Text>
                  </View>
                ) : (
                  festivals.map((fest) => (
                    <View key={fest.id} style={[styles.sliderCard, styles.festivalCard]}>
                      {fest.image ? (
                        <Image
                          source={{ uri: fest.image }}
                          style={styles.festivalImage}
                          resizeMode="cover"
                        />
                      ) : null}
                      <View style={[styles.festivalBadgeRow, { backgroundColor: fest.color ? `${fest.color}22` : "rgba(0,0,0,0.08)" }]}>
                        <Text style={styles.festivalMonth}>{fest.month}</Text>
                      </View>
                      <Text style={styles.sliderCardTitle} numberOfLines={2}>{fest.title}</Text>
                      <Text style={styles.festivalLocation} numberOfLines={2}>{fest.location}</Text>
                      <Text style={styles.sliderCardDesc} numberOfLines={3}>{fest.vibe}</Text>
                      <Text style={styles.sliderCardPrice}>
                        {typeof fest.ticket === "number" ? `From INR ${fest.ticket}` : fest.ticket}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        ) : null}

      </View>
      </ScrollView>
    </ImageBackground>
  );

  if (primaryTab === "orders") {
    return tabOverlay(
      <View style={{ flex: 1, paddingTop: 90 }}>
        <MyOrdersScreen
          onRequireAuth={() => setAuthOpen(true)}
          onRequestRefund={(o: any) => setRefundOrder(o)}
          onRateExperience={(o: any) => setRateOrder(o)}
        />
      </View>
    );
  }

  if (primaryTab === "emergency" || primaryTab === "rescue") {
    return (
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} style={{ flex: 1 }}>
          <RescueScreen />
        </ScrollView>
        <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          <TopNav
            query={query}
            setQuery={setQuery}
            onFilter={() => setFiltersOpen(true)}
            typeFilter={filters.type}
            onTypeChange={(t: string) => setFilters((prev: any) => ({ ...prev, type: t }))}
            primaryTab={primaryTab}
            onPrimaryChange={(next: string) => {
              if (authMode !== "authenticated") {
                setPendingTab(next);
                setAuthOpen(true);
                return;
              }
              setPrimaryTab(next);
            }}
            authMode={authMode}
            authUser={authUser}
            onProfilePress={() => setProfileOpen(true)}
            onAuthPress={() => setAuthOpen(true)}
            onLogout={() => {
              trackEvent({
                type: "auth_logout",
                category: "core",
                name: authUser?.name,
                email: authUser?.email,
                phone: authUser?.phone,
                meta: { screen: primaryTab }
              });
              setAuthToken(null);
              setAuthUser(null);
              setAuthMode("none");
              setAuthModeState("none");
              setAuthUserState(null);
            }}
          />
        </View>

        <AuthModal
          visible={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthed={(mode: any) => {
            setAuthModeState(mode);
            setAuthUserState(getAuthUser());
            if (pendingTab) {
              setPrimaryTab(pendingTab);
              setPendingTab(null);
            }
          }}
        />
        <ProfileModal
          visible={profileOpen}
          onClose={() => setProfileOpen(false)}
          onSaved={(p: any) => {
            const nextName = String(p?.name || "").trim();
            if (!nextName) return;
            const curr = getAuthUser() || authUser || {};
            const merged = { ...curr, name: nextName };
            setAuthUser(merged as any);
            setAuthUserState(merged as any);
          }}
        />
        <RefundRequestModal visible={!!refundOrder} onClose={() => setRefundOrder(null)} order={refundOrder} onRequireAuth={() => setAuthOpen(true)} />
        <RateExperienceModal visible={!!rateOrder} onClose={() => setRateOrder(null)} order={rateOrder} onRequireAuth={() => setAuthOpen(true)} />
        <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
        {renderFooter()}
      </View>
    );
  }

  if (primaryTab === "mart") {
    return (
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <View style={{ flex: 1, paddingTop: 90 }}>
          {renderMartWindow()}
        </View>
        <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          <TopNav
            query={query}
            setQuery={setQuery}
            onFilter={() => setFiltersOpen(true)}
            typeFilter={filters.type}
            onTypeChange={(t: string) => setFilters((prev: any) => ({ ...prev, type: t }))}
            primaryTab={primaryTab}
            onPrimaryChange={(next: string) => {
              if (authMode !== "authenticated") {
                setPendingTab(next);
                setAuthOpen(true);
                return;
              }
              setPrimaryTab(next);
            }}
            authMode={authMode}
            authUser={authUser}
            onProfilePress={() => setProfileOpen(true)}
            onAuthPress={() => setAuthOpen(true)}
            onLogout={() => {
              trackEvent({
                type: "auth_logout",
                category: "core",
                name: authUser?.name,
                email: authUser?.email,
                phone: authUser?.phone,
                meta: { screen: primaryTab }
              });
              setAuthToken(null);
              setAuthUser(null);
              setAuthMode("none");
              setAuthModeState("none");
              setAuthUserState(null);
            }}
          />
        </View>
        <AuthModal
          visible={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthed={(mode: any) => {
            setAuthModeState(mode);
            setAuthUserState(getAuthUser());
            if (pendingTab) {
              setPrimaryTab(pendingTab);
              setPendingTab(null);
            }
          }}
        />
        <ProfileModal
          visible={profileOpen}
          onClose={() => setProfileOpen(false)}
          onSaved={(p: any) => {
            const nextName = String(p?.name || "").trim();
            if (!nextName) return;
            const curr = getAuthUser() || authUser || {};
            const merged = { ...curr, name: nextName };
            setAuthUser(merged as any);
            setAuthUserState(merged as any);
          }}
        />
        <RefundRequestModal visible={!!refundOrder} onClose={() => setRefundOrder(null)} order={refundOrder} onRequireAuth={() => setAuthOpen(true)} />
        <RateExperienceModal visible={!!rateOrder} onClose={() => setRateOrder(null)} order={rateOrder} onRequireAuth={() => setAuthOpen(true)} />
        <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
        {renderFooter()}
      </View>
    );
  }

  if (!items && primaryTab === "travel") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={{ color: "#fff", marginTop: 8 }}>{uiText("home", "loading", "Loading ExploreValley…")}</Text>
        <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
        {renderFooter()}
      </View>
    );
  }

  if (items.length === 0 && primaryTab === "travel") {
    const emptyMessage = loadError
      ? uiText("home", "loadError", "We couldn't load ExploreValley right now. Please try again.")
      : uiText("home", "empty", "No content yet. Add tours/hotels from Admin Dashboard or via Telegram bot: /addtour or /addhotel");
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "transparent" }}>
        <Text style={{ color: "#fff", fontSize: 18, textAlign: "center" }}>
          {emptyMessage}
        </Text>
        {loadError ? (
          <Text style={{ color: "#ff6b6b", fontSize: 12, marginTop: 10, textAlign: "center" }}>
            Load error: {loadError}
          </Text>
        ) : null}
        <Pressable onPress={loadData} style={{ marginTop: 14, borderWidth: 1, borderColor: "#333", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{uiText("home", "retry", "Retry")}</Text>
        </Pressable>
        <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
        {renderFooter()}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      {primaryTab === "taxi" ? (
        <View style={{ flex: 1, paddingTop: 90 }}>
          <TaxiScreen onRequireAuth={authMode !== "authenticated" ? () => setAuthOpen(true) : undefined} />
        </View>
      ) : primaryTab === "bike" ? (
        <View style={{ flex: 1, paddingTop: 90 }}>
          <BikeRentalScreen onRequireAuth={authMode !== "authenticated" ? () => setAuthOpen(true) : undefined} />
        </View>
      ) : primaryTab === "food" ? (
        <View style={{ flex: 1, paddingTop: 90 }}>
          <FoodOrderScreen
            authMode={authMode}
            onRequireAuth={() => setAuthOpen(true)}
          />
        </View>
      ) : (
        travelContent
      )}

      {!bookingOpen ? (
        <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          <TopNav
            query={query}
            setQuery={setQuery}
            onFilter={() => setFiltersOpen(true)}
            typeFilter={filters.type}
            onTypeChange={(t: string) => setFilters((prev: any) => ({ ...prev, type: t }))}
            primaryTab={primaryTab}
            onPrimaryChange={(next: string) => {
              if (authMode !== "authenticated") {
                setPendingTab(next);
                setAuthOpen(true);
                return;
              }
              setPrimaryTab(next);
            }}
            authMode={authMode}
            authUser={authUser}
            onProfilePress={() => setProfileOpen(true)}
            onAuthPress={() => setAuthOpen(true)}
            onLogout={() => {
              trackEvent({
                type: "auth_logout",
                category: "core",
                name: authUser?.name,
                email: authUser?.email,
                phone: authUser?.phone,
                meta: { screen: primaryTab }
              });
              setAuthToken(null);
              setAuthUser(null);
              setAuthMode("none");
              setAuthModeState("none");
              setAuthUserState(null);
            }}
          />
        </View>
      ) : null}

      

      {active ? (
        <BookingModal
          visible={bookingOpen}
          onClose={() => setBookingOpen(false)}
          item={active}
        />
      ) : null}

      {/* Filter modal */}
      <FilterModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        initial={filters}
        onApply={(f: any) => { setFilters(f); setFiltersOpen(false); }}
      />
      <ProfileModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={(p: any) => {
          const nextName = String(p?.name || "").trim();
          if (!nextName) return;
          const curr = getAuthUser() || authUser || {};
          const merged = { ...curr, name: nextName };
          setAuthUser(merged as any);
          setAuthUserState(merged as any);
        }}
      />

      <AuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={(mode: any) => {
          setAuthModeState(mode);
          setAuthUserState(getAuthUser());
          if (pendingTab) {
            setPrimaryTab(pendingTab);
            setPendingTab(null);
          }
        }}
      />

      <RefundRequestModal visible={!!refundOrder} onClose={() => setRefundOrder(null)} order={refundOrder} onRequireAuth={() => setAuthOpen(true)} />
      <RateExperienceModal visible={!!rateOrder} onClose={() => setRateOrder(null)} order={rateOrder} onRequireAuth={() => setAuthOpen(true)} />

      {userNotice ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 16,
            top: 86,
            zIndex: 2000,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#1f7a34",
            backgroundColor: "rgba(9, 30, 14, 0.92)",
            paddingHorizontal: 12,
            paddingVertical: 10
          }}
        >
          <Text style={{ color: "#d9ffe3", fontWeight: "700", fontSize: 13 }}>{userNotice}</Text>
        </View>
      ) : null}

      <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
      {renderFooter()}

    </View>
  );
}

const styles = StyleSheet.create({
  travelRoot: {
    flex: 1,
    backgroundColor: "#ffffff",
    position: "relative",
  },
  travelOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  travelContentWrap: {
    flex: 1,
  },
  travelContent: {
    paddingTop: 110,
    paddingHorizontal: 18,
    paddingBottom: 120,
  },
  hero: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#000000",
  },
  heroSub: {
    marginTop: 6,
    color: "#333333",
    fontSize: 13.5,
  },
  alertCard: {
    borderWidth: 1,
    borderColor: "#ff5d5d",
    backgroundColor: "#fff3f3",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  alertTitle: {
    fontWeight: "800",
    color: "#b42318",
    marginBottom: 6,
  },
  alertText: {
    color: "#7a1b1b",
    fontSize: 12.5,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#000000",
  },
  sectionSub: {
    color: "#333333",
    marginTop: 6,
  },
  sliderSection: {
    marginTop: 16,
  },
  sliderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
  },
  sliderRow: {
    paddingVertical: 12,
    paddingRight: 12,
    gap: 12,
  },
  sliderCard: {
    width: 265,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  festivalCard: {
    width: 285,
  },
  festivalImage: {
    width: "100%",
    height: 130,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#e5e7eb",
  },
  festivalBadgeRow: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  festivalMonth: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "800",
  },
  festivalLocation: {
    marginTop: 6,
    color: "#334155",
    fontSize: 12.5,
    fontWeight: "700",
  },
  sliderCardImage: {
    width: "100%",
    height: 115,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#e5e7eb",
  },
  sliderCardImagePlaceholder: {
    width: "100%",
    height: 115,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderCardImagePlaceholderText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
  },
  sliderBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#34e0a1",
    color: "#000000",
    fontSize: 11,
    fontWeight: "800",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  sliderCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },
  sliderCardDesc: {
    marginTop: 6,
    color: "#333333",
    fontSize: 12.5,
  },
  sliderCardPrice: {
    marginTop: 8,
    fontWeight: "800",
    color: "#000000",
  },
  sliderCta: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderWidth: 0,
    backgroundColor: "#000000",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sliderCtaText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginTop: 12,
  },
  serviceCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderWidth: 1,
    borderColor: "#d9e7df",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    margin: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a24",
  },
  serviceCount: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "#0f5b3f",
  },
  serviceDesc: {
    marginTop: 8,
    color: "#5f6e66",
    fontSize: 12.5,
  },
  serviceCta: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#00a568",
    backgroundColor: "#eef8f3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  serviceCtaText: {
    color: "#134935",
    fontSize: 12,
    fontWeight: "800",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: "#1f2a24",
    fontWeight: "600",
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#d9e7df",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },
  emptyTitle: {
    fontWeight: "800",
    color: "#1f2a24",
    marginBottom: 6,
  },
  emptyText: {
    color: "#5f6e66",
    fontSize: 12.5,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginTop: 12,
  },
  featureCard: {
    flexGrow: 1,
    flexBasis: 240,
    borderWidth: 1,
    borderColor: "#d9e7df",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    margin: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  featureBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e6f6ef",
    color: "#0f5b3f",
    fontSize: 11,
    fontWeight: "800",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2a24",
  },
  featureDesc: {
    marginTop: 6,
    color: "#5f6e66",
    fontSize: 12.5,
  },
  featurePrice: {
    marginTop: 8,
    fontWeight: "800",
    color: "#0f5b3f",
  },
  featureBtn: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#00aa6c",
    paddingVertical: 8,
    alignItems: "center",
  },
  featureBtnText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  martRoot: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  martDesktopLayout: {
    flex: 1,
    flexDirection: "row",
  },
  martCategoryRail: {
    width: 240,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  martCategoryRailContent: {
    paddingVertical: 10,
  },
  martCategoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  martCategoryItemActive: {
    backgroundColor: "#efe3ff",
    borderLeftColor: "#a855f7",
  },
  martCategoryImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
  },
  martCategoryText: {
    flex: 1,
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
  martCategoryTextActive: {
    color: "#7e22ce",
    fontWeight: "700",
  },
  martProductsPane: {
    flex: 1,
  },
  martProductsPaneContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
    paddingTop: 14,
  },
  martGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  martGridMobile: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginTop: 8,
  },
  martCard: {
    width: 184,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
    margin: 6,
  },
  martProductImage: {
    width: "100%",
    height: 118,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  martAddButton: {
    position: "absolute",
    right: 12,
    top: 110,
    borderWidth: 1.5,
    borderColor: "#f43f5e",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  martAddButtonText: {
    color: "#f43f5e",
    fontWeight: "800",
    fontSize: 13,
  },
  martPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  martPrice: {
    backgroundColor: "#1f8f3a",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  martOriginalPrice: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },
  martDiscount: {
    marginTop: 4,
    color: "#15803d",
    fontSize: 11,
    fontWeight: "800",
  },
  martProductTitle: {
    marginTop: 8,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
    minHeight: 38,
  },
  martProductPack: {
    marginTop: 4,
    color: "#475569",
    fontSize: 12,
    fontWeight: "500",
  },
  martTag: {
    alignSelf: "flex-start",
    marginTop: 7,
    borderRadius: 8,
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  martRating: {
    marginTop: 8,
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
  },
  martMobileWrap: {
    flex: 1,
  },
  martMobileContent: {
    paddingHorizontal: 10,
    paddingBottom: 130,
    paddingTop: 8,
  },
  martCategoryRow: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  martCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
    marginRight: 8,
  },
  martCategoryChipActive: {
    borderColor: "#a855f7",
    backgroundColor: "#f3e8ff",
  },
  martCategoryChipImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },
  martCategoryChipText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  martCategoryChipTextActive: {
    color: "#7e22ce",
    fontWeight: "700",
  },
});

