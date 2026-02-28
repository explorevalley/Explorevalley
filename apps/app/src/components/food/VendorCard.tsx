import { View, Text, Pressable, ImageBackground, useWindowDimensions } from "react-native";
import type { Restaurant } from "@explorevalley/shared";
import { vendorCardDynamicStyles as ds, vendorCardStyles as styles } from "../../styles/FoodComponents.styles";
import { vendorCardData as t } from "../../staticData/vendorCard.staticData";

interface VendorCardProps {
  vendor: Restaurant;
  onPress: (vendor: Restaurant) => void;
}

export default function VendorCard({ vendor, onPress }: VendorCardProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const heroImage = (vendor as any).heroImage || (vendor as any).image || (vendor.images && vendor.images[0]) || "";

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.starsRow}>
        {[...Array(fullStars)].map((_, i) => (
          <Text key={`full-${i}`} style={[styles.starFull, ds.starTextSize(isMobile)]}>
            {t.stars.full}
          </Text>
        ))}
        {hasHalfStar && (
          <Text style={[styles.starFull, ds.starTextSize(isMobile)]}>{t.stars.empty}</Text>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} style={[styles.starEmpty, ds.starTextSize(isMobile)]}>
            {t.stars.empty}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <Pressable
      onPress={() => onPress(vendor)}
      style={({ pressed, hovered }) => [styles.card, ds.cardState(hovered, pressed)]}
    >
      <ImageBackground
        source={heroImage ? { uri: heroImage } : undefined as any}
        style={ds.heroHeight(isMobile, isTablet)}
        resizeMode="cover"
      >
        <View style={[styles.heroOverlay, ds.heroOverlayPadding(isMobile)]}>
          {vendor.isVeg && (
              <View style={styles.badgeWrap}>
              <View style={styles.vegBadge}>
                <Text style={[styles.vegBadgeText, ds.textSize(isMobile, 10, 11)]}>
                  {t.pureVeg}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.sectionGap}>
            <View style={styles.timeBadge}>
              <Text style={[styles.timeBadgeText, ds.textSize(isMobile, 11, 12)]}>
                {vendor.deliveryTime}
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>

      <View style={[styles.body, ds.bodyPadding(isMobile)]}>
        <View>
          <Text style={[styles.title, ds.textSize(isMobile, 16, 18)]}>
            {vendor.name}
          </Text>
          <Text style={[styles.description, ds.descText(isMobile)]} numberOfLines={2}>
            {vendor.description}
          </Text>
        </View>

        <View style={styles.ratingRow}>
          {renderStars(vendor.rating)}
          <Text style={[styles.ratingText, ds.textSize(isMobile, 12, 13)]}>
            {vendor.rating} ({vendor.reviewCount})
          </Text>
        </View>

        <View style={styles.chipRow}>
          {vendor.cuisine.slice(0, 3).map((cuisine, index) => (
            <View
              key={index}
              style={styles.cuisineChip}
            >
              <Text style={[styles.cuisineText, ds.textSize(isMobile, 11, 12)]}>
                {cuisine}
              </Text>
            </View>
          ))}
        </View>

        {vendor.tags && vendor.tags.length > 0 && (
          <View style={styles.chipRow}>
            {vendor.tags.map((tag, index) => (
              <View
                key={index}
                style={[styles.tagChip, ds.tagChip(tag)]}
              >
                <Text style={ds.tagText(tag, isMobile)}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.infoWrap, ds.infoWrap(isMobile)]}>
          <Text style={[styles.infoText, ds.textSize(isMobile, 11, 12)]}>
            {t.minOrderLabel}: ₹{vendor.minimumOrder} {t.separator} {vendor.location}
          </Text>
          {vendor.deliveryZones && vendor.deliveryZones.length > 0 ? (
            <Text style={[styles.infoSubText, ds.textSize(isMobile, 10, 11)]}>
              {t.zonesLabel}: {vendor.deliveryZones.join(", ")}
            </Text>
          ) : vendor.serviceRadiusKm ? (
            <Text style={[styles.infoSubText, ds.textSize(isMobile, 10, 11)]}>
              {t.serviceRadiusLabel}: {vendor.serviceRadiusKm} {t.serviceRadiusUnit}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
