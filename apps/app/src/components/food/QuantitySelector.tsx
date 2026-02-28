import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { quantitySelectorDynamicStyles as ds, quantitySelectorStyles as styles } from "../../styles/FoodComponents.styles";
import { quantitySelectorData as t } from "../../staticData/quantitySelector.staticData";

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
    <View style={[styles.row, ds.rowGap(isMobile)]}>
      <Pressable
        onPress={handleDecrement}
        disabled={quantity <= min}
        style={({ pressed, hovered }) => [styles.btn, ds.button(buttonSize, quantity <= min, pressed, hovered)]}
      >
        {() => (
          <Text style={[styles.btnText, ds.buttonText(isMobile, quantity <= min)]}>
            {t.decrement}
          </Text>
        )}
      </Pressable>

      <Text style={[styles.countText, ds.countText(isMobile)]}>
        {quantity}
      </Text>

      <Pressable
        onPress={handleIncrement}
        disabled={quantity >= max}
        style={({ pressed, hovered }) => [styles.btn, ds.button(buttonSize, quantity >= max, pressed, hovered)]}
      >
        {() => (
          <Text style={[styles.btnText, ds.buttonText(isMobile, quantity >= max)]}>
            {t.increment}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
