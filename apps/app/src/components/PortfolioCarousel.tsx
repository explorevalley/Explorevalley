import React, { useEffect, useRef, useState } from "react";
import { View, ImageBackground, FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, Platform, Text, TouchableOpacity, ScrollView, Image, useWindowDimensions, Animated } from "react-native";
import { portfolioCarouselDynamicStyles as ds, portfolioCarouselStyles as styles } from "../styles/PortfolioCarousel.styles";
import { portfolioCarouselData as t } from "../staticData/portfolioCarousel.staticData";


export default function PortfolioCarousel({ items, onViewPhotos, onBook, autoplay = true, autoplayInterval = 4000, showThumbnails = true, showHeroInfo = true }: any) {
  const listRef = useRef<FlatList>(null);
  const thumbRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [heroHeight, setHeroHeight] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [gallerySelectedIndex, setGallerySelectedIndex] = useState(0);
  const [galleryTitle, setGalleryTitle] = useState("");

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const w = windowWidth;
  const thumbItemWidth = (isMobile ? 80 : 110) + 12;

  useEffect(() => {
    if (Platform.OS === "web") {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") scrollTo(index + 1);
        if (e.key === "ArrowLeft") scrollTo(index - 1);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [index]);

  useEffect(() => {
    if (!autoplay || paused || galleryOpen || !items || items.length <= 1) return;
    const t = setInterval(() => {
      scrollTo(index + 1);
    }, autoplayInterval);
    return () => clearInterval(t);
  }, [autoplay, paused, galleryOpen, index, items, autoplayInterval]);

  function scrollTo(i: number) {
    const total = (items || []).length;
    if (!total) return;
    const idx = ((i % total) + total) % total;
    setIndex(idx);
    listRef.current?.scrollToOffset({ offset: w * idx, animated: true });
    thumbRef.current?.scrollToOffset({ offset: thumbItemWidth * idx, animated: true });
  }

  function onMomentum(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / w);
    setIndex(idx);
  }

  if (!items || items.length === 0) {
    return null;
  }

  const fontSize = {
    pill: isMobile ? 12.5 : isTablet ? 17.5 : 22.5,
    pillTag: isMobile ? 11.25 : isTablet ? 12.5 : 15,
    title: isMobile ? 22.5 : isTablet ? 30 : 35,
    desc: isMobile ? 13.5 : isTablet ? 14.5 : 15.5,
    meta: isMobile ? 12.5 : isTablet ? 13.75 : 15,
    highlight: isMobile ? 11.5 : isTablet ? 12.5 : 13.5,
    price: isMobile ? 16.25 : isTablet ? 17.5 : 20,
    count: isMobile ? 12.5 : isTablet ? 13.75 : 15,
    button: isMobile ? 16.25 : isTablet ? 18.75 : 20,
    thumbTitle: isMobile ? 17.5 : isTablet ? 20 : 22.5,
    thumbPrice: isMobile ? 17.5 : isTablet ? 20 : 22.5,
  };

  const heroScrimWidth = isMobile ? "85%" : isTablet ? "45%" : "35%";
  const buttonWidth = isMobile ? 137.5 : 175;
  const thumbW = isMobile ? 80 : 110;
  const thumbH = isMobile ? 56 : 82;
  const edgeButton = isMobile ? 36 : 52;
  const edgeInset = edgeButton + 18;

  return (
    <View style={styles.root}>
      <View
        style={styles.flex1}
        onLayout={(e) => {
          const next = e.nativeEvent.layout.height || 0;
          if (next > 0 && Math.abs(next - heroHeight) > 2) setHeroHeight(next);
        }}
      >
        <FlatList
          ref={listRef}
          data={items}
          horizontal
          pagingEnabled
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(x: any, i: number) => `item_${i}`}
          getItemLayout={(_, i) => ({ length: w, offset: w * i, index: i })}
          onScrollToIndexFailed={({ index: failedIndex }) => {
            listRef.current?.scrollToOffset({ offset: w * failedIndex, animated: true });
          }}
          onMomentumScrollEnd={onMomentum}
          onScrollBeginDrag={() => setPaused(true)}
          onScrollEndDrag={() => setPaused(false)}
          style={styles.flex1}
          renderItem={({ item }: any) => {
            const imageUri = item.images?.[0];
            const duration = item.raw?.duration;
            const highlights = item.raw?.highlights;
            const highlightText = Array.isArray(highlights) ? highlights.join("  ") : highlights;
            const galleryImages = Array.from(new Set([
              ...(item?.images || []),
              ...(item?.raw?.heroImage ? [item.raw.heroImage] : []),
              ...((item?.raw?.images || []) as string[]),
              ...(((item?.raw?.imageMeta || []) as any[]).map((m: any) => m?.url).filter(Boolean))
            ]));
            const isAvailable = item?.raw?.available !== false;
            const dropPct = Math.max(0, Math.min(100, Number(item?.raw?.priceDropPercent || (item?.raw?.priceDropped ? 10 : 0))));
            const isPriceDropped = dropPct > 0;
            const basePrice = Number(item.kind === "hotel" ? item?.raw?.pricePerNight : item?.raw?.price || 0);
            const discountedPrice = isPriceDropped ? Math.round((basePrice * (100 - dropPct)) / 100) : basePrice;
            return (
              <ImageBackground
                source={imageUri ? { uri: imageUri } : undefined}
                style={ds.heroImage(w, heroHeight, windowHeight)}
                resizeMode="cover"
              >
                <View style={styles.heroScrimTop} />
                <View style={[styles.heroScrimBottom, ds.heroScrimBottom(isMobile, heroScrimWidth)]}>
                  {showHeroInfo ? (
                    <View style={styles.rightPanelContent}>
                      <View style={styles.heroTopRow}>
                        <HoverScale style={styles.heroPill}>
                          <Text style={[styles.heroPillText, ds.textSize(fontSize.pill)]}>
                            {isMobile ? t.brand.base : t.brand.select}
                          </Text>
                        </HoverScale>
                        <HoverScale style={styles.heroPillGhost}>
                          <Text style={[styles.heroPillGhostText, ds.textSize(fontSize.pillTag)]}>
                            {item.kind === "hotel" ? t.kinds.hotel : t.kinds.tour}
                          </Text>
                        </HoverScale>
                        <HoverScale style={styles.heroPillPrice}>
                          <Text style={[styles.heroPillPriceText, ds.textSize(fontSize.pillTag)]}>
                            {isPriceDropped ? t.priceFrom(discountedPrice) : item.priceLabel}
                          </Text>
                        </HoverScale>
                        {isPriceDropped ? (
                          <HoverScale style={styles.heroPillDropped}>
                            <Text style={[styles.heroPillDroppedText, ds.textSize(fontSize.pillTag)]}>
                              {t.discountOff(dropPct)}
                            </Text>
                          </HoverScale>
                        ) : null}
                        <HoverScale style={isAvailable ? styles.heroPillAvailable : styles.heroPillUnavailable}>
                          <Text style={[isAvailable ? styles.heroPillAvailableText : styles.heroPillUnavailableText, ds.textSize(fontSize.pillTag)]}>
                            {isAvailable ? t.availability.available : t.availability.unavailable}
                          </Text>
                        </HoverScale>
                      </View>

                      <Text style={[styles.heroTitle, ds.textSize(fontSize.title)]} numberOfLines={2}>{item.title}</Text>
                      {isPriceDropped ? (
                        <Text style={[styles.heroOldPrice, ds.textSize(fontSize.meta)]}>
                          {item.kind === "hotel" ? t.pricePerNight(basePrice) : t.priceFlat(basePrice)}
                        </Text>
                      ) : null}
                      <Text style={[styles.heroDesc, ds.textSize(fontSize.desc)]} numberOfLines={isMobile ? 3 : 2}>
                        {item.description}
                      </Text>

                      {duration ? (
                        <Text style={[styles.heroMetaLine, ds.textSize(fontSize.meta)]}>{t.durationLabel} {duration}</Text>
                      ) : null}
                      {highlightText ? (
                        <Text style={[styles.heroMetaLine, styles.heroHighlightLine, ds.textSize(fontSize.highlight)]} numberOfLines={2}>
                          {t.highlightsLabel} {highlightText}
                        </Text>
                      ) : null}

                      <View style={[styles.heroActionsInline, ds.heroActionsInline(isMobile)]}>
                        <HoverScale onPress={isAvailable ? () => onBook(item) : undefined} style={[styles.bookButton, !isAvailable ? styles.bookButtonDisabled : null, ds.buttonWidth(buttonWidth)]}>
                          <Text style={[styles.bookButtonText, !isAvailable ? styles.bookButtonTextDisabled : null, ds.textSize(fontSize.button)]}>{isAvailable ? t.bookNow : t.availability.unavailable}</Text>
                        </HoverScale>
                        <HoverScale
                          onPress={() => {
                            if (typeof onViewPhotos === "function") onViewPhotos(item);
                            const normalizeImageUrl = (src: string) => {
                              const s = String(src || "").trim();
                              if (!s) return "";
                              if (s.startsWith("http")) return s;
                              if (s.startsWith("/") && typeof window !== "undefined") return `${window.location.origin}${s}`;
                              return s;
                            };
                            const perPlaceImages = Array.from(new Set([
                              ...(item?.images || []),
                              ...(item?.raw?.heroImage ? [item.raw.heroImage] : []),
                              ...((item?.raw?.images || []) as string[]),
                              ...(((item?.raw?.imageMeta || []) as any[]).map((m: any) => m?.url).filter(Boolean))
                            ].map((x: string) => normalizeImageUrl(x)))).filter(Boolean);
                            if (!perPlaceImages.length) return;
                            setGalleryImages(perPlaceImages);
                            setGalleryTitle(String(item?.title || t.galleryTitle));
                            setGallerySelectedIndex(0);
                            setGalleryOpen(true);
                          }}
                          style={[styles.viewButton, ds.buttonWidth(buttonWidth)]}
                        >
                          <Text style={[styles.viewButtonText, ds.textSize(fontSize.button)]}>{t.viewPhotos}</Text>
                        </HoverScale>
                      </View>
                      <View style={styles.storeBadgesRow}>
                        <HoverScale style={styles.storeBadge}>
                          <View style={[styles.storeIconBubble, styles.storeIconApple]}>
                            <Text style={styles.storeIconText}>{t.storeBadges.appleIcon}</Text>
                          </View>
                          <View>
                            <Text style={styles.storeBadgeSubText}>{t.storeBadges.downloadOn}</Text>
                            <Text style={styles.storeBadgeText}>{t.storeBadges.appStore}</Text>
                          </View>
                        </HoverScale>
                        <HoverScale style={styles.storeBadge}>
                          <View style={[styles.storeIconBubble, styles.storeIconPlay]}>
                            <Text style={styles.storeIconText}>{t.storeBadges.playIcon}</Text>
                          </View>
                          <View>
                            <Text style={styles.storeBadgeSubText}>{t.storeBadges.getItOn}</Text>
                            <Text style={styles.storeBadgeText}>{t.storeBadges.playStore}</Text>
                          </View>
                        </HoverScale>
                      </View>

                    </View>
                  ) : null}
                </View>
              </ImageBackground>
            );
          }}
        />
      </View>

      {showThumbnails && !galleryOpen && (
        <View style={[styles.thumbContainer, ds.thumbContainer(isMobile)]} pointerEvents="auto">
          <View style={[styles.thumbEdgeLeft, ds.thumbEdgePosition(thumbH, edgeButton)]}>
            <Pressable
              onPress={() => scrollTo(index - 1)}
              style={({ hovered, pressed }) => [
                styles.thumbEdgeButton,
                ds.thumbEdgeButton(edgeButton, !!hovered, !!pressed),
              ]}
            >
              <Text style={[styles.thumbEdgeArrow, ds.thumbEdgeArrow(isMobile)]}>{t.nav.prevArrow}</Text>
            </Pressable>
            <Text style={styles.thumbEdgeLabel}>{t.nav.previous}</Text>
          </View>
          <View style={[styles.thumbEdgeRight, ds.thumbEdgePosition(thumbH, edgeButton)]}>
            <Pressable
              onPress={() => scrollTo(index + 1)}
              style={({ hovered, pressed }) => [
                styles.thumbEdgeButton,
                ds.thumbEdgeButton(edgeButton, !!hovered, !!pressed),
              ]}
            >
              <Text style={[styles.thumbEdgeArrow, ds.thumbEdgeArrow(isMobile)]}>{t.nav.nextArrow}</Text>
            </Pressable>
            <Text style={styles.thumbEdgeLabel}>{t.nav.next}</Text>
          </View><FlatList
            ref={thumbRef}
            data={items}
            horizontal
            scrollEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(x: any, i: number) => `thumb_${i}`}
            contentContainerStyle={ds.thumbContent(edgeInset)}
            getItemLayout={(_, i) => {
              return { length: thumbW + 12, offset: (thumbW + 12) * i, index: i };
            }}
            onScrollToIndexFailed={({ index: failedIndex }) => {
              thumbRef.current?.scrollToOffset({ offset: thumbItemWidth * failedIndex, animated: true });
            }}
            renderItem={({ item, index: i }: any) => {
              return (
                <TouchableOpacity
                  onPress={() => scrollTo(i)}
                  style={[styles.thumbWrap, i === index ? styles.thumbActive : null]}
                >
                  <ImageBackground
                    source={{ uri: item.images?.[0] }}
                    style={[styles.thumb, ds.thumbSize(thumbW, thumbH)]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            }}
          />
          <View style={[styles.thumbMeta, ds.thumbMeta(edgeInset)]}>
            <Text style={[styles.thumbTitle, ds.textSize(fontSize.thumbTitle)]} numberOfLines={1}>
              {items[index]?.title}
            </Text>
            <Text style={[styles.thumbPrice, ds.textSize(fontSize.thumbPrice)]}>{items[index]?.priceLabel}</Text>
          </View>
        </View>
      )}
      {galleryOpen ? (
        <View style={styles.galleryOverlay}>
          <View style={styles.galleryModal}>
            <Pressable
              onPress={() => setGalleryOpen(false)}
              style={styles.galleryCloseBtn}
            >
              <Text style={styles.galleryCloseText}>{t.close}</Text>
            </Pressable>
            <Text style={styles.galleryModalTitle} numberOfLines={1}>{galleryTitle}</Text>
            <View style={styles.galleryHeroWrap}>
              {galleryImages[gallerySelectedIndex] ? (
                <Image
                  source={{ uri: galleryImages[gallerySelectedIndex] }}
                  style={styles.galleryHeroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.galleryHeroFallback}>
                  <Text style={styles.galleryHeroFallbackText}>{t.noImage}</Text>
                </View>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryThumbRow}
            >
              {galleryImages.map((img: string, i: number) => (
                <Pressable
                  key={`gallery_thumb_${i}`}
                  onPress={() => setGallerySelectedIndex(i)}
                  style={[styles.galleryThumbWrap, i === gallerySelectedIndex ? styles.galleryThumbActive : null]}
                >
                  <Image source={{ uri: img }} style={styles.galleryThumbImage} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function HoverScale({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, friction: 7, tension: 120 }).start();
  const withHoverText = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === Text) {
      const typedChild = child as React.ReactElement<any>;
      return React.cloneElement(typedChild, {
        style: [typedChild.props.style, hovered ? styles.hoverText : null],
      });
    }
    return child;
  });
  return (
    <Animated.View style={ds.hoverScaleWrap(scale)}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => { setHovered(true); to(1.04); }}
        onHoverOut={() => { setHovered(false); to(1); }}
        onPressIn={() => to(0.98)}
        onPressOut={() => to(1)}
        style={[style, hovered ? styles.hoverButton : null]}
      >
        {withHoverText}
      </Pressable>
    </Animated.View>
  );
}
