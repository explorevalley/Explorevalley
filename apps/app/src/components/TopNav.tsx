import React, { useEffect, useRef } from "react";
import { Animated, View, TextInput, Pressable, Text, Platform, useWindowDimensions } from "react-native";

const PRIMARY_NAV = [
  { key: "travel", label: "Travel", icon: "🗺️" },
  { key: "cabs", label: "Cabs", icon: "🚕" },
  { key: "food", label: "Food", icon: "🍽️" },
  { key: "festivals", label: "Fest", icon: "🎉" },
  { key: "rescue", label: "Info", icon: "ℹ️" },
] as const;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "tour", label: "Tour" },
  { key: "hotel", label: "Hotels" },
  { key: "cottages", label: "Cottages" },
] as const;

export default function TopNav({ query, setQuery, onFilter, typeFilter, onTypeChange, primaryTab, onPrimaryChange, authMode, authUser, onAuthPress, onLogout, onProfilePress }: any) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const navAnim = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(navAnim, { toValue: 1, useNativeDriver: Platform.OS !== "web", friction: 8, tension: 40 }).start();
  }, [navAnim]);

  function onSearchFocus() {
    Animated.timing(searchFocusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  }
  function onSearchBlur() {
    Animated.timing(searchFocusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  const fontSize = {
    logo: isMobile ? 12.5 : isTablet ? 17.5 : 25.3,
    nav: isMobile ? 13.75 : isTablet ? 17.5 : 22.5,
    filter: isMobile ? 13.75 : isTablet ? 16.25 : 19.7,
    search: isMobile ? 16.25 : isTablet ? 17.5 : 22.5,
    sideFilter: isMobile ? 13.75 : isTablet ? 22.5 : 28.125,
  };
  const userLabel = String(authUser?.name || authUser?.email || authUser?.phone || "User");

  // Mobile Layout
  if (isMobile) {
    return (
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Top Bar - Fixed at top */}
        <Animated.View
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            zIndex: 100,
            transform: [{ translateY: navAnim.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }],
            opacity: navAnim,
          }}
          pointerEvents="box-none"
        >
          <View
            pointerEvents="auto"
            style={{
              backgroundColor: "rgba(16, 16, 16, 0.95)",
              borderColor: "rgba(245, 242, 232, 0.1)",
              borderWidth: 1,
              borderRadius: 16,
              padding: 10,
              gap: 8,
              ...Platform.select({
                ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
                android: { elevation: 6 },
                web: { backdropFilter: "blur(20px)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" },
              }),
            }}
          >
            {/* Logo, Search and Filter Row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 7.5,
                  borderRadius: 999,
                  backgroundColor: "#f5f2e8",
                  borderWidth: 1,
                  borderColor: "#e9e3d4",
                }}
              >
                <Text style={{ color: "#1c1c1c", fontWeight: "800", fontSize: fontSize.logo, letterSpacing: 0.5 }}>
                  ExploreValley
                </Text>
              </View>

              <Animated.View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(30, 30, 30, 0.8)",
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: searchFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["rgba(245, 242, 232, 0.15)", "rgba(245, 242, 232, 0.4)"]
                  }),
                  paddingHorizontal: 12.5,
                  paddingVertical: 7.5,
                }}
              >
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onFocus={onSearchFocus}
                  onBlur={onSearchBlur}
                  placeholder="Search..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={{ flex: 1, color: "#fff", paddingVertical: 0, fontSize: fontSize.search - 2, fontWeight: "500" }}
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery("")} style={{ padding: 2.5 }}>
                    <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 17.5, fontWeight: "700" }}>✕</Text>
                  </Pressable>
                )}
              </Animated.View>

              <HoverScale
                onPress={authMode === "authenticated" ? onLogout : onAuthPress}
                style={{
                  paddingHorizontal: 12.5,
                  paddingVertical: 7.5,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(245, 242, 232, 0.2)",
                  backgroundColor: "rgba(245, 242, 232, 0.1)",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: fontSize.filter }}>
                  {authMode === "authenticated" ? "Logout" : "Login"}
                </Text>
              </HoverScale>
            </View>
            {authMode === "authenticated" ? (
              <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                <Pressable
                  onPress={() => onPrimaryChange?.("orders")}
                  style={({ hovered, pressed }) => ({
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: hovered ? "#f5f2e8" : "rgba(245, 242, 232, 0.2)",
                    backgroundColor: hovered ? "#f5f2e8" : "rgba(245, 242, 232, 0.08)",
                    opacity: pressed ? 0.9 : 1
                  })}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>📋</Text>
                </Pressable>
                <Pressable onPress={onProfilePress} style={{ maxWidth: 230 }}>
                  <Text numberOfLines={1} style={{ color: "#9ef1a6", fontSize: 12, fontWeight: "700", textAlign: "right" }}>
                    {userLabel}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Primary Navigation Row */}
            <View style={{
              flexDirection: "row",
              gap: 6,
              justifyContent: "center"
            }}>
              {PRIMARY_NAV.map(f => {
                const active = primaryTab === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => onPrimaryChange?.(f.key)}
                    style={({ hovered }) => [
                      {
                        flex: 1,
                        paddingHorizontal: 12.5,
                        paddingVertical: 7.5,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? "#f5f2e8" : "rgba(245, 242, 232, 0.2)",
                        backgroundColor: active ? "#f5f2e8" : "transparent",
                        alignItems: "center",
                      },
                      hovered ? { backgroundColor: "#007c00", borderColor: "#007c00" } : null
                    ]}
                  >
                    <Text style={{
                      color: active ? "#1c1c1c" : "#fff",
                      fontWeight: "700",
                      fontSize: fontSize.nav
                    }}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {null}
          </View>
        </Animated.View>

        {primaryTab === "travel" ? (
          <Animated.View
            pointerEvents="auto"
            style={{
              position: "absolute",
              left: 8,
              right: 8,
              bottom: 8,
              zIndex: 120,
              transform: [{ translateY: navAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
              opacity: navAnim,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                backgroundColor: "rgba(16, 16, 16, 0.95)",
                borderColor: "rgba(245, 242, 232, 0.15)",
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 8,
              }}
            >
              {FILTERS.map(f => {
                const active = typeFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => onTypeChange?.(f.key)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 8,
                        paddingHorizontal: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? "#f5f2e8" : "rgba(245, 242, 232, 0.25)",
                        backgroundColor: active ? "#f5f2e8" : "transparent",
                      },
                      pressed ? { opacity: 0.9 } : null,
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? "#1c1c1c" : "#fff",
                        fontWeight: "800",
                        fontSize: 15,
                      }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </View>
    );
  }

  // Desktop/Tablet Layout (unchanged)
  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 8,
        gap: 10,
        backgroundColor: "transparent"
      }}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 9.375,
          backgroundColor: "#101010",
          borderColor: "#1f1f1f",
          borderWidth: 1,
          borderRadius: 999,
          paddingHorizontal: 11.25,
          paddingVertical: 7.5,
          shadowColor: "transparent",
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
          position: "relative",
          transform: [{ translateY: navAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          opacity: navAnim,
        }}
        pointerEvents="auto"
      >
        <View
          style={{
            paddingHorizontal: 11.25,
            paddingVertical: 5.625,
            borderRadius: 999,
            backgroundColor: "#f5f2e8",
            borderWidth: 1,
            borderColor: "#e9e3d4",
          }}
        >
          <Text style={{ color: "#1c1c1c", fontWeight: "800", fontSize: fontSize.logo, letterSpacing: 0.3 }}>
            ExploreValley
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 5.625 }}>
          {PRIMARY_NAV.map(f => {
            const active = primaryTab === f.key;
            return (
              <HoverScale
                key={f.key}
                onPress={() => onPrimaryChange?.(f.key)}
                style={{
                  paddingHorizontal: isTablet ? 10 : 11.25,
                  paddingVertical: isTablet ? 7.5 : 7.5,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "#f5f2e8" : "transparent",
                  backgroundColor: active ? "#f5f2e8" : "transparent"
                }}
              >
                <Text style={{ color: active ? "#1c1c1c" : "#fff", fontWeight: "800", fontSize: fontSize.nav }}>
                  {f.label}
                </Text>
              </HoverScale>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        <Animated.View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#121212",
            borderRadius: 999,
            borderWidth: 1,
            borderColor: searchFocusAnim.interpolate({ inputRange: [0, 1], outputRange: ["#242424", "#f5f2e8"] }),
            paddingHorizontal: 15,
            paddingVertical: 7.5,
            minWidth: 187.5,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            placeholder="Search..."
            placeholderTextColor="#999"
            style={{ flex: 1, color: "#fff", paddingVertical: 0, fontSize: fontSize.search }}
          />
        </Animated.View>

        {authMode === "authenticated" ? (
          <Pressable
            onPress={onProfilePress}
            style={{
              paddingHorizontal: 11.25,
              paddingVertical: 7.5,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(158, 241, 166, 0.35)",
              backgroundColor: "rgba(25, 60, 32, 0.4)",
              maxWidth: 230
            }}
          >
            <Text numberOfLines={1} style={{ color: "#9ef1a6", fontWeight: "700", fontSize: 14 }}>
              {userLabel}
            </Text>
          </Pressable>
        ) : null}

        {authMode === "authenticated" ? (
          <HoverScale
            onPress={() => onPrimaryChange?.("orders")}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7.5,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(245, 242, 232, 0.2)",
              backgroundColor: "rgba(245, 242, 232, 0.08)",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: fontSize.filter }}>📋</Text>
          </HoverScale>
        ) : null}

        <HoverScale
          onPress={authMode === "authenticated" ? onLogout : onAuthPress}
          style={{
            paddingHorizontal: 11.25,
            paddingVertical: 7.5,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(245, 242, 232, 0.2)",
            backgroundColor: "transparent",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: fontSize.filter }}>
            {authMode === "authenticated" ? "Logout" : "Login"}
          </Text>
        </HoverScale>
      </Animated.View>

      {/* Side Filters - show on Travel/hero only */}
      {primaryTab === "travel" ? (
        <View
          pointerEvents="box-none"
          style={{
            flexDirection: "column",
            gap: 11.25,
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            top: 390,
            bottom: 0,
            right: 50,
          }}
        >
          {FILTERS.map(f => {
            const active = typeFilter === f.key;
            return (
              <HoverScale
                key={f.key}
                onPress={() => onTypeChange?.(f.key)}
                style={{
                  paddingHorizontal: 11.25,
                  paddingVertical: 7.5,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "#f5f2e8" : "#2a2a2a",
                  backgroundColor: active ? "#f5f2e8" : "rgba(0,0,0,0.25)",
                }}
              >
                <Text style={{ color: active ? "#1c1c1c" : "#fff", fontWeight: "800", fontSize: fontSize.sideFilter }}>
                  {f.label}
                </Text>
              </HoverScale>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function HoverScale({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = React.useState(false);
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, friction: 7, tension: 120 }).start();
  const withHoverText = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === Text) {
      const typedChild = child as React.ReactElement<any>;
      return React.cloneElement(typedChild, {
        style: [typedChild.props.style, hovered ? { color: "#fff" } : null],
      });
    }
    return child;
  });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => { setHovered(true); to(1.04); }}
        onHoverOut={() => { setHovered(false); to(1); }}
        onPressIn={() => to(0.98)}
        onPressOut={() => to(1)}
        style={[style, hovered ? { backgroundColor: "#007c00", borderColor: "#007c00" } : null]}
      >
        {withHoverText}
      </Pressable>
    </Animated.View>
  );
}

