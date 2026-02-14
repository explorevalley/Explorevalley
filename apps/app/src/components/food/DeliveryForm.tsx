import { View, Text, TextInput, Pressable, useWindowDimensions, ActivityIndicator } from "react-native";
import { useState } from "react";
import { autoCapitalizeNewLineStarts } from "../../lib/text";

interface OrderData {
  userName: string;
  phone: string;
  deliveryAddress: string;
  specialInstructions: string;
}

interface DeliveryFormProps {
  onSubmit: (data: OrderData) => Promise<void>;
  cartTotal: number;
  minimumOrder?: number;
  coupons?: Array<{ code: string; type: string; amount: number; minCart: number }>;
  policyText?: string;
}

function Field({ label, ...props }: any) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View>
      <Text style={{
        color: "#ddd",
        marginBottom: 6,
        fontSize: isMobile ? 12 : 14,
        fontWeight: "600"
      }}>
        {label}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor="#666"
        style={{
          backgroundColor: "#141414",
          color: "#fff",
          paddingHorizontal: 12,
          paddingVertical: isMobile ? 10 : 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#222",
          fontSize: isMobile ? 14 : 16
        }}
      />
    </View>
  );
}

export default function DeliveryForm({ onSubmit, cartTotal, minimumOrder = 0, coupons = [], policyText }: DeliveryFormProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gstRate = 0.05;
  const gstAmount = cartTotal * gstRate;
  const totalAmount = cartTotal + gstAmount;

  const belowMinimum = minimumOrder > 0 && cartTotal < minimumOrder;

  const handleSubmit = async () => {
    setError(null);

    if (!userName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!phone.trim() || phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    if (!deliveryAddress.trim() || deliveryAddress.length < 10) {
      setError("Please enter a valid delivery address");
      return;
    }

    if (belowMinimum) {
      setError(`Minimum order amount is ₹${minimumOrder}`);
      return;
    }

    setBusy(true);
    try {
      await onSubmit({
        userName: userName.trim(),
        phone: phone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        specialInstructions: specialInstructions.trim()
      });
    } catch (e: any) {
      setError(e.message || "Failed to place order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: isMobile ? 16 : 18 }}>
      <View>
        <Text style={{
          color: "#fff",
          fontSize: isMobile ? 18 : 22,
          fontWeight: "800",
          marginBottom: isMobile ? 12 : 16
        }}>
          Delivery Details
        </Text>

        <View style={{ gap: isMobile ? 12 : 14 }}>
          <Field
            label="Name *"
            value={userName}
            onChangeText={setUserName}
            placeholder="Enter your name"
            autoCapitalize="words"
          />

          <Field
            label="Phone *"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
          />

          <Field
            label="Delivery Address *"
            value={deliveryAddress}
            onChangeText={(v: string) => setDeliveryAddress(autoCapitalizeNewLineStarts(v))}
            placeholder="Enter complete delivery address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Field
            label="Special Instructions (Optional)"
            value={specialInstructions}
            onChangeText={(v: string) => setSpecialInstructions(autoCapitalizeNewLineStarts(v))}
            placeholder="E.g., Extra spicy, no onions, etc."
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      </View>

      <View style={{
        backgroundColor: "#0f0f0f",
        padding: isMobile ? 14 : 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#222",
        gap: isMobile ? 10 : 12
      }}>
        <Text style={{
          color: "#fff",
          fontSize: isMobile ? 16 : 18,
          fontWeight: "700"
        }}>
          Price Breakdown
        </Text>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#ddd", fontSize: isMobile ? 13 : 14 }}>
              Subtotal
            </Text>
            <Text style={{ color: "#fff", fontSize: isMobile ? 13 : 14, fontWeight: "600" }}>
              ₹{cartTotal.toFixed(2)}
            </Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#ddd", fontSize: isMobile ? 13 : 14 }}>
              GST (5%)
            </Text>
            <Text style={{ color: "#fff", fontSize: isMobile ? 13 : 14, fontWeight: "600" }}>
              ₹{gstAmount.toFixed(2)}
            </Text>
          </View>

          <View style={{
            height: 1,
            backgroundColor: "#222",
            marginVertical: 4
          }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{
              color: "#f5f2e8",
              fontSize: isMobile ? 16 : 18,
              fontWeight: "800"
            }}>
              Total
            </Text>
            <Text style={{
              color: "#f5f2e8",
              fontSize: isMobile ? 16 : 18,
              fontWeight: "800"
            }}>
              ₹{totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {belowMinimum && (
          <View style={{
            backgroundColor: "#1a1a1a",
            padding: isMobile ? 10 : 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#ff6b6b"
          }}>
            <Text style={{
              color: "#ff6b6b",
              fontSize: isMobile ? 12 : 13,
              textAlign: "center"
            }}>
              Add ₹{(minimumOrder - cartTotal).toFixed(0)} more to meet minimum order
            </Text>
          </View>
        )}
      </View>

      {(coupons.length > 0 || policyText) && (
        <View style={{
          backgroundColor: "#0f0f0f",
          padding: isMobile ? 14 : 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#222",
          gap: 8
        }}>
          <Text style={{ color: "#fff", fontSize: isMobile ? 15 : 16, fontWeight: "700" }}>Offers & Policy</Text>
          {coupons.slice(0, 3).map(c => (
            <Text key={c.code} style={{ color: "#ddd", fontSize: isMobile ? 12 : 13 }}>
              {c.code} · {c.type === "flat" ? `₹${c.amount}` : `${c.amount}%`} off · Min ₹{c.minCart}
            </Text>
          ))}
          {policyText ? (
            <Text style={{ color: "#aaa", fontSize: isMobile ? 12 : 13 }}>{policyText}</Text>
          ) : null}
        </View>
      )}

      {error && (
        <View style={{
          backgroundColor: "#1a1a1a",
          padding: isMobile ? 12 : 14,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#ff6b6b"
        }}>
          <Text style={{
            color: "#ff6b6b",
            fontSize: isMobile ? 13 : 14,
            textAlign: "center"
          }}>
            {error}
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={busy || belowMinimum}
        style={({ pressed, hovered }) => [
          {
            backgroundColor: busy || belowMinimum ? "#333" : hovered ? "#007c00" : "#f5f2e8",
            paddingVertical: isMobile ? 14 : 16,
            borderRadius: 14,
            alignItems: "center",
            opacity: busy || belowMinimum ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          }
        ]}
      >
        {({ hovered }) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {busy && <ActivityIndicator size="small" color={hovered ? "#fff" : "#1c1c1c"} />}
            <Text style={{
              color: busy || belowMinimum ? "#666" : hovered ? "#fff" : "#1c1c1c",
              fontSize: isMobile ? 16 : 18,
              fontWeight: "800"
            }}>
              {busy ? "Placing Order..." : "Place Order"}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
