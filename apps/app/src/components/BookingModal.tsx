import React, { useMemo, useState } from "react";
import { Modal, View, Text, Pressable, TextInput, Platform } from "react-native";
import { apiPost } from "../lib/api";

export default function BookingModal({ visible, onClose, item }: any) {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState("2");

  const [checkIn, setCheckIn] = useState("2026-03-15");
  const [checkOut, setCheckOut] = useState("2026-03-18");
  const [tourDate, setTourDate] = useState("2026-03-20");
  const [roomType, setRoomType] = useState(item.kind === "hotel" ? (item.raw.roomTypes?.[0]?.type || "") : "");

  const [specialRequests, setSpecialRequests] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const isHotel = item.kind === "hotel";

  const payload = useMemo(() => {
    const g = Math.max(1, parseInt(guests || "1", 10));
    if (isHotel) {
      return { type: "hotel", itemId: item.id, userName, email, phone, guests: g, checkIn, checkOut, roomType, specialRequests };
    }
    return { type: "tour", itemId: item.id, userName, email, phone, guests: g, tourDate, specialRequests };
  }, [isHotel, item, userName, email, phone, guests, checkIn, checkOut, roomType, tourDate, specialRequests]);

  async function submit() {
    setErr(null);
    setResult(null);
    setBusy(true);
    try {
      const r = await apiPost<{ success: boolean; id: string }>("/api/bookings", payload);
      setResult(r);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#0b0b0b", padding: 18, paddingTop: Platform.select({ ios: 48, default: 18 }) }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Book: {item.title}</Text>
          <Pressable onPress={onClose}><Text style={{ color: "#fff" }}>Close</Text></Pressable>
        </View>

        <Text style={{ color: "#aaa", marginTop: 8 }}>GST is calculated server-side (Indian GST rules).</Text>

        <View style={{ marginTop: 16, gap: 10 }}>
          <Field label="Name" value={userName} onChangeText={setUserName} />
          <Field label="Email" value={email} onChangeText={setEmail} />
          <Field label="Phone" value={phone} onChangeText={setPhone} />
          <Field label="Guests" value={guests} onChangeText={setGuests} keyboardType="numeric" />

          {isHotel ? (
            <>
              <Field label="Check-in (YYYY-MM-DD)" value={checkIn} onChangeText={setCheckIn} />
              <Field label="Check-out (YYYY-MM-DD)" value={checkOut} onChangeText={setCheckOut} />
              <Field label="Room Type (exact)" value={roomType} onChangeText={setRoomType} />
            </>
          ) : (
            <Field label="Tour Date (YYYY-MM-DD)" value={tourDate} onChangeText={setTourDate} />
          )}

          <Field label="Special Requests" value={specialRequests} onChangeText={setSpecialRequests} multiline />
        </View>

        {err ? <Text style={{ color: "#ff6b6b", marginTop: 12 }}>{err}</Text> : null}
        {result ? <Text style={{ color: "#9ef1a6", marginTop: 12 }}>✅ Submitted! ID: {result.id}</Text> : null}

        <Pressable
          disabled={busy}
          onPress={submit}
          style={{ marginTop: 18, backgroundColor: "#fff", paddingVertical: 14, borderRadius: 14, alignItems: "center", opacity: busy ? 0.6 : 1 }}
        >
          <Text style={{ fontWeight: "800" }}>{busy ? "Submitting…" : "Confirm Booking"}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function Field({ label, ...props }: any) {
  return (
    <View>
      <Text style={{ color: "#ddd", marginBottom: 6 }}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#666"
        style={{
          backgroundColor: "#141414",
          color: "#fff",
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#222"
        }}
      />
    </View>
  );
}
