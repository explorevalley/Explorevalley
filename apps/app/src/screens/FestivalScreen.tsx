import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, useWindowDimensions, ActivityIndicator, Image } from "react-native";
import { apiGet, BASE_URL } from "../lib/api";

type Festival = {
  id: string;
  title: string;
  location?: string;
  month: string;
  vibe: string;
  ticket: string | number;
  color: string;
  image?: string;
};

const COLORS = ["#1f4a6b", "#4f3d2b", "#3a5d3f", "#5a3f46", "#2f425d", "#5b4a2f"];

export default function FestivalScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [items, setItems] = useState<Festival[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        // Prefer festivals if json contains dedicated section. Fallback to tours.
        let data: any[] = [];
        try {
          const f = await apiGet<any[]>("/api/festivals");
          data = Array.isArray(f) ? f : [];
        } catch {
          const tours = await apiGet<any[]>("/api/tours");
          data = Array.isArray(tours) ? tours : [];
        }
        if (!mounted) return;
        const mapped = data.map((x: any, idx: number) => {
          const month = x.month || (x.createdAt ? new Date(x.createdAt).toLocaleString("en-US", { month: "long" }) : "All Season");
          const image = Array.isArray(x.images) && x.images.length ? String(x.images[0]) : undefined;
          return {
            id: x.id || `festival_${idx}`,
            title: x.title || x.name || "Festival",
            location: x.location || x.destination || "",
            month,
            vibe: x.vibe || x.description || x.duration || "Live events and cultural experiences",
            ticket: x.ticket || x.price || x.starting_price || "On request",
            color: COLORS[idx % COLORS.length],
            image: image && !image.startsWith("http") ? `${BASE_URL}${image}` : image
          } as Festival;
        });
        setItems(mapped);
      } catch (e: any) {
        if (!mounted) return;
        setItems([]);
        setError(String(e?.message || e));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const festivals = useMemo(() => items || [], [items]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f3f5f9" }}
      contentContainerStyle={{ paddingTop: 110, paddingHorizontal: isMobile ? 14 : 24, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "#1d3258",
          backgroundColor: "#0f1a2d",
          padding: isMobile ? 16 : 22,
          marginBottom: 16
        }}
      >
        <Text style={{ color: "#eaf2ff", fontSize: isMobile ? 12 : 13, fontWeight: "800", letterSpacing: 1.1 }}>
          EXPLOREVALLEY FEST
        </Text>
        <Text style={{ color: "#fff", fontSize: isMobile ? 25 : 34, fontWeight: "800", marginTop: 6 }}>
          ExploreValley Highlights
        </Text>
        <Text style={{ color: "#9db0d6", fontSize: isMobile ? 13 : 16, marginTop: 8 }}>
          Browse upcoming events, compare vibes, and book your next trip around live experiences.
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <Pill text="Live Music" />
        <Pill text="Food Trails" />
        <Pill text="Cultural Nights" />
        <Pill text="Family Friendly" />
      </View>

      {items === null ? (
        <View style={{ paddingVertical: 30, alignItems: "center" }}>
          <ActivityIndicator color="#f4511e" />
          <Text style={{ color: "#6b7280", marginTop: 8 }}>Loading ExploreValley highlights...</Text>
        </View>
      ) : null}

      {items !== null && festivals.length === 0 ? (
        <View style={{ paddingVertical: 20 }}>
          <Text style={{ color: "#111827", fontSize: 16, fontWeight: "700" }}>No ExploreValley data in JSON.</Text>
          {error ? <Text style={{ color: "#ff8b8b", marginTop: 6, fontSize: 12 }}>{error}</Text> : null}
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        {festivals.map((fest) => (
          <View
            key={fest.id}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#d8e1ee",
              backgroundColor: "#ffffff",
              padding: isMobile ? 14 : 18,
              shadowColor: "#1d2c49",
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#111827", fontSize: isMobile ? 20 : 24, fontWeight: "800", flex: 1, marginRight: 8 }}>{fest.title}</Text>
              <View style={{ backgroundColor: "#fff1e8", borderWidth: 1, borderColor: "#ffd8c2", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: "#9a3412", fontSize: isMobile ? 12 : 13, fontWeight: "700" }}>{fest.month}</Text>
              </View>
            </View>
            {fest.image ? (
              <Image
                source={{ uri: fest.image }}
                resizeMode="cover"
                style={{ width: "100%", height: isMobile ? 120 : 170, borderRadius: 10, marginTop: 8 }}
              />
            ) : null}
            <Text style={{ color: "#6b7280", marginTop: 6, fontSize: isMobile ? 13 : 14 }}>{fest.location || "Explore Valley"}</Text>
            <Text style={{ color: "#4b5563", marginTop: 8, fontSize: isMobile ? 13 : 14 }}>{fest.vibe}</Text>
            <Text style={{ color: "#f4511e", marginTop: 8, fontSize: isMobile ? 15 : 16, fontWeight: "800" }}>
              {typeof fest.ticket === "number" ? `From INR ${fest.ticket}` : fest.ticket}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable style={secondaryButtonBase}>
                <Text style={secondaryButtonText}>View Lineup</Text>
              </Pressable>
              <Pressable style={primaryButtonBase}>
                <Text style={primaryButtonText}>Book Pass</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#f4511e",
        backgroundColor: "#fff1e8",
        paddingHorizontal: 12,
        paddingVertical: 7
      }}
    >
      <Text style={{ color: "#9a3412", fontSize: 12, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

const primaryButtonBase = {
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#f4511e",
  backgroundColor: "#f4511e",
  paddingHorizontal: 14,
  paddingVertical: 8
} as const;

const primaryButtonText = {
  color: "#fff",
  fontSize: 12,
  fontWeight: "800"
} as const;

const secondaryButtonBase = {
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#d8e1ee",
  backgroundColor: "#f8fafc",
  paddingHorizontal: 14,
  paddingVertical: 8
} as const;

const secondaryButtonText = {
  color: "#334155",
  fontSize: 12,
  fontWeight: "800"
} as const;
