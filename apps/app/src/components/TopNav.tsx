import React, { useEffect, useRef } from "react";
import { Animated, View, Pressable, Text, Platform, useWindowDimensions, Image } from "react-native";
import { FaBell, FaClipboardList, FaUserCog } from "react-icons/fa";
import { topNavColors, topNavDynamicStyles, topNavStyles } from "../styles/TopNav.styles";
import { topNavData as t } from "../staticData/topNav.staticData";

export default function TopNav({ typeFilter, onTypeChange, primaryTab, onPrimaryChange, authMode, authUser, onAuthPress, onLogout, onProfilePress }: any) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const navAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(navAnim, { toValue: 1, useNativeDriver: Platform.OS !== "web", friction: 8, tension: 40 }).start();
  }, [navAnim]);

  const fontSize = {
    logo: isMobile ? 12.5 : isTablet ? 17.5 : 25.3,
    nav: isMobile ? 13.75 : isTablet ? 17.5 : 22.5,
    filter: isMobile ? 13.75 : isTablet ? 16.25 : 19.7,
    sideFilter: isMobile ? 13.75 : isTablet ? 22.5 : 28.125,
  };
  const userLabel = String(authUser?.name || authUser?.email || authUser?.phone || t.userFallback);

  if (isMobile) {
    return (
      <View pointerEvents="box-none" style={topNavStyles.absoluteFill}>
        <Animated.View
          style={[topNavStyles.mobileContainer, topNavDynamicStyles.mobileAnimated(navAnim)]}
          pointerEvents="box-none"
        >
          <View pointerEvents="auto" style={[topNavStyles.mobileCard, topNavDynamicStyles.mobileCardPlatform()]}>
            <View style={topNavStyles.mobileHeaderRow}>
              <View style={topNavStyles.logoWrap}>
                <View style={[topNavStyles.logoCircleMobile, topNavDynamicStyles.mobileLogoCircle(isMobile)]}>
                  <Image source={{ uri: t.logoUrl }} style={topNavStyles.logoSizeMobile} resizeMode="contain" />
                </View>
                <Text style={[topNavStyles.evTextMobile, topNavDynamicStyles.evTextMobilePos(isMobile)]}>{t.evMark}</Text>
              </View>
              <View style={topNavStyles.flex1} />

              {authMode === "authenticated" ? (
                <View style={topNavStyles.mobileIconRow}>
                  <Pressable
                    onPress={() => onPrimaryChange?.(t.ordersTab)}
                    style={({ hovered, pressed }) => topNavDynamicStyles.mobileIconBtn(!!hovered, !!pressed)}
                  >
                    <FaClipboardList size={12} color={topNavColors.icon} />
                  </Pressable>
                  <Pressable
                    onPress={() => onPrimaryChange?.(t.ordersTab)}
                    style={({ hovered, pressed }) => topNavDynamicStyles.mobileIconBtn(!!hovered, !!pressed)}
                  >
                    <FaBell size={12} color={topNavColors.icon} />
                  </Pressable>
                  <Pressable
                    onPress={onProfilePress}
                    style={({ hovered, pressed }) => topNavDynamicStyles.mobileIconBtn(!!hovered, !!pressed)}
                  >
                    <FaUserCog size={12} color={topNavColors.icon} />
                  </Pressable>
                </View>
              ) : null}

              <HoverScale onPress={authMode === "authenticated" ? onLogout : onAuthPress} style={topNavStyles.mobileAuthBtn}>
                <Text style={topNavDynamicStyles.authText(fontSize.filter)}>
                  {authMode === "authenticated" ? t.authLogout : t.authLogin}
                </Text>
              </HoverScale>
            </View>

            <View style={topNavStyles.mobilePrimaryRow}>
              {t.primaryNav.map((f) => {
                const active = primaryTab === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => onPrimaryChange?.(f.key)}
                    style={({ hovered }) => topNavDynamicStyles.mobilePrimaryBtn(active, !!hovered)}
                  >
                    <Text style={topNavDynamicStyles.mobilePrimaryText(active, fontSize.nav)}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {primaryTab === "travel" ? (
          <Animated.View
            pointerEvents="auto"
            style={[topNavStyles.mobileFilterDock, topNavDynamicStyles.mobileFilterAnimated(navAnim)]}
          >
            <View style={topNavStyles.mobileFilterCard}>
              {t.filters.map((f) => {
                const active = typeFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => onTypeChange?.(f.key)}
                    style={({ pressed }) => topNavDynamicStyles.mobileFilterBtn(active, !!pressed)}
                  >
                    <Text style={topNavDynamicStyles.mobileFilterText(active)}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={topNavStyles.desktopOuter}>
      <Animated.View style={[topNavStyles.desktopBar, topNavDynamicStyles.desktopAnimated(navAnim)]} pointerEvents="auto">
        <View style={topNavStyles.logoWrap}>
          <View style={[topNavStyles.logoCircleDesktop, topNavDynamicStyles.desktopLogoCircle(isTablet)]}>
            <Image source={{ uri: t.logoUrl }} style={topNavDynamicStyles.desktopLogoSize(isTablet)} resizeMode="contain" />
          </View>
          <Text style={[topNavStyles.evTextDesktop, topNavDynamicStyles.evTextDesktopPos(isTablet)]}>{t.evMark}</Text>
        </View>

        <View style={topNavStyles.flex1} />

        <View style={topNavStyles.desktopNavRow}>
          {t.primaryNav.map((f) => {
            const active = primaryTab === f.key;
            return (
              <HoverScale key={f.key} onPress={() => onPrimaryChange?.(f.key)} style={topNavDynamicStyles.desktopPrimaryBtn(active, isTablet)}>
                <Text style={topNavDynamicStyles.desktopPrimaryText(active, fontSize.nav)}>{f.label}</Text>
              </HoverScale>
            );
          })}
        </View>

        <View style={topNavStyles.flex1} />

        {authMode === "authenticated" ? (
          <Pressable onPress={onProfilePress} style={topNavStyles.desktopUserBtn}>
            <Text numberOfLines={1} style={topNavStyles.desktopUserText}>{userLabel}</Text>
          </Pressable>
        ) : null}

        {authMode === "authenticated" ? (
          <HoverScale onPress={() => onPrimaryChange?.(t.ordersTab)} style={topNavStyles.desktopIconBtnBase}>
            <FaClipboardList size={14} color={topNavColors.icon} />
          </HoverScale>
        ) : null}

        {authMode === "authenticated" ? (
          <HoverScale onPress={() => onPrimaryChange?.(t.ordersTab)} style={topNavStyles.desktopIconBtnBase}>
            <FaBell size={14} color={topNavColors.icon} />
          </HoverScale>
        ) : null}

        {authMode === "authenticated" ? (
          <HoverScale onPress={onProfilePress} style={topNavStyles.desktopIconBtnBase}>
            <FaUserCog size={14} color={topNavColors.icon} />
          </HoverScale>
        ) : null}

        <HoverScale onPress={authMode === "authenticated" ? onLogout : onAuthPress} style={topNavStyles.desktopAuthBtn}>
          <Text style={topNavDynamicStyles.authText(fontSize.filter)}>
            {authMode === "authenticated" ? t.authLogout : t.authLogin}
          </Text>
        </HoverScale>
      </Animated.View>

      {primaryTab === "travel" ? (
        <View pointerEvents="box-none" style={topNavStyles.desktopFilterDock}>
          <View pointerEvents="auto" style={topNavStyles.desktopFilterCard}>
            {t.filters.map((f) => {
              const active = typeFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => onTypeChange?.(f.key)}
                  style={({ pressed }) => topNavDynamicStyles.desktopFilterBtn(active, !!pressed)}
                >
                  <Text style={topNavDynamicStyles.desktopFilterText(active, fontSize.filter)}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
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
        style: [typedChild.props.style, topNavDynamicStyles.hoverText(hovered)],
      });
    }
    return child;
  });
  return (
    <Animated.View style={topNavDynamicStyles.hoverScaleWrap(scale)}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => { setHovered(true); to(1.04); }}
        onHoverOut={() => { setHovered(false); to(1); }}
        onPressIn={() => to(0.98)}
        onPressOut={() => to(1)}
        style={topNavDynamicStyles.hoverScalePressable(style, hovered)}
      >
        {withHoverText}
      </Pressable>
    </Animated.View>
  );
}
