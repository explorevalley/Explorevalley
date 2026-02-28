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
import { refundRequestModalColors, refundRequestModalStyles as styles } from "../styles/RefundRequestModal.styles";
import { refundRequestModalData as t } from "../staticData/refundRequestModal.staticData";

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
      await apiPost(t.api.requestRefund, {
        orderId: order.id,
        orderType: order.type === "booking" ? "booking" : order.type === "cab" ? "cab" : "food",
        reason: reason.trim(),
        amount: amount ? parseFloat(amount) : undefined,
      });
      setResult({ success: true, message: t.successMessage });
      setReason("");
      setAmount("");
    } catch (err: any) {
      setResult({ success: false, message: err.message || t.fallbackError });
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <View style={styles.overlay}>
      <View style={[styles.card, { maxWidth: isMobile ? "100%" : 480 }]}>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.orderPrefix} {order?.title || order?.id || t.fallbackOrder}</Text>

        {result ? (
          <>
            <View style={[styles.resultBox, result.success ? styles.resultSuccess : styles.resultError]}>
              <Text style={[styles.resultText, result.success ? styles.successText : styles.errorText]}>
                {result.success ? t.successPrefix : t.errorPrefix} {result.message}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>{t.close}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>{t.reasonLabel}</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t.reasonPlaceholder}
              placeholderTextColor={refundRequestModalColors.placeholder}
              multiline
              numberOfLines={4}
              style={styles.inputArea}
            />

            <Text style={styles.label}>{t.amountLabel}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={t.amountPlaceholder}
              placeholderTextColor={refundRequestModalColors.placeholder}
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.buttonRow}>
              <Pressable
                onPress={onClose}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={submitting || !reason.trim()}
                style={[styles.submitButton, reason.trim() ? styles.submitEnabled : styles.submitDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator color={refundRequestModalColors.spinner} size="small" />
                ) : (
                  <Text style={styles.submitText}>{t.submit}</Text>
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
