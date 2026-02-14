import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Image, ScrollView, useWindowDimensions } from "react-native";
import { apiGet, apiPost, BASE_URL, trackEvent } from "../lib/api";
import BookingModal from "../components/BookingModal";
import TopNav from "../components/TopNav";
import PortfolioCarousel from "../components/PortfolioCarousel";
import FilterModal from "../components/FilterModal";
import CabBookingScreen from "./CabBookingScreen";
import FoodOrderScreen from "./FoodOrderScreen";
import FestivalScreen from "./FestivalScreen";
import RescueScreen from "./RescueScreen";
import AIChatWidget from "../components/AIChatWidget";
import MyOrdersScreen from "./MyOrdersScreen";
import AuthModal from "../components/AuthModal";
import RefundRequestModal from "../components/RefundRequestModal";
import RateExperienceModal from "../components/RateExperienceModal";
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
  const [userNotice, setUserNotice] = useState<string | null>(null);
  const [refundOrder, setRefundOrder] = useState<any>(null);
  const [rateOrder, setRateOrder] = useState<any>(null);
  const browseRef = useRef<ScrollView>(null);
  const browseOffsetRef = useRef(0);
  const attributionSentRef = useRef(false);
  const locale = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : "";
  const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const syncAuthState = React.useCallback(() => {
    loadAuth();
    setAuthModeState(getAuthMode());
    setAuthUserState(getAuthUser());
  }, []);

  async function loadData() {
    try {
      setLoadError(null);
      const [tours, hotels] = await Promise.all([
        apiGet<any[]>("/api/tours"),
        apiGet<any[]>("/api/hotels")
      ]);

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
            images: imageUrls.map((x: string) => x.startsWith("http") ? x : `${BASE_URL}${x}`),
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
            images: imageUrls.map((x: string) => x.startsWith("http") ? x : `${BASE_URL}${x}`),
            raw: h
          };
        })
      ];

      setItems(merged.length ? merged : []);
    } catch (err: any) {
      setLoadError(String(err?.message || err));
      setItems([]);
    }
  }

  useEffect(() => {
    syncAuthState();
    loadData();
  }, [syncAuthState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = String(window.location.hash || "");
    if (!hash) return;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    if (params.get("access_token")) {
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

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    let out = items.slice();
    if (filters.type && filters.type !== "all") {
      if (filters.type === "cottages") {
        out = out.filter(i => {
          if (i.kind !== "hotel") return false;
          const raw = i.raw || {};
          const hay = `${raw.name || ""} ${raw.title || ""} ${raw.category || ""} ${raw.type || ""} ${(raw.tags || []).join(" ")}`.toLowerCase();
          return hay.includes("cottage");
        });
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

  // Shared TopNav + Auth overlay factory for full-screen tab pages
  const tabOverlay = (tabContent: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {tabContent}
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
        <TopNav
          query={query}
          setQuery={setQuery}
          onFilter={() => setFiltersOpen(true)}
          typeFilter={filters.type}
          onTypeChange={(t: string) => setFilters((prev: any) => ({ ...prev, type: t }))}
          primaryTab={primaryTab}
          onPrimaryChange={setPrimaryTab}
          authMode={authMode}
          authUser={authUser}
          onAuthPress={() => setAuthOpen(true)}
          onLogout={() => {
            trackEvent({ type: "auth_logout", category: "core", name: authUser?.name, email: authUser?.email, phone: authUser?.phone, meta: { screen: primaryTab } });
            setAuthToken(null); setAuthUser(null); setAuthMode("none"); setAuthModeState("none"); setAuthUserState(null);
          }}
        />
      </View>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} onAuthed={(mode: any) => { setAuthModeState(mode); setAuthUserState(getAuthUser()); }} />
      <RefundRequestModal visible={!!refundOrder} onClose={() => setRefundOrder(null)} order={refundOrder} onRequireAuth={() => setAuthOpen(true)} />
      <RateExperienceModal visible={!!rateOrder} onClose={() => setRateOrder(null)} order={rateOrder} onRequireAuth={() => setAuthOpen(true)} />
      <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
    </View>
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

  if (primaryTab === "rescue") {
    return (
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <RescueScreen />
        <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          <TopNav
            query={query}
            setQuery={setQuery}
            onFilter={() => setFiltersOpen(true)}
            typeFilter={filters.type}
            onTypeChange={(t: string) => setFilters((prev: any) => ({ ...prev, type: t }))}
            primaryTab={primaryTab}
            onPrimaryChange={setPrimaryTab}
            authMode={authMode}
            authUser={authUser}
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
          }}
        />
        <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
      </View>
    );
  }

  if (!items) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={{ color: "#fff", marginTop: 8 }}>{uiText("home", "loading", "Loading ExploreValley…")}</Text>
        <AIChatWidget onRequireAuth={() => setAuthOpen(true)} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 18, textAlign: "center" }}>
          {uiText("home", "empty", "No content yet. Add tours/hotels from Admin Dashboard or via Telegram bot: /addtour or /addhotel")}
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
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      {primaryTab === "cabs" ? (
        <View style={{ flex: 1, paddingTop: 90 }}>
          <CabBookingScreen onClose={() => setPrimaryTab("travel")} />
        </View>
      ) : primaryTab === "festivals" ? (
        <FestivalScreen />
      ) : primaryTab === "food" ? (
        <View style={{ flex: 1, paddingTop: 90 }}>
          <FoodOrderScreen
            authMode={authMode}
            onRequireAuth={() => setAuthOpen(true)}
          />
        </View>
      ) : filtered === null ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={{ color: "#fff", marginTop: 8 }}>Loading…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#000" }}>
          <Text style={{ color: "#fff", fontSize: 18, textAlign: "center" }}>
            No results for "{query}".
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <View style={{ height: "100%" }}>
              <PortfolioCarousel
                items={filtered}
                onViewPhotos={(it: any) => {
                  const idx = filtered.findIndex(i => i.id === it.id && i.kind === it.kind);
                  if (idx >= 0) setActiveIndex(idx);
                }}
                onBook={(it: any) => {
                  const idx = filtered.findIndex(i => i.id === it.id && i.kind === it.kind);
                  if (idx >= 0) setActiveIndex(idx);
                  if (authMode !== "authenticated") {
                    setAuthOpen(true);
                    return;
                  }
                  setBookingOpen(true);
                }}
                autoplay={true}
                autoplayInterval={3500}
                showThumbnails={true}
                showHeroInfo={true}
              />
            </View>
          </View>
        </>
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
            onPrimaryChange={setPrimaryTab}
            authMode={authMode}
            authUser={authUser}
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

      <AuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={(mode: any) => {
          setAuthModeState(mode);
          setAuthUserState(getAuthUser());
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

    </View>
  );
}


