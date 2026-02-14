import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Platform, StyleSheet, useWindowDimensions } from "react-native";

type NavItem = {
  key: string;
  label: string;
  icon: string;
  badge?: number;
};

type MobileBottomNavProps = {
  activeTab: string;
  onTabChange: (key: string) => void;
  items?: NavItem[];
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: "travel", label: "Explore", icon: "🗺️" },
  { key: "cabs", label: "Cabs", icon: "🚕" },
  { key: "food", label: "Food", icon: "🍽️" },
  { key: "profile", label: "Profile", icon: "👤" },
];

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  items = DEFAULT_NAV_ITEMS
}: MobileBottomNavProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  // Mount animation
  const mountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(mountAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, []);

  if (!isMobile) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: mountAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ],
          opacity: mountAnim,
        },
      ]}
    >
      {/* Glassmorphism background with blur effect */}
      <View style={styles.glassBackground} />

      {/* Navigation Items */}
      <View style={styles.navContent}>
        {items.map((item, index) => (
          <NavButton
            key={item.key}
            item={item}
            isActive={activeTab === item.key}
            onPress={() => onTabChange(item.key)}
            index={index}
          />
        ))}
      </View>

      {/* Active Indicator - Floating Pill */}
      <ActiveIndicator items={items} activeTab={activeTab} />
    </Animated.View>
  );
}

// Individual Nav Button Component
function NavButton({
  item,
  isActive,
  onPress,
  index
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(isActive ? 1 : 0.6)).current;

  // Staggered entrance animation
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entranceAnim, {
      toValue: 1,
      delay: index * 50,
      useNativeDriver: true,
      friction: 7,
      tension: 40,
    }).start();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: isActive ? 1.15 : 1,
        useNativeDriver: true,
        friction: 6,
        tension: 80,
      }),
      Animated.timing(labelOpacity, {
        toValue: isActive ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  return (
    <Animated.View
      style={{
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
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.navButton}
      >
        <View style={styles.navButtonContent}>
          {/* Icon with scale animation */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>
              {item.icon}
            </Text>
            {item.badge && item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.badge > 99 ? "99+" : item.badge}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Label */}
          <Animated.Text
            style={[
              styles.label,
              isActive && styles.labelActive,
              { opacity: labelOpacity },
            ]}
          >
            {item.label}
          </Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Active Indicator - Animated Pill that follows active tab
function ActiveIndicator({ items, activeTab }: { items: NavItem[]; activeTab: string }) {
  const activeIndex = items.findIndex(item => item.key === activeTab);
  const translateX = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: activeIndex,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [activeIndex]);

  const itemWidth = 100 / items.length;

  return (
    <Animated.View
      style={[
        styles.activeIndicator,
        {
          width: `${itemWidth}%`,
          transform: [
            {
              translateX: translateX.interpolate({
                inputRange: items.map((_, i) => i),
                outputRange: items.map((_, i) => i * (100 / items.length)),
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.activeIndicatorInner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
