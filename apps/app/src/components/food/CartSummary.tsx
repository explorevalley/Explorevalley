import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { cartSummaryDynamicStyles as ds, cartSummaryStyles as styles } from "../../styles/FoodComponents.styles";
import { cartSummaryData as t } from "../../staticData/cartSummary.staticData";

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
    <View style={[styles.dock, ds.dock(isMobile)]}>
      <Pressable
        onPress={onCheckout}
        style={({ pressed, hovered }) => [styles.button, ds.button(isMobile, hovered, pressed)]}
      >
        {() => (
          <>
            <View style={[styles.countBadge, ds.countBadge(isMobile)]}>
              <Text style={[styles.countText, ds.countText(isMobile)]}>
                {itemCount}
              </Text>
            </View>

            <View style={styles.flex1}>
              <Text style={[styles.labelText, ds.labelText(isMobile)]}>
                {t.viewCartLabel}
              </Text>
            </View>

            <Text style={[styles.totalText, ds.totalText(isMobile)]}>
              {t.currency}{total.toFixed(0)}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
