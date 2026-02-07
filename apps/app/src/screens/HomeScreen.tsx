import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Modal } from "react-native";
import { apiGet } from "../lib/api";
import BookingModal from "../components/BookingModal";
import TopNav from "../components/TopNav";
import PortfolioCarousel from "../components/PortfolioCarousel";
import FilterModal from "../components/FilterModal";

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
  const [items, setItems] = useState<Item[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<any>({ type: "all", vegOnly: false });

  useEffect(() => {
    (async () => {
      try {
        const [tours, hotels] = await Promise.all([
          apiGet<any[]>("/api/tours"),
          apiGet<any[]>("/api/hotels")
        ]);

        const merged: Item[] = [
          ...tours.map(t => ({
            kind: "tour" as const,
            id: t.id,
            title: t.title,
            description: t.description,
            priceLabel: `From ₹${t.price}`,
            images: (t.images || []).map((x: string) => x.startsWith("http") ? x : `http://localhost:8080${x}`),
            raw: t
          })),
          ...hotels.map(h => ({
            kind: "hotel" as const,
            id: h.id,
            title: h.name,
            description: `${h.location} • ${h.description}`,
            priceLabel: `From ₹${h.pricePerNight}/night`,
            images: (h.images || []).map((x: string) => x.startsWith("http") ? x : `http://localhost:8080${x}`),
            raw: h
          }))
        ];

        setItems(merged.length ? merged : []);
      } catch (err) {
        setItems([]);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    let out = items.slice();
    if (filters.type && filters.type !== "all") {
      out = out.filter(i => i.kind === filters.type);
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

  if (!items) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={{ color: "#fff", marginTop: 8 }}>Loading ExploreValley…</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 18, textAlign: "center" }}>
          No content yet. Add tours/hotels via Telegram bot: /addtour or /addhotel
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <TopNav query={query} setQuery={setQuery} onFilter={() => setFiltersOpen(true)} />

      {filtered === null ? (
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
          <PortfolioCarousel
            items={filtered}
            onViewPhotos={(it: any) => setGalleryOpen(true)}
            onBook={(it: any) => setBookingOpen(true)}
            autoplay={true}
            autoplayInterval={3500}
            showThumbnails={true}
          />
        </>
      )}

      <BookingModal
        visible={bookingOpen}
        onClose={() => setBookingOpen(false)}
        item={active!}
      />

      {/* Filter modal */}
      <FilterModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        initial={filters}
        onApply={(f: any) => { setFilters(f); setFiltersOpen(false); }}
      />
    </View>
  );
}
