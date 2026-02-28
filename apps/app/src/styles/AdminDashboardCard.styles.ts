import { StyleSheet } from "react-native";

export const adminDashboardCardStyles = StyleSheet.create({
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
