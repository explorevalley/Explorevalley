import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, useWindowDimensions } from "react-native";
import { mobileBottomNavDynamicStyles, mobileBottomNavStyles as styles } from "../styles/MobileBottomNav.styles";
import { mobileBottomNavData as t } from "../staticData/mobileBottomNav.staticData";

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

const DEFAULT_NAV_ITEMS: NavItem[] = t.items as unknown as NavItem[];

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
      style={mobileBottomNavDynamicStyles.navButtonWrap(entranceAnim, scale)}
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
                  {item.badge > 99 ? t.badgeOverflow : item.badge}
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

