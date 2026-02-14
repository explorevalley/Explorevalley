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
      style={{ flex: 1, backgroundColor: "#060606" }}
      contentContainerStyle={{ paddingTop: 110, paddingHorizontal: isMobile ? 14 : 24, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "#22342a",
          backgroundColor: "#0d1711",
          padding: isMobile ? 16 : 22,
          marginBottom: 16
        }}
      >
        <Text style={{ color: "#9ad8a0", fontSize: isMobile ? 12 : 13, fontWeight: "800", letterSpacing: 1.1 }}>
          EXPLOREVALLEY MODE
        </Text>
        <Text style={{ color: "#fff", fontSize: isMobile ? 25 : 34, fontWeight: "800", marginTop: 6 }}>
          ExploreValley Highlights
        </Text>
        <Text style={{ color: "#d5d5d5", fontSize: isMobile ? 13 : 16, marginTop: 8 }}>
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
          <ActivityIndicator color="#fff" />
          <Text style={{ color: "#aaa", marginTop: 8 }}>Loading ExploreValley highlights...</Text>
        </View>
      ) : null}

      {items !== null && festivals.length === 0 ? (
        <View style={{ paddingVertical: 20 }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>No ExploreValley data in JSON.</Text>
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
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: fest.color,
              padding: isMobile ? 14 : 18
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#fff", fontSize: isMobile ? 20 : 24, fontWeight: "800" }}>{fest.title}</Text>
              <Text style={{ color: "#fff", fontSize: isMobile ? 12 : 13, fontWeight: "700", opacity: 0.9 }}>{fest.month}</Text>
            </View>
            {fest.image ? (
              <Image
                source={{ uri: fest.image }}
                resizeMode="cover"
                style={{ width: "100%", height: isMobile ? 120 : 170, borderRadius: 10, marginTop: 8 }}
              />
            ) : null}
            <Text style={{ color: "#f4f4f4", marginTop: 6, fontSize: isMobile ? 13 : 14 }}>{fest.location || "Explore Valley"}</Text>
            <Text style={{ color: "#f2f2f2", marginTop: 8, fontSize: isMobile ? 13 : 14 }}>{fest.vibe}</Text>
            <Text style={{ color: "#f9f6d8", marginTop: 8, fontSize: isMobile ? 15 : 16, fontWeight: "800" }}>
              {typeof fest.ticket === "number" ? `From INR ${fest.ticket}` : fest.ticket}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable style={buttonBase}>
                <Text style={buttonText}>View Lineup</Text>
              </Pressable>
              <Pressable style={[buttonBase, { backgroundColor: "#f5f2e8", borderColor: "#f5f2e8" }]}>
                <Text style={[buttonText, { color: "#121212" }]}>Book Pass</Text>
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
        borderColor: "#2a7a3f",
        backgroundColor: "rgba(10,40,20,0.65)",
        paddingHorizontal: 12,
        paddingVertical: 7
      }}
    >
      <Text style={{ color: "#d5ffd8", fontSize: 12, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

const buttonBase = {
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#ffffff",
  backgroundColor: "rgba(0,0,0,0.2)",
  paddingHorizontal: 14,
  paddingVertical: 8
} as const;

const buttonText = {
  color: "#fff",
  fontSize: 12,
  fontWeight: "800"
} as const;
