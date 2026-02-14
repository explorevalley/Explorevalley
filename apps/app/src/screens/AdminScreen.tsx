import React from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { BASE_URL, ADMIN_UI_PATH } from "../lib/api";
import { uiText } from "../lib/ui";

export default function AdminScreen() {
  const adminUrl = `${BASE_URL}${ADMIN_UI_PATH}`;

  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#f3f5f9", padding: 20 }}>
      <View style={{ backgroundColor: "#0f1a2d", borderRadius: 18, borderWidth: 1, borderColor: "#1d3258", padding: 18, marginBottom: 12 }}>
        <Text style={{ color: "#eaf2ff", fontSize: 12, letterSpacing: 1.1, fontWeight: "800" }}>EXPLOREVALLEY ADMIN</Text>
        <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 6 }}>{uiText("admin", "title", "Admin Panel")}</Text>
        <Text style={{ color: "#9db0d6", marginTop: 6 }}>
          {uiText("admin", "subtitle", "Opens in a separate window.")}
        </Text>
      </View>

      <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#d5deeb", padding: 14 }}>
        <Text style={{ color: "#5f6b81", fontSize: 12, marginBottom: 6 }}>Dashboard URL</Text>
        <Text selectable style={{ color: "#111827", fontSize: 13, marginBottom: 12 }}>{adminUrl}</Text>
        <Pressable
          onPress={() => {
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.open(adminUrl, "_blank", "noopener,noreferrer");
              return;
            }
            Linking.openURL(adminUrl);
          }}
          style={{ borderWidth: 1, borderColor: "#f4511e", backgroundColor: "#f4511e", paddingVertical: 11, paddingHorizontal: 16, borderRadius: 999, alignSelf: "flex-start" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>{uiText("admin", "openButton", "Open Admin URL")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
