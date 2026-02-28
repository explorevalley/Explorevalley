import { Animated, Platform, StyleSheet } from "react-native";

export const mobileTopBarStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 12,
    paddingBottom: 12,
  },
  glassBackground: {
    position: "absolute",
    top: Platform.OS === "ios" ? 40 : 8,
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: "rgba(18, 18, 18, 0.85)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245, 242, 232, 0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(245, 242, 232, 0.08)",
      },
    }),
  },
  content: {
    flexDirection: "column",
    gap: 12,
    zIndex: 2,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f5f2e8",
    borderWidth: 1,
    borderColor: "#e9e3d4",
  },
  logoText: {
    color: "#1c1c1c",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 30, 30, 0.6)",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
  clearButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
  },
  clearButtonText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "700",
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 30, 30, 0.6)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 242, 232, 0.1)",
    position: "relative",
  },
  iconButtonText: {
    fontSize: 18,
  },
  iconBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#121212",
  },
  iconBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
  },
});

export const mobileTopBarDynamicStyles: Record<string, (...args: any[]) => any> = {
  iconPressWrap: (scale: Animated.Value) => ({ transform: [{ scale }] }),
};

export const mobileTopBarColors = {
  placeholder: "rgba(255, 255, 255, 0.4)",
} as const;
