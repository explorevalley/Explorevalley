import React from "react";
import { Text, View } from "react-native";
import { adminHeaderCardStyles as styles } from "../../styles/AdminHeaderCard.styles";
import { adminHeaderCardData as t } from "../../staticData/adminHeaderCard.staticData";

type AdminHeaderCardProps = {
  title: string;
  subtitle: string;
};

export default function AdminHeaderCard({ title, subtitle }: AdminHeaderCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>
        {t.eyebrow}
      </Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
