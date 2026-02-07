import React, { useEffect, useRef, useState } from "react";
import { View, Image, ImageBackground, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, Platform, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function PortfolioCarousel({ items, onViewPhotos, onBook, autoplay = true, autoplayInterval = 4000, showThumbnails = true }: any) {
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const w = Dimensions.get("window").width;

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
    if (!autoplay || paused || !items || items.length <= 1) return;
    const t = setInterval(() => {
      scrollTo(index + 1);
    }, autoplayInterval);
    return () => clearInterval(t);
  }, [autoplay, paused, index, items, autoplayInterval]);

  function scrollTo(i: number) {
    const idx = Math.max(0, Math.min((items || []).length - 1, i));
    setIndex(idx);
    listRef.current?.scrollToIndex({ index: idx, animated: true });
  }

  function onMomentum(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / w);
    setIndex(idx);
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList
        ref={listRef}
        data={items}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(x: any, i: number) => `item_${i}`}
        onMomentumScrollEnd={onMomentum}
        onScrollBeginDrag={() => setPaused(true)}
        onScrollEndDrag={() => setPaused(false)}
        style={{ flex: 1 }}
        renderItem={({ item }: any) => {
          const imageUri = item.images?.[0];
          return (
            <ImageBackground
              source={{ uri: imageUri }}
              style={{ width: w, height: "100%", backgroundColor: "#111" }}
              resizeMode="cover"
            >
              <View style={styles.buttonOverlay}>
                <Pressable onPress={() => onBook(item)} style={styles.bookButton}>
                  <Text style={{ color: "#000", fontWeight: "700", fontSize: 16 }}>Book Now</Text>
                </Pressable>
                <Pressable onPress={() => onViewPhotos(item)} style={styles.viewButton}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>View Photos</Text>
                </Pressable>
              </View>
            </ImageBackground>
          );
        }}
      />

      {showThumbnails && (
        <View style={styles.thumbContainer}>
          <FlatList
            data={items}
            horizontal
            scrollEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(x: any, i: number) => `thumb_${i}`}
            renderItem={({ item, index: i }: any) => (
              <TouchableOpacity 
                onPress={() => scrollTo(i)} 
                style={[styles.thumbWrap, i === index ? styles.thumbActive : null]}
              >
                <ImageBackground 
                  source={{ uri: item.images?.[0] }} 
                  style={styles.thumb}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOverlay: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 34,
  },
  bookButton: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  viewButton: {
    borderColor: "#fff",
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  thumbContainer: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    height: 72,
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
    width: 72,
    height: 56,
  },
});

