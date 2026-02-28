import { Platform, StyleSheet } from "react-native";

export const aiChatStyles = StyleSheet.create({
  overlay: { position: "absolute", bottom: 0, right: 0, left: 0, top: 0, zIndex: 9000 },
  fabWrap: { position: "absolute", right: 16, top: "50%", marginTop: -28 },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
  },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
  card: {
    position: "absolute",
    backgroundColor: "#0c0c0c",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    backgroundColor: "#111",
    gap: 8,
  },
  robotText: { fontSize: 18 },
  flex1: { flex: 1 },
  title: { color: "#fff", fontWeight: "800", fontSize: 14 },
  subtitle: { color: "#666", fontSize: 10 },
  iconBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },
  iconBtnText: { color: "#888", fontSize: 14 },
  closeText: { color: "#888", fontSize: 16 },
  messages: { flex: 1, paddingHorizontal: 10 },
  messagesContent: { paddingVertical: 10, gap: 8 },
  bubble: { maxWidth: "85%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleText: { fontSize: 13, lineHeight: 19 },
  timeText: { fontSize: 9, marginTop: 3 },
  typingWrap: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#222",
    backgroundColor: "#111",
    gap: 6,
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  sendBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sendText: { color: "#fff", fontSize: 16 },
});

export const aiChatDynamicStyles: Record<string, (...args: any[]) => any> = {
  fabPulse: (pulseAnim: any) => ({ transform: [{ scale: pulseAnim }] }),
  fabShadow: () =>
    Platform.OS === "web"
      ? ({ boxShadow: "0 4px 20px rgba(0,0,0,0.4)" } as const)
      : ({ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 } as const),
  cardPlacement: (state: "mini" | "full", isMobile: boolean, winW: number, fullW: number) =>
    state === "full"
      ? ({ top: isMobile ? 0 : 20, left: isMobile ? 0 : (winW - fullW) / 2, right: isMobile ? 0 : undefined, bottom: isMobile ? 0 : 20 } as const)
      : ({ bottom: 18, right: 12 } as const),
  cardSize: (state: "mini" | "full", isMobile: boolean, chatW: number, chatH: number) =>
    state === "full" && isMobile ? ({ width: undefined, height: undefined } as const) : ({ width: chatW, height: chatH } as const),
  cardRadius: (state: "mini" | "full", isMobile: boolean) => ({ borderRadius: state === "full" && isMobile ? 0 : 16 }),
  cardShadow: () =>
    Platform.OS === "web"
      ? ({ boxShadow: "0 8px 40px rgba(0,0,0,0.6)" } as const)
      : ({ shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 } as const),
  bubble: (role: "user" | "assistant" | "system") => ({
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    backgroundColor: role === "user" ? "#16a34a" : role === "system" ? "#2a2a1a" : "#161616",
    borderWidth: role === "assistant" ? 1 : 0,
    borderColor: "#2a2a2a",
  }),
  bubbleText: (role: "user" | "assistant" | "system") => ({
    color: role === "user" ? "#fff" : role === "system" ? "#fbbf24" : "#ddd",
  }),
  timeText: (role: "user" | "assistant" | "system") => ({
    color: role === "user" ? "rgba(255,255,255,0.5)" : "#444",
    textAlign: role === "user" ? "right" : "left",
  }),
  inputPadding: () => ({ paddingVertical: Platform.OS === "web" ? 8 : 6 }),
  inputOutline: () => (Platform.OS === "web" ? ({ outlineStyle: "none" } as const) : null),
  sendBtn: (enabled: boolean) => ({ backgroundColor: enabled ? "#16a34a" : "#2a2a2a" }),
};

export const aiChatColors = {
  placeholder: "#555",
  typingSpinner: "#16a34a",
} as const;
