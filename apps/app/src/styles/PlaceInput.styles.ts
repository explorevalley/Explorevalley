import { StyleSheet } from "react-native";

export const placeInputStyles = StyleSheet.create({
  label: { color: "#ddd", marginBottom: 6 },
  inputBase: {
    backgroundColor: "#141414",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  mapBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#f5f2e8",
    backgroundColor: "rgba(245,242,232,0.12)",
  },
  mapBtnHover: { backgroundColor: "#007c00", borderColor: "#007c00" },
  mapBtnText: { fontWeight: "800", fontSize: 18 },
  dropdown: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#0f0f0f",
    overflow: "hidden",
  },
  row: { paddingHorizontal: 12, paddingVertical: 10 },
  rowText: { color: "#fff" },
});

export const placeInputDynamicStyles = {
  inputBorder: (focusBorder: any) => ({ borderColor: focusBorder }),
  mapBtnText: (hovered: boolean) => ({ color: hovered ? "#fff" : "#f5f2e8" }),
  rowBorder: (index: number) => ({ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: "#1c1c1c" }),
};

export const placeInputColors = {
  placeholder: "#666",
  borderDefault: "#222",
  borderActive: "#f5f2e8",
} as const;
