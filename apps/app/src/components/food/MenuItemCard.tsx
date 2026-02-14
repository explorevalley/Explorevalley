import { View, Text, Image, useWindowDimensions, ActivityIndicator } from "react-native";
import { useState } from "react";
import type { MenuItem } from "@explorevalley/shared";
import QuantitySelector from "./QuantitySelector";

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
    <View style={{
      flexDirection: "row",
      backgroundColor: "#0f0f0f",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#222",
      padding: isMobile ? 10 : 12,
      gap: isMobile ? 10 : 12,
      opacity: outOfStock ? 0.5 : 1
    }}>
      <View style={{
        width: imageSize,
        height: imageSize,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#1a1a1a",
        position: "relative"
      }}>
        {item.image && !imageError ? (
          <>
            {imageLoading && (
              <View style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center"
              }}>
                <ActivityIndicator size="small" color="#666" />
              </View>
            )}
            <Image
              source={{ uri: item.image }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          </>
        ) : (
          <View style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Text style={{ color: "#666", fontSize: isMobile ? 10 : 11, textAlign: "center" }}>
              No Image
            </Text>
          </View>
        )}

        <View style={{
          position: "absolute",
          top: 4,
          left: 4,
          width: isMobile ? 16 : 18,
          height: isMobile ? 16 : 18,
          borderRadius: 2,
          borderWidth: 2,
          borderColor: item.isVeg ? "#4caf50" : "#f44336",
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <View style={{
            width: isMobile ? 6 : 7,
            height: isMobile ? 6 : 7,
            borderRadius: isMobile ? 3 : 3.5,
            backgroundColor: item.isVeg ? "#4caf50" : "#f44336"
          }} />
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Text style={{
              color: "#fff",
              fontSize: isMobile ? 14 : 16,
              fontWeight: "700",
              flex: 1
            }}>
              {item.name}
            </Text>
          </View>

          {item.description && (
            <Text style={{
              color: "#aaa",
              fontSize: isMobile ? 12 : 13,
              lineHeight: isMobile ? 16 : 18
            }} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {item.variants && item.variants.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {item.variants.map((v, index) => (
                <View
                  key={`variant_${index}`}
                  style={{
                    backgroundColor: "#1a1a1a",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: "#333"
                  }}
                >
                  <Text style={{ color: "#ddd", fontSize: isMobile ? 10 : 11 }}>
                    {v.name} · ₹{v.price}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {item.addons && item.addons.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {item.addons.map((a, index) => (
                <View
                  key={`addon_${index}`}
                  style={{
                    backgroundColor: "#0f0f0f",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: "#333"
                  }}
                >
                  <Text style={{ color: "#aaa", fontSize: isMobile ? 10 : 11 }}>
                    + {a.name} · ₹{a.price}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{
              color: "#f5f2e8",
              fontSize: isMobile ? 16 : 18,
              fontWeight: "800"
            }}>
              ₹{item.price}
            </Text>

            <Text style={{ color: "#888", fontSize: isMobile ? 11 : 12 }}>
              Stock: {item.stock ?? 0} · Max {maxOrder}
            </Text>

            {item.tags && item.tags.length > 0 && (
              item.tags.map((tag, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: "#1a1a1a",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: "#333"
                  }}
                >
                  <Text style={{
                    color: tag.toLowerCase().includes("bestseller") ? "#f5f2e8" : "#ddd",
                    fontSize: isMobile ? 10 : 11,
                    fontWeight: tag.toLowerCase().includes("bestseller") ? "700" : "600"
                  }}>
                    {tag}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: isMobile ? 8 : 10
        }}>
          {outOfStock ? (
            <View style={{
              backgroundColor: "#1a1a1a",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: "#333"
            }}>
              <Text style={{
                color: "#ff6b6b",
                fontSize: isMobile ? 12 : 13,
                fontWeight: "700"
              }}>
                OUT OF STOCK
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
        <View style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(11, 11, 11, 0.7)",
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Text style={{
            color: "#ff6b6b",
            fontSize: isMobile ? 14 : 16,
            fontWeight: "700"
          }}>
            OUT OF STOCK
          </Text>
        </View>
      )}
    </View>
  );
}
