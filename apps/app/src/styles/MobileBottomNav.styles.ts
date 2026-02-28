import { Animated, Platform, StyleSheet } from "react-native";

export const mobileBottomNavStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    paddingTop: 12,
    pointerEvents: "box-none",
  },
  glassBackground: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: Platform.OS === "ios" ? 88 : 76,
    backgroundColor: "rgba(18, 18, 18, 0.85)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(245, 242, 232, 0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
      web: {
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(245, 242, 232, 0.08)",
      },
    }),
  },
  navContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: Platform.OS === "ios" ? 64 : 60,
    paddingHorizontal: 8,
    zIndex: 2,
    pointerEvents: "box-none",
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navButtonContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconContainer: {
    position: "relative",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 24,
    opacity: 0.7,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: "800",
    color: "#f5f2e8",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#121212",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  activeIndicator: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 48 : 40,
    height: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  activeIndicatorInner: {
    width: "50%",
    height: 4,
    backgroundColor: "#f5f2e8",
    borderRadius: 2,
    shadowColor: "#f5f2e8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
});

export const mobileBottomNavDynamicStyles: Record<string, (...args: any[]) => any> = {
  navButtonWrap: (entranceAnim: Animated.Value, scale: Animated.Value) => ({
    flex: 1,
    transform: [
      {
        translateY: entranceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
      { scale },
    ],
    opacity: entranceAnim,
  }),
};
