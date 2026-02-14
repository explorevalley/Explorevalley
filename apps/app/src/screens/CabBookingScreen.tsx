import React, { useEffect, useMemo, useState } from "react";
import { Animated, View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { apiGet, apiPost, trackEvent } from "../lib/api";
import PlaceInput from "../components/PlaceInput";
import { getAuthMode } from "../lib/auth";
import { trackOrder } from "../lib/orders";
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function CabBookingScreen({ onClose }: { onClose?: () => void }) {
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [datetime, setDatetime] = useState("2026-03-15 10:30");
  const [passengers, setPassengers] = useState("2");
  const [meta, setMeta] = useState<any>(null);
  const [serviceAreaId, setServiceAreaId] = useState("");

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiGet<any>("/api/meta")
      .then((data) => {
        setMeta(data);
        const areas = (data?.serviceAreas || []).filter((a: any) => a.enabled);
        if (areas.length && !serviceAreaId) {
          setServiceAreaId(areas[0].id);
        }
      })
      .catch(() => {
        setMeta(null);
      });
  }, []);

  const serviceAreas = (meta?.serviceAreas || []).filter((a: any) => a.enabled);
  const cabPricing = meta?.cabPricing;
  const cabLocations = Array.isArray(meta?.cabLocations) ? meta.cabLocations : [];
  const paxCount = Math.max(1, parseInt(passengers || "1", 10));

  const payload = useMemo(() => {
    return {
      userName,
      phone,
      pickupLocation,
      dropLocation,
      datetime,
      passengers: paxCount,
      serviceAreaId
    };
  }, [userName, phone, pickupLocation, dropLocation, datetime, paxCount, serviceAreaId]);

  async function submit() {
    setErr(null);
    setResult(null);
    if (getAuthMode() !== "authenticated") {
      setErr("Please login with Google before placing a cab booking.");
      return;
    }
    trackEvent({
      type: "cab_booking_intent",
      category: "transaction",
      name: userName,
      phone,
      meta: {
        passengers: paxCount,
        estimatedFare: "computed_by_backend",
        paymentMethod: "pending"
      }
    });
    trackEvent({
      type: "ride_route_selected",
      category: "location",
      name: userName,
      phone,
      meta: {
        pickupDropLocations: [pickupLocation, dropLocation].filter(Boolean),
        routeHistory: [{ from: pickupLocation, to: dropLocation, at: datetime }]
      }
    });
    setBusy(true);
    try {
      const r = await apiPost<{ success: boolean; id: string }>("/api/cab-bookings", payload);
      setResult(r);
      trackOrder("cab", r.id);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 16 }}>
      <View style={{ backgroundColor: "#0b0b0b", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#1f1f1f", maxWidth: 1280, alignSelf: "center", width: "100%" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "#fff", fontSize: 25, fontWeight: "800" }}>Book a Cab</Text>
          {onClose ? (
            <HoverScale onPress={onClose} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "#222" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 22 }}>Close</Text>
            </HoverScale>
          ) : null}
        </View>
        <Text style={{ color: "#9b9b9b", marginTop: 4, fontSize: 20, fontWeight: "700" }}>
          Fast pickups, verified drivers, and transparent pricing.
        </Text>

        <View style={{ marginTop: 10, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8, width: "92%", alignSelf: "center" }}>
            <View style={{ flex: 1 }}>
              <Field label="Name" value={userName} onChangeText={setUserName} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>
          {serviceAreas.length > 0 && (
            <View style={{ width: "92%", alignSelf: "center" }}>
              <Text style={{ color: "#ddd", marginBottom: 4, fontSize: 22, fontWeight: "700" }}>Service Area</Text>
              <View style={{ borderRadius: 10, borderWidth: 1, borderColor: "#222", backgroundColor: "#141414", overflow: "hidden" }}>
                {serviceAreas.map((a: any, i: number) => (
                  <Pressable
                    key={a.id}
                    onPress={() => setServiceAreaId(a.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderBottomWidth: i < serviceAreas.length - 1 ? 1 : 0,
                      borderBottomColor: "#222",
                      backgroundColor: serviceAreaId === a.id ? "#1a3a1a" : "transparent"
                    }}
                  >
                    <Text style={{ color: serviceAreaId === a.id ? "#f5f2e8" : "#aaa", fontWeight: "700", fontSize: 20 }}>
                      {a.name} · {a.city}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <View style={{ width: "92%", alignSelf: "center" }}>
            <PlaceInput
              label="Pickup Location"
              value={pickupLocation}
              onChangeText={setPickupLocation}
              suggestions={cabLocations}
              labelStyle={{ fontSize: 22, fontWeight: "700" }}
              inputStyle={{ fontSize: 22, fontWeight: "700", paddingVertical: 6 }}
            />
          </View>
          <View style={{ width: "92%", alignSelf: "center" }}>
            <PlaceInput
              label="Drop Location"
              value={dropLocation}
              onChangeText={setDropLocation}
              suggestions={cabLocations}
              labelStyle={{ fontSize: 22, fontWeight: "700" }}
              inputStyle={{ fontSize: 22, fontWeight: "700", paddingVertical: 6 }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, width: "92%", alignSelf: "center" }}>
            <View style={{ flex: 1.2 }}>
              <Field label="Date & Time" value={datetime} onChangeText={setDatetime} />
            </View>
            <View style={{ flex: 0.8 }}>
              <Field label="Passengers" value={passengers} onChangeText={setPassengers} keyboardType="numeric" />
            </View>
          </View>{(cabPricing || meta?.policies) && (
            <View style={{ backgroundColor: "#0f0f0f", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#222", width: "92%", alignSelf: "center" }}>
              {/* Pricing formula intentionally hidden in UI. */}
            </View>
          )}
        </View>

        {err ? <Text style={{ color: "#ff6b6b", marginTop: 10, fontSize: 20, fontWeight: "700" }}>{err}</Text> : null}
        {result ? (
          <Text style={{ color: "#9ef1a6", marginTop: 10, fontSize: 20, fontWeight: "700" }}>
            Submitted! ID: {result.id}
            {typeof result.estimatedFare === "number" ? ` | Fare: INR ${result.estimatedFare.toFixed(0)}` : ""}
          </Text>
        ) : null}

        <HoverScale
          disabled={busy}
          onPress={submit}
          style={{
            marginTop: 12,
            backgroundColor: "#f5f2e8",
            paddingVertical: 10,
            paddingHorizontal: 24,
            borderRadius: 12,
            alignItems: "center",
            alignSelf: "flex-start",
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={{ fontWeight: "800", color: "#1c1c1c", fontSize: 22 }}>{busy ? "Submitting…" : "Confirm Cab Booking"}</Text>
        </HoverScale>
      </View>

    </ScrollView>
  );
}

function Field({ label, ...props }: any) {
  const focusAnim = React.useRef(new Animated.Value(0)).current;
  function onFocus(e: any) {
    Animated.timing(focusAnim, { toValue: 1, duration: 160, useNativeDriver: false }).start();
    props?.onFocus?.(e);
  }
  function onBlur(e: any) {
    Animated.timing(focusAnim, { toValue: 0, duration: 160, useNativeDriver: false }).start();
    props?.onBlur?.(e);
  }
  return (
    <View>
      <Text style={{ color: "#ddd", marginBottom: 4, fontSize: 22, fontWeight: "700" }}>{label}</Text>
      <AnimatedTextInput
        {...props}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholderTextColor="#666"
        style={{
          backgroundColor: "#141414",
          color: "#fff",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: focusAnim.interpolate({ inputRange: [0, 1], outputRange: ["#222", "#f5f2e8"] }),
          fontSize: 22,
          fontWeight: "700",
        }}
      />
    </View>
  );
}

function HoverScale({ children, onPress, style, disabled }: any) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, friction: 7, tension: 120 }).start();
  const withHoverText = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === Text) {
      const typedChild = child as React.ReactElement<any>;
      return React.cloneElement(typedChild, {
        style: [typedChild.props.style, hovered ? { color: "#fff" } : null],
      });
    }
    return child;
  });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onHoverIn={() => { setHovered(true); to(1.04); }}
        onHoverOut={() => { setHovered(false); to(1); }}
        onPressIn={() => to(0.98)}
        onPressOut={() => to(1)}
        style={[style, hovered ? { backgroundColor: "#007c00", borderColor: "#007c00" } : null]}
      >
        {withHoverText}
      </Pressable>
    </Animated.View>
  );
}




