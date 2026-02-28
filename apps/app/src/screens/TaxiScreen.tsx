import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Platform, TextInput } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiGet } from "../lib/api";
import { styles } from "../styles/TaxiScreen.styles";
import { taxiScreenData as t } from "../staticData/taxiScreen.staticData";

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
    if (document.getElementById(t.datePicker.styleId)) return;
    const style = document.createElement("style");
    style.id = t.datePicker.styleId;
    style.textContent = t.datePicker.css;
    document.head.appendChild(style);
  }, [isWeb]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedName = String(window.localStorage.getItem(t.storageKeys.name) || "");
    const savedPhone = String(window.localStorage.getItem(t.storageKeys.phone) || "");
    setCustomerName(savedName);
    setCustomerPhone(savedPhone);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<CabRate[]>(t.api.cabRates)
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
    const options = t.options;

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
        <Text style={styles.kicker}>{t.header.kicker}</Text>
        <Text style={styles.title}>{t.header.title}</Text>
        <Text style={styles.subTitle}>{t.header.subtitle}</Text>
      </View>

      <View style={[styles.formCard, datePickerOpen ? styles.formCardOpen : null]}>
        <Text style={styles.sectionLabel}>{t.sections.tripDetails}</Text>
        {loading ? <Text style={styles.muted}>{t.loadingRoutes}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <SelectField
          label={t.selectOrigin}
          value={origin}
          placeholder={t.selectOrigin}
          options={origins}
          onSelect={setOrigin}
        />
        <SelectField
          label={t.selectDestination}
          value={destination}
          placeholder={origin ? t.selectDestination : t.selectOriginFirst}
          options={destinations}
          onSelect={setDestination}
          disabled={!origin}
        />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t.dateTimeLabel}</Text>
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
                  dateFormat={t.datePicker.dateFormat}
                  className={t.datePicker.className}
                  popperClassName={t.datePicker.popperClassName}
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
                placeholder={t.datePicker.placeholder}
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
        <Text style={styles.sectionLabel}>{t.sections.rates}</Text>
        {!origin || !destination ? (
          <Text style={styles.muted}>{t.noSelectionRates}</Text>
        ) : !selectedRate ? (
          <Text style={styles.muted}>{t.noRouteRates}</Text>
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
            <Text style={styles.modalTitle}>{t.booking.title}</Text>
            <Text style={styles.modalSub}>{t.booking.subtitle}</Text>
            {submitNote ? <Text style={styles.submitNote}>{submitNote}</Text> : null}
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>{t.booking.cabType}</Text>
              <Text style={styles.modalRowValue}>{selectedCab?.label || t.rateCard.na}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>{t.booking.route}</Text>
              <Text style={styles.modalRowValue}>
                {safeText(origin)} → {safeText(destination)}
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>{t.booking.fare}</Text>
              <Text style={styles.modalRowValue}>{t.currency.inr} {selectedCab ? selectedCab.price : 0}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>{t.booking.maxPeople}</Text>
              <Text style={styles.modalRowValue}>
                {selectedCab?.maxPeople ? `${selectedCab.maxPeople} ${t.booking.maxPeopleSuffix}` : t.booking.maxPeopleFallback}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t.booking.peopleCount}</Text>
              <TextInput
                value={passengerCount}
                onChangeText={(v) => setPassengerCount(v.replace(/[^0-9]/g, ""))}
                placeholder={t.booking.peoplePlaceholder}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t.booking.name}</Text>
              <TextInput
                value={customerName}
                onChangeText={setCustomerName}
                placeholder={t.booking.namePlaceholder}
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t.booking.phone}</Text>
              <TextInput
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder={t.booking.phonePlaceholder}
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
                <Text style={styles.modalBtnGhostText}>{t.booking.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!customerName.trim() || !customerPhone.trim()) {
                    setSubmitNote(t.errors.namePhoneRequired);
                    return;
                  }
                  const count = Number(passengerCount || "0");
                  if (!passengerCount || !Number.isFinite(count) || count < 1) {
                    setSubmitNote(t.errors.invalidPeople);
                    return;
                  }
                  if (selectedCab?.maxPeople && count > selectedCab.maxPeople) {
                    setSubmitNote(t.errors.maxPeople(selectedCab.maxPeople));
                    return;
                  }
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem(t.storageKeys.name, customerName.trim());
                    window.localStorage.setItem(t.storageKeys.phone, customerPhone.trim());
                  }
                  setSubmitNote("");
                  setBookingOpen(false);
                  setBookingNotice(t.booking.confirmed);
                  setTimeout(() => setBookingNotice(""), 3500);
                }}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnText}>{t.booking.confirm}</Text>
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
            <Text style={styles.muted}>{t.dropdown.noOptions}</Text>
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
        <Text style={styles.ratePriceMuted}>{t.rateCard.na}</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rateCard, selected ? styles.rateCardSelected : null, pressed ? styles.rateCardPressed : null]}
    >
      <Text style={styles.rateTitle}>{title}</Text>
      <Text style={styles.ratePrice}>{t.currency.inr} {Number(price)}</Text>
      <Text style={styles.rateAction}>{selected ? t.rateCard.selected : t.rateCard.tapToSelect}</Text>
    </Pressable>
  );
}
