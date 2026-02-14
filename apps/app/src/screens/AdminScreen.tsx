import React from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { BASE_URL, ADMIN_UI_PATH } from "../lib/api";
import { uiText } from "../lib/ui";

export default function AdminScreen() {
  const adminUrl = `${BASE_URL}${ADMIN_UI_PATH}`;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", padding: 20 }}>
      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 8 }}>{uiText("admin", "title", "Admin Panel")}</Text>
      <Text style={{ color: "#bdbdbd", textAlign: "center", marginBottom: 14 }}>
        {uiText("admin", "subtitle", "Opens in a separate window.")}
      </Text>
      <Pressable
        onPress={() => {
          if (Platform.OS === "web" && typeof window !== "undefined") {
            window.open(adminUrl, "_blank", "noopener,noreferrer");
            return;
          }
          Linking.openURL(adminUrl);
        }}
        style={{ borderWidth: 1, borderColor: "#22c55e", backgroundColor: "#14532d", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>{uiText("admin", "openButton", "Open Admin URL")}</Text>
      </Pressable>
    </View>
  );
}
