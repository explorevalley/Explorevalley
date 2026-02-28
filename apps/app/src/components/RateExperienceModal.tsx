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
import {
  rateExperienceColors,
  rateExperienceDynamicStyles,
  rateExperienceStyles as styles,
} from "../styles/RateExperienceModal.styles";
import { rateExperienceModalData as t } from "../staticData/rateExperienceModal.staticData";

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
      await apiPost(t.api.submitReview, {
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
    <View style={styles.overlayCenter}>
      <View style={[styles.modalCard, rateExperienceDynamicStyles.cardWidth(isMobile)]}>
        {submitted ? (
          <>
            <Text style={styles.successEmoji}>{t.successEmoji}</Text>
            <Text style={styles.successTitle}>{t.successTitle}</Text>
            <Text style={styles.successSubtitle}>
              {t.successSubtitle}
            </Text>
            <Pressable onPress={reset} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>{t.doneLabel}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.heading}>{t.heading}</Text>
            <Text style={styles.subheading}>
              {order?.title || t.fallbackSubheading}
            </Text>

            {/* Star rating */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Text style={[styles.starIcon, rateExperienceDynamicStyles.starColor(star <= rating)]}>
                    {star <= rating ? t.starFilled : t.starEmpty}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.ratingHint}>
              {rating === 0
                ? t.ratingHints.none
                : rating <= 2
                ? t.ratingHints.low
                : rating <= 3
                ? t.ratingHints.mid
                : rating <= 4
                ? t.ratingHints.good
                : t.ratingHints.great}
            </Text>

            <View style={styles.actionRow}>
              <Pressable onPress={reset} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>{t.skipLabel}</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={submitting || rating === 0}
                style={[styles.primaryBtn, rateExperienceDynamicStyles.submitBtnBg(rating > 0)]}
              >
                {submitting ? (
                  <ActivityIndicator color={rateExperienceColors.spinner} size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t.submitLabel}</Text>
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
      <View style={styles.webRoot}>
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
