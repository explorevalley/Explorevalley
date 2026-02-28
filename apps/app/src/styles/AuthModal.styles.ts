import { StyleSheet } from "react-native";

export const authModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#111214",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    padding: 16,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  closeText: { color: "#fff", fontWeight: "700" },
  formWrap: { marginTop: 10, gap: 10 },
  hintText: { color: "#bbb" },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
  },
  primaryBtn: { backgroundColor: "#fff", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  primaryText: { fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#2a2a2a", marginVertical: 2 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#5b5b5b",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#fff", fontWeight: "800" },
  successText: { color: "#9ef1a6", marginTop: 10 },
  errorText: { color: "#ff6b6b", marginTop: 10 },
});

export const authModalDynamicStyles = {
  busyOpacity: (busy: boolean) => ({ opacity: busy ? 0.75 : 1 }),
};

export const authModalColors = {
  placeholder: "#7a7a7a",
} as const;
