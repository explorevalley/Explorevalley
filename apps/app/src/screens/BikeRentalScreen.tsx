import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiGet, apiPost, resolveAssetUrl } from "../lib/api";

type BikeRental = {
  id: string;
  name: string;
  location: string;
  bikeType?: string;
  maxDays?: number;
  pricePerHour?: number;
  pricePerDay?: number;
  availableQty?: number;
  securityDeposit?: number;
  helmetIncluded?: boolean;
  image?: string;
  active?: boolean;
};

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function BikeRentalScreen({ onRequireAuth }: { onRequireAuth?: () => void }) {
  const [rows, setRows] = useState<BikeRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<BikeRental | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState("1");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const isWeb = Platform.OS === "web";
  const DatePicker = isWeb ? require("react-datepicker").default : null;

  useEffect(() => {
    if (isWeb) {
      require("react-datepicker/dist/react-datepicker.css");
    }
  }, [isWeb]);

  useEffect(() => {
    if (!isWeb || typeof document === "undefined") return;
    if (document.getElementById("ev-bike-datepicker-style")) return;
    const style = document.createElement("style");
    style.id = "ev-bike-datepicker-style";
    style.textContent = `
      .ev-bike-datepicker { width: 100%; border: 0; outline: none; font-weight: 600; color: #111; }
      .ev-bike-datepicker-popper { z-index: 3000 !important; }
    `;
    document.head.appendChild(style);
  }, [isWeb]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<BikeRental[]>("/api/bike-rentals")
      .then((list) => {
        if (!alive) return;
        setRows(Array.isArray(list) ? list.filter((x) => x && x.active !== false) : []);
        setError("");
      })
      .catch((err) => {
        if (!alive) return;
        setRows([]);
        setError(String(err?.message || err));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUserName(String(window.localStorage.getItem("ev_bike_name") || ""));
    setPhone(String(window.localStorage.getItem("ev_bike_phone") || ""));
  }, []);

  const computedDays = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, diffDays);
  }, [startDate, endDate]);

  const computedFare = useMemo(() => {
    const selectedQty = Math.max(1, Number(qty || 1));
    if (!selected) return 0;
    const perDay = Number(selected.pricePerDay || 0);
    return Math.round((perDay * computedDays * selectedQty) * 100) / 100;
  }, [computedDays, qty, selected]);

  const handleBook = async () => {
    if (!selected) {
      setNotice("Select a bike first.");
      return;
    }
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }

    const normalizedName = safeText(userName);
    const normalizedPhone = safeText(phone);
    const selectedDays = computedDays;
    const selectedQty = Math.max(1, Number(qty || 1));

    if (endDate < startDate) {
      setNotice("End date cannot be before start date.");
      return;
    }

    if (!normalizedName || !normalizedPhone) {
      setNotice("Enter your name and phone number.");
      return;
    }
    if (Number(selected.maxDays || 0) > 0 && selectedDays > Number(selected.maxDays || 0)) {
      setNotice(`Maximum rental for this bike is ${Number(selected.maxDays)} day(s).`);
      return;
    }
    if (selectedQty > Math.max(0, Number(selected.availableQty || 0))) {
      setNotice("Selected quantity is not available.");
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      const response = await apiPost<{ success: boolean; id: string }>("/api/bike-bookings/book", {
        bikeRentalId: selected.id,
        userName: normalizedName,
        phone: normalizedPhone,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        days: selectedDays,
        hours: selectedDays * 24,
        qty: selectedQty
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ev_bike_name", normalizedName);
        window.localStorage.setItem("ev_bike_phone", normalizedPhone);
      }
      setNotice(`Booking created. ID: ${safeText(response?.id)}`);
      setRows((prev) => prev.map((x) => x.id === selected.id ? { ...x, availableQty: Math.max(0, Number(x.availableQty || 0) - selectedQty) } : x));
      setBookingOpen(false);
    } catch (err: any) {
      setNotice(String(err?.message || err || "Booking failed."));
    } finally {
      setBusy(false);
    }
  };

  const handleSelectBike = (bike: BikeRental) => {
    if (selected?.id === bike.id && bookingOpen) {
      setBookingOpen(false);
      return;
    }
    setSelected(bike);
    setNotice("");
    setBookingOpen(true);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.kicker}>BIKE</Text>
        <Text style={styles.title}>Rent a Bike</Text>
        <Text style={styles.subTitle}>Choose your bike, rental duration, and pickup time.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#111" />
          <Text style={styles.muted}>Loading bikes…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {rows.map((bike) => {
          const isSelected = selected?.id === bike.id;
          return (
              <View key={bike.id} style={styles.cardShell}>
                <Pressable onPress={() => handleSelectBike(bike)} style={[styles.card, isSelected ? styles.cardSelected : null]}>
                <Text style={styles.cardTitle}>{safeText(bike.name) || "Bike"}</Text>
                <Text style={styles.cardMeta}>{safeText(bike.location)} • {safeText(bike.bikeType || "Bike")}</Text>
                <Text style={styles.cardPrice}>INR {Number(bike.pricePerDay || 0)}/day</Text>
                <Text style={styles.cardMeta}>Available: {Math.max(0, Number(bike.availableQty || 0))}</Text>
                {Number(bike.maxDays || 0) > 0 ? <Text style={styles.cardMeta}>Max rental: {Number(bike.maxDays)} day(s)</Text> : null}
                {bike.securityDeposit ? <Text style={styles.cardMeta}>Deposit: INR {Number(bike.securityDeposit || 0)}</Text> : null}
                {bike.helmetIncluded ? <Text style={styles.cardMeta}>Helmet included</Text> : null}
                {!!safeText(bike.image) ? (
                  <Text style={styles.cardMeta}>Image: {resolveAssetUrl(safeText(bike.image))}</Text>
                ) : null}
                <Text style={styles.chevron}>{selected?.id === bike.id && bookingOpen ? "▲" : "▼"}</Text>
              </Pressable>

              {isSelected && bookingOpen ? (
                <View style={[styles.bookingCard, styles.bookingCardInline]}>
                  <Text style={styles.sectionTitle}>Booking details</Text>
                  <TextInput value={userName} onChangeText={setUserName} placeholder="Your name" style={styles.input} />
                  <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" style={styles.input} />
                  <Text style={styles.fieldLabel}>How many bikes do you want to rent?</Text>
                  <TextInput value={qty} onChangeText={setQty} placeholder="How many bikes" keyboardType="number-pad" style={styles.input} />

                  {Platform.OS === "web" ? (
                    DatePicker ? (
                      <View style={styles.dateRangeRow}>
                        <View style={styles.dateRangeField}>
                          <Text style={styles.fieldLabel}>Start Date</Text>
                          <View style={styles.datePickerWrap}>
                            <DatePicker
                              selected={startDate}
                              onChange={(d: Date | null) => {
                                if (!d) return;
                                setStartDate(d);
                                if (endDate < d) setEndDate(d);
                              }}
                              dateFormat="yyyy-MM-dd"
                              className="ev-bike-datepicker"
                              popperClassName="ev-bike-datepicker-popper"
                              onCalendarOpen={() => setDatePickerOpen(true)}
                              onCalendarClose={() => setDatePickerOpen(false)}
                            />
                          </View>
                        </View>
                        <View style={styles.dateRangeField}>
                          <Text style={styles.fieldLabel}>End Date</Text>
                          <View style={styles.datePickerWrap}>
                            <DatePicker
                              selected={endDate}
                              onChange={(d: Date | null) => {
                                if (!d) return;
                                setEndDate(d);
                              }}
                              minDate={startDate}
                              dateFormat="yyyy-MM-dd"
                              className="ev-bike-datepicker"
                              popperClassName="ev-bike-datepicker-popper"
                              onCalendarOpen={() => setDatePickerOpen(true)}
                              onCalendarClose={() => setDatePickerOpen(false)}
                            />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.dateRangeRow}>
                        <TextInput
                          value={formatDate(startDate)}
                          onChangeText={(value) => {
                            const d = new Date(`${value}T09:00:00`);
                            if (!Number.isFinite(d.getTime())) return;
                            setStartDate(d);
                            if (endDate < d) setEndDate(d);
                          }}
                          placeholder="Start YYYY-MM-DD"
                          style={[styles.input, styles.dateRangeField]}
                        />
                        <TextInput
                          value={formatDate(endDate)}
                          onChangeText={(value) => {
                            const d = new Date(`${value}T09:00:00`);
                            if (Number.isFinite(d.getTime())) setEndDate(d);
                          }}
                          placeholder="End YYYY-MM-DD"
                          style={[styles.input, styles.dateRangeField]}
                        />
                      </View>
                    )
                  ) : (
                    <View style={styles.dateRangeColumn}>
                      <View style={styles.dateRangeField}>
                        <Text style={styles.fieldLabel}>Start Date</Text>
                        <Pressable onPress={() => setShowStartPicker(true)} style={styles.input}>
                          <Text>{formatDate(startDate)}</Text>
                        </Pressable>
                        {showStartPicker ? (
                          <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={(_event, selectedDate) => {
                              setShowStartPicker(false);
                              if (!selectedDate) return;
                              setStartDate(selectedDate);
                              if (endDate < selectedDate) setEndDate(selectedDate);
                            }}
                          />
                        ) : null}
                      </View>
                      <View style={styles.dateRangeField}>
                        <Text style={styles.fieldLabel}>End Date</Text>
                        <Pressable onPress={() => setShowEndPicker(true)} style={styles.input}>
                          <Text>{formatDate(endDate)}</Text>
                        </Pressable>
                        {showEndPicker ? (
                          <DateTimePicker
                            value={endDate}
                            mode="date"
                            display="default"
                            onChange={(_event, selectedDate) => {
                              setShowEndPicker(false);
                              if (selectedDate) setEndDate(selectedDate);
                            }}
                          />
                        ) : null}
                      </View>
                    </View>
                  )}

                  <Text style={styles.metaText}>Rental days: {computedDays}</Text>
                  <Text style={styles.total}>Estimated Total: INR {computedFare}</Text>

                  <View style={styles.actions}>
                    <Pressable onPress={() => setBookingOpen(false)} style={[styles.actionBtn, styles.actionGhost]}>
                      <Text style={styles.actionGhostText}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleBook} disabled={busy} style={[styles.actionBtn, styles.actionPrimary, busy ? { opacity: 0.7 } : null]}>
                      <Text style={styles.actionPrimaryText}>{busy ? "Booking..." : "Book Bike"}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
        {!loading && rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.muted}>No bike rentals available yet.</Text>
          </View>
        ) : null}
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  content: { paddingTop: 92, paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  headerCard: { backgroundColor: "#111", borderRadius: 14, padding: 14 },
  kicker: { color: "#9ef1a6", fontWeight: "800", fontSize: 12 },
  title: { color: "#fff", fontWeight: "800", fontSize: 24, marginTop: 4 },
  subTitle: { color: "#ddd", marginTop: 4 },
  loadingCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e5e5e5", gap: 8 },
  muted: { color: "#666" },
  errorCard: { backgroundColor: "#fff3f3", borderColor: "#f6b3b3", borderWidth: 1, borderRadius: 12, padding: 10 },
  errorText: { color: "#a11" },
  grid: { gap: 10 },
  cardShell: { gap: 8 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e5e5e5", gap: 4 },
  cardSelected: { borderColor: "#111", borderWidth: 2 },
  chevron: { color: "#666", fontSize: 14, textAlign: "right", marginTop: -4 },
  cardTitle: { fontWeight: "800", color: "#111", fontSize: 16 },
  cardMeta: { color: "#444", fontSize: 12 },
  cardPrice: { color: "#0b5", fontWeight: "700", marginTop: 2 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e5e5e5" },
  bookBtn: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  bookBtnText: { color: "#fff", fontWeight: "800" },
  notice: { color: "#111", fontWeight: "600" },
  bookingCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e5e5", padding: 12, gap: 8 },
  bookingCardInline: { marginTop: 0, zIndex: 1 },
  bookingCardOpen: { zIndex: 2500 },
  dateRangeRow: { flexDirection: "row", gap: 8 },
  dateRangeColumn: { gap: 8 },
  dateRangeField: { flex: 1 },
  fieldLabel: { color: "#333", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  datePickerWrap: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#fafafa"
  },
  sectionTitle: { fontWeight: "800", fontSize: 15, color: "#111" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#fafafa" },
  metaText: { marginTop: 2, color: "#333", fontWeight: "600" },
  total: { marginTop: 4, fontWeight: "700", color: "#111" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 6 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  actionGhost: { borderWidth: 1, borderColor: "#bbb", backgroundColor: "#fff" },
  actionPrimary: { backgroundColor: "#111" },
  actionGhostText: { color: "#111", fontWeight: "700" },
  actionPrimaryText: { color: "#fff", fontWeight: "800" }
});
