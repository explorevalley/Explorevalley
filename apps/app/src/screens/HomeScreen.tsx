import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView, useWindowDimensions, ImageBackground, Image, Linking } from "react-native";
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
import { homeScreenColors, styles, homeLayoutStyles } from "../styles/HomeScreen.styles";
import { homeScreenData as t } from "../staticData/homeScreen.staticData";


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

const FESTIVAL_COLORS = t.festivalColors;

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
  if (!raw) return t.defaults.uncategorized;
  return raw.replace(/\s+/g, " ");
}

const MART_CATEGORY_IMAGES: Record<string, string> = t.martCategoryImages;
const FOOTER_NAV = t.footerNav;

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
    const page: any = await apiGet(t.api.pages(slug));
    const title = String(page?.title || slug);
    const content = String(page?.content || "");
    const html = t.htmlTemplate(title, content);
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
  const isMobile = width < 768;
  const tabTopOffset = isMobile ? 210 : 90;
  const travelTopOffset = isMobile ? 180 : 110;
  const serviceTabTopOffset = isMobile ? 20 : tabTopOffset;
  const bikeTopOffset = isMobile ? 70 : tabTopOffset;
  const foodTopOffset = isMobile ? 160 : tabTopOffset;
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
      const martPath = t.api.martProducts(configuredMartId || undefined);
      const [toursRes, hotelsRes, restaurantsRes, busesRes, metaRes, festivalsRes, martRes] = await Promise.allSettled([
        apiGet<any[]>(t.api.tours),
        apiGet<any[]>(t.api.hotels),
        apiGet<any[]>(t.api.restaurants),
        apiGet<any[]>(t.api.buses),
        apiGet<any>(t.api.meta),
        apiGet<any[]>(t.api.festivals),
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
      if (toursRes.status === "rejected") errors.push(String(toursRes.reason?.message || toursRes.reason || t.errors.toursUnavailable));
      if (hotelsRes.status === "rejected") errors.push(String(hotelsRes.reason?.message || hotelsRes.reason || t.errors.hotelsUnavailable));
      if (festivalsRes.status === "rejected") errors.push(String(festivalsRes.reason?.message || festivalsRes.reason || t.errors.festivalsUnavailable));
      if (martRes.status === "rejected") errors.push(String(martRes.reason?.message || martRes.reason || t.errors.martUnavailable));
      if (errors.length) setLoadError(errors.join(t.errors.joiner));

      const merged: Item[] = [
        ...tours.map(tour => {
          const pct = Math.max(0, Math.min(100, Number(tour.priceDropPercent || (tour.priceDropped ? 10 : 0))));
          const base = Number(tour.price || 0);
          const nextPrice = pct > 0 ? Math.round((base * (100 - pct)) / 100) : base;
          const imageUrls = Array.from(new Set([
            ...(tour.heroImage ? [tour.heroImage] : []),
            ...((tour.images || []) as string[]),
            ...(((tour.imageMeta || []) as any[]).map((m: any) => m?.url).filter(Boolean))
          ]));
          return {
            kind: "tour" as const,
            id: tour.id,
            title: tour.title,
            description: tour.description,
            priceLabel: pct > 0 ? t.pricing.fromInrWithBase(nextPrice, base) : t.pricing.fromInr(base),
            images: imageUrls.map((x: string) => resolveAssetUrl(x)),
            raw: tour
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
            priceLabel: pct > 0 ? t.pricing.fromInrNightWithBase(nextPrice, base) : t.pricing.fromInrNight(base),
            images: imageUrls.map((x: string) => resolveAssetUrl(x)),
            raw: h
          };
        })
      ];

      setItems(merged.length ? merged : []);
      setFestivals(
        Array.isArray(festivalsRaw)
          ? festivalsRaw.map((f: any, idx: number) => {
              const month = f.month || (f.createdAt ? new Date(f.createdAt).toLocaleString("en-US", { month: "long" }) : t.defaults.festivalSeason);
              const image = Array.isArray(f.images) && f.images.length ? String(f.images[0]) : f.image;
              return {
                id: f.id || `festival_${idx}`,
                title: f.title || f.name || t.defaults.festivalTitle,
                location: f.location || f.destination || t.defaults.festivalLocation,
                month,
                vibe: f.vibe || f.description || f.duration || t.defaults.festivalVibe,
                ticket: f.ticket || f.price || f.starting_price || t.defaults.festivalTicket,
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
        categoryId: String(x?.categoryId || x?.category_id || "").trim() || t.defaults.uncategorized,
        categoryKey: normalizeMartCategoryId(x?.categoryId || x?.category_id),
        name: String(x?.name || t.defaults.productName),
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
          new N(t.notifications.title, { body: message });
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
          t.api.ordersStatus,
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
        const p = await apiGet<any>(t.api.profile);
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
        byKey.set(key, String(item.categoryId || t.defaults.uncategorized).trim() || t.defaults.uncategorized);
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
    <View style={styles.flexTransparent}>
      {tabContent}
      {renderFooter()}
      <View pointerEvents="box-none" style={styles.overlayFill}>
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
            setAuthToken(null); setAuthUser(null); setAuthMode("none"); setAuthModeState("none");
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
    if (loading) return t.countLabel.loading;
    if (fallback) return fallback;
    return `${value} ${t.countLabel.listedSuffix}`;
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
                      <Text style={styles.martAddButtonText}>{t.mart.add}</Text>
                    </Pressable>
                    <View style={styles.martPriceRow}>
                      <Text style={styles.martPrice}>{t.mart.currency} {product.price}</Text>
                      {hasDiscount ? <Text style={styles.martOriginalPrice}>{t.mart.currency} {product.mrp}</Text> : null}
                    </View>
                    {hasDiscount ? <Text style={styles.martDiscount}>{t.mart.currency} {discount} {t.mart.off}</Text> : null}
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
                    <Text style={styles.martAddButtonText}>{t.mart.add}</Text>
                  </Pressable>
                  <View style={styles.martPriceRow}>
                    <Text style={styles.martPrice}>{t.mart.currency} {product.price}</Text>
                    {hasDiscount ? <Text style={styles.martOriginalPrice}>{t.mart.currency} {product.mrp}</Text> : null}
                  </View>
                  {hasDiscount ? <Text style={styles.martDiscount}>{t.mart.currency} {discount} {t.mart.off}</Text> : null}
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
      source={{ uri: t.travelBackgroundUrl }}
      style={styles.travelRoot}
      resizeMode="cover"
    >
      <View style={styles.travelOverlay} pointerEvents="none" />
      <ScrollView style={styles.travelContentWrap} contentContainerStyle={[styles.travelContent, homeLayoutStyles.topPadding(travelTopOffset)]}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t.hero.title}</Text>
        <Text style={styles.heroSub}>{t.hero.subtitle}</Text>
      </View>
      {loadError ? (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>{t.hero.alertTitle}</Text>
          <Text style={styles.alertText}>{loadError}</Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.sections.travelHighlights}</Text>
        <Text style={styles.sectionSub}>{t.sections.travelSub}</Text>

        {filters.type === "all" || filters.type === "tour" ? (
          <View style={styles.sliderSection}>
            <Text style={styles.sliderTitle}>{t.sections.toursTitle}</Text>
            {tourIdItems === null ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={homeScreenColors.loadingAccent} />
                <Text style={styles.loadingText}>{t.loading.tours}</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderRow}>
                {tourIdItems.length === 0 ? (
                  <View style={styles.sliderCard}>
                    <Text style={styles.sliderBadge}>{t.empty.comingSoon}</Text>
                    <Text style={styles.sliderCardTitle}>{t.empty.noTours}</Text>
                    <Text style={styles.sliderCardDesc}>{t.empty.toursHelp}</Text>
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
                            <Text style={styles.sliderCardImagePlaceholderText}>{t.placeholders.noImage}</Text>
                          </View>
                        )}
                        <Text style={styles.sliderBadge}>{t.badges.tour}</Text>
                        <Text style={styles.sliderCardTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.sliderCardDesc} numberOfLines={2}>{item.description}</Text>
                        <Text style={styles.sliderCardPrice}>{item.priceLabel}</Text>
                        <View style={styles.sliderCta}><Text style={styles.sliderCtaText}>{t.ctas.bookNow}</Text></View>
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
            <Text style={styles.sliderTitle}>{t.sections.hotelsTitle}</Text>
            {hotelOnlyItems === null ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={homeScreenColors.loadingAccent} />
                <Text style={styles.loadingText}>{t.loading.hotels}</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderRow}>
                {hotelOnlyItems.length === 0 ? (
                  <View style={styles.sliderCard}>
                    <Text style={styles.sliderBadge}>{t.empty.comingSoon}</Text>
                    <Text style={styles.sliderCardTitle}>{t.empty.noHotels}</Text>
                    <Text style={styles.sliderCardDesc}>{t.empty.hotelsHelp}</Text>
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
                            <Text style={styles.sliderCardImagePlaceholderText}>{t.placeholders.noImage}</Text>
                          </View>
                        )}
                        <Text style={styles.sliderBadge}>{t.badges.hotel}</Text>
                        <Text style={styles.sliderCardTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.sliderCardDesc} numberOfLines={2}>{item.description}</Text>
                        <Text style={styles.sliderCardPrice}>{item.priceLabel}</Text>
                        <View style={styles.sliderCta}><Text style={styles.sliderCtaText}>{t.ctas.bookStay}</Text></View>
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
            <Text style={styles.sliderTitle}>{t.sections.cottagesTitle}</Text>
            {cottageIdItems === null ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={homeScreenColors.loadingAccent} />
                <Text style={styles.loadingText}>{t.loading.cottages}</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderRow}>
                {cottageIdItems.length === 0 ? (
                  <View style={styles.sliderCard}>
                    <Text style={styles.sliderBadge}>{t.empty.syncPending}</Text>
                    <Text style={styles.sliderCardTitle}>{t.empty.noCottages}</Text>
                    <Text style={styles.sliderCardDesc}>{t.empty.cottagesHelp}</Text>
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
                            <Text style={styles.sliderCardImagePlaceholderText}>{t.placeholders.noImage}</Text>
                          </View>
                        )}
                        <Text style={styles.sliderBadge}>{t.badges.cottage}</Text>
                        <Text style={styles.sliderCardTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.sliderCardDesc} numberOfLines={2}>{item.description}</Text>
                        <Text style={styles.sliderCardPrice}>{item.priceLabel}</Text>
                        <View style={styles.sliderCta}><Text style={styles.sliderCtaText}>{t.ctas.bookCottage}</Text></View>
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
            <Text style={styles.sliderTitle}>{t.sections.festivalsTitle}</Text>
            {festivals === null ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={homeScreenColors.loadingAccent} />
                <Text style={styles.loadingText}>{t.loading.festivals}</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderRow}>
                {festivals.length === 0 ? (
                  <View style={[styles.sliderCard, styles.festivalCard]}>
                    <Text style={styles.sliderBadge}>{t.empty.upcomingSoon}</Text>
                    <Text style={styles.sliderCardTitle}>{t.empty.noFestivals}</Text>
                    <Text style={styles.sliderCardDesc}>{t.empty.festivalsHelp}</Text>
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
                      <View style={[styles.festivalBadgeRow, homeLayoutStyles.festivalBadgeBackground(fest.color)]}>
                        <Text style={styles.festivalMonth}>{fest.month}</Text>
                      </View>
                      <Text style={styles.sliderCardTitle} numberOfLines={2}>{fest.title}</Text>
                      <Text style={styles.festivalLocation} numberOfLines={2}>{fest.location}</Text>
                      <Text style={styles.sliderCardDesc} numberOfLines={3}>{fest.vibe}</Text>
                      <Text style={styles.sliderCardPrice}>
                        {typeof fest.ticket === "number" ? t.pricing.fromInr(fest.ticket) : fest.ticket}
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
      <View style={homeLayoutStyles.panelWithTop(tabTopOffset)}>
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
      <View style={styles.flexTransparent}>
        <ScrollView contentContainerStyle={homeLayoutStyles.rescueScrollContent(tabTopOffset)} style={styles.flexOnly}>
          <RescueScreen />
        </ScrollView>
        <View pointerEvents="box-none" style={styles.overlayFill}>
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
              setAuthUserState((prev) => prev);
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
      <View style={styles.flexTransparent}>
        <View style={homeLayoutStyles.panelWithTop(tabTopOffset)}>
          {renderMartWindow()}
        </View>
        <View pointerEvents="box-none" style={styles.overlayFill}>
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
              setAuthUserState((prev) => prev);
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
      <View style={styles.centerTransparent}>
        <ActivityIndicator color={homeScreenColors.spinnerLight} size="large" />
        <Text style={styles.loadingCaption}>{uiText("home", "loading", t.loading.app)}</Text>
        <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
        {renderFooter()}
      </View>
    );
  }

  if (items.length === 0 && primaryTab === "travel") {
    const emptyMessage = loadError
      ? uiText("home", "loadError", t.emptyState.loadError)
      : uiText("home", "empty", t.emptyState.empty);
    return (
      <View style={styles.emptyStateWrap}>
        <Text style={styles.emptyStateTitle}>
          {emptyMessage}
        </Text>
        {loadError ? (
          <Text style={styles.emptyStateError}>
            {t.emptyState.errorPrefix} {loadError}
          </Text>
        ) : null}
        <Pressable onPress={loadData} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{uiText("home", "retry", t.emptyState.retry)}</Text>
        </Pressable>
        <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
        {renderFooter()}
      </View>
    );
  }

  return (
    <View style={styles.flexTransparent}>
      {primaryTab === "taxi" ? (
        <View style={homeLayoutStyles.panelWithTop(serviceTabTopOffset)}>
          <TaxiScreen onRequireAuth={authMode !== "authenticated" ? () => setAuthOpen(true) : undefined} />
        </View>
      ) : primaryTab === "bike" ? (
        <View style={homeLayoutStyles.panelWithTop(bikeTopOffset)}>
          <BikeRentalScreen onRequireAuth={authMode !== "authenticated" ? () => setAuthOpen(true) : undefined} />
        </View>
      ) : primaryTab === "food" ? (
        <View style={homeLayoutStyles.panelWithTop(foodTopOffset)}>
          <FoodOrderScreen
            authMode={authMode}
            onRequireAuth={() => setAuthOpen(true)}
          />
        </View>
      ) : (
        travelContent
      )}

      {!bookingOpen ? (
        <View pointerEvents="box-none" style={styles.overlayFill}>
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
              setAuthUserState((prev) => prev);
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
        <View pointerEvents="none" style={styles.userNotice}>
          <Text style={styles.userNoticeText}>{userNotice}</Text>
        </View>
      ) : null}

      <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
      {renderFooter()}

    </View>
  );
}
