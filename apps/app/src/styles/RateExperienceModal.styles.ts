import { StyleSheet } from "react-native";

export const rateExperienceStyles = StyleSheet.create({
  overlayCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 24,
    width: "100%",
    alignItems: "center",
  },
  successEmoji: { fontSize: 48, marginBottom: 12 },
  successTitle: { color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 6 },
  successSubtitle: { color: "#888", fontSize: 14, textAlign: "center", marginBottom: 20 },
  doneBtn: { backgroundColor: "#16a34a", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10 },
  doneBtnText: { color: "#fff", fontWeight: "700" },
  heading: { color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 4 },
  subheading: { color: "#888", fontSize: 12, marginBottom: 20, textAlign: "center" },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  starIcon: { fontSize: 36 },
  ratingHint: { color: "#888", fontSize: 12, marginBottom: 20 },
  actionRow: { flexDirection: "row", gap: 10, width: "100%" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#888", fontWeight: "700" },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  webRoot: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 5000 },
});

export const rateExperienceDynamicStyles = {
  cardWidth: (isMobile: boolean) => ({ maxWidth: isMobile ? "100%" : 420 }),
  starColor: (active: boolean) => ({ color: active ? "#f59e0b" : "#333" }),
  submitBtnBg: (enabled: boolean) => ({ backgroundColor: enabled ? "#f59e0b" : "#333" }),
};

export const rateExperienceColors = {
  spinner: "#fff",
} as const;
