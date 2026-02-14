import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, Switch, useWindowDimensions, ScrollView } from "react-native";

export default function FilterModal({ visible, onClose, onApply, initial }: any) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  const [minPrice, setMinPrice] = useState(String(initial?.minPrice ?? ""));
  const [maxPrice, setMaxPrice] = useState(String(initial?.maxPrice ?? ""));
  const [type, setType] = useState(initial?.type ?? "all");
  const [vegOnly, setVegOnly] = useState(!!initial?.vegOnly);

  function apply() {
    const payload: any = { type, vegOnly };
    if (minPrice) payload.minPrice = Number(minPrice);
    if (maxPrice) payload.maxPrice = Number(maxPrice);
    onApply(payload);
  }

  const fontSize = {
    title: isMobile ? 18 : 22,
    label: isMobile ? 14 : 16,
    button: isMobile ? 14 : 16,
    input: isMobile ? 14 : 16,
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
        <View style={{ padding: isMobile ? 14 : 18, paddingTop: isMobile ? 20 : 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ color: "#fff", fontSize: fontSize.title, fontWeight: "700" }}>Filters</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: "#fff", fontSize: fontSize.title, fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: isMobile ? 14 : 18 }}>
            <Text style={{ color: "#ddd", marginBottom: 8, fontSize: fontSize.label, fontWeight: "700" }}>Type</Text>
            <View style={{ flexDirection: isMobile ? "column" : "row", gap: 8 }}>
              <Pressable
                onPress={() => setType("all")}
                style={{
                  flex: isMobile ? undefined : 1,
                  padding: isMobile ? 12 : 14,
                  borderRadius: 8,
                  backgroundColor: type === "all" ? "#f5f2e8" : "#111",
                  borderWidth: 1,
                  borderColor: type === "all" ? "#f5f2e8" : "#222",
                  alignItems: "center"
                }}
              >
                <Text style={{
                  color: type === "all" ? "#1c1c1c" : "#fff",
                  fontSize: fontSize.button,
                  fontWeight: "700"
                }}>All</Text>
              </Pressable>
              <Pressable
                onPress={() => setType("tour")}
                style={{
                  flex: isMobile ? undefined : 1,
                  padding: isMobile ? 12 : 14,
                  borderRadius: 8,
                  backgroundColor: type === "tour" ? "#f5f2e8" : "#111",
                  borderWidth: 1,
                  borderColor: type === "tour" ? "#f5f2e8" : "#222",
                  alignItems: "center"
                }}
              >
                <Text style={{
                  color: type === "tour" ? "#1c1c1c" : "#fff",
                  fontSize: fontSize.button,
                  fontWeight: "700"
                }}>Tours</Text>
              </Pressable>
              <Pressable
                onPress={() => setType("hotel")}
                style={{
                  flex: isMobile ? undefined : 1,
                  padding: isMobile ? 12 : 14,
                  borderRadius: 8,
                  backgroundColor: type === "hotel" ? "#f5f2e8" : "#111",
                  borderWidth: 1,
                  borderColor: type === "hotel" ? "#f5f2e8" : "#222",
                  alignItems: "center"
                }}
              >
                <Text style={{
                  color: type === "hotel" ? "#1c1c1c" : "#fff",
                  fontSize: fontSize.button,
                  fontWeight: "700"
                }}>Hotels</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: isMobile ? 14 : 18 }}>
            <Text style={{ color: "#ddd", marginBottom: 8, fontSize: fontSize.label, fontWeight: "700" }}>
              Price Range (₹)
            </Text>
            <View style={{ flexDirection: isMobile ? "column" : "row", gap: 8 }}>
              <TextInput
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="numeric"
                placeholder="Min"
                placeholderTextColor="#666"
                style={{
                  flex: 1,
                  backgroundColor: "#111",
                  color: "#fff",
                  padding: isMobile ? 12 : 14,
                  borderRadius: 8,
                  fontSize: fontSize.input,
                  borderWidth: 1,
                  borderColor: "#222"
                }}
              />
              <TextInput
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
                placeholder="Max"
                placeholderTextColor="#666"
                style={{
                  flex: 1,
                  backgroundColor: "#111",
                  color: "#fff",
                  padding: isMobile ? 12 : 14,
                  borderRadius: 8,
                  fontSize: fontSize.input,
                  borderWidth: 1,
                  borderColor: "#222"
                }}
              />
            </View>
          </View>

          <View style={{
            marginTop: isMobile ? 14 : 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#111",
            padding: isMobile ? 12 : 14,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#222"
          }}>
            <Text style={{ color: "#ddd", fontSize: fontSize.label, fontWeight: "700" }}>Veg only</Text>
            <Switch value={vegOnly} onValueChange={setVegOnly} />
          </View>

          <View style={{ marginTop: isMobile ? 18 : 24, flexDirection: isMobile ? "column" : "row", gap: 12 }}>
            <Pressable
              onPress={apply}
              style={{
                flex: 1,
                backgroundColor: "#f5f2e8",
                padding: isMobile ? 14 : 16,
                borderRadius: 12,
                alignItems: "center"
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: fontSize.button, color: "#1c1c1c" }}>Apply Filters</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: "#222",
                padding: isMobile ? 14 : 16,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#333"
              }}
            >
              <Text style={{ color: "#fff", fontSize: fontSize.button, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
