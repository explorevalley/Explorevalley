import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
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
    <ScrollView style={{ flex: 1, backgroundColor: "#eceef2" }} contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 30 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <ModeButton title="Buses" active={mode === "bus"} onPress={() => setMode("bus")} />
        <ModeButton title="Cabs" active={mode === "cab"} onPress={() => setMode("cab")} />
        {onClose ? <ModeButton title="Close" active={false} onPress={onClose} /> : null}
      </View>

      <View style={{ backgroundColor: "#f2f2f3", borderWidth: 1, borderColor: "#d5d8dc", borderRadius: 12, padding: 12 }}>
        <Text style={{ fontSize: 32, fontWeight: "800", color: "#111", marginBottom: 8 }}>BUY TICKET</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <InputField label="From" value={from} onChangeText={setFrom} placeholder="Please Select" width={280} />
          <SwapButton onPress={() => { const a = from; setFrom(to); setTo(a); }} />
          <InputField label="To" value={to} onChangeText={setTo} placeholder="Please Select" width={280} />
          <InputField label="Journey Date" value={journeyDate} onChangeText={setJourneyDate} placeholder="YYYY-MM-DD" width={240} />
          <InputField label="Return Date (Optional)" value={returnDate} onChangeText={setReturnDate} placeholder="YYYY-MM-DD" width={240} />
          <InputField label="Pax" value={passengers} onChangeText={setPassengers} placeholder="1" width={90} />
          <Pressable onPress={runSearch} style={{ alignSelf: "flex-end", backgroundColor: "#ff430a", borderRadius: 10, paddingHorizontal: 26, paddingVertical: 14, minHeight: 54 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 32 }}>{busy ? "..." : "Search"}</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
          <InputField label="Name" value={name} onChangeText={setName} placeholder="Passenger name" width={260} />
          <InputField label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" width={220} />
        </View>
      </View>

      {mode === "bus" ? (
        <>
          {busRoutes.length > 0 ? (
            <View style={{ backgroundColor: "#b9cbe8", borderRadius: 8, borderWidth: 1, borderColor: "#9eb6dd", overflow: "hidden" }}>
              <View style={{ flexDirection: "row" }}>
                <View style={{ width: 190, backgroundColor: "#8fb3e8", padding: 10 }}>
                  <Text style={{ color: "#ff3c00", fontWeight: "800", fontSize: 44 }}>Departure Bus</Text>
                  <Text style={{ color: "#111", fontSize: 34 }}>{dayLabel(activeDate)}</Text>
                </View>
                <View style={{ flex: 1, padding: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 42, fontWeight: "700", color: "#111" }}>{from.toUpperCase()}</Text>
                  <Text style={{ fontSize: 28, fontWeight: "700", color: "#3568b8" }}>BUS</Text>
                  <Text style={{ fontSize: 42, fontWeight: "700", color: "#111" }}>{to.toUpperCase()}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: "#d9d9d9", padding: 8, flexDirection: "row", gap: 6 }}>
                {dateTabs.map((d) => (
                  <Pressable key={d} onPress={() => setActiveDate(d)} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: d === activeDate ? "#4b88ff" : "#c8c8c8", backgroundColor: d === activeDate ? "#eef4ff" : "#efefef" }}>
                    <Text style={{ color: d === activeDate ? "#3b78eb" : "#444", fontSize: 28 }}>{dayLabel(d)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {busRoutes.map((route) => (
            <View key={route.id} style={{ backgroundColor: "#f7f7f7", borderRadius: 12, borderWidth: 1, borderColor: "#e3e3e3", padding: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 52, fontWeight: "800", color: "#ff3c00" }}>{safeText(route.operatorName)}</Text>
                  <Text style={{ fontSize: 30, color: "#666" }}>{safeText(route.operatorCode)}</Text>
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={{ fontSize: 34, color: "#111" }}>{safeText(route.fromCity)} ({safeText(route.departureTime)})</Text>
                  <Text style={{ fontSize: 34, color: "#111" }}>{safeText(route.toCity)} ({safeText(route.arrivalTime)})</Text>
                  <Text style={{ fontSize: 34, color: "#111" }}>Duration: {safeText(route.durationText)}</Text>
                </View>
                <View style={{ width: 130, alignItems: "center" }}>
                  <Text style={{ fontSize: 30, color: "#cf8b15", backgroundColor: "#fff2db", paddingHorizontal: 8, borderRadius: 6 }}>{safeText(route.busType)}</Text>
                </View>
                <View style={{ width: 150, alignItems: "center" }}>
                  <Text style={{ fontSize: 44, color: "#1ca14c", fontWeight: "800" }}>{safeText(route.seatsLabel)}</Text>
                  <Text style={{ fontSize: 32, color: "#444" }}>Seats</Text>
                </View>
                <View style={{ width: 130, alignItems: "center" }}>
                  <Text style={{ fontSize: 54, color: "#ff3c00", fontWeight: "900" }}>${Number(route.fare || 0).toFixed(2)}</Text>
                  <Text style={{ fontSize: 28, color: "#444" }}>Fare/Seat</Text>
                </View>
                <Pressable onPress={() => openSeats(route.id)} style={{ backgroundColor: "#ff5b33", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 30 }}>{openRouteId === route.id ? "Close Seat" : "View Seats"}</Text>
                </Pressable>
              </View>

              {openRouteId === route.id && seatData ? (
                <View style={{ marginTop: 12, borderWidth: 1, borderColor: "#d2d2d2", borderRadius: 8, padding: 10, backgroundColor: "#f3f3f3" }}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ width: 320, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, backgroundColor: "#fff" }}>
                      <Text style={{ fontSize: 28, marginBottom: 6, color: "#777" }}>Wheel</Text>
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
                              <Text style={{ fontSize: 28, color: booked ? "#aaa" : "#333", fontWeight: "700" }}>{code}</Text>
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
                        <Text style={{ fontSize: 34, fontWeight: "800", color: "#111" }}>
                          Ticket Sub total: <Text style={{ color: "#ff3c00" }}>${Number((seatData.fare || 0) * selectedSeats.length).toFixed(2)}</Text>
                        </Text>
                        <Pressable onPress={bookBus} style={{ marginTop: 8, alignSelf: "flex-start", backgroundColor: "#ff430a", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 28 }}>{busy ? "Booking..." : "Book Seats"}</Text>
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
        <>
          {cabResults.map((cab) => {
            const active = safeText(cab?.providerId) === safeText(selectedCabId);
            return (
              <Pressable key={safeText(cab?.providerId)} onPress={() => setSelectedCabId(safeText(cab?.providerId))} style={{ backgroundColor: active ? "#fff1ec" : "#fff", borderWidth: 1, borderColor: active ? "#ff5b33" : "#e4e4e4", borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 34, fontWeight: "800", color: "#111" }}>{safeText(cab?.providerName)} · {safeText(cab?.vehicleType)}</Text>
                <Text style={{ fontSize: 30, color: "#555" }}>{safeText(cab?.pickupLocation)} → {safeText(cab?.dropLocation)} | {safeText(cab?.distanceKm)} km</Text>
                <Text style={{ fontSize: 42, color: "#ff3c00", fontWeight: "900" }}>${Number(cab?.totalAmount || 0).toFixed(2)}</Text>
              </Pressable>
            );
          })}
          {cabResults.length ? (
            <Pressable onPress={bookCab} style={{ alignSelf: "flex-start", backgroundColor: "#ff430a", borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 30 }}>{busy ? "Booking..." : "Book Cab"}</Text>
            </Pressable>
          ) : null}
        </>
      )}

      {error ? <Text style={{ color: "#e33", fontSize: 28, fontWeight: "700" }}>{error}</Text> : null}
      {success ? <Text style={{ color: "#1d9b4e", fontSize: 28, fontWeight: "700" }}>{success}</Text> : null}
    </ScrollView>
  );
}

function InputField({ label, value, onChangeText, placeholder, width = 240 }: any) {
  return (
    <View style={{ width }}>
      <Text style={{ fontSize: 26, color: "#3a3a3a", marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9d9d9d"
        style={{ height: 48, borderWidth: 1, borderColor: "#919191", borderRadius: 8, backgroundColor: "#f4f4f4", paddingHorizontal: 10, fontSize: 24, color: "#222" }}
      />
    </View>
  );
}

function SwapButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignSelf: "flex-end", marginBottom: 2, width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: "#b8b8b8", backgroundColor: "#efefef", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#ff430a", fontSize: 28, fontWeight: "800" }}>{"<->"}</Text>
    </Pressable>
  );
}

function ModeButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: active ? "#ff5b33" : "#d9d9d9", backgroundColor: active ? "#fff1ec" : "#fff", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: active ? "#ff430a" : "#333" }}>{title}</Text>
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
      <Text style={{ fontSize: 28, color: "#666" }}>{label}</Text>
      <Text style={{ fontSize: 28, color: "#222", fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
