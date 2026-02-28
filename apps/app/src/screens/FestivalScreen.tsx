import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, useWindowDimensions, ActivityIndicator, Image } from "react-native";
import { apiGet, resolveAssetUrl } from "../lib/api";
import { festivalColors, festivalDynamicStyles as ds, festivalStyles as styles } from "../styles/FestivalScreen.styles";
import { festivalScreenData as t } from "../staticData/festivalScreen.staticData";

type Festival = {
  id: string;
  title: string;
  location?: string;
  month: string;
  vibe: string;
  ticket: string | number;
  color: string;
  image?: string;
};

const COLORS = t.colors;

export default function FestivalScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [items, setItems] = useState<Festival[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        // Prefer festivals if json contains dedicated section. Fallback to tours.
        let data: any[] = [];
        try {
          const f = await apiGet<any[]>(t.api.festivals);
          data = Array.isArray(f) ? f : [];
        } catch {
          const tours = await apiGet<any[]>(t.api.tours);
          data = Array.isArray(tours) ? tours : [];
        }
        if (!mounted) return;
        const mapped = data.map((x: any, idx: number) => {
          const month = x.month || (x.createdAt ? new Date(x.createdAt).toLocaleString("en-US", { month: "long" }) : t.defaults.season);
          const image = Array.isArray(x.images) && x.images.length ? String(x.images[0]) : undefined;
          return {
            id: x.id || `festival_${idx}`,
            title: x.title || x.name || t.defaults.title,
            location: x.location || x.destination || "",
            month,
            vibe: x.vibe || x.description || x.duration || t.defaults.vibe,
            ticket: x.ticket || x.price || x.starting_price || t.defaults.ticket,
            color: COLORS[idx % COLORS.length],
            image: resolveAssetUrl(image || "")
          } as Festival;
        });
        setItems(mapped);
      } catch (e: any) {
        if (!mounted) return;
        setItems([]);
        setError(String(e?.message || e));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const festivals = useMemo(() => items || [], [items]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={ds.contentPad(isMobile)}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, ds.heroPad(isMobile)]}>
        <Text style={[styles.heroKicker, ds.heroKickerSize(isMobile)]}>
          {t.hero.kicker}
        </Text>
        <Text style={[styles.heroTitle, ds.heroTitleSize(isMobile)]}>
          {t.hero.title}
        </Text>
        <Text style={[styles.heroSubtitle, ds.heroSubtitleSize(isMobile)]}>
          {t.hero.subtitle}
        </Text>
      </View>

      <View style={styles.pillsRow}>
        {t.pills.map((pill) => (
          <Pill key={pill} text={pill} />
        ))}
      </View>

      {items === null ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={festivalColors.spinner} />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      ) : null}

      {items !== null && festivals.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{t.empty}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      ) : null}

      <View style={styles.cardList}>
        {festivals.map((fest) => (
          <View
            key={fest.id}
            style={[styles.card, ds.cardPad(isMobile)]}
          >
            <View style={styles.cardHead}>
              <Text style={[styles.cardTitle, ds.cardTitleSize(isMobile)]}>{fest.title}</Text>
              <View style={styles.monthBadge}>
                <Text style={[styles.monthText, ds.monthTextSize(isMobile)]}>{fest.month}</Text>
              </View>
            </View>
            {fest.image ? (
              <Image
                source={{ uri: fest.image }}
                resizeMode="cover"
                style={[styles.image, ds.imageHeight(isMobile)]}
              />
            ) : null}
            <Text style={[styles.locationText, ds.bodyText(isMobile)]}>{fest.location || t.defaults.location}</Text>
            <Text style={[styles.vibeText, ds.bodyText(isMobile)]}>{fest.vibe}</Text>
            <Text style={[styles.ticketText, ds.ticketSize(isMobile)]}>
              {typeof fest.ticket === "number" ? t.pricing.from(fest.ticket) : fest.ticket}
            </Text>
            <View style={styles.actionsRow}>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{t.actions.viewLineup}</Text>
              </Pressable>
              <Pressable style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{t.actions.bookPass}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}
