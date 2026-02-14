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
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 20,
      }}
    >
      <View
        style={{
          backgroundColor: "#111",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#333",
          padding: 20,
          width: "100%",
          maxWidth: isMobile ? "100%" : 480,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 4 }}>
          🔄 Request Refund
        </Text>
        <Text style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>
          Order: {order?.title || order?.id || "—"}
        </Text>

        {result ? (
          <>
            <View
              style={{
                backgroundColor: result.success ? "#16a34a22" : "#ef444422",
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: result.success ? "#4ade80" : "#f87171", fontSize: 14, fontWeight: "600" }}>
                {result.success ? "✅" : "⚠️"} {result.message}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                backgroundColor: "#1a1a1a",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ color: "#ccc", fontSize: 13, marginBottom: 6 }}>Reason for refund *</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Describe why you need a refund..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={4}
              style={{
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
              }}
            />

            <Text style={{ color: "#ccc", fontSize: 13, marginBottom: 6 }}>Refund amount (optional)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="₹ Amount"
              placeholderTextColor="#555"
              keyboardType="numeric"
              style={{
                backgroundColor: "#1a1a1a",
                color: "#fff",
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                borderWidth: 1,
                borderColor: "#333",
                marginBottom: 16,
                ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
              }}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: "#1a1a1a",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#888", fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={submitting || !reason.trim()}
                style={{
                  flex: 1,
                  backgroundColor: reason.trim() ? "#ef4444" : "#333",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Submit Request</Text>
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
    return (
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 5000 }}>
        {content}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}
