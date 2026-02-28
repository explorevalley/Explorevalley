import { View, Text, TextInput, Pressable, useWindowDimensions, ActivityIndicator } from "react-native";
import { useState } from "react";
import { autoCapitalizeNewLineStarts } from "../../lib/text";
import { deliveryFormDynamicStyles as ds, deliveryFormStyles as styles, foodComponentsColors } from "../../styles/FoodComponents.styles";
import { deliveryFormData as t } from "../../staticData/deliveryForm.staticData";

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
      <Text style={[styles.fieldLabel, ds.fieldLabel(isMobile)]}>
        {label}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor={foodComponentsColors.placeholder}
        style={[styles.fieldInput, ds.fieldInput(isMobile)]}
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
      setError(t.errors.nameRequired);
      return;
    }

    if (!phone.trim() || phone.length < 10) {
      setError(t.errors.phoneInvalid);
      return;
    }

    if (!deliveryAddress.trim() || deliveryAddress.length < 10) {
      setError(t.errors.addressInvalid);
      return;
    }

    if (belowMinimum) {
      setError(t.errors.minOrder(minimumOrder));
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
      setError(e.message || t.errors.failedSubmit);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.formRoot, ds.formGap(isMobile)]}>
      <View>
        <Text style={[styles.sectionTitle, ds.sectionTitle(isMobile)]}>
          {t.sectionTitle}
        </Text>

        <View style={[styles.fieldsWrap, ds.fieldsGap(isMobile)]}>
          <Field
            label={t.fields.nameLabel}
            value={userName}
            onChangeText={setUserName}
            placeholder={t.fields.namePlaceholder}
            autoCapitalize="words"
          />

          <Field
            label={t.fields.phoneLabel}
            value={phone}
            onChangeText={setPhone}
            placeholder={t.fields.phonePlaceholder}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <Field
            label={t.fields.addressLabel}
            value={deliveryAddress}
            onChangeText={(v: string) => setDeliveryAddress(autoCapitalizeNewLineStarts(v))}
            placeholder={t.fields.addressPlaceholder}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Field
            label={t.fields.instructionsLabel}
            value={specialInstructions}
            onChangeText={(v: string) => setSpecialInstructions(autoCapitalizeNewLineStarts(v))}
            placeholder={t.fields.instructionsPlaceholder}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      </View>

      <View style={[styles.card, ds.card(isMobile)]}>
        <Text style={[styles.cardTitle, ds.textSize(isMobile, 16, 18)]}>
          {t.priceBreakdown.title}
        </Text>

        <View style={styles.gap8}>
          <View style={styles.rowBetween}>
            <Text style={[styles.labelText, ds.textSize(isMobile, 13, 14)]}>
              {t.priceBreakdown.subtotal}
            </Text>
            <Text style={[styles.valueText, ds.textSize(isMobile, 13, 14)]}>
              ₹{cartTotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={[styles.labelText, ds.textSize(isMobile, 13, 14)]}>
              {t.priceBreakdown.gst}
            </Text>
            <Text style={[styles.valueText, ds.textSize(isMobile, 13, 14)]}>
              ₹{gstAmount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={[styles.totalLabel, ds.textSize(isMobile, 16, 18)]}>
              {t.priceBreakdown.total}
            </Text>
            <Text style={[styles.totalValue, ds.textSize(isMobile, 16, 18)]}>
              ₹{totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {belowMinimum && (
          <View style={[styles.warningCard, ds.warningCard(isMobile)]}>
            <Text style={[styles.warningText, ds.warningText(isMobile)]}>
              {t.priceBreakdown.addMorePrefix} ₹{(minimumOrder - cartTotal).toFixed(0)} {t.priceBreakdown.addMoreSuffix}
            </Text>
          </View>
        )}
      </View>

      {(coupons.length > 0 || policyText) && (
        <View style={[styles.card, ds.card(isMobile), styles.gap8]}>
          <Text style={[styles.offerTitle, ds.textSize(isMobile, 15, 16)]}>{t.offersTitle}</Text>
          {coupons.slice(0, 3).map(c => (
            <Text key={c.code} style={[styles.offerText, ds.textSize(isMobile, 12, 13)]}>
              {c.code} {t.coupon.separator} {c.type === "flat" ? `₹${c.amount}` : `${c.amount}%`} {t.coupon.offSuffix} {t.coupon.separator} {t.coupon.minPrefix} ₹{c.minCart}
            </Text>
          ))}
          {policyText ? (
            <Text style={[styles.policyText, ds.textSize(isMobile, 12, 13)]}>{policyText}</Text>
          ) : null}
        </View>
      )}

      {error && (
        <View style={[styles.warningCard, ds.errorCard(isMobile)]}>
          <Text style={[styles.warningText, ds.errorText(isMobile)]}>
            {error}
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={busy || belowMinimum}
        style={({ pressed, hovered }) => [
          styles.submitBtn,
          ds.submitBtn(isMobile, busy, belowMinimum, hovered, pressed),
        ]}
      >
        {() => (
          <View style={styles.submitRow}>
            {busy && <ActivityIndicator size="small" color={foodComponentsColors.spinner} />}
            <Text style={[styles.submitText, ds.submitText(isMobile, busy || belowMinimum)]}>
              {busy ? t.submit.placing : t.submit.place}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
