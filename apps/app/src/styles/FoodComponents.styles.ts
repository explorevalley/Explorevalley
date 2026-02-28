import { StyleSheet } from "react-native";

export const vendorCardStyles = StyleSheet.create({
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  starFull: { color: "#f59e0b" },
  starEmpty: { color: "#c6cfde" },
  card: { borderRadius: 12, overflow: "hidden", borderWidth: 1, backgroundColor: "#fff" },
  heroOverlay: { flex: 1, backgroundColor: "rgba(12, 20, 34, 0.42)", justifyContent: "space-between" },
  badgeWrap: { alignSelf: "flex-start" },
  vegBadge: { backgroundColor: "#d7f6de", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  vegBadgeText: { color: "#165122", fontWeight: "700" },
  timeBadge: { backgroundColor: "rgba(255, 255, 255, 0.92)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" },
  timeBadgeText: { color: "#111827", fontWeight: "700" },
  sectionGap: { gap: 4 },
  body: { gap: 10 },
  title: { color: "#111827", fontWeight: "700", marginBottom: 4 },
  description: { color: "#6b7280" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingText: { color: "#5f6b81", fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cuisineChip: { backgroundColor: "#f7f9fc", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#d8e1ee" },
  cuisineText: { color: "#445066" },
  tagChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  infoWrap: { borderTopWidth: 1, borderTopColor: "#edf1f7" },
  infoText: { color: "#6b7280" },
  infoSubText: { color: "#7c8698", marginTop: 4 },
});

export const vendorCardDynamicStyles = {
  starTextSize: (isMobile: boolean) => ({ fontSize: isMobile ? 14 : 16 }),
  cardState: (hovered: boolean, pressed: boolean) => ({
    borderColor: hovered ? "#f4511e" : "#d5deeb",
    shadowColor: hovered ? "#f4511e" : "#1d2c49",
    shadowOpacity: hovered ? 0.2 : 0.08,
    shadowRadius: hovered ? 14 : 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: hovered ? 5 : 2,
    transform: [{ scale: pressed ? 0.98 : hovered ? 1.01 : 1 }],
  }),
  heroHeight: (isMobile: boolean, isTablet: boolean) => ({ width: "100%", height: isMobile ? 140 : isTablet ? 160 : 180 }),
  heroOverlayPadding: (isMobile: boolean) => ({ padding: isMobile ? 10 : 12 }),
  textSize: (isMobile: boolean, mobile: number, desktop: number) => ({ fontSize: isMobile ? mobile : desktop }),
  descText: (isMobile: boolean) => ({ fontSize: isMobile ? 12 : 13, lineHeight: isMobile ? 16 : 18 }),
  bodyPadding: (isMobile: boolean) => ({ padding: isMobile ? 12 : 14, gap: isMobile ? 8 : 10 }),
  tagChip: (tag: string) => ({ backgroundColor: tag.toLowerCase().includes("veg") ? "#d7f6de" : "#fff1e8" }),
  tagText: (tag: string, isMobile: boolean) => ({
    color: tag.toLowerCase().includes("veg") ? "#165122" : "#9a3412",
    fontSize: isMobile ? 10 : 11,
    fontWeight: "700",
  }),
  infoWrap: (isMobile: boolean) => ({ paddingTop: isMobile ? 8 : 10 }),
};

export const menuItemCardStyles = StyleSheet.create({
  card: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#d5deeb" },
  imageWrap: { borderRadius: 8, overflow: "hidden", backgroundColor: "#eef2f7", position: "relative" },
  absoluteFillCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  imageFull: { width: "100%", height: "100%" },
  fallbackImage: { flex: 1, alignItems: "center", justifyContent: "center" },
  vegBadgeOuter: { position: "absolute", top: 4, left: 4, borderRadius: 2, borderWidth: 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, justifyContent: "space-between" },
  sectionGap: { gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { color: "#111827", fontWeight: "700", flex: 1 },
  description: { color: "#6b7280" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: "#f7f9fc", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: "#d8e1ee" },
  addonChip: { backgroundColor: "#f8fafd", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: "#e2e8f2" },
  variantText: { color: "#4b5565" },
  addonText: { color: "#6b7280" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  priceText: { color: "#f4511e", fontWeight: "800" },
  stockText: { color: "#7b8798" },
  tagText: { fontWeight: "600" },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  outBadge: { backgroundColor: "#fff1f1", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#ffd0d0" },
  outBadgeText: { color: "#ff6b6b", fontWeight: "700" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255, 255, 255, 0.65)", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  overlayText: { color: "#ff6b6b", fontWeight: "700" },
});

export const menuItemCardDynamicStyles = {
  card: (isMobile: boolean, outOfStock: boolean) => ({ padding: isMobile ? 10 : 12, gap: isMobile ? 10 : 12, opacity: outOfStock ? 0.65 : 1 }),
  imageSize: (size: number) => ({ width: size, height: size }),
  tinyText: (isMobile: boolean) => ({ fontSize: isMobile ? 10 : 11 }),
  vegBadgeOuter: (isMobile: boolean, isVeg: boolean) => ({ width: isMobile ? 16 : 18, height: isMobile ? 16 : 18, borderColor: isVeg ? "#4caf50" : "#f44336" }),
  vegBadgeInner: (isMobile: boolean, isVeg: boolean) => ({
    width: isMobile ? 6 : 7,
    height: isMobile ? 6 : 7,
    borderRadius: isMobile ? 3 : 3.5,
    backgroundColor: isVeg ? "#4caf50" : "#f44336",
  }),
  titleSize: (isMobile: boolean) => ({ fontSize: isMobile ? 14 : 16 }),
  descriptionSize: (isMobile: boolean) => ({ fontSize: isMobile ? 12 : 13, lineHeight: isMobile ? 16 : 18 }),
  priceSize: (isMobile: boolean) => ({ fontSize: isMobile ? 16 : 18 }),
  stockSize: (isMobile: boolean) => ({ fontSize: isMobile ? 11 : 12 }),
  footerMargin: (isMobile: boolean) => ({ marginTop: isMobile ? 8 : 10 }),
  outTextSize: (isMobile: boolean) => ({ fontSize: isMobile ? 12 : 13 }),
  overlayTextSize: (isMobile: boolean) => ({ fontSize: isMobile ? 14 : 16 }),
  tagText: (tag: string, isMobile: boolean) => ({
    color: tag.toLowerCase().includes("bestseller") ? "#9a3412" : "#4b5565",
    fontSize: isMobile ? 10 : 11,
    fontWeight: tag.toLowerCase().includes("bestseller") ? "700" : "600",
  }),
};

export const deliveryFormStyles = StyleSheet.create({
  formRoot: { gap: 18 },
  sectionTitle: { color: "#111827", fontWeight: "800" },
  fieldsWrap: { gap: 14 },
  fieldLabel: { color: "#5f6b81", marginBottom: 6, fontWeight: "600" },
  fieldInput: {
    backgroundColor: "#fff",
    color: "#111827",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d5deeb",
  },
  card: { backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1, borderColor: "#d5deeb" },
  cardTitle: { color: "#111827", fontWeight: "700" },
  gap8: { gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  labelText: { color: "#5f6b81" },
  valueText: { color: "#111827", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#e9edf5", marginVertical: 4 },
  totalLabel: { color: "#111827", fontWeight: "800" },
  totalValue: { color: "#f4511e", fontWeight: "800" },
  warningCard: { backgroundColor: "#fff5f5", borderRadius: 8, borderWidth: 1, borderColor: "#ff6b6b" },
  warningText: { color: "#ff6b6b", textAlign: "center" },
  offerTitle: { color: "#111827", fontWeight: "700" },
  offerText: { color: "#5f6b81" },
  policyText: { color: "#7c8698" },
  submitBtn: { borderRadius: 14, alignItems: "center" },
  submitRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitText: { fontWeight: "800" },
});

export const deliveryFormDynamicStyles = {
  formGap: (isMobile: boolean) => ({ gap: isMobile ? 16 : 18 }),
  sectionTitle: (isMobile: boolean) => ({ fontSize: isMobile ? 18 : 22, marginBottom: isMobile ? 12 : 16 }),
  fieldsGap: (isMobile: boolean) => ({ gap: isMobile ? 12 : 14 }),
  fieldLabel: (isMobile: boolean) => ({ fontSize: isMobile ? 12 : 14 }),
  fieldInput: (isMobile: boolean) => ({ paddingVertical: isMobile ? 10 : 12, fontSize: isMobile ? 14 : 16 }),
  card: (isMobile: boolean) => ({ padding: isMobile ? 14 : 16, gap: isMobile ? 10 : 12 }),
  textSize: (isMobile: boolean, mobile: number, desktop: number) => ({ fontSize: isMobile ? mobile : desktop }),
  warningCard: (isMobile: boolean) => ({ padding: isMobile ? 10 : 12 }),
  warningText: (isMobile: boolean) => ({ fontSize: isMobile ? 12 : 13 }),
  errorCard: (isMobile: boolean) => ({ padding: isMobile ? 12 : 14 }),
  errorText: (isMobile: boolean) => ({ fontSize: isMobile ? 13 : 14 }),
  submitBtn: (isMobile: boolean, busy: boolean, belowMinimum: boolean, hovered: boolean, pressed: boolean) => ({
    backgroundColor: busy || belowMinimum ? "#c9d1de" : hovered ? "#d73f11" : "#f4511e",
    paddingVertical: isMobile ? 14 : 16,
    opacity: busy || belowMinimum ? 0.6 : 1,
    transform: [{ scale: pressed ? 0.98 : 1 }],
  }),
  submitText: (isMobile: boolean, disabled: boolean) => ({ color: disabled ? "#eef2f7" : "#fff", fontSize: isMobile ? 16 : 18 }),
};

export const cartSummaryStyles = StyleSheet.create({
  dock: { position: "absolute", zIndex: 1000 },
  button: {
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#f4511e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 8,
  },
  countBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, alignItems: "center" },
  countText: { color: "#fff", fontWeight: "800" },
  flex1: { flex: 1 },
  labelText: { color: "#fff", fontWeight: "800" },
  totalText: { color: "#fff", fontWeight: "800" },
});

export const cartSummaryDynamicStyles = {
  dock: (isMobile: boolean) => ({ bottom: isMobile ? 20 : 30, left: isMobile ? 14 : "auto", right: isMobile ? 14 : 30 }),
  button: (isMobile: boolean, hovered: boolean, pressed: boolean) => ({
    backgroundColor: hovered ? "#d73f11" : "#f4511e",
    paddingVertical: isMobile ? 14 : 16,
    paddingHorizontal: isMobile ? 18 : 24,
    gap: isMobile ? 12 : 16,
    transform: [{ scale: pressed ? 0.98 : 1 }],
  }),
  countBadge: (isMobile: boolean) => ({ paddingHorizontal: isMobile ? 10 : 12, paddingVertical: isMobile ? 4 : 6, minWidth: isMobile ? 32 : 36 }),
  countText: (isMobile: boolean) => ({ fontSize: isMobile ? 14 : 16 }),
  labelText: (isMobile: boolean) => ({ fontSize: isMobile ? 14 : 16 }),
  totalText: (isMobile: boolean) => ({ fontSize: isMobile ? 16 : 18 }),
};

export const quantitySelectorStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  btn: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnText: { fontWeight: "700" },
  countText: { color: "#111827", fontWeight: "700", textAlign: "center" },
});

export const quantitySelectorDynamicStyles = {
  rowGap: (isMobile: boolean) => ({ gap: isMobile ? 8 : 12 }),
  button: (size: number, disabled: boolean, pressed: boolean, hovered: boolean) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: disabled ? "#f1f4f9" : pressed ? "#d73f11" : hovered ? "#f4511e" : "#f4511e",
    borderColor: disabled ? "#d8e1ee" : "#f4511e",
  }),
  buttonText: (isMobile: boolean, disabled: boolean) => ({
    color: disabled ? "#96a0b2" : "#fff",
    fontSize: isMobile ? 18 : 20,
    lineHeight: isMobile ? 18 : 20,
  }),
  countText: (isMobile: boolean) => ({ fontSize: isMobile ? 16 : 18, minWidth: isMobile ? 24 : 28 }),
};

export const foodComponentsColors = {
  placeholder: "#96a0b2",
  spinner: "#fff",
  imageSpinner: "#7b8798",
} as const;
