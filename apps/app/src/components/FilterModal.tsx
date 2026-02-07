import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, Switch } from "react-native";

export default function FilterModal({ visible, onClose, onApply, initial }: any) {
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#0b0b0b", padding: 18 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Filters</Text>
          <Pressable onPress={onClose}><Text style={{ color: "#fff" }}>Close</Text></Pressable>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ color: "#ddd", marginBottom: 6 }}>Type</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => setType("all")} style={{ padding: 10, borderRadius: 8, backgroundColor: type === "all" ? "#222" : "#111" }}><Text style={{ color: "#fff" }}>All</Text></Pressable>
            <Pressable onPress={() => setType("tour")} style={{ padding: 10, borderRadius: 8, backgroundColor: type === "tour" ? "#222" : "#111" }}><Text style={{ color: "#fff" }}>Tours</Text></Pressable>
            <Pressable onPress={() => setType("hotel")} style={{ padding: 10, borderRadius: 8, backgroundColor: type === "hotel" ? "#222" : "#111" }}><Text style={{ color: "#fff" }}>Hotels</Text></Pressable>
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ color: "#ddd", marginBottom: 6 }}>Price Range (₹)</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" placeholder="Min" placeholderTextColor="#666" style={{ flex: 1, backgroundColor: "#111", color: "#fff", padding: 10, borderRadius: 8 }} />
            <TextInput value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" placeholder="Max" placeholderTextColor="#666" style={{ flex: 1, backgroundColor: "#111", color: "#fff", padding: 10, borderRadius: 8 }} />
          </View>
        </View>

        <View style={{ marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "#ddd" }}>Veg only</Text>
          <Switch value={vegOnly} onValueChange={setVegOnly} />
        </View>

        <View style={{ marginTop: 24, flexDirection: "row", gap: 12 }}>
          <Pressable onPress={apply} style={{ backgroundColor: "#fff", padding: 14, borderRadius: 12, flex: 1, alignItems: "center" }}><Text style={{ fontWeight: "700" }}>Apply</Text></Pressable>
          <Pressable onPress={onClose} style={{ backgroundColor: "#222", padding: 14, borderRadius: 12, flex: 1, alignItems: "center" }}><Text style={{ color: "#fff" }}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}
