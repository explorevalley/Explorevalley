import { StyleSheet } from "react-native";

export const rescueStyles = StyleSheet.create({
  content: { backgroundColor: "transparent" },
  hero: {
    borderRadius: 18,
    backgroundColor: "rgba(10, 10, 10, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 18,
  },
  heroTitle: { color: "#fff", fontWeight: "800" },
  heroBody: { color: "#bdbdbd", marginTop: 8, lineHeight: 22 },
  section: { marginBottom: 18 },
  sectionTitle: { color: "#e6ffe8", fontSize: 18, fontWeight: "700", marginBottom: 10 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: "rgba(12, 12, 12, 0.9)", borderWidth: 1 },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cardText: { color: "#cfd8dc", marginTop: 6 },
  cardMuted: { color: "#9aa5b1", marginTop: 6 },
  mt10: { marginTop: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  labelGreen: { color: "#b9f6ca", fontSize: 12 },
  labelBlue: { color: "#bae6fd", fontSize: 12 },
  value: { color: "#fff", fontSize: 16, fontWeight: "700" },
  callBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  callText: { fontWeight: "700" },
  tipsCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(10, 10, 10, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  tipsTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  tipsBody: { color: "#bdbdbd", marginTop: 8, lineHeight: 20 },
});

export const rescueDynamicStyles = {
  contentPad: (isMobile: boolean) => ({
    paddingTop: 110,
    paddingHorizontal: isMobile ? 16 : 32,
    paddingBottom: 40,
    minHeight: "100%",
  }),
  heroPad: (isMobile: boolean) => ({ padding: isMobile ? 18 : 24 }),
  heroTitleSize: (isMobile: boolean) => ({ fontSize: isMobile ? 22 : 28 }),
  heroBodySize: (isMobile: boolean) => ({ fontSize: isMobile ? 14 : 16 }),
  teamCardBorder: { borderColor: "rgba(46, 204, 113, 0.25)" },
  ambulanceCardBorder: { borderColor: "rgba(56, 189, 248, 0.25)" },
  callButton: (can: boolean, tone: "green" | "blue") => ({
    borderColor: can ? (tone === "green" ? "#22c55e" : "#38bdf8") : "rgba(255,255,255,0.2)",
    backgroundColor: can ? (tone === "green" ? "rgba(34, 197, 94, 0.2)" : "rgba(56, 189, 248, 0.2)") : "transparent",
  }),
  callText: (can: boolean, tone: "green" | "blue") => ({
    color: can ? (tone === "green" ? "#dcfce7" : "#e0f2fe") : "#9aa5b1",
  }),
};
