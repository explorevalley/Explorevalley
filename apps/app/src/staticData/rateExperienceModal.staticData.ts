export const rateExperienceModalData = {
  successEmoji: "\ud83c\udf89",
  successTitle: "Thank you!",
  successSubtitle: "Your review helps us improve our service.",
  doneLabel: "Done",
  heading: "Rate your experience",
  fallbackSubheading: "How was your order?",
  starFilled: "\u2605",
  starEmpty: "\u2606",
  ratingHints: {
    none: "Tap a star to rate",
    low: "We're sorry to hear that",
    mid: "Thanks for your feedback",
    good: "Glad you enjoyed it!",
    great: "Awesome! \ud83c\udf89",
  },
  skipLabel: "Skip",
  submitLabel: "Submit",
  api: {
    submitReview: "/api/admin/supabase/upsert",
  },
};
