import React from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { adminDashboardCardStyles as styles } from "../../styles/AdminDashboardCard.styles";
import { adminCardsData as t } from "../../staticData/adminCards.staticData";

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
      <Text style={styles.label}>{t.dashboardLabel}</Text>
      <Text selectable style={styles.url}>
        {adminUrl}
      </Text>
      <Pressable onPress={handleOpen} style={styles.cta}>
        <Text style={styles.ctaText}>{openLabel}</Text>
      </Pressable>
    </View>
  );
}
