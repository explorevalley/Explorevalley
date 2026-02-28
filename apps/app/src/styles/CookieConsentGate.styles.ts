import { StyleSheet } from "react-native";

export const cookieConsentStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
    padding: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "#0f1112",
    padding: 16,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  body: { color: "#c6d1d9", marginTop: 8, lineHeight: 20 },
  linksRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  linkText: { color: "#93c5fd", fontWeight: "700" },
  dot: { color: "#64748b" },
  acceptBtn: {
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.2)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  acceptText: { color: "#dcfce7", fontWeight: "800", fontSize: 14 },
});
