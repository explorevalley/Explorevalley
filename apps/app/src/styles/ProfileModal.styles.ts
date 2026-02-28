import { Platform, StyleSheet } from "react-native";

export const profileModalStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    zIndex: 9999,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d5deeb",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#0f1a2d",
    borderBottomWidth: 1,
    borderBottomColor: "#1d3258",
    padding: 14,
  },
  kicker: {
    color: "#eaf2ff",
    fontSize: 12,
    letterSpacing: 1.1,
    fontWeight: "800",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  subtitle: {
    color: "#9db0d6",
    fontSize: 12,
    marginTop: 4,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  errorWrap: {
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d5deeb",
    backgroundColor: "#f8fafc",
  },
  cancelText: {
    color: "#334155",
    fontWeight: "800",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#f4511e",
    backgroundColor: "#f4511e",
  },
  saveText: {
    color: "#fff",
    fontWeight: "800",
  },
  idText: {
    color: "#7c8698",
    fontSize: 11,
    marginTop: 6,
  },
  fieldLabel: {
    color: "#5f6b81",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d5deeb",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
  },
});

export const profileModalDynamicStyles = {
  overlayPlatform: () => (Platform.OS === "web" ? ({ backdropFilter: "blur(10px)" } as const) : null),
  saveButtonState: (busy: boolean) => ({ opacity: busy ? 0.7 : 1 }),
};

export const profileModalColors = {
  placeholder: "#96a0b2",
} as const;
