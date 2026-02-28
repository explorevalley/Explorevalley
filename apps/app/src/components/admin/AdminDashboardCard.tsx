import React from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

type AdminDashboardCardProps = {
  adminUrl: string;
  openLabel: string;
};

export default function AdminDashboardCard({ adminUrl, openLabel }: AdminDashboardCardProps) {
  const handleOpen = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(adminUrl, "_blank", "noopener,noreferrer");
      return;
    }
    Linking.openURL(adminUrl);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Dashboard URL</Text>
      <Text selectable style={styles.url}>
        {adminUrl}
      </Text>
      <Pressable onPress={handleOpen} style={styles.cta}>
        <Text style={styles.ctaText}>{openLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d5deeb",
    padding: 14,
  },
  label: {
    color: "#5f6b81",
    fontSize: 12,
    marginBottom: 6,
  },
  url: {
    color: "#111827",
    fontSize: 13,
    marginBottom: 12,
  },
  cta: {
    borderWidth: 1,
    borderColor: "#f4511e",
    backgroundColor: "#f4511e",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  ctaText: {
    color: "#fff",
    fontWeight: "800",
  },
});
