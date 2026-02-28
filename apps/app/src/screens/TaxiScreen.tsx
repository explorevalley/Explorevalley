import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Platform, TextInput, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiGet } from "../lib/api";

type CabRate = {
  id?: string;
  origin?: string;
  destination?: string;
  routeLabel?: string;
  ordinary4_1?: number;
  luxury4_1?: number;
  ordinary6_1?: number;
  luxury6_1?: number;
  traveller?: number;
};

type CabSelection = {
  key: string;
  label: string;
  price: number;
  maxPeople: number | null;
};

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TaxiScreen({ onRequireAuth }: { onRequireAuth?: () => void }) {
  const [rates, setRates] = useState<CabRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [dateTime, setDateTime] = useState(new Date());
  const [dateTimeText, setDateTimeText] = useState(formatDateTime(new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [submitNote, setSubmitNote] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [passengerCount, setPassengerCount] = useState("1");
  const [selectedCab, setSelectedCab] = useState<CabSelection | null>(null);
  const [bookingNotice, setBookingNotice] = useState("");
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
    if (document.getElementById("ev-datepicker-style")) return;
    const style = document.createElement("style");
    style.id = "ev-datepicker-style";
    style.textContent = `
      .ev-datepicker { width: 100%; border: 0; outline: none; font-weight: 600; color: #111; }
      .ev-datepicker-popper { z-index: 3000 !important; }
    `;
    document.head.appendChild(style);
  }, [isWeb]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedName = String(window.localStorage.getItem("ev_taxi_name") || "");
    const savedPhone = String(window.localStorage.getItem("ev_taxi_phone") || "");
    setCustomerName(savedName);
    setCustomerPhone(savedPhone);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<CabRate[]>("/api/cab-rates")
      .then((rows) => {
        if (!alive) return;
        setRates(Array.isArray(rows) ? rows : []);
        setError("");
      })
      .catch((err) => {
        if (!alive) return;
        setError(String(err?.message || err));
        setRates([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const origins = useMemo(() => {
    const list = Array.from(new Set(rates.map((r) => safeText(r.origin)).filter(Boolean)));
    return list.sort((a, b) => a.localeCompare(b));
  }, [rates]);

  const destinations = useMemo(() => {
    if (!origin) return [];
    const list = Array.from(new Set(
      rates.filter((r) => safeText(r.origin).toLowerCase() === origin.toLowerCase())
        .map((r) => safeText(r.destination))
        .filter(Boolean)
    ));
    return list.sort((a, b) => a.localeCompare(b));
  }, [rates, origin]);

  useEffect(() => {
    if (!origin) {
      setDestination("");
      return;
    }
    if (destination && destinations.some((d) => d.toLowerCase() === destination.toLowerCase())) return;
    setDestination(destinations[0] || "");
  }, [origin, destination, destinations]);

  const selectedRate = useMemo(() => {
    if (!origin || !destination) return null;
    return rates.find(
      (r) =>
        safeText(r.origin).toLowerCase() === origin.toLowerCase() &&
        safeText(r.destination).toLowerCase() === destination.toLowerCase()
    ) || null;
  }, [rates, origin, destination]);

  const fareOptions = useMemo(() => {
    if (!selectedRate) return [] as CabSelection[];
    const out: CabSelection[] = [];
    const options = [
      { key: "ordinary4_1", label: "Ordinary 4+1", maxPeople: 5 },
      { key: "luxury4_1", label: "Luxury 4+1", maxPeople: 5 },
      { key: "ordinary6_1", label: "Ordinary 6+1", maxPeople: 7 },
      { key: "luxury6_1", label: "Luxury 6+1", maxPeople: 7 },
      { key: "traveller", label: "Traveller", maxPeople: null }
    ] as const;

    for (const opt of options) {
      const price = Number((selectedRate as any)[opt.key]);
      if (Number.isFinite(price) && price >= 0) {
        out.push({ key: opt.key, label: opt.label, price, maxPeople: opt.maxPeople });
      }
    }

    return out;
  }, [selectedRate]);

  useEffect(() => {
    setSelectedCab(null);
    setBookingOpen(false);
    setPassengerCount("1");
  }, [origin, destination]);

  function onSelectCab(option: CabSelection) {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    setSelectedCab(option);
    setPassengerCount("1");
    setSubmitNote("");
    setBookingOpen(true);
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, isWeb ? styles.contentWeb : null]}
    >
      <View style={styles.headerCard}>
        <Text style={styles.kicker}>TAXI</Text>
        <Text style={styles.title}>Book a Taxi</Text>
        <Text style={styles.subTitle}>Choose your origin, destination, and time to see live rates.</Text>
      </View>

      <View style={[styles.formCard, datePickerOpen ? styles.formCardOpen : null]}>
        <Text style={styles.sectionLabel}>Trip details</Text>
        {loading ? <Text style={styles.muted}>Loading routes…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <SelectField
          label="Origin"
          value={origin}
          placeholder="Select origin"
          options={origins}
          onSelect={setOrigin}
        />
        <SelectField
          label="Destination"
          value={destination}
          placeholder={origin ? "Select destination" : "Select origin first"}
          options={destinations}
          onSelect={setDestination}
          disabled={!origin}
        />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date & time</Text>
          {isWeb ? (
            DatePicker ? (
              <View style={styles.datePickerWrap}>
                <DatePicker
                  selected={dateTime}
                  onChange={(d: Date | null) => {
                    if (!d) return;
                    setDateTime(d);
                    setDateTimeText(formatDateTime(d));
                  }}
                  showTimeSelect
                  dateFormat="yyyy-MM-dd HH:mm"
                  className="ev-datepicker"
                  popperClassName="ev-datepicker-popper"
                  onCalendarOpen={() => setDatePickerOpen(true)}
                  onCalendarClose={() => setDatePickerOpen(false)}
                />
              </View>
            ) : (
              <TextInput
                value={dateTimeText}
                onChangeText={(v) => {
                  setDateTimeText(v);
                  const d = new Date(v.replace(" ", "T"));
                  if (Number.isFinite(d.getTime())) setDateTime(d);
                }}
                placeholder="YYYY-MM-DD HH:mm"
                style={styles.input}
              />
            )
          ) : (
            <>
              <Pressable onPress={() => setShowPicker(true)} style={styles.input}>
                <Text style={styles.inputText}>{formatDateTime(dateTime)}</Text>
              </Pressable>
              {showPicker ? (
                <DateTimePicker
                  value={dateTime}
                  mode="datetime"
                  display="default"
                  onChange={(_event, selected) => {
                    setShowPicker(false);
                    if (selected) {
                      setDateTime(selected);
                      setDateTimeText(formatDateTime(selected));
                    }
                  }}
                />
              ) : null}
            </>
          )}
        </View>

        {submitNote ? <Text style={styles.submitNote}>{submitNote}</Text> : null}
      </View>

      <View style={styles.resultsCard}>
        <Text style={styles.sectionLabel}>Rates</Text>
        {!origin || !destination ? (
          <Text style={styles.muted}>Select an origin and destination to view rates.</Text>
        ) : !selectedRate ? (
          <Text style={styles.muted}>No rates available for this route.</Text>
        ) : (
              <>
            {safeText(selectedRate.routeLabel) ? (
              <Text style={styles.routeLabel}>{safeText(selectedRate.routeLabel)}</Text>
            ) : null}
            <View style={styles.rateGrid}>
              {fareOptions.map((opt) => (
                <RateCard
                  key={opt.key}
                  title={opt.label}
                  price={opt.price}
                  selected={selectedCab?.key === opt.key}
                  onPress={() => onSelectCab(opt)}
                />
              ))}
            </View>
          </>
        )}
      </View>

      {bookingOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Booking</Text>
            <Text style={styles.modalSub}>Please confirm selected cab and enter your details.</Text>
            {submitNote ? <Text style={styles.submitNote}>{submitNote}</Text> : null}
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Cab type</Text>
              <Text style={styles.modalRowValue}>{selectedCab?.label || "Not selected"}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Route</Text>
              <Text style={styles.modalRowValue}>
                {safeText(origin)} → {safeText(destination)}
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Fare</Text>
              <Text style={styles.modalRowValue}>INR {selectedCab ? selectedCab.price : 0}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Maximum people</Text>
              <Text style={styles.modalRowValue}>
                {selectedCab?.maxPeople ? `${selectedCab.maxPeople} person(s)` : "As per vehicle capacity"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Number of people</Text>
              <TextInput
                value={passengerCount}
                onChangeText={(v) => setPassengerCount(v.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 2"
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Your name"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setBookingOpen(false);
                  setSubmitNote("");
                }}
                style={styles.modalBtnGhost}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!customerName.trim() || !customerPhone.trim()) {
                    setSubmitNote("Please enter your name and phone.");
                    return;
                  }
                  const count = Number(passengerCount || "0");
                  if (!passengerCount || !Number.isFinite(count) || count < 1) {
                    setSubmitNote("Please enter a valid number of people.");
                    return;
                  }
                  if (selectedCab?.maxPeople && count > selectedCab.maxPeople) {
                    setSubmitNote(`Please choose up to ${selectedCab.maxPeople} people for this cab.`);
                    return;
                  }
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("ev_taxi_name", customerName.trim());
                    window.localStorage.setItem("ev_taxi_phone", customerPhone.trim());
                  }
                  setSubmitNote("");
                  setBookingOpen(false);
                  setBookingNotice("Booking confirmed.");
                  setTimeout(() => setBookingNotice(""), 3500);
                }}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnText}>Confirm booking</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {bookingNotice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{bookingNotice}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  options,
  onSelect,
  disabled
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={() => !disabled && setOpen((v) => !v)}
        style={[styles.input, disabled ? styles.inputDisabled : null]}
      >
        <Text style={styles.inputText}>{value || placeholder}</Text>
      </Pressable>
      {open ? (
        <View style={styles.dropdown}>
          {options.length === 0 ? (
            <Text style={styles.muted}>No options</Text>
          ) : (
            options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownText}>{opt}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function RateCard({
  title,
  price,
  selected,
  onPress
}: {
  title: string;
  price: number;
  selected?: boolean;
  onPress: () => void;
}) {
  if (price === undefined || price === null || Number.isNaN(Number(price))) {
    return (
      <View style={[styles.rateCard, styles.rateCardMuted]}>
        <Text style={styles.rateTitle}>{title}</Text>
        <Text style={styles.ratePriceMuted}>N/A</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rateCard, selected ? styles.rateCardSelected : null, pressed ? { opacity: 0.95 } : null]}
    >
      <Text style={styles.rateTitle}>{title}</Text>
      <Text style={styles.ratePrice}>INR {Number(price)}</Text>
      <Text style={styles.rateAction}>{selected ? "Selected" : "Tap to select"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent"
  },
  content: {
    paddingTop: 110,
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 14
  },
  contentWeb: {
    maxWidth: 860,
    alignSelf: "center",
    width: "100%"
  },
  headerCard: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#ffffff"
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.4,
    color: "#111",
    fontWeight: "800"
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#000"
  },
  subTitle: {
    marginTop: 6,
    color: "#333",
    fontSize: 13.5
  },
  formCard: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#ffffff",
    gap: 10
  },
  formCardOpen: {
    paddingBottom: 220
  },
  resultsCard: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#ffffff",
    gap: 10
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000"
  },
  field: {
    gap: 6
  },
  fieldLabel: {
    color: "#222",
    fontWeight: "700",
    fontSize: 12
  },
  input: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  datePickerWrap: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 5
  },
  inputText: {
    color: "#111",
    fontWeight: "600"
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ededed"
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    padding: 8,
    backgroundColor: "#fff",
    gap: 6
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f7f7f7"
  },
  dropdownText: {
    color: "#111",
    fontWeight: "600"
  },
  muted: {
    color: "#666",
    fontSize: 12.5
  },
  bookBtn: {
    marginTop: 6,
    backgroundColor: "#000000",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    alignItems: "center"
  },
  bookBtnDisabled: {
    backgroundColor: "#444444"
  },
  bookBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12
  },
  submitNote: {
    marginTop: 6,
    color: "#0a7a45",
    fontSize: 12.5
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    gap: 10
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000"
  },
  modalSub: {
    fontSize: 12.5,
    color: "#444444"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6
  },
  modalBtn: {
    backgroundColor: "#000000",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14
  },
  modalBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12.5
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: "#d1d1d1",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14
  },
  modalBtnGhostText: {
    color: "#111111",
    fontWeight: "700",
    fontSize: 12.5
  },
  notice: {
    position: "absolute",
    right: 18,
    top: 120,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  noticeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12.5
  },
  error: {
    color: "#b42318",
    fontSize: 12.5
  },
  routeLabel: {
    color: "#0a7a45",
    fontWeight: "800"
  },
  rateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  rateCard: {
    flexBasis: 160,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#ffffff"
  },
  rateCardSelected: {
    borderColor: "#111",
    backgroundColor: "#f5f5f5"
  },
  rateAction: {
    marginTop: 7,
    color: "#666",
    fontSize: 11,
    fontWeight: "700"
  },
  rateCardMuted: {
    backgroundColor: "#fafafa"
  },
  rateTitle: {
    fontWeight: "800",
    color: "#111",
    fontSize: 12
  },
  ratePrice: {
    marginTop: 6,
    fontWeight: "800",
    color: "#000"
  },
  ratePriceMuted: {
    marginTop: 6,
    fontWeight: "700",
    color: "#777"
  },
  modalRow: {
    borderTopWidth: 1,
    borderTopColor: "#ececec",
    paddingTop: 8,
    gap: 2
  },
  modalRowLabel: {
    color: "#666",
    fontSize: 11,
    fontWeight: "700"
  },
  modalRowValue: {
    color: "#111",
    fontWeight: "700"
  }
});
