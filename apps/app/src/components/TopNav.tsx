import React from "react";
import { View, TextInput, Pressable, Text, Platform } from "react-native";

export default function TopNav({ query, setQuery, onFilter }: any) {
  return (
    <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "transparent" }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search tours, hotels..."
        placeholderTextColor="#999"
        style={{ flex: 1, backgroundColor: "#111", color: "#fff", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#222" }}
      />

      <Pressable onPress={onFilter} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#222" }}>
        <Text style={{ color: "#fff" }}>Filters</Text>
      </Pressable>

      {Platform.OS === "web" ? (
        <Text style={{ color: "#aaa", marginLeft: 8 }}>← → keys</Text>
      ) : null}
    </View>
  );
}
