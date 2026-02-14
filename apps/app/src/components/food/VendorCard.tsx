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
          <Text key={`full-${i}`} style={{ color: "#f59e0b", fontSize: isMobile ? 14 : 16 }}>
            ★
          </Text>
        ))}
        {hasHalfStar && (
          <Text style={{ color: "#f59e0b", fontSize: isMobile ? 14 : 16 }}>☆</Text>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} style={{ color: "#c6cfde", fontSize: isMobile ? 14 : 16 }}>
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
          borderColor: hovered ? "#f4511e" : "#d5deeb",
          backgroundColor: "#fff",
          shadowColor: hovered ? "#f4511e" : "#1d2c49",
          shadowOpacity: hovered ? 0.2 : 0.08,
          shadowRadius: hovered ? 14 : 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: hovered ? 5 : 2,
          transform: [{ scale: pressed ? 0.98 : hovered ? 1.01 : 1 }]
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
          backgroundColor: "rgba(12, 20, 34, 0.42)",
          padding: isMobile ? 10 : 12,
          justifyContent: "space-between"
        }}>
          {vendor.isVeg && (
            <View style={{ alignSelf: "flex-start" }}>
              <View style={{
                backgroundColor: "#d7f6de",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6
              }}>
                <Text style={{
                  color: "#165122",
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
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              alignSelf: "flex-start"
            }}>
              <Text style={{
                color: "#111827",
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
            color: "#111827",
            fontSize: isMobile ? 16 : 18,
            fontWeight: "700",
            marginBottom: 4
          }}>
            {vendor.name}
          </Text>
          <Text style={{
            color: "#6b7280",
            fontSize: isMobile ? 12 : 13,
            lineHeight: isMobile ? 16 : 18
          }} numberOfLines={2}>
            {vendor.description}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {renderStars(vendor.rating)}
          <Text style={{
            color: "#5f6b81",
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
                backgroundColor: "#f7f9fc",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#d8e1ee"
              }}
            >
              <Text style={{
                color: "#445066",
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
                  backgroundColor: tag.toLowerCase().includes("veg") ? "#d7f6de" : "#fff1e8",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6
                }}
              >
                <Text style={{
                  color: tag.toLowerCase().includes("veg") ? "#165122" : "#9a3412",
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
          borderTopColor: "#edf1f7"
        }}>
          <Text style={{
            color: "#6b7280",
            fontSize: isMobile ? 11 : 12
          }}>
            Min order: ₹{vendor.minimumOrder} • {vendor.location}
          </Text>
          {vendor.deliveryZones && vendor.deliveryZones.length > 0 ? (
            <Text style={{ color: "#7c8698", fontSize: isMobile ? 10 : 11, marginTop: 4 }}>
              Zones: {vendor.deliveryZones.join(", ")}
            </Text>
          ) : vendor.serviceRadiusKm ? (
            <Text style={{ color: "#7c8698", fontSize: isMobile ? 10 : 11, marginTop: 4 }}>
              Service radius: {vendor.serviceRadiusKm} km
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
