import { Platform, StyleSheet } from "react-native";

export const refundRequestModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
  },
  webOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5000,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 20,
    width: "100%",
  },
  title: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    color: "#888",
    fontSize: 12,
    marginBottom: 16,
  },
  resultBox: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  resultSuccess: {
    backgroundColor: "#16a34a22",
  },
  resultError: {
    backgroundColor: "#ef444422",
  },
  resultText: {
    fontSize: 14,
    fontWeight: "600",
  },
  successText: {
    color: "#4ade80",
  },
  errorText: {
    color: "#f87171",
  },
  closeButton: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontWeight: "700",
  },
  label: {
    color: "#ccc",
    fontSize: 13,
    marginBottom: 6,
  },
  inputBase: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#333",
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  inputArea: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelText: {
    color: "#888",
    fontWeight: "700",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  submitEnabled: {
    backgroundColor: "#ef4444",
  },
  submitDisabled: {
    backgroundColor: "#333",
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export const refundRequestModalColors = {
  placeholder: "#555",
  spinner: "#fff",
} as const;
