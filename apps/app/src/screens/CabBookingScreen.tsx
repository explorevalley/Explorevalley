import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiGet, apiPost } from "../lib/api";
import { getAuthMode } from "../lib/auth";
import { trackOrder } from "../lib/orders";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function dayLabel(dateText: string) {
  const d = new Date(dateText);
  if (!Number.isFinite(d.getTime())) return dateText;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function nextDays(baseDate: string, pad = 2) {
  const d0 = new Date(baseDate);
  if (!Number.isFinite(d0.getTime())) return [baseDate];
  const list: string[] = [];
  for (let i = -pad; i <= pad; i += 1) {
    const d = new Date(d0);
    d.setDate(d.getDate() + i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

export default function CabBookingScreen({ onClose }: { onClose?: () => void }) {
  const [mode, setMode] = useState<"bus" | "cab">("bus");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [journeyDate, setJourneyDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [serviceAreaId, setServiceAreaId] = useState("");
  const [meta, setMeta] = useState<any>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [busRoutes, setBusRoutes] = useState<any[]>([]);
  const [activeDate, setActiveDate] = useState(journeyDate);
  const [openRouteId, setOpenRouteId] = useState("");
  const [seatData, setSeatData] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const [cabResults, setCabResults] = useState<any[]>([]);
  const [selectedCabId, setSelectedCabId] = useState("");
  const [showJourneyPicker, setShowJourneyPicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);

  useEffect(() => {
    apiGet<any>("/api/meta").then((x) => {
      setMeta(x || null);
      const areas = Array.isArray(x?.serviceAreas) ? x.serviceAreas.filter((a: any) => a.enabled) : [];
      if (areas[0]?.id) setServiceAreaId(String(areas[0].id));
    }).catch(() => setMeta(null));
  }, []);

  const pax = Math.max(1, Number(passengers || 1));
  const activeCab = useMemo(() => cabResults.find((x) => safeText(x?.providerId) === safeText(selectedCabId)) || null, [cabResults, selectedCabId]);
  const dateTabs = useMemo(() => nextDays(activeDate || journeyDate, 2), [activeDate, journeyDate]);
  const cabHeadline = `${from || "Select pickup"} to ${to || "select drop"}`;

  function toDateOrNow(value: string) {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return new Date();
    return d;
  }

  async function runSearch() {
    setError("");
    setSuccess("");
    setOpenRouteId("");
    setSeatData(null);
    setSelectedSeats([]);
    setCabResults([]);
    setBusRoutes([]);

    if (!from || !to || !journeyDate) {
      setError("Enter from, to and journey date.");
      return;
    }
    if (from.toLowerCase() === to.toLowerCase()) {
      setError("From and To cannot be same.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "bus") {
        const qs = new URLSearchParams({ from, to, journeyDate, passengers: String(pax) }).toString();
        const r = await apiGet<{ routes: any[] }>(`/api/buses/search?${qs}`);
        setBusRoutes(Array.isArray(r?.routes) ? r.routes : []);
        setActiveDate(journeyDate);
      } else {
        const qs = new URLSearchParams({
          pickupLocation: from,
          dropLocation: to,
          datetime: `${journeyDate} 10:00`,
          passengers: String(pax),
          ...(serviceAreaId ? { serviceAreaId } : {})
        }).toString();
        const r = await apiGet<{ results: any[] }>(`/api/cab-bookings/search?${qs}`);
        const list = Array.isArray(r?.results) ? r.results : [];
        setCabResults(list);
        setSelectedCabId(safeText(list[0]?.providerId));
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function openSeats(routeId: string) {
    setOpenRouteId((prev) => (prev === routeId ? "" : routeId));
    if (openRouteId === routeId) {
      setSeatData(null);
      setSelectedSeats([]);
      return;
    }
    setBusy(true);
    try {
      const qs = new URLSearchParams({ journeyDate: activeDate }).toString();
      const r = await apiGet<any>(`/api/buses/${routeId}/seats?${qs}`);
      setSeatData(r);
      setSelectedSeats([]);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function bookBus() {
    setError("");
    setSuccess("");
    if (getAuthMode() !== "authenticated") {
      setError("Please login with Google before booking.");
      return;
    }
    if (!openRouteId || !selectedSeats.length) {
      setError("Select at least one seat.");
      return;
    }
    if (!name || !phone) {
      setError("Enter your name and phone.");
      return;
    }
    setBusy(true);
    try {
      const r = await apiPost<{ id: string }>("/api/bus-bookings/book", {
        routeId: openRouteId,
        journeyDate: activeDate,
        seats: selectedSeats,
        userName: name,
        phone
      });
      setSuccess(`Bus booking submitted. ID: ${r.id}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function bookCab() {
    setError("");
    setSuccess("");
    if (getAuthMode() !== "authenticated") {
      setError("Please login with Google before booking.");
      return;
    }
    if (!activeCab) {
      setError("Select a cab option.");
      return;
    }
    if (!name || !phone) {
      setError("Enter your name and phone.");
      return;
    }
    setBusy(true);
    try {
      const r = await apiPost<{ id: string }>("/api/cab-bookings", {
        userName: name,
        phone,
        pickupLocation: from,
        dropLocation: to,
        datetime: `${journeyDate} 10:00`,
        passengers: pax,
        serviceAreaId: serviceAreaId || undefined,
        providerId: activeCab.providerId,
        vehicleType: activeCab.vehicleType
      });
      trackOrder("cab", r.id);
      setSuccess(`Cab booking submitted. ID: ${r.id}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f3f5f9" }} contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}>
      <View style={{ backgroundColor: mode === "cab" ? "#0f1a2d" : "#151d2b", borderRadius: 18, borderWidth: 1, borderColor: mode === "cab" ? "#1d3258" : "#24324a", padding: 16 }}>
        <Text style={{ color: "#eaf2ff", fontSize: 13, letterSpacing: 1.2, marginBottom: 4 }}>EXPLOREVALLEY TRANSPORT</Text>
        <Text style={{ color: "#ffffff", fontSize: 30, fontWeight: "800", marginBottom: 3, lineHeight: 34 }}>
          {mode === "cab" ? "Award Style Cab Booking" : "Smart Bus Booking"}
        </Text>
        <Text style={{ color: "#a6b4cb", fontSize: 14 }}>
          {mode === "cab" ? "Elegant ride discovery, clear fares, and one-click confirmation." : "Compare operators, inspect seats, and book in one flow."}
        </Text>
        {mode === "cab" ? (
          <View style={{ marginTop: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <MiniStat label="On-time rides" value="98.4%" />
            <MiniStat label="Trusted drivers" value="4.9/5" />
            <MiniStat label="Instant support" value="24/7" />
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <ModeButton title="Buses" active={mode === "bus"} onPress={() => setMode("bus")} />
        <ModeButton title="Cabs" active={mode === "cab"} onPress={() => setMode("cab")} />
        {onClose ? <ModeButton title="Close" active={false} onPress={onClose} /> : null}
      </View>

      <View style={{ backgroundColor: mode === "cab" ? "#ffffff" : "#f7f8fa", borderWidth: 1, borderColor: mode === "cab" ? "#dee5f0" : "#d7dde6", borderRadius: 16, padding: 12 }}>
        <Text style={{ fontSize: 13, color: "#6e798e", marginBottom: 2, letterSpacing: 0.6 }}>
          {mode === "cab" ? "RIDE DETAILS" : "TRIP DETAILS"}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 10, lineHeight: 28 }}>
          {mode === "cab" ? "Book your next ride" : "Find your ideal seat"}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <InputField label="From" value={from} onChangeText={setFrom} placeholder="Please Select" width={220} icon="P" />
          <SwapButton onPress={() => { const a = from; setFrom(to); setTo(a); }} />
          <InputField label="To" value={to} onChangeText={setTo} placeholder="Please Select" width={220} icon="D" />
          <DateField
            label="Journey Date"
            value={journeyDate}
            onChangeText={(v: string) => {
              setJourneyDate(v);
              setActiveDate(v);
            }}
            placeholder="YYYY-MM-DD"
            width={170}
            icon="JD"
            onPress={() => setShowJourneyPicker(true)}
          />
          <DateField
            label="Return Date (Optional)"
            value={returnDate}
            onChangeText={setReturnDate}
            placeholder="YYYY-MM-DD"
            width={170}
            icon="RD"
            onPress={() => setShowReturnPicker(true)}
          />
          <InputField label="Pax" value={passengers} onChangeText={setPassengers} placeholder="1" width={78} icon="PX" />
          <Pressable onPress={runSearch} style={{ alignSelf: "flex-end", backgroundColor: "#f4511e", borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12, minHeight: 46, shadowColor: "#f4511e", shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{busy ? "Searching..." : "Search Ride"}</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <InputField label="Name" value={name} onChangeText={setName} placeholder="Passenger name" width={220} icon="NM" />
          <InputField label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" width={170} icon="PH" />
        </View>
      </View>
      {Platform.OS !== "web" && showJourneyPicker ? (
        <DateTimePicker
          value={toDateOrNow(journeyDate)}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowJourneyPicker(false);
            if (!selectedDate) return;
            const iso = selectedDate.toISOString().slice(0, 10);
            setJourneyDate(iso);
            setActiveDate(iso);
          }}
        />
      ) : null}
      {Platform.OS !== "web" && showReturnPicker ? (
        <DateTimePicker
          value={toDateOrNow(returnDate || journeyDate)}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowReturnPicker(false);
            if (!selectedDate) return;
            setReturnDate(selectedDate.toISOString().slice(0, 10));
          }}
        />
      ) : null}

      {mode === "bus" ? (
        <>
          {busRoutes.length > 0 ? (
            <View style={{ backgroundColor: "#b9cbe8", borderRadius: 8, borderWidth: 1, borderColor: "#9eb6dd", overflow: "hidden" }}>
              <View style={{ flexDirection: "row" }}>
                <View style={{ width: 190, backgroundColor: "#8fb3e8", padding: 10 }}>
                  <Text style={{ color: "#ff3c00", fontWeight: "800", fontSize: 18 }}>Departure Bus</Text>
                  <Text style={{ color: "#111", fontSize: 13 }}>{dayLabel(activeDate)}</Text>
                </View>
                <View style={{ flex: 1, padding: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#111" }}>{from.toUpperCase()}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#3568b8" }}>BUS</Text>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#111" }}>{to.toUpperCase()}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: "#d9d9d9", padding: 8, flexDirection: "row", gap: 6 }}>
                {dateTabs.map((d) => (
                  <Pressable key={d} onPress={() => setActiveDate(d)} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: d === activeDate ? "#4b88ff" : "#c8c8c8", backgroundColor: d === activeDate ? "#eef4ff" : "#efefef" }}>
                    <Text style={{ color: d === activeDate ? "#3b78eb" : "#444", fontSize: 13 }}>{dayLabel(d)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {busRoutes.map((route) => (
            <View key={route.id} style={{ backgroundColor: "#f7f7f7", borderRadius: 12, borderWidth: 1, borderColor: "#e3e3e3", padding: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: "#ff3c00" }}>{safeText(route.operatorName)}</Text>
                  <Text style={{ fontSize: 14, color: "#666" }}>{safeText(route.operatorCode)}</Text>
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={{ fontSize: 14, color: "#111" }}>{safeText(route.fromCity)} ({safeText(route.departureTime)})</Text>
                  <Text style={{ fontSize: 14, color: "#111" }}>{safeText(route.toCity)} ({safeText(route.arrivalTime)})</Text>
                  <Text style={{ fontSize: 14, color: "#111" }}>Duration: {safeText(route.durationText)}</Text>
                </View>
                <View style={{ width: 130, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, color: "#cf8b15", backgroundColor: "#fff2db", paddingHorizontal: 8, borderRadius: 6 }}>{safeText(route.busType)}</Text>
                </View>
                <View style={{ width: 150, alignItems: "center" }}>
                  <Text style={{ fontSize: 24, color: "#1ca14c", fontWeight: "800" }}>{safeText(route.seatsLabel)}</Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>Seats</Text>
                </View>
                <View style={{ width: 130, alignItems: "center" }}>
                  <Text style={{ fontSize: 28, color: "#ff3c00", fontWeight: "900" }}>${Number(route.fare || 0).toFixed(2)}</Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>Fare/Seat</Text>
                </View>
                <Pressable onPress={() => openSeats(route.id)} style={{ backgroundColor: "#ff5b33", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{openRouteId === route.id ? "Close Seat" : "View Seats"}</Text>
                </Pressable>
              </View>

              {openRouteId === route.id && seatData ? (
                <View style={{ marginTop: 12, borderWidth: 1, borderColor: "#d2d2d2", borderRadius: 8, padding: 10, backgroundColor: "#f3f3f3" }}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ width: 320, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, backgroundColor: "#fff" }}>
                      <Text style={{ fontSize: 14, marginBottom: 6, color: "#777" }}>Wheel</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {(seatData.seatLayout || []).map((s: any) => {
                          const code = safeText(s?.code);
                          const booked = (seatData.bookedSeats || []).includes(code);
                          const selected = selectedSeats.includes(code);
                          return (
                            <Pressable
                              key={code}
                              disabled={booked}
                              onPress={() => {
                                setSelectedSeats((prev) => selected ? prev.filter((x) => x !== code) : [...prev, code]);
                              }}
                              style={{
                                width: 64,
                                height: 44,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: booked ? "#ddd" : selected ? "#ff5b33" : "#cfcfcf",
                                backgroundColor: booked ? "#f1f1f1" : selected ? "#ffe8e1" : "#fff",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <Text style={{ fontSize: 14, color: booked ? "#aaa" : "#333", fontWeight: "700" }}>{code}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, backgroundColor: "#fff" }}>
                      <Row label="Seat Type" value="Regular" />
                      <Row label="Seat" value={selectedSeats.join(", ") || "-"} />
                      <Row label="Price" value={`$${Number((seatData.fare || 0) * selectedSeats.length).toFixed(2)}`} />
                      <Row label="Action" value={selectedSeats.length ? "Ready" : "-"} />
                      <View style={{ borderTopWidth: 1, borderTopColor: "#ececec", padding: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111" }}>
                          Ticket Sub total: <Text style={{ color: "#ff3c00" }}>${Number((seatData.fare || 0) * selectedSeats.length).toFixed(2)}</Text>
                        </Text>
                        <Pressable onPress={bookBus} style={{ marginTop: 8, alignSelf: "flex-start", backgroundColor: "#ff430a", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{busy ? "Booking..." : "Book Seats"}</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={{ backgroundColor: "#0f1a2d", borderRadius: 16, borderWidth: 1, borderColor: "#233253", padding: 14 }}>
            <Text style={{ color: "#9db0d6", fontSize: 12, letterSpacing: 0.6 }}>PREMIUM RIDE OPTIONS</Text>
            <Text style={{ color: "#f3f7ff", fontSize: 22, fontWeight: "800", marginTop: 3, lineHeight: 28 }}>
              {cabHeadline}
            </Text>
            <Text style={{ color: "#8ca0c9", marginTop: 4, fontSize: 13 }}>
              {dayLabel(journeyDate)} · {pax} passenger{pax > 1 ? "s" : ""}
            </Text>
          </View>

          {cabResults.map((cab) => {
            const active = safeText(cab?.providerId) === safeText(selectedCabId);
            return (
              <Pressable
                key={safeText(cab?.providerId)}
                onPress={() => setSelectedCabId(safeText(cab?.providerId))}
                style={{
                  backgroundColor: active ? "#152847" : "#ffffff",
                  borderWidth: 1,
                  borderColor: active ? "#f4511e" : "#dde4ef",
                  borderRadius: 16,
                  padding: 14,
                  shadowColor: active ? "#f4511e" : "#1d2c49",
                  shadowOpacity: active ? 0.2 : 0.08,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: active ? 6 : 2
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 19, fontWeight: "800", color: active ? "#f6f9ff" : "#101828" }}>
                      {safeText(cab?.providerName)} · {safeText(cab?.vehicleType)}
                    </Text>
                    <Text style={{ fontSize: 13, color: active ? "#93a6ca" : "#5a6578", marginTop: 4 }}>
                      {safeText(cab?.pickupLocation)} → {safeText(cab?.dropLocation)}
                    </Text>
                    <Text style={{ fontSize: 12, color: active ? "#7f93bc" : "#7c8698", marginTop: 2 }}>
                      {safeText(cab?.distanceKm)} km · {safeText(cab?.durationMin)} min · seats {safeText(cab?.capacity)}
                    </Text>
                    <View style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: active ? "#2a466f" : "#e5e9f1", paddingHorizontal: 10, paddingVertical: 4, backgroundColor: active ? "#12213a" : "#f7f9fc" }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#b5caee" : "#5f6a7d" }}>
                        ETA {Math.max(5, Number(cab?.durationMin || 0) - 4)}-{Number(cab?.durationMin || 0) + 6} min
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
                    <Text style={{ fontSize: 24, color: "#ff7a45", fontWeight: "900" }}>${Number(cab?.totalAmount || 0).toFixed(2)}</Text>
                    <Text style={{ fontSize: 11, color: active ? "#7f93bc" : "#7b8798" }}>total fare</Text>
                    <Text style={{ marginTop: 8, fontSize: 12, color: active ? "#9db0d6" : "#6f7b8d" }}>
                      ${Number(cab?.totalAmount || 0).toFixed(2)} / ride
                    </Text>
                  </View>
                </View>
                {active ? (
                  <View style={{ marginTop: 10, alignSelf: "flex-start", backgroundColor: "rgba(244,81,30,0.12)", borderRadius: 999, borderWidth: 1, borderColor: "rgba(244,81,30,0.4)", paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: "#ff8d62", fontSize: 11, fontWeight: "700" }}>Selected</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          {cabResults.length ? (
            <View style={{ backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#dde4ef", padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#6b7688", fontSize: 12 }}>Selected fare</Text>
                <Text style={{ color: "#111827", fontSize: 20, fontWeight: "800" }}>
                  ${Number(activeCab?.totalAmount || 0).toFixed(2)}
                </Text>
              </View>
              <Pressable onPress={bookCab} style={{ backgroundColor: "#f4511e", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, shadowColor: "#f4511e", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{busy ? "Booking..." : "Confirm Premium Ride"}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}

      {error ? <Text style={{ color: "#ff7c7c", fontSize: 13, fontWeight: "700" }}>{error}</Text> : null}
      {success ? <Text style={{ color: "#7be6a0", fontSize: 13, fontWeight: "700" }}>{success}</Text> : null}
    </ScrollView>
  );
}

function InputField({ label, value, onChangeText, placeholder, width = 240, icon = "" }: any) {
  return (
    <View style={{ width }}>
      <Text style={{ fontSize: 12, color: "#5e6674", marginBottom: 4, fontWeight: "600" }}>{label}</Text>
      <View style={{ height: 44, borderWidth: 1, borderColor: "#c4cdda", borderRadius: 10, backgroundColor: "#fff", paddingHorizontal: 10, flexDirection: "row", alignItems: "center" }}>
        {icon ? (
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "#f2f4f8", borderWidth: 1, borderColor: "#e0e6ef", alignItems: "center", justifyContent: "center", marginRight: 7 }}>
            <Text style={{ fontSize: 9, color: "#6d7990", fontWeight: "700" }}>{icon}</Text>
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9d9d9d"
          style={{ flex: 1, height: 42, fontSize: 14, color: "#111827" }}
        />
      </View>
    </View>
  );
}

function DateField({ label, value, onChangeText, placeholder, width = 170, icon = "", onPress }: any) {
  return (
    <View style={{ width }}>
      <Text style={{ fontSize: 12, color: "#5e6674", marginBottom: 4, fontWeight: "600" }}>{label}</Text>
      <View style={{ height: 44, borderWidth: 1, borderColor: "#c4cdda", borderRadius: 10, backgroundColor: "#fff", paddingHorizontal: 10, flexDirection: "row", alignItems: "center" }}>
        {icon ? (
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "#f2f4f8", borderWidth: 1, borderColor: "#e0e6ef", alignItems: "center", justifyContent: "center", marginRight: 7 }}>
            <Text style={{ fontSize: 9, color: "#6d7990", fontWeight: "700" }}>{icon}</Text>
          </View>
        ) : null}
        {Platform.OS === "web" ? (
          <input
            value={value}
            onChange={(e) => onChangeText((e.target as HTMLInputElement).value)}
            type="date"
            placeholder={placeholder}
            style={{
              flex: 1,
              height: 40,
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "#111827",
              background: "transparent"
            }}
          />
        ) : (
          <Pressable onPress={onPress} style={{ flex: 1, height: 40, justifyContent: "center" }}>
            <Text style={{ fontSize: 14, color: value ? "#111827" : "#9d9d9d" }}>
              {value ? dayLabel(value) : placeholder}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function SwapButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignSelf: "flex-end", marginBottom: 1, width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "#c6ceda", backgroundColor: "#f2f4f8", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#f4511e", fontSize: 16, fontWeight: "800" }}>{"<->"}</Text>
    </Pressable>
  );
}

function ModeButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: active ? "#f4511e" : "#2b3a57", backgroundColor: active ? "#f4511e" : "#15203a", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : "#b1c2e4" }}>{title}</Text>
    </Pressable>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#29406b", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#13233d" }}>
      <Text style={{ color: "#9db1d8", fontSize: 11 }}>{label}</Text>
      <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>{value}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
      <Text style={{ fontSize: 13, color: "#666" }}>{label}</Text>
      <Text style={{ fontSize: 13, color: "#222", fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
