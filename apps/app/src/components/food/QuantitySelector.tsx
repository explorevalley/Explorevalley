import { View, Text, Pressable, useWindowDimensions } from "react-native";

interface QuantitySelectorProps {
  quantity: number;
  onChange: (newQty: number) => void;
  min?: number;
  max?: number;
}

export default function QuantitySelector({ quantity, onChange, min = 0, max = 99 }: QuantitySelectorProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const handleDecrement = () => {
    if (quantity > min) {
      onChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < max) {
      onChange(quantity + 1);
    }
  };

  const buttonSize = isMobile ? 32 : 36;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: isMobile ? 8 : 12 }}>
      <Pressable
        onPress={handleDecrement}
        disabled={quantity <= min}
        style={({ pressed, hovered }) => [
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: quantity <= min ? "#1a1a1a" : pressed ? "#007c00" : hovered ? "#f5f2e8" : "#222",
            borderWidth: 1,
            borderColor: quantity <= min ? "#333" : "#222",
            alignItems: "center",
            justifyContent: "center"
          }
        ]}
      >
        {({ hovered }) => (
          <Text style={{
            color: quantity <= min ? "#666" : hovered ? "#1c1c1c" : "#fff",
            fontSize: isMobile ? 18 : 20,
            fontWeight: "700",
            lineHeight: isMobile ? 18 : 20
          }}>
            −
          </Text>
        )}
      </Pressable>

      <Text style={{
        color: "#fff",
        fontSize: isMobile ? 16 : 18,
        fontWeight: "700",
        minWidth: isMobile ? 24 : 28,
        textAlign: "center"
      }}>
        {quantity}
      </Text>

      <Pressable
        onPress={handleIncrement}
        disabled={quantity >= max}
        style={({ pressed, hovered }) => [
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: quantity >= max ? "#1a1a1a" : pressed ? "#007c00" : hovered ? "#f5f2e8" : "#222",
            borderWidth: 1,
            borderColor: quantity >= max ? "#333" : "#222",
            alignItems: "center",
            justifyContent: "center"
          }
        ]}
      >
        {({ hovered }) => (
          <Text style={{
            color: quantity >= max ? "#666" : hovered ? "#1c1c1c" : "#fff",
            fontSize: isMobile ? 18 : 20,
            fontWeight: "700",
            lineHeight: isMobile ? 18 : 20
          }}>
            +
          </Text>
        )}
      </Pressable>
    </View>
  );
}
