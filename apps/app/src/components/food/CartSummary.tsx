import { View, Text, Pressable, useWindowDimensions } from "react-native";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartSummaryProps {
  items: CartItem[];
  onCheckout: () => void;
}

export default function CartSummary({ items, onCheckout }: CartSummaryProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (items.length === 0) return null;

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <View style={{
      position: "absolute",
      bottom: isMobile ? 20 : 30,
      left: isMobile ? 14 : "auto",
      right: isMobile ? 14 : 30,
      zIndex: 1000
    }}>
      <Pressable
        onPress={onCheckout}
        style={({ pressed, hovered }) => [
          {
            backgroundColor: hovered ? "#007c00" : "#f5f2e8",
            paddingVertical: isMobile ? 14 : 16,
            paddingHorizontal: isMobile ? 18 : 24,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isMobile ? 12 : 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          }
        ]}
      >
        {({ hovered }) => (
          <>
            <View style={{
              backgroundColor: hovered ? "#fff" : "#1c1c1c",
              paddingHorizontal: isMobile ? 10 : 12,
              paddingVertical: isMobile ? 4 : 6,
              borderRadius: 8,
              minWidth: isMobile ? 32 : 36,
              alignItems: "center"
            }}>
              <Text style={{
                color: hovered ? "#007c00" : "#f5f2e8",
                fontSize: isMobile ? 14 : 16,
                fontWeight: "800"
              }}>
                {itemCount}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{
                color: hovered ? "#fff" : "#1c1c1c",
                fontSize: isMobile ? 14 : 16,
                fontWeight: "800"
              }}>
                View Cart
              </Text>
            </View>

            <Text style={{
              color: hovered ? "#fff" : "#1c1c1c",
              fontSize: isMobile ? 16 : 18,
              fontWeight: "800"
            }}>
              ₹{total.toFixed(0)}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
