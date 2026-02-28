import React from "react";
import { StyleSheet, Text, View } from "react-native";

type AdminHeaderCardProps = {
  title: string;
  subtitle: string;
};

export default function AdminHeaderCard({ title, subtitle }: AdminHeaderCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>
        EXPLOREVALLEY ADMIN
      </Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f1a2d",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1d3258",
    padding: 18,
    marginBottom: 12,
  },
  eyebrow: {
    color: "#eaf2ff",
    fontSize: 12,
    letterSpacing: 1.1,
    fontWeight: "800",
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    color: "#9db0d6",
    marginTop: 6,
  },
});
