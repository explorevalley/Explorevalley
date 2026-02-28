import { StyleSheet } from "react-native";

export const mapPickerStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0b0b" },
  header: { padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  closeText: { color: "#fff" },
  mapWrap: { flex: 1, borderTopWidth: 1, borderTopColor: "#222" },
  flex1: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  errorText: { color: "#f66", textAlign: "center" },
  helperText: { color: "#888", padding: 12 },
});
