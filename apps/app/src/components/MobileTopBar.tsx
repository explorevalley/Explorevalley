import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  useWindowDimensions,
} from "react-native";
import { mobileTopBarColors, mobileTopBarDynamicStyles, mobileTopBarStyles as styles } from "../styles/MobileTopBar.styles";
import { mobileTopBarData as t } from "../staticData/mobileTopBar.staticData";

type MobileTopBarProps = {
  query: string;
  setQuery: (query: string) => void;
  onFilter?: () => void;
  onNotifications?: () => void;
  notificationCount?: number;
  showSearch?: boolean;
};

export default function MobileTopBar({
  query,
  setQuery,
  onFilter,
  onNotifications,
  notificationCount = 0,
  showSearch = true,
}: MobileTopBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  const [searchFocused, setSearchFocused] = useState(false);
  const mountAnim = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(mountAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(searchFocusAnim, {
      toValue: searchFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchFocused]);

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
                outputRange: [-50, 0],
              }),
            },
          ],
          opacity: mountAnim,
        },
      ]}
    >
      {/* Glassmorphism background */}
      <View style={styles.glassBackground} />

      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>{t.brand}</Text>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <Animated.View
            style={[
              styles.searchContainer,
              {
                borderColor: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["rgba(245, 242, 232, 0.15)", "rgba(245, 242, 232, 0.4)"],
                }),
              },
            ]}
          >
            <Text style={styles.searchIcon}>{t.searchIcon}</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={mobileTopBarColors.placeholder}
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>{t.clearIcon}</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {onNotifications && (
            <IconButton
              icon={t.bellIcon}
              onPress={onNotifications}
              badge={notificationCount}
            />
          )}
          {onFilter && (
            <IconButton icon={t.filterIcon} onPress={onFilter} />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// Icon Button Component
function IconButton({
  icon,
  onPress,
  badge,
}: {
  icon: string;
  onPress: () => void;
  badge?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.85,
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
    <Animated.View style={mobileTopBarDynamicStyles.iconPressWrap(scale)}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.iconButton}
      >
        <Text style={styles.iconButtonText}>{icon}</Text>
        {badge && badge > 0 && (
          <View style={styles.iconBadge}>
            <Text style={styles.iconBadgeText}>
              {badge > 9 ? t.badgeOverflow : badge}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

