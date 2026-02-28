import { StyleSheet } from "react-native";

export const filterModalStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0b0b" },
  body: { padding: 18, paddingTop: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { color: "#fff", fontWeight: "700" },
  section: { marginTop: 18 },
  label: { color: "#ddd", marginBottom: 8, fontWeight: "700" },
  labelNoMargin: { marginBottom: 0 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  typeBtnText: { fontWeight: "700" },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#111",
    color: "#fff",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  switchRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  actionsRow: { marginTop: 24, flexDirection: "row", gap: 12 },
  applyBtn: { flex: 1, backgroundColor: "#f5f2e8", padding: 16, borderRadius: 12, alignItems: "center" },
  applyBtnText: { fontWeight: "800", color: "#1c1c1c" },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  cancelBtnText: { color: "#fff", fontWeight: "700" },
});

export const filterModalDynamicStyles = {
  body: (isMobile: boolean) => ({
    padding: isMobile ? 14 : 18,
    paddingTop: isMobile ? 20 : 24,
  }),
  text: (isMobile: boolean, kind: "title" | "label" | "button" | "input") => {
    const sizes = {
      title: isMobile ? 18 : 22,
      label: isMobile ? 14 : 16,
      button: isMobile ? 14 : 16,
      input: isMobile ? 14 : 16,
    };
    return { fontSize: sizes[kind] };
  },
  section: (isMobile: boolean) => ({ marginTop: isMobile ? 14 : 18 }),
  rowDirection: (isMobile: boolean) => ({ flexDirection: isMobile ? "column" : "row" as const }),
  typeBtn: (isMobile: boolean, active: boolean) => ({
    flex: isMobile ? undefined : 1,
    padding: isMobile ? 12 : 14,
    backgroundColor: active ? "#f5f2e8" : "#111",
    borderColor: active ? "#f5f2e8" : "#222",
  }),
  typeBtnText: (isMobile: boolean, active: boolean) => ({
    color: active ? "#1c1c1c" : "#fff",
    fontSize: isMobile ? 14 : 16,
  }),
  input: (isMobile: boolean) => ({ padding: isMobile ? 12 : 14, fontSize: isMobile ? 14 : 16 }),
  switchRow: (isMobile: boolean) => ({ marginTop: isMobile ? 14 : 18, padding: isMobile ? 12 : 14 }),
  actionsRow: (isMobile: boolean) => ({ marginTop: isMobile ? 18 : 24, flexDirection: isMobile ? "column" : "row" as const }),
  actionBtn: (isMobile: boolean) => ({ padding: isMobile ? 14 : 16 }),
};

export const filterModalColors = {
  placeholder: "#666",
} as const;
