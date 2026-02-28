import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Modal,
  StyleSheet,
} from "react-native";
import { apiPost } from "../lib/api";
import { getAuthMode } from "../lib/auth";

type Props = {
  visible: boolean;
  onClose: () => void;
  order?: { id: string; type: string; title: string; amount?: string } | null;
  onRequireAuth?: () => void;
};

export default function RefundRequestModal({ visible, onClose, order, onRequireAuth }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(order?.amount || "");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const submit = async () => {
    if (!order?.id || !reason.trim()) return;
    const authMode = getAuthMode();
    if (authMode !== "authenticated") {
      onRequireAuth?.();
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      await apiPost("/api/refunds/request", {
        orderId: order.id,
        orderType: order.type === "booking" ? "booking" : order.type === "cab" ? "cab" : "food",
        reason: reason.trim(),
        amount: amount ? parseFloat(amount) : undefined,
      });
      setResult({ success: true, message: "Refund request submitted! Our team will review it shortly." });
      setReason("");
      setAmount("");
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Failed to submit refund request" });
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <View style={styles.overlay}>
      <View style={[styles.card, { maxWidth: isMobile ? "100%" : 480 }]}>
        <Text style={styles.title}>🔄 Request Refund</Text>
        <Text style={styles.subtitle}>Order: {order?.title || order?.id || "—"}</Text>

        {result ? (
          <>
            <View style={[styles.resultBox, result.success ? styles.resultSuccess : styles.resultError]}>
              <Text style={[styles.resultText, result.success ? styles.successText : styles.errorText]}>
                {result.success ? "✅" : "⚠️"} {result.message}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>Reason for refund *</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Describe why you need a refund..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={4}
              style={styles.inputArea}
            />

            <Text style={styles.label}>Refund amount (optional)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="₹ Amount"
              placeholderTextColor="#555"
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.buttonRow}>
              <Pressable
                onPress={onClose}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={submitting || !reason.trim()}
                style={[styles.submitButton, reason.trim() ? styles.submitEnabled : styles.submitDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitText}>Submit Request</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    if (!visible) return null;
    return <View style={styles.webOverlay}>{content}</View>;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
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
