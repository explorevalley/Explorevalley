import { View, Text, Pressable, ImageBackground, useWindowDimensions } from "react-native";
import type { Restaurant } from "@explorevalley/shared";

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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        {[...Array(fullStars)].map((_, i) => (
          <Text key={`full-${i}`} style={{ color: "#f5f2e8", fontSize: isMobile ? 14 : 16 }}>
            ★
          </Text>
        ))}
        {hasHalfStar && (
          <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 14 : 16 }}>☆</Text>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} style={{ color: "#666", fontSize: isMobile ? 14 : 16 }}>
            ☆
          </Text>
        ))}
      </View>
    );
  };

  return (
    <Pressable
      onPress={() => onPress(vendor)}
      style={({ pressed, hovered }) => [
        {
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: hovered ? "#f5f2e8" : "#222",
          backgroundColor: "#0f0f0f",
          transform: [{ scale: pressed ? 0.98 : hovered ? 1.02 : 1 }]
        }
      ]}
    >
      <ImageBackground
        source={heroImage ? { uri: heroImage } : undefined as any}
        style={{
          width: "100%",
          height: isMobile ? 140 : isTablet ? 160 : 180
        }}
        resizeMode="cover"
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          padding: isMobile ? 10 : 12,
          justifyContent: "space-between"
        }}>
          {vendor.isVeg && (
            <View style={{ alignSelf: "flex-start" }}>
              <View style={{
                backgroundColor: "#9ef1a6",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6
              }}>
                <Text style={{
                  color: "#0b0b0b",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: "700"
                }}>
                  PURE VEG
                </Text>
              </View>
            </View>
          )}

          <View style={{ gap: 4 }}>
            <View style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              alignSelf: "flex-start"
            }}>
              <Text style={{
                color: "#f5f2e8",
                fontSize: isMobile ? 11 : 12,
                fontWeight: "700"
              }}>
                {vendor.deliveryTime}
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>

      <View style={{ padding: isMobile ? 12 : 14, gap: isMobile ? 8 : 10 }}>
        <View>
          <Text style={{
            color: "#fff",
            fontSize: isMobile ? 16 : 18,
            fontWeight: "700",
            marginBottom: 4
          }}>
            {vendor.name}
          </Text>
          <Text style={{
            color: "#aaa",
            fontSize: isMobile ? 12 : 13,
            lineHeight: isMobile ? 16 : 18
          }} numberOfLines={2}>
            {vendor.description}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {renderStars(vendor.rating)}
          <Text style={{
            color: "#ddd",
            fontSize: isMobile ? 12 : 13,
            fontWeight: "600"
          }}>
            {vendor.rating} ({vendor.reviewCount})
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {vendor.cuisine.slice(0, 3).map((cuisine, index) => (
            <View
              key={index}
              style={{
                backgroundColor: "#1a1a1a",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#333"
              }}
            >
              <Text style={{
                color: "#ddd",
                fontSize: isMobile ? 11 : 12
              }}>
                {cuisine}
              </Text>
            </View>
          ))}
        </View>

        {vendor.tags && vendor.tags.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {vendor.tags.map((tag, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: tag.toLowerCase().includes("veg") ? "#9ef1a6" : "#f5f2e8",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6
                }}
              >
                <Text style={{
                  color: "#0b0b0b",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: "700"
                }}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{
          paddingTop: isMobile ? 8 : 10,
          borderTopWidth: 1,
          borderTopColor: "#222"
        }}>
          <Text style={{
            color: "#aaa",
            fontSize: isMobile ? 11 : 12
          }}>
            Min order: ₹{vendor.minimumOrder} • {vendor.location}
          </Text>
          {vendor.deliveryZones && vendor.deliveryZones.length > 0 ? (
            <Text style={{ color: "#777", fontSize: isMobile ? 10 : 11, marginTop: 4 }}>
              Zones: {vendor.deliveryZones.join(", ")}
            </Text>
          ) : vendor.serviceRadiusKm ? (
            <Text style={{ color: "#777", fontSize: isMobile ? 10 : 11, marginTop: 4 }}>
              Service radius: {vendor.serviceRadiusKm} km
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
