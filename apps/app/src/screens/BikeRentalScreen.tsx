import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiGet, apiPost, resolveAssetUrl } from "../lib/api";
import { bikeRentalColors, styles } from "../styles/BikeRentalScreen.styles";
import { bikeRentalScreenData as t } from "../staticData/bikeRentalScreen.staticData";

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
    if (document.getElementById(t.datePicker.styleId)) return;
    const style = document.createElement("style");
    style.id = t.datePicker.styleId;
    style.textContent = t.datePicker.css;
    document.head.appendChild(style);
  }, [isWeb]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<BikeRental[]>(t.api.rentals)
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
    setUserName(String(window.localStorage.getItem(t.storageKeys.name) || ""));
    setPhone(String(window.localStorage.getItem(t.storageKeys.phone) || ""));
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
      setNotice(t.notices.selectBike);
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
      setNotice(t.notices.endDateBefore);
      return;
    }

    if (!normalizedName || !normalizedPhone) {
      setNotice(t.notices.namePhoneRequired);
      return;
    }
    if (Number(selected.maxDays || 0) > 0 && selectedDays > Number(selected.maxDays || 0)) {
      setNotice(t.notices.maxDays(Number(selected.maxDays)));
      return;
    }
    if (selectedQty > Math.max(0, Number(selected.availableQty || 0))) {
      setNotice(t.notices.qtyUnavailable);
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      const response = await apiPost<{ success: boolean; id: string }>(t.api.booking, {
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
        window.localStorage.setItem(t.storageKeys.name, normalizedName);
        window.localStorage.setItem(t.storageKeys.phone, normalizedPhone);
      }
      setNotice(t.notices.bookingCreated(safeText(response?.id)));
      setRows((prev) => prev.map((x) => x.id === selected.id ? { ...x, availableQty: Math.max(0, Number(x.availableQty || 0) - selectedQty) } : x));
      setBookingOpen(false);
    } catch (err: any) {
      setNotice(String(err?.message || err || t.notices.bookingFailed));
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
        <Text style={styles.kicker}>{t.header.kicker}</Text>
        <Text style={styles.title}>{t.header.title}</Text>
        <Text style={styles.subTitle}>{t.header.subtitle}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={bikeRentalColors.spinner} />
          <Text style={styles.muted}>{t.loading}</Text>
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
                <Text style={styles.cardTitle}>{safeText(bike.name) || t.bikeFallback}</Text>
                <Text style={styles.cardMeta}>{safeText(bike.location)} • {safeText(bike.bikeType || t.bikeFallback)}</Text>
                <Text style={styles.cardPrice}>{t.currency.inr} {Number(bike.pricePerDay || 0)}/day</Text>
                <Text style={styles.cardMeta}>{t.labels.available}: {Math.max(0, Number(bike.availableQty || 0))}</Text>
                {Number(bike.maxDays || 0) > 0 ? (
                  <Text style={styles.cardMeta}>
                    {t.labels.maxRental}: {Number(bike.maxDays)} {t.labels.maxRentalSuffix}
                  </Text>
                ) : null}
                {bike.securityDeposit ? <Text style={styles.cardMeta}>{t.labels.deposit}: {t.currency.inr} {Number(bike.securityDeposit || 0)}</Text> : null}
                {bike.helmetIncluded ? <Text style={styles.cardMeta}>{t.labels.helmetIncluded}</Text> : null}
                {!!safeText(bike.image) ? (
                  <Text style={styles.cardMeta}>{t.labels.image}: {resolveAssetUrl(safeText(bike.image))}</Text>
                ) : null}
                <Text style={styles.chevron}>{selected?.id === bike.id && bookingOpen ? t.chevrons.open : t.chevrons.closed}</Text>
              </Pressable>

              {isSelected && bookingOpen ? (
                <View style={[styles.bookingCard, styles.bookingCardInline]}>
                  <Text style={styles.sectionTitle}>{t.labels.bookingDetails}</Text>
                  <TextInput value={userName} onChangeText={setUserName} placeholder={t.labels.namePlaceholder} style={styles.input} />
                  <TextInput value={phone} onChangeText={setPhone} placeholder={t.labels.phonePlaceholder} keyboardType="phone-pad" style={styles.input} />
                  <Text style={styles.fieldLabel}>{t.labels.qtyLabel}</Text>
                  <TextInput value={qty} onChangeText={setQty} placeholder={t.labels.qtyPlaceholder} keyboardType="number-pad" style={styles.input} />

                  {Platform.OS === "web" ? (
                    DatePicker ? (
                      <View style={styles.dateRangeRow}>
                        <View style={styles.dateRangeField}>
                          <Text style={styles.fieldLabel}>{t.labels.startDate}</Text>
                          <View style={styles.datePickerWrap}>
                            <DatePicker
                              selected={startDate}
                              onChange={(d: Date | null) => {
                                if (!d) return;
                                setStartDate(d);
                                if (endDate < d) setEndDate(d);
                              }}
                              dateFormat={t.datePicker.dateFormat}
                              className={t.datePicker.className}
                              popperClassName={t.datePicker.popperClassName}
                              onCalendarOpen={() => setDatePickerOpen(true)}
                              onCalendarClose={() => setDatePickerOpen(false)}
                            />
                          </View>
                        </View>
                        <View style={styles.dateRangeField}>
                          <Text style={styles.fieldLabel}>{t.labels.endDate}</Text>
                          <View style={styles.datePickerWrap}>
                            <DatePicker
                              selected={endDate}
                              onChange={(d: Date | null) => {
                                if (!d) return;
                                setEndDate(d);
                              }}
                              minDate={startDate}
                              dateFormat={t.datePicker.dateFormat}
                              className={t.datePicker.className}
                              popperClassName={t.datePicker.popperClassName}
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
                          placeholder={t.datePicker.startPlaceholder}
                          style={[styles.input, styles.dateRangeField]}
                        />
                        <TextInput
                          value={formatDate(endDate)}
                          onChangeText={(value) => {
                            const d = new Date(`${value}T09:00:00`);
                            if (Number.isFinite(d.getTime())) setEndDate(d);
                          }}
                          placeholder={t.datePicker.endPlaceholder}
                          style={[styles.input, styles.dateRangeField]}
                        />
                      </View>
                    )
                  ) : (
                    <View style={styles.dateRangeColumn}>
                      <View style={styles.dateRangeField}>
                        <Text style={styles.fieldLabel}>{t.labels.startDate}</Text>
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
                        <Text style={styles.fieldLabel}>{t.labels.endDate}</Text>
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

                  <Text style={styles.metaText}>{t.labels.rentalDays} {computedDays}</Text>
                  <Text style={styles.total}>{t.labels.total} {t.currency.inr} {computedFare}</Text>

                  <View style={styles.actions}>
                    <Pressable onPress={() => setBookingOpen(false)} style={[styles.actionBtn, styles.actionGhost]}>
                      <Text style={styles.actionGhostText}>{t.labels.cancel}</Text>
                    </Pressable>
                    <Pressable onPress={handleBook} disabled={busy} style={[styles.actionBtn, styles.actionPrimary, busy ? styles.actionPrimaryBusy : null]}>
                      <Text style={styles.actionPrimaryText}>{busy ? t.labels.booking : t.labels.book}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
        {!loading && rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.muted}>{t.empty}</Text>
          </View>
        ) : null}
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
  );
}
