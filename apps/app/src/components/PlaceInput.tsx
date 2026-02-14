import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, View, Text, TextInput, Pressable, Platform } from "react-native";

const GOOGLE_MAPS_KEY = "AIzaSyC49LGA349edPGYvmN18hXhtrn8XMzC2pk";
const MAX_RESULTS = 6;
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Prediction = {
  description: string;
  place_id: string;
};

type Suggestion = Prediction & { source: "local" | "google" };

export default function PlaceInput({
  label,
  value,
  onChangeText,
  placeholder,
  onPickMap,
  labelStyle,
  inputStyle,
  suggestions,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onPickMap?: () => void;
  labelStyle?: any;
  inputStyle?: any;
  suggestions?: string[];
}) {
  const [ready, setReady] = useState(Platform.OS !== "web");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Prediction[]>([]);
    const localSuggestions = useMemo(() => {
      const base = (suggestions || []).map((s) => String(s || "").trim()).filter(Boolean);
      if (!value) return base;
      const q = value.toLowerCase();
      return base.filter((s) => s.toLowerCase().includes(q));
    }, [suggestions, value]);

    const displayItems: Suggestion[] = useMemo(() => {
      const googleItems = (items || []).map((p) => ({ ...p, source: "google" as const }));
      const localItems = localSuggestions.map((s) => ({
        description: s,
        place_id: `local_${s.toLowerCase().replace(/\s+/g, "_")}`,
        source: "local" as const,
      }));
      const seen = new Set<string>();
      const combined: Suggestion[] = [];
      for (const item of [...localItems, ...googleItems]) {
        const key = item.description.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        combined.push(item);
      }
      return combined.slice(0, MAX_RESULTS);
    }, [items, localSuggestions]);
  const debounceRef = useRef<any>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const service = useMemo(() => {
    const g = (globalThis as any)?.google;
    if (!g?.maps?.places) return null;
    return new g.maps.places.AutocompleteService();
  }, [ready]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const g = (globalThis as any)?.google;
    if (g?.maps?.places) {
      setReady(true);
      return;
    }
    const id = "google-places-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    s.async = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setItems([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (Platform.OS === "web") {
        if (!service) return;
        service.getPlacePredictions({ input: value }, (preds: any[]) => {
          const out = (preds || []).slice(0, MAX_RESULTS).map(p => ({
            description: p.description,
            place_id: p.place_id,
          }));
          setItems(out);
        });
      } else {
        try {
          const url =
            `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
            `?key=${GOOGLE_MAPS_KEY}&input=${encodeURIComponent(value)}&types=geocode`;
          const r = await fetch(url);
          const data = await r.json();
          const out = (data?.predictions || []).slice(0, MAX_RESULTS).map((p: any) => ({
            description: p.description,
            place_id: p.place_id,
          }));
          setItems(out);
        } catch {
          setItems([]);
        }
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [value, service]);

  return (
    <View>
      <Text style={[{ color: "#ddd", marginBottom: 6 }, labelStyle]}>{label}</Text>
      <AnimatedTextInput
        value={value}
        onChangeText={(t) => {
          onChangeText(t);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          Animated.timing(focusAnim, { toValue: 1, duration: 160, useNativeDriver: false }).start();
        }}
        onBlur={() => Animated.timing(focusAnim, { toValue: 0, duration: 160, useNativeDriver: false }).start()}
        placeholder={placeholder || "Search location or type manually"}
        placeholderTextColor="#666"
        style={[
          {
          backgroundColor: "#141414",
          color: "#fff",
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: focusAnim.interpolate({ inputRange: [0, 1], outputRange: ["#222", "#f5f2e8"] }),
          },
          inputStyle,
        ]}
      />

      {onPickMap ? (
        <Pressable
          onPress={onPickMap}
          style={({ hovered }) => [
            {
              marginTop: 6,
              alignSelf: "flex-start",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#f5f2e8",
              backgroundColor: "rgba(245,242,232,0.12)",
            },
            hovered ? { backgroundColor: "#007c00", borderColor: "#007c00" } : null,
          ]}
        >
          {({ hovered }) => (
            <Text style={{ color: hovered ? "#fff" : "#f5f2e8", fontWeight: "800", fontSize: 18 }}>
              Pick on map
            </Text>
          )}
        </Pressable>
      ) : null}

      {open && displayItems.length > 0 ? (
        <View
          style={{
            marginTop: 6,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#222",
            backgroundColor: "#0f0f0f",
            overflow: "hidden",
          }}
        >
          {displayItems.map((p, i) => (
            <Pressable
              key={p.place_id}
              onPress={() => {
                onChangeText(p.description);
                setOpen(false);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: "#1c1c1c",
              }}
            >
              <Text style={{ color: "#fff" }}>{p.description}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
