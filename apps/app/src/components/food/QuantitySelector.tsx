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
            backgroundColor: quantity <= min ? "#f1f4f9" : pressed ? "#d73f11" : hovered ? "#f4511e" : "#f4511e",
            borderWidth: 1,
            borderColor: quantity <= min ? "#d8e1ee" : "#f4511e",
            alignItems: "center",
            justifyContent: "center"
          }
        ]}
      >
        {({ hovered }) => (
          <Text style={{
            color: quantity <= min ? "#96a0b2" : "#fff",
            fontSize: isMobile ? 18 : 20,
            fontWeight: "700",
            lineHeight: isMobile ? 18 : 20
          }}>
            −
          </Text>
        )}
      </Pressable>

      <Text style={{
        color: "#111827",
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
            backgroundColor: quantity >= max ? "#f1f4f9" : pressed ? "#d73f11" : hovered ? "#f4511e" : "#f4511e",
            borderWidth: 1,
            borderColor: quantity >= max ? "#d8e1ee" : "#f4511e",
            alignItems: "center",
            justifyContent: "center"
          }
        ]}
      >
        {({ hovered }) => (
          <Text style={{
            color: quantity >= max ? "#96a0b2" : "#fff",
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
