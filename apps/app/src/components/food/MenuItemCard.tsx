import { View, Text, Image, useWindowDimensions, ActivityIndicator } from "react-native";
import { useState } from "react";
import type { MenuItem } from "@explorevalley/shared";
import QuantitySelector from "./QuantitySelector";
import { foodComponentsColors, menuItemCardDynamicStyles as ds, menuItemCardStyles as styles } from "../../styles/FoodComponents.styles";
import { menuItemCardData as t } from "../../staticData/menuItemCard.staticData";

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onQuantityChange: (id: string, qty: number) => void;
}

export default function MenuItemCard({ item, quantity, onQuantityChange }: MenuItemCardProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const imageSize = isMobile ? 80 : 100;
  const maxOrder = Math.min(item.maxPerOrder ?? 99, item.stock ?? 99);
  const outOfStock = (item.stock ?? 0) <= 0 || !item.available;

  return (
    <View style={[styles.card, ds.card(isMobile, outOfStock)]}>
      <View style={[styles.imageWrap, ds.imageSize(imageSize)]}>
        {item.image && !imageError ? (
          <>
            {imageLoading && (
              <View style={styles.absoluteFillCenter}>
                <ActivityIndicator size="small" color={foodComponentsColors.imageSpinner} />
              </View>
            )}
            <Image
              source={{ uri: item.image }}
              style={styles.imageFull}
              resizeMode="cover"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          </>
        ) : (
          <View style={styles.fallbackImage}>
            <Text style={[styles.stockText, ds.tinyText(isMobile)]}>
              {t.noImage}
            </Text>
          </View>
        )}

        <View style={[styles.vegBadgeOuter, ds.vegBadgeOuter(isMobile, item.isVeg)]}>
          <View style={ds.vegBadgeInner(isMobile, item.isVeg)} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.sectionGap}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, ds.titleSize(isMobile)]}>
              {item.name}
            </Text>
          </View>

          {item.description && (
            <Text style={[styles.description, ds.descriptionSize(isMobile)]} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {item.variants && item.variants.length > 0 && (
            <View style={styles.rowWrap}>
              {item.variants.map((v, index) => (
                <View
                  key={`variant_${index}`}
                  style={styles.chip}
                >
                  <Text style={[styles.variantText, ds.tinyText(isMobile)]}>
                    {t.formatVariant(v.name, v.price)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {item.addons && item.addons.length > 0 && (
            <View style={styles.rowWrap}>
              {item.addons.map((a, index) => (
                <View
                  key={`addon_${index}`}
                  style={styles.addonChip}
                >
                  <Text style={[styles.addonText, ds.tinyText(isMobile)]}>
                    {t.formatAddon(a.name, a.price)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={[styles.priceText, ds.priceSize(isMobile)]}>
              {t.formatPrice(item.price)}
            </Text>

            <Text style={[styles.stockText, ds.stockSize(isMobile)]}>
              {t.formatStock(item.stock ?? 0, maxOrder)}
            </Text>

            {item.tags && item.tags.length > 0 && (
              item.tags.map((tag, index) => (
                <View
                  key={index}
                  style={styles.chip}
                >
                  <Text style={[styles.tagText, ds.tagText(tag, isMobile)]}>
                    {tag}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={[styles.footerRow, ds.footerMargin(isMobile)]}>
          {outOfStock ? (
            <View style={styles.outBadge}>
              <Text style={[styles.outBadgeText, ds.outTextSize(isMobile)]}>
                {t.outOfStock}
              </Text>
            </View>
          ) : (
            <QuantitySelector
              quantity={quantity}
              max={maxOrder}
              onChange={(newQty) => onQuantityChange(item.id, newQty)}
            />
          )}
        </View>
      </View>

      {outOfStock && (
        <View style={styles.overlay}>
          <Text style={[styles.overlayText, ds.overlayTextSize(isMobile)]}>
            {t.outOfStock}
          </Text>
        </View>
      )}
    </View>
  );
}
