import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Modal,
} from "react-native";
import { apiPost } from "../lib/api";
import { getAuthMode, getAuthUser } from "../lib/auth";

type Props = {
  visible: boolean;
  onClose: () => void;
  order?: { id: string; type: string; title: string } | null;
  onRequireAuth?: () => void;
};

export default function RateExperienceModal({ visible, onClose, order, onRequireAuth }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!order?.id || rating === 0) return;
    const authMode = getAuthMode();
    if (authMode !== "authenticated") {
      onRequireAuth?.();
      return;
    }

    setSubmitting(true);
    try {
      const user = getAuthUser();
      await apiPost("/api/admin/supabase/upsert", {
        table: "ev_reviews",
        rows: [
          {
            id: `review_${order.id}_${Date.now()}`,
            entity_type: order.type === "booking" ? "booking" : order.type === "cab" ? "cab" : "food_order",
            entity_id: order.id,
            user_id: user?.phone || user?.email || "anonymous",
            user_name: user?.name || "",
            rating,
            comment: comment.trim() || null,
            created_at: new Date().toISOString(),
          },
        ],
      });
      setSubmitted(true);
    } catch (err) {
      // Silently fail — review is non-critical
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setRating(0);
    setComment("");
    setSubmitted(false);
    onClose();
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
          padding: 24,
          width: "100%",
          maxWidth: isMobile ? "100%" : 420,
          alignItems: "center",
        }}
      >
        {submitted ? (
          <>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 6 }}>
              Thank you!
            </Text>
            <Text style={{ color: "#888", fontSize: 14, textAlign: "center", marginBottom: 20 }}>
              Your review helps us improve our service.
            </Text>
            <Pressable
              onPress={reset}
              style={{
                backgroundColor: "#16a34a",
                paddingVertical: 12,
                paddingHorizontal: 28,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Done</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 4 }}>
              Rate your experience
            </Text>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 20, textAlign: "center" }}>
              {order?.title || "How was your order?"}
            </Text>

            {/* Star rating */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Text style={{ fontSize: 36, color: star <= rating ? "#f59e0b" : "#333" }}>
                    {star <= rating ? "★" : "☆"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: "#888", fontSize: 12, marginBottom: 20 }}>
              {rating === 0
                ? "Tap a star to rate"
                : rating <= 2
                ? "We're sorry to hear that"
                : rating <= 3
                ? "Thanks for your feedback"
                : rating <= 4
                ? "Glad you enjoyed it!"
                : "Awesome! 🎉"}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <Pressable
                onPress={reset}
                style={{
                  flex: 1,
                  backgroundColor: "#1a1a1a",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#888", fontWeight: "700" }}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={submitting || rating === 0}
                style={{
                  flex: 1,
                  backgroundColor: rating > 0 ? "#f59e0b" : "#333",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Submit</Text>
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={reset}>
      {content}
    </Modal>
  );
}
