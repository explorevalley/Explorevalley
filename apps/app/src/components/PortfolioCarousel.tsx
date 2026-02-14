import React, { useEffect, useRef, useState } from "react";
import { View, ImageBackground, FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, Platform, Text, TouchableOpacity, StyleSheet, ScrollView, Image, useWindowDimensions, Animated } from "react-native";

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
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <View
        style={{ flex: 1 }}
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
          style={{ flex: 1 }}
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
                style={{ width: w, height: heroHeight || windowHeight, backgroundColor: "#111" }}
                resizeMode="cover"
              >
                <View style={styles.heroScrimTop} />
                <View style={[styles.heroScrimBottom, {
                  width: heroScrimWidth,
                  bottom: isMobile ? 0 : 0,
                  top: isMobile ? 0 : 80,
                  paddingTop: isMobile ? 12 : 24,
                  paddingHorizontal: isMobile ? 10 : 16,
                  paddingBottom: isMobile ? 12 : 16,
                  backgroundColor: isMobile ? "rgba(0, 0, 0, .65)" : "rgba(0, 0, 0, 0.87)",
                  justifyContent: isMobile ? "flex-end" : "center",
                }]}>
                  {showHeroInfo ? (
                    <View style={styles.rightPanelContent}>
                      <View style={styles.heroTopRow}>
                        <HoverScale style={styles.heroPill}>
                          <Text style={[styles.heroPillText, { fontSize: fontSize.pill }]}>
                            {isMobile ? "ExploreValley" : "ExploreValley Select"}
                          </Text>
                        </HoverScale>
                        <HoverScale style={styles.heroPillGhost}>
                          <Text style={[styles.heroPillGhostText, { fontSize: fontSize.pillTag }]}>
                            {item.kind === "hotel" ? "Hotel" : "Tour"}
                          </Text>
                        </HoverScale>
                        <HoverScale style={styles.heroPillPrice}>
                          <Text style={[styles.heroPillPriceText, { fontSize: fontSize.pillTag }]}>
                            {isPriceDropped ? `From INR ${discountedPrice}` : item.priceLabel}
                          </Text>
                        </HoverScale>
                        {isPriceDropped ? (
                          <HoverScale style={styles.heroPillDropped}>
                            <Text style={[styles.heroPillDroppedText, { fontSize: fontSize.pillTag }]}>
                              {dropPct}% OFF
                            </Text>
                          </HoverScale>
                        ) : null}
                        <HoverScale style={isAvailable ? styles.heroPillAvailable : styles.heroPillUnavailable}>
                          <Text style={[isAvailable ? styles.heroPillAvailableText : styles.heroPillUnavailableText, { fontSize: fontSize.pillTag }]}>
                            {isAvailable ? "Available" : "Unavailable"}
                          </Text>
                        </HoverScale>
                      </View>

                      <Text style={[styles.heroTitle, { fontSize: fontSize.title }]} numberOfLines={2}>{item.title}</Text>
                      {isPriceDropped ? (
                        <Text style={[styles.heroOldPrice, { fontSize: fontSize.meta }]}>
                          {item.kind === "hotel" ? `INR ${basePrice}/night` : `INR ${basePrice}`}
                        </Text>
                      ) : null}
                      <Text style={[styles.heroDesc, { fontSize: fontSize.desc }]} numberOfLines={isMobile ? 3 : 2}>
                        {item.description}
                      </Text>

                      {duration ? (
                        <Text style={[styles.heroMetaLine, { fontSize: fontSize.meta }]}>Duration: {duration}</Text>
                      ) : null}
                      {highlightText ? (
                        <Text style={[styles.heroMetaLine, styles.heroHighlightLine, { fontSize: fontSize.highlight }]} numberOfLines={2}>
                          Highlights: {highlightText}
                        </Text>
                      ) : null}

                      <View style={[styles.heroActionsInline, { flexDirection: isMobile ? "column" : "row", marginTop: 10 }]}>
                        <HoverScale onPress={isAvailable ? () => onBook(item) : undefined} style={[styles.bookButton, !isAvailable ? styles.bookButtonDisabled : null, { width: buttonWidth }]}>
                          <Text style={[styles.bookButtonText, !isAvailable ? styles.bookButtonTextDisabled : null, { fontSize: fontSize.button }]}>{isAvailable ? "Book Now" : "Unavailable"}</Text>
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
                            setGalleryTitle(String(item?.title || "Gallery"));
                            setGallerySelectedIndex(0);
                            setGalleryOpen(true);
                          }}
                          style={[styles.viewButton, { width: buttonWidth }]}
                        >
                          <Text style={[styles.viewButtonText, { fontSize: fontSize.button }]}>View Photos</Text>
                        </HoverScale>
                      </View>
                      <View style={styles.storeBadgesRow}>
                        <HoverScale style={styles.storeBadge}>
                          <View style={[styles.storeIconBubble, styles.storeIconApple]}>
                            <Text style={styles.storeIconText}>A</Text>
                          </View>
                          <View>
                            <Text style={styles.storeBadgeSubText}>Download on the</Text>
                            <Text style={styles.storeBadgeText}>App Store</Text>
                          </View>
                        </HoverScale>
                        <HoverScale style={styles.storeBadge}>
                          <View style={[styles.storeIconBubble, styles.storeIconPlay]}>
                            <Text style={styles.storeIconText}>P</Text>
                          </View>
                          <View>
                            <Text style={styles.storeBadgeSubText}>Get it on</Text>
                            <Text style={styles.storeBadgeText}>Play Store</Text>
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
        <View style={[styles.thumbContainer, {
          height: isMobile ? 100 : 150,
          marginBottom: isMobile ? 90 : 0  // Space for mobile bottom nav (reduced since filters moved to top)
        }]} pointerEvents="auto">
          <View style={[styles.thumbEdgeLeft, { top: 8 + (thumbH / 2), marginTop: -(edgeButton / 2) }]}>
            <Pressable
              onPress={() => scrollTo(index - 1)}
              style={({ hovered, pressed }) => [
                styles.thumbEdgeButton,
                {
                  width: edgeButton,
                  height: edgeButton,
                  borderRadius: edgeButton / 2,
                },
                hovered ? { backgroundColor: "#007c00", borderColor: "#007c00" } : null,
                pressed ? { opacity: 0.92 } : null,
              ]}
            >
              <Text style={[styles.thumbEdgeArrow, { fontSize: isMobile ? 20 : 28 }]}>‹</Text>
            </Pressable>
            <Text style={styles.thumbEdgeLabel}>Previous</Text>
          </View>
          <View style={[styles.thumbEdgeRight, { top: 8 + (thumbH / 2), marginTop: -(edgeButton / 2) }]}>
            <Pressable
              onPress={() => scrollTo(index + 1)}
              style={({ hovered, pressed }) => [
                styles.thumbEdgeButton,
                {
                  width: edgeButton,
                  height: edgeButton,
                  borderRadius: edgeButton / 2,
                },
                hovered ? { backgroundColor: "#007c00", borderColor: "#007c00" } : null,
                pressed ? { opacity: 0.92 } : null,
              ]}
            >
              <Text style={[styles.thumbEdgeArrow, { fontSize: isMobile ? 20 : 28 }]}>›</Text>
            </Pressable>
            <Text style={styles.thumbEdgeLabel}>Next</Text>
          </View><FlatList
            ref={thumbRef}
            data={items}
            horizontal
            scrollEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(x: any, i: number) => `thumb_${i}`}
            contentContainerStyle={{ paddingHorizontal: edgeInset, alignItems: "center" }}
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
                    style={[styles.thumb, { width: thumbW, height: thumbH }]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            }}
          />
          <View style={[styles.thumbMeta, { marginHorizontal: edgeInset }]}>
            <Text style={[styles.thumbTitle, { fontSize: fontSize.thumbTitle }]} numberOfLines={1}>
              {items[index]?.title}
            </Text>
            <Text style={[styles.thumbPrice, { fontSize: fontSize.thumbPrice }]}>{items[index]?.priceLabel}</Text>
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
              <Text style={styles.galleryCloseText}>X</Text>
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
                  <Text style={{ color: "#777" }}>No image</Text>
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

const styles = StyleSheet.create({
  heroScrimTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: "transparent",
  },
  heroScrimBottom: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
  },
  rightPanelContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 12,
    gap: 6,
    flexWrap: "wrap",
  },
  heroPill: {
    backgroundColor: "#f5f2e8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroPillText: {
    color: "#1c1c1c",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  heroPillGhost: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroPillGhostText: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroPillPrice: {
    backgroundColor: "#f5f2e8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroPillPriceText: {
    color: "#1c1c1c",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroPillDropped: {
    borderWidth: 1,
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroPillDroppedText: {
    color: "#fcd34d",
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  heroPillAvailable: {
    borderWidth: 1,
    borderColor: "#22c55e",
    backgroundColor: "rgba(34, 197, 94, 0.16)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroPillAvailableText: {
    color: "#bbf7d0",
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  heroPillUnavailable: {
    borderWidth: 1,
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroPillUnavailableText: {
    color: "#fecaca",
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "left",
    marginTop: 4,
    ...Platform.select({
      web: { textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)" },
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.8)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
    }),
  },
  heroDesc: {
    color: "rgba(255,255,255,0.88)",
    lineHeight: 18,
    marginTop: 6,
    textAlign: "left",
    ...Platform.select({
      web: { textShadow: "0px 1px 6px rgba(0, 0, 0, 0.7)" },
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.7)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
      },
    }),
  },
  heroOldPrice: {
    color: "rgba(255,255,255,0.65)",
    textDecorationLine: "line-through",
    marginTop: 4,
  },
  heroMetaLine: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    textAlign: "left",
  },
  heroHighlightLine: {
    fontWeight: "800",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 8,
    gap: 10,
  },
  heroPrice: {
    color: "#fff",
    fontWeight: "700",
    ...Platform.select({
      web: { textShadow: "0px 1px 6px rgba(0, 0, 0, 0.7)" },
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.7)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
      },
    }),
  },
  heroCount: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  heroActionsInline: {
    marginTop: 10,
    gap: 8,
  },
  galleryList: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    borderRadius: 10,
    padding: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  galleryCard: {
    borderWidth: 1,
    borderColor: "#1f1f1f",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0d0d0d",
    marginBottom: 8,
  },
  galleryImage: {
    width: "100%",
    height: 90,
  },
  galleryImageEmpty: {
    height: 90,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryMeta: {
    padding: 6,
    gap: 2,
  },
  galleryTitle: {
    color: "#fff",
    fontWeight: "700",
  },
  galleryPrice: {
    color: "rgba(255,255,255,0.75)",
  },
  galleryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.74)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: 16,
  },
  galleryModal: {
    width: "100%",
    maxWidth: 980,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 14,
    padding: 12,
  },
  galleryCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 3,
  },
  galleryCloseText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  galleryModalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    paddingRight: 40,
  },
  galleryHeroWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    backgroundColor: "#111",
  },
  galleryHeroImage: {
    width: "100%",
    height: "100%",
  },
  galleryHeroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryThumbRow: {
    paddingTop: 10,
    gap: 8,
  },
  galleryThumbWrap: {
    width: 108,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  galleryThumbActive: {
    borderColor: "#fff",
  },
  galleryThumbImage: {
    width: "100%",
    height: "100%",
  },
  bookButton: {
    backgroundColor: "#f5f2e8",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  bookButtonText: {
    color: "#1c1c1c",
    fontWeight: "800",
  },
  bookButtonDisabled: {
    backgroundColor: "rgba(120,120,120,0.7)",
    borderColor: "rgba(170,170,170,0.8)",
  },
  bookButtonTextDisabled: {
    color: "#f3f4f6",
  },
  viewButton: {
    borderColor: "#fff",
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  viewButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  storeBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  storeIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  storeIconApple: {
    backgroundColor: "#111",
  },
  storeIconPlay: {
    backgroundColor: "#0b6a2b",
  },
  storeIconText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  storeBadgeSubText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    lineHeight: 11,
  },
  storeBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  thumbContainer: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "transparent",
  },
  thumbWrap: {
    marginHorizontal: 6,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbActive: {
    borderColor: "#fff",
  },
  thumb: {
    backgroundColor: "#111",
  },
  thumbEdgeLeft: {
    position: "absolute",
    left: 8,
    top: "50%",
    alignItems: "center",
    zIndex: 5,
  },
  thumbEdgeRight: {
    position: "absolute",
    right: 8,
    top: "50%",
    alignItems: "center",
    zIndex: 5,
  },
  thumbEdgeButton: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEdgeArrow: {
    color: "#fff",
    fontWeight: "800",
  },
  thumbEdgeLabel: {
    marginTop: 6,
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
    ...Platform.select({
      web: { textShadow: "0px 1px 3px rgba(0,0,0,0.6)" },
      default: {
        textShadowColor: "rgba(0,0,0,0.6)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  thumbMeta: {
    marginTop: 6,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  thumbTitle: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
  },
  thumbPrice: {
    color: "#f5f2e8",
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },
});

function HoverScale({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);
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
