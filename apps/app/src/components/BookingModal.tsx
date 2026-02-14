import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Modal, View, Text, Pressable, TextInput, Platform, Image, ScrollView, useWindowDimensions } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiGet, apiPost, BASE_URL, trackEvent } from "../lib/api";
import { getAuthMode, getAuthToken } from "../lib/auth";
import { trackOrder } from "../lib/orders";
import { autoCapitalizeNewLineStarts } from "../lib/text";

export default function BookingModal({ visible, onClose, item }: any) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaarUrl, setAadhaarUrl] = useState("");
  const [aadhaarFileName, setAadhaarFileName] = useState("");
  const [aadhaarUploading, setAadhaarUploading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);
  const [guests, setGuests] = useState("1");
  const [numRooms, setNumRooms] = useState("1");
  const [checkIn, setCheckIn] = useState("2026-03-15");
  const [checkOut, setCheckOut] = useState("2026-03-18");
  const [tourDate, setTourDate] = useState("2026-03-20");
  const [roomType, setRoomType] = useState(item.kind === "hotel" ? (item.raw.roomTypes?.[0]?.type || "") : "");
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [showTourDatePicker, setShowTourDatePicker] = useState(false);
  const [webPickerVisible, setWebPickerVisible] = useState(false);
  const [webPickerTarget, setWebPickerTarget] = useState<"checkIn" | "checkOut" | "tourDate" | null>(null);
  const [webPickerMonth, setWebPickerMonth] = useState(new Date());

  const [specialRequests, setSpecialRequests] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [tierName, setTierName] = useState<string>("");

  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const itineraryScrollRef = useRef<ScrollView>(null);

  const isHotel = item.kind === "hotel";
  const isCottage = !!String(item?.title || item?.raw?.name || "").toLowerCase().includes("cottage");
  const category: "tour" | "hotel" | "cottages" = isHotel ? (isCottage ? "cottages" : "hotel") : "tour";
  const isWeb = Platform.OS === "web";
  
  // Guest capacity based on room type
  const maxGuestsByRoom: { [key: string]: number } = {
    "Hall": 4,
    "Standard": 2,
    "Deluxe": 2,
    "Suite": 3,
    "Presidential": 4
  };
  const maxGuests = isHotel ? (maxGuestsByRoom[roomType] || 2) : 99;
  
  // Pricing calculation
  const pricePerRoom = 5000; // Base price per room per night
  const dayMs = 1000 * 60 * 60 * 24;
  const parseDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = startOfDay(new Date());
  const isPastDate = (date: Date) => startOfDay(date).getTime() < today.getTime();
  const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };
  const eachDate = (start: string, end: string) => {
    const out: string[] = [];
    const startAt = new Date(start + "T00:00:00Z");
    const endAt = new Date(end + "T00:00:00Z");
    for (let d = new Date(startAt); d < endAt; d.setUTCDate(d.getUTCDate() + 1)) {
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  };
  const setCheckInSafe = (nextCheckIn: string) => {
    setCheckIn(nextCheckIn);
    const inDate = parseDate(nextCheckIn);
    const outDate = parseDate(checkOut);
    if (inDate && outDate && outDate.getTime() <= inDate.getTime()) {
      setCheckOut(formatDate(addDays(inDate, 1)));
    }
  };
  const setCheckOutSafe = (nextCheckOut: string) => {
    const inDate = parseDate(checkIn);
    const outDate = parseDate(nextCheckOut);
    if (inDate && outDate && outDate.getTime() <= inDate.getTime()) {
      setCheckOut(formatDate(addDays(inDate, 1)));
      return;
    }
    setCheckOut(nextCheckOut);
  };
  const openWebPicker = (target: "checkIn" | "checkOut" | "tourDate") => {
    console.log("[BookingModal] openWebPicker called", { target, isWeb, isHotel });
    const currentValue = target === "checkIn" ? checkIn : target === "checkOut" ? checkOut : tourDate;
    const currentDate = parseDate(currentValue) || new Date();
    console.log("[BookingModal] openWebPicker current value", { currentValue, currentDate: currentDate.toISOString() });
    setWebPickerTarget(target);
    setWebPickerMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    setWebPickerVisible(true);
  };
  const applyWebDate = (date: Date) => {
    const formatted = formatDate(date);
    if (webPickerTarget === "checkIn") setCheckInSafe(formatted);
    if (webPickerTarget === "checkOut") setCheckOutSafe(formatted);
    if (webPickerTarget === "tourDate") setTourDate(formatted);
    setWebPickerVisible(false);
  };
  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);
  const numNights = isHotel && checkInDate && checkOutDate
    ? Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / dayMs))
    : 0;
  const totalPrice = isHotel ? Math.ceil(pricePerRoom * numNights * parseInt(numRooms || "1", 10)) : 0;
  const pricingTiers = meta?.settings?.pricingTiers || [];
  const selectedTier = pricingTiers.find((t: any) => t.name === tierName) || pricingTiers[0];
  const tierMultiplier = selectedTier?.multiplier || 1;
  const tierPreviewTotal = Math.ceil(totalPrice * tierMultiplier);
  const hotelAvailability = item?.raw?.availability;
  const tourAvailability = item?.raw?.availability;
  const stayDates = isHotel ? eachDate(checkIn, checkOut) : [];
  const hotelClosedDates = hotelAvailability?.closedDates || [];
  const isHotelClosed = isHotel && stayDates.some((d: string) => hotelClosedDates.includes(d));
  const roomsByType = hotelAvailability?.roomsByType || {};
  const roomInventory = roomsByType?.[roomType];
  const tourClosedDates = tourAvailability?.closedDates || [];
  const tourCapacityByDate = tourAvailability?.capacityByDate || {};
  const isTourClosed = !isHotel && tourClosedDates.includes(tourDate);
  const tourCapacity = !isHotel ? (tourCapacityByDate?.[tourDate] || item?.raw?.maxGuests) : null;
  const leftContent: any = {};
  const rightContent: any = {};
  const inclusionsList = useMemo(() => {
    if (Array.isArray(item?.raw?.inclusions) && item.raw.inclusions.length) {
      return item.raw.inclusions.map((x: any) => String(x || "").trim()).filter(Boolean);
    }
    return [];
  }, [item?.raw?.inclusions]);
  const exclusionsList = useMemo(() => {
    if (Array.isArray(item?.raw?.exclusions) && item.raw.exclusions.length) {
      return item.raw.exclusions.map((x: any) => String(x || "").trim()).filter(Boolean);
    }
    return [];
  }, [item?.raw?.exclusions]);
  const highlightsList = useMemo(() => {
    if (Array.isArray(item?.raw?.highlights) && item.raw.highlights.length) {
      return item.raw.highlights.map((h: any) => String(h || "").trim()).filter(Boolean);
    }
    if (category === "tour") return [];
    if (Array.isArray(leftContent?.highlights) && leftContent.highlights.length) {
      return leftContent.highlights.map((h: any) => String(h || "").trim()).filter(Boolean);
    }
    return [];
  }, [item?.raw?.highlights, leftContent?.highlights, category]);
  const itineraryCards = useMemo(() => {
    const raw = item?.raw?.itinerary;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((d: any, i: number) => ({
        day: Number(d?.day || i + 1),
        title: String(d?.title || `Day ${i + 1}`),
        description: Array.isArray(d?.activities) ? d.activities.join(" <") : String(d?.description || "")
      }));
    }
    if (typeof raw === "string" && raw.trim()) {
      const chunks = raw
        .split(/\.\s+/)
        .map((x: string) => x.trim())
        .filter(Boolean);
      if (chunks.length) {
        return chunks.map((line: string, i: number) => {
          const m = line.match(/day\s*(\d+)\s*:\s*(.*)/i);
          if (m) {
            return {
              day: Number(m[1] || i + 1),
              title: String(m[2] || `Day ${i + 1}`),
              description: ""
            };
          }
          return { day: i + 1, title: line, description: "" };
        });
      }
    }
    if (category === "tour") return [];
    const fallback = rightContent?.itinerary;
    if (Array.isArray(fallback) && fallback.length) return fallback;
    return [];
  }, [item?.raw?.itinerary, rightContent?.itinerary, category]);

  const backendImages = useMemo(() => {
    const all: string[] = [];
    const pushUnique = (v?: string) => {
      const s = String(v || "").trim();
      if (!s || all.includes(s)) return;
      all.push(s);
    };
    ((item?.raw?.images || []) as string[]).forEach((x) => pushUnique(x));
    (((item?.raw?.imageMeta || []) as any[]).map((m: any) => m?.url).filter(Boolean) as string[]).forEach((x) => pushUnique(x));
    if (item?.raw?.heroImage) {
      const hero = String(item.raw.heroImage).trim();
      if (hero && !all.includes(hero)) all.unshift(hero);
    }
    return all;
  }, [item?.raw?.heroImage, item?.raw?.images, item?.raw?.imageMeta]);
  const fallbackImages = useMemo(() => [], []);
  const rawImages = useMemo(() => (backendImages.length ? backendImages : fallbackImages), [backendImages, fallbackImages]);
  const resolvedImages = useMemo(
    () =>
      rawImages.map((src: string) =>
        src.startsWith("http") ? src : src.startsWith("/") ? `${BASE_URL}${src}` : src
      ),
    [rawImages]
  );
  const imagesToShow = useMemo(() => resolvedImages, [resolvedImages]);
  const [selectedImage, setSelectedImage] = useState(imagesToShow[0]);

  const imageMeta = useMemo(() => {
    const backendMeta = Array.isArray(item?.raw?.imageMeta) ? item.raw.imageMeta : [];
    const backendTitles = Array.isArray(item?.raw?.imageTitles) ? item.raw.imageTitles : [];
    const backendDescriptions = Array.isArray(item?.raw?.imageDescriptions) ? item.raw.imageDescriptions : [];
    return imagesToShow.map((src: string, i: number) => {
      const match = backendMeta.find((m: any) => String(m?.url || "").trim() === String(src).trim());
      return {
        src,
        title: String(match?.title || backendTitles[i] || `${item?.title || "Image"} ${i + 1}`),
        description: String(match?.description || backendDescriptions[i] || item?.raw?.description || ""),
      };
    });
  }, [imagesToShow, item?.title, item?.raw?.description, item?.raw?.imageMeta, item?.raw?.imageTitles, item?.raw?.imageDescriptions]);

  const selectedMeta = useMemo(() => {
    return imageMeta.find(x => x.src === selectedImage) || imageMeta[0];
  }, [imageMeta, selectedImage]);

  useEffect(() => {
    if (!imagesToShow.length) return;
    if (!selectedImage || !imagesToShow.includes(selectedImage)) {
      setSelectedImage(imagesToShow[0]);
    }
  }, [imagesToShow, selectedImage]);

  const payload = useMemo(() => {
    const g = Math.max(1, parseInt(guests || "1", 10));
    if (isHotel) {
      return { type: "hotel", itemId: item.id, userName, email, phone, aadhaarUrl, guests: g, checkIn, checkOut, roomType, numRooms: parseInt(numRooms || "1", 10), specialRequests, totalPrice };
    }
    return { type: "tour", itemId: item.id, userName, email, phone, aadhaarUrl, guests: g, tourDate, specialRequests };
  }, [isHotel, item, userName, email, phone, aadhaarUrl, guests, numRooms, checkIn, checkOut, roomType, tourDate, specialRequests, totalPrice]);

  const uploadAadhaarFile = async (file: any) => {
    setAadhaarError(null);
    setAadhaarUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const token = getAuthToken();
      const r = await fetch(`${BASE_URL}/api/bookings/aadhaar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setAadhaarUrl(String(data?.url || ""));
      setAadhaarFileName(file.name || "Aadhaar card");
    } catch (e: any) {
      setAadhaarError(String(e?.message || e));
    } finally {
      setAadhaarUploading(false);
    }
  };

  const openAadhaarPicker = () => {
    if (!isWeb) {
      setAadhaarError("Aadhaar upload is available on web only right now.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (file) uploadAadhaarFile(file);
    };
    input.click();
  };

  async function submit() {
    setErr(null);
    setResult(null);
    if (getAuthMode() !== "authenticated") {
      setErr("Please login with Google before placing a booking.");
      return;
    }
    if (!aadhaarUrl) {
      setErr("Please upload your Aadhaar card to continue.");
      return;
    }
    const locationLabel = isHotel
      ? (item?.raw?.location || item?.raw?.city || item?.raw?.region || item?.raw?.address || "")
      : (item?.raw?.location || item?.raw?.region || "");
    trackEvent({
      type: "booking_intent",
      category: "transaction",
      name: userName,
      email,
      phone,
      meta: {
        orderType: payload.type,
        itemId: payload.itemId,
        guests: payload.guests,
        roomType: payload.roomType,
        numRooms: payload.numRooms,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        tourDate: payload.tourDate,
        totalAmount: payload.totalPrice || totalPrice || 0,
        paymentMethod: "pending"
      }
    });
    if (locationLabel) {
      trackEvent({
        type: "booking_location",
        category: "location",
        name: userName,
        email,
        phone,
        meta: {
          savedAddresses: [locationLabel],
          localityPatterns: [locationLabel]
        }
      });
    }
    setBusy(true);
    try {
      const r = await apiPost<{ success: boolean; id: string }>("/api/bookings", payload);
      setResult(r);
      trackOrder("booking", r.id);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const handleImageError = useCallback((src: string) => {
    setImageErrors(prev => new Set(prev).add(src));
  }, []);

  const scrollItineraryLeft = useCallback(() => {
    itineraryScrollRef.current?.scrollTo({ x: -200, animated: true });
  }, []);

  const scrollItineraryRight = useCallback(() => {
    itineraryScrollRef.current?.scrollTo({ x: 200, animated: true });
  }, []);

  useEffect(() => {
    if (!visible) return;
    apiGet<any>("/api/meta")
      .then((data) => {
        setMeta(data);
        const tiers = data?.settings?.pricingTiers || [];
        if (tiers.length && !tierName) {
          setTierName(tiers[0].name);
        }
      })
      .catch(() => {
        setMeta(null);
      });
  }, [visible]);

  const thumbnailWidth = isMobile ? 100 : 140;
  const thumbnailHeight = isMobile ? 65 : 90;
  const mainImageHeight = isMobile ? 200 : isTablet ? 240 : 300;

  const WebDateField = ({ value, onPress, placeholder }: any) => (
    <View
      style={{
        backgroundColor: "#141414",
        paddingHorizontal: 12,
        paddingVertical: isMobile ? 10 : 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#007c00",
        flexDirection: "row",
        alignItems: "center"
      }}
      pointerEvents="auto"
      onStartShouldSetResponder={() => true}
      onResponderRelease={onPress}
    >
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#666"
        editable={false}
        onFocus={onPress}
        onPressIn={onPress}
        style={{
          flex: 1,
          color: value ? "#fff" : "#666",
          fontSize: isMobile ? 12 : 14,
          fontWeight: "600",
          padding: 0
        }}
      />
      <Text style={{ color: "#f5f2e8", fontSize: 16, marginLeft: 8 }}>ðŸ“…</Text>
    </View>
  );

  useEffect(() => {
    console.log("[BookingModal] web picker state changed", {
      webPickerVisible,
      webPickerTarget,
      webPickerMonth: webPickerMonth?.toISOString?.(),
    });
  }, [webPickerVisible, webPickerTarget, webPickerMonth]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
        <ScrollView style={{ flex: 1 }}>
          <View style={{
            padding: isMobile ? 14 : 18,
            paddingTop: Platform.select({ ios: 48, default: isMobile ? 14 : 18 })
          }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ color: "#fff", fontSize: isMobile ? 16 : 18, fontWeight: "700", flex: 1, marginRight: 12 }}>
              Book: {item.title}
            </Text>
            <Pressable
              onPress={onClose}
              style={{
                backgroundColor: "#007c00",
                borderRadius: 999,
                paddingHorizontal: isMobile ? 12 : 14,
                paddingVertical: isMobile ? 6 : 7,
                minWidth: isMobile ? 84 : 96,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: "#fff", fontSize: isMobile ? 14 : 16, fontWeight: "800" }}>Close</Text>
            </Pressable>
          </View>

          <Text style={{ color: "#aaa", fontSize: isMobile ? 12 : 14 }}>
            GST is calculated server-side (Indian GST rules).
          </Text>

          <View style={{
            marginTop: 16,
            gap: 16,
            flexDirection: isMobile ? "column" : "row"
          }}>
            {/* Left Panel - Overview */}
            <View style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#1f1f1f",
              borderRadius: 14,
              padding: isMobile ? 12 : 14,
              backgroundColor: "#0f0f0f"
            }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Overview</Text>

              <View style={{ marginTop: 8 }}>
                <Text style={{ color: "#fff", fontSize: isMobile ? 18 : 20, fontWeight: "800" }}>
                  {item.title || leftContent.title}
                </Text>
                {category === "tour" ? (
                  <Text style={{ color: "#aaa", marginTop: 6, fontSize: isMobile ? 12 : 14 }}>
                    {(item.raw?.destination || item.raw?.location) ?
                      `Destination: ${item.raw?.destination || item.raw?.location}` : ""}
                  </Text>
                ) : (
                  <Text style={{ color: "#aaa", marginTop: 6, fontSize: isMobile ? 12 : 14 }}>
                    {(item.raw?.location) ? `Location: ${item.raw?.location}` : ""}
                  </Text>
                )}
                {(category === "tour" ? item.raw?.duration : leftContent.duration) ? (
                  <Text style={{ color: "#aaa", marginTop: 4, fontSize: isMobile ? 12 : 14 }}>
                    Duration: {category === "tour" ? item.raw?.duration : leftContent.duration}
                  </Text>
                ) : null}
              </View>

              <Text style={{ color: "#f5f2e8", fontWeight: "800", marginTop: 8, fontSize: isMobile ? 16 : 18 }}>
                {item.priceLabel}
              </Text>

              {/* Image Gallery */}
              <View style={{ marginTop: 10, marginBottom: 12 }}>
                {/* Main Image */}
                <View style={{ position: "relative", marginBottom: 10 }}>
                  {selectedImage ? (
                    <>
                      <Image
                        source={{ uri: selectedImage }}
                        resizeMode="cover"
                        onError={() => handleImageError(selectedImage)}
                        style={{
                          width: "100%",
                          height: mainImageHeight,
                          borderRadius: 12,
                          backgroundColor: "#111",
                          borderWidth: 1,
                          borderColor: "#333"
                        }}
                      />
                      {imageErrors.has(selectedImage) && (
                        <View style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: "#1a1a1a",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 12
                        }}>
                          <Text style={{ color: "#666", fontSize: 16, fontWeight: "700", letterSpacing: 1 }}>
                            {category.toUpperCase()}
                          </Text>
                          <Text style={{ color: "#555", fontSize: 12, marginTop: 4 }}>Preview unavailable</Text>
                        </View>
                      )}
                    </>
                  ) : null}
                </View>

                {/* Image Info */}
                {selectedMeta ? (
                  <View style={{ marginBottom: 10, paddingHorizontal: 4 }}>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: isMobile ? 14 : 16 }}>
                      {selectedMeta.title}
                    </Text>
                    <Text style={{ color: "#aaa", marginTop: 4, fontSize: isMobile ? 12 : 14 }}>
                      {selectedMeta.description}
                    </Text>
                  </View>
                ) : null}

                {/* Thumbnails */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingRight: 16, paddingLeft: 4, flexGrow: 1 }}
                  scrollEventThrottle={16}
                  style={{ minHeight: thumbnailHeight + 4 }}
                >
                  {imageMeta.map((img: any, i: number) => (
                    <Pressable 
                      key={`thumb_${i}_${img.src}`}
                      onPress={() => setSelectedImage(img.src)}
                      style={{ cursor: "pointer" }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={{ position: "relative" }}>
                        <Image
                          source={{ uri: img.src }}
                          resizeMode="cover"
                          onError={() => handleImageError(img.src)}
                          style={{
                            width: thumbnailWidth,
                            height: thumbnailHeight,
                            borderRadius: 8,
                            backgroundColor: "#111",
                            borderWidth: 2,
                            borderColor: selectedImage === img.src ? "#f5f2e8" : "#333",
                          }}
                        />
                        {imageErrors.has(img.src) && (
                          <View style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "#1a1a1a",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                            pointerEvents: "none"
                          }}>
                            <Text style={{ color: "#666", fontSize: 10, fontWeight: "700" }}>
                              {category.toUpperCase()}
                            </Text>
                            <Text style={{ color: "#555", fontSize: 8, marginTop: 2 }}>Unavailable</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {(highlightsList.length > 0 || inclusionsList.length > 0 || exclusionsList.length > 0) ? (
                <View style={{
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: "#1f1f1f",
                  borderRadius: 12,
                  backgroundColor: "#101010",
                  padding: 10
                }}>
                  <View style={{ flexDirection: isMobile ? "column" : "row", gap: 10 }}>
                    <View style={{ flex: 1, backgroundColor: "#151515", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#202020" }}>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: isMobile ? 13 : 14 }}>Highlights</Text>
                      {highlightsList.length ? highlightsList.map((h: string, i: number) => (
                        <Text key={`hl_${h}_${i}`} style={{ color: "#aaa", marginTop: 4, fontSize: isMobile ? 11 : 12 }}>
                          • {h}
                        </Text>
                      )) : <Text style={{ color: "#666", marginTop: 4, fontSize: isMobile ? 11 : 12 }}>-</Text>}
                    </View>
                    <View style={{ flex: 1, backgroundColor: "#151515", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#202020" }}>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: isMobile ? 13 : 14 }}>Inclusions</Text>
                      {inclusionsList.length ? inclusionsList.map((h: string, i: number) => (
                        <Text key={`inc_${h}_${i}`} style={{ color: "#aaa", marginTop: 4, fontSize: isMobile ? 11 : 12 }}>
                          • {h}
                        </Text>
                      )) : <Text style={{ color: "#666", marginTop: 4, fontSize: isMobile ? 11 : 12 }}>-</Text>}
                    </View>
                    <View style={{ flex: 1, backgroundColor: "#151515", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#202020" }}>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: isMobile ? 13 : 14 }}>Exclusions</Text>
                      {exclusionsList.length ? exclusionsList.map((h: string, i: number) => (
                        <Text key={`exc_${h}_${i}`} style={{ color: "#aaa", marginTop: 4, fontSize: isMobile ? 11 : 12 }}>
                          • {h}
                        </Text>
                      )) : <Text style={{ color: "#666", marginTop: 4, fontSize: isMobile ? 11 : 12 }}>-</Text>}
                    </View>
                  </View>
                </View>
              ) : null}

              {Array.isArray(item.raw?.quick_info) && item.raw.quick_info.length > 0 ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: isMobile ? 14 : 16 }}>Quick Info</Text>
                  {item.raw.quick_info.map((h: string, i: number) => (
                    <View key={`${h}_${i}`} style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 6, gap: 8 }}>
                      <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 14 : 15, marginTop: 1 }}>â„¹</Text>
                      <Text style={{ color: "#aaa", fontSize: isMobile ? 12 : 14, flex: 1 }}>{h}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {itineraryCards.length > 0 ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: isMobile ? 14 : 16, marginBottom: 10 }}>Itinerary</Text>
                  <View style={{ position: "relative" }}>
                    {/* Left Arrow */}
                    <Pressable
                      onPress={scrollItineraryLeft}
                      style={({ hovered }) => [
                        {
                          position: "absolute",
                          left: 0,
                          top: "50%",
                          zIndex: 10,
                          marginTop: -20,
                          backgroundColor: "#007c00",
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: hovered ? 0.8 : 1
                        }
                      ]}
                    >
                      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}></Text>
                    </Pressable>

                    {/* Itinerary ScrollView */}
                    <ScrollView
                      ref={itineraryScrollRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 8, gap: 10, paddingHorizontal: 50 }}
                      scrollEventThrottle={16}
                    >
                      {itineraryCards.map((d: any, i: number) => (
                        <View
                          key={`day_card_${i}`}
                          style={{
                            minWidth: isMobile ? 130 : 155,
                            backgroundColor: "#141414",
                            borderWidth: 1,
                            borderColor: "#1f1f1f",
                            borderRadius: 12,
                            padding: 10,
                            paddingTop: 8,
                            justifyContent: "flex-start",
                            minHeight: isMobile ? 86 : 96,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 3
                          }}
                        >
                          <View>
                            <Text
                              style={{
                                color: "#f5f2e8",
                                fontWeight: "800",
                                fontSize: isMobile ? 10 : 11,
                                letterSpacing: 1,
                                marginBottom: 4,
                                textTransform: "uppercase"
                              }}
                            >
                              Day {d.day}
                            </Text>
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "600",
                                fontSize: isMobile ? 11 : 12,
                                lineHeight: 16,
                                marginBottom: 6
                              }}
                              numberOfLines={2}
                            >
                              {d.title}
                            </Text>
                            <Text
                              style={{
                                color: "#aaa",
                                fontWeight: "400",
                                fontSize: isMobile ? 10 : 11,
                                lineHeight: 14
                              }}
                              numberOfLines={3}
                            >
                              {d.description || ""}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>

                    {/* Right Arrow */}
                    <Pressable
                      onPress={scrollItineraryRight}
                      style={({ hovered }) => [
                        {
                          position: "absolute",
                          right: 0,
                          top: "50%",
                          zIndex: 10,
                          marginTop: -20,
                          backgroundColor: "#007c00",
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: hovered ? 0.8 : 1
                        }
                      ]}
                    >
                      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}></Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {Array.isArray(item.raw?.amenities) && item.raw.amenities.length > 0 ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: isMobile ? 14 : 16, marginBottom: 8 }}>Amenities</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                    {item.raw.amenities.map((a: string, i: number) => (
                      <View key={`${a}_${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 14 : 15 }}></Text>
                        <Text style={{ color: "#aaa", fontSize: isMobile ? 12 : 14 }}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>

            {/* Right Panel - Booking Form */}
            <View style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#1f1f1f",
              borderRadius: 14,
              padding: isMobile ? 12 : 14,
              backgroundColor: "#0f0f0f"
            }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>Booking Details</Text>

              <View style={{ marginTop: 8, gap: 12 }}>
                {/* Guest Info Section */}
                <View style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#007c00" }}>
                  <Text style={{ color: "#f5f2e8", fontSize: 12, fontWeight: "700", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Guest Information</Text>
                  <Field label="Full Name" value={userName} onChangeText={setUserName} />
                  <Field label="Email" value={email} onChangeText={setEmail} style={{ marginTop: 8 }} />
                  <Field label="Phone Number" value={phone} onChangeText={setPhone} style={{ marginTop: 8 }} />
                </View>

                {/* Hotel Specific Fields */}
                {isHotel ? (
                  <>
                    {/* Room Selection */}
                    {item.raw?.roomTypes && item.raw.roomTypes.length > 0 && (
                      <View style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#007c00" }}>
                        <Text style={{ color: "#f5f2e8", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Room Selection</Text>
                        <View style={{ marginBottom: 10 }}>
                          <Text style={{ color: "#ddd", marginBottom: 8, fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>Room Type</Text>
                          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#222", backgroundColor: "#141414", overflow: "hidden" }}>
                            {item.raw.roomTypes.map((rt: any, i: number) => (
                              <Pressable
                                key={i}
                                onPress={() => setRoomType(rt.type)}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 10,
                                  borderBottomWidth: i < item.raw.roomTypes.length - 1 ? 1 : 0,
                                  borderBottomColor: "#222",
                                  backgroundColor: roomType === rt.type ? "#1a3a1a" : "transparent"
                                }}
                              >
                                <Text style={{ color: roomType === rt.type ? "#f5f2e8" : "#aaa", fontWeight: roomType === rt.type ? "700" : "500", fontSize: isMobile ? 12 : 14 }}>
                                  {rt.type} {rt.capacity ? `(${rt.capacity} person)` : ""}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>

                        {/* Number of Rooms */}
                        <View>
                          <Text style={{ color: "#ddd", marginBottom: 8, fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>Number of Rooms</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Pressable
                              onPress={() => setNumRooms(Math.max(1, parseInt(numRooms || "1", 10) - 1).toString())}
                              style={{
                                backgroundColor: "#007c00",
                                width: 36,
                                height: 36,
                                borderRadius: 6,
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
                            </Pressable>
                            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center", backgroundColor: "#141414", paddingVertical: 8, borderRadius: 6 }}>
                              {numRooms}
                            </Text>
                            <Pressable
                              onPress={() => setNumRooms((parseInt(numRooms || "1", 10) + 1).toString())}
                              style={{
                                backgroundColor: "#007c00",
                                width: 36,
                                height: 36,
                                borderRadius: 6,
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    )}

                    {pricingTiers.length > 0 && (
                      <View style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#007c00" }}>
                        <Text style={{ color: "#f5f2e8", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Pricing Tier (Preview)</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          {pricingTiers.map((tier: any) => (
                            <Pressable
                              key={tier.name}
                              onPress={() => setTierName(tier.name)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: tierName === tier.name ? "#007c00" : "#222",
                                backgroundColor: tierName === tier.name ? "#1a3a1a" : "#141414"
                              }}
                            >
                              <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 12 : 13, fontWeight: "700" }}>
                                {tier.name} Â· {Math.round(tier.multiplier * 100)}%
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Text style={{ color: "#777", fontSize: 11, marginTop: 6 }}>
                          Preview only. Final billing uses base pricing rules.
                        </Text>
                      </View>
                    )}

                    {/* Dates Section */}
                    <View style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#007c00" }}>
                      <Text style={{ color: "#f5f2e8", fontSize: 12, fontWeight: "700", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Stay Dates</Text>
                      
                      {/* Check In and Check Out in Row */}
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#ddd", marginBottom: 6, fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>Check In</Text>
                          {isWeb ? (
                            <WebDateField
                              placeholder="YYYY-MM-DD"
                              value={checkIn}
                              onPress={() => openWebPicker("checkIn")}
                            />
                          ) : (
                            <>
                              <Pressable
                                onPress={() => setShowCheckInPicker(true)}
                                style={{
                                  backgroundColor: "#141414",
                                  paddingHorizontal: 12,
                                  paddingVertical: isMobile ? 10 : 12,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: "#007c00",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between"
                                }}
                              >
                                <Text style={{ color: "#fff", fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>{checkIn}</Text>
                                <Text style={{ color: "#f5f2e8", fontSize: 16 }}>ðŸ“…</Text>
                              </Pressable>
                              {showCheckInPicker && (
                                <DateTimePicker
                                  value={checkInDate || new Date()}
                                  mode="date"
                                  display="calendar"
                                  onChange={(event, selectedDate) => {
                                    setShowCheckInPicker(false);
                                    if (selectedDate) {
                                      setCheckInSafe(formatDate(selectedDate));
                                    }
                                  }}
                                  minimumDate={today}
                                />
                              )}
                            </>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#ddd", marginBottom: 6, fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>Check Out</Text>
                          {isWeb ? (
                            <WebDateField
                              placeholder="YYYY-MM-DD"
                              value={checkOut}
                              onPress={() => openWebPicker("checkOut")}
                            />
                          ) : (
                            <>
                              <Pressable
                                onPress={() => setShowCheckOutPicker(true)}
                                style={{
                                  backgroundColor: "#141414",
                                  paddingHorizontal: 12,
                                  paddingVertical: isMobile ? 10 : 12,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: "#007c00",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between"
                                }}
                              >
                                <Text style={{ color: "#fff", fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>{checkOut}</Text>
                                <Text style={{ color: "#f5f2e8", fontSize: 16 }}>ðŸ“…</Text>
                              </Pressable>
                              {showCheckOutPicker && (
                                <DateTimePicker
                                  value={checkOutDate || new Date()}
                                  mode="date"
                                  display="calendar"
                                  onChange={(event, selectedDate) => {
                                    setShowCheckOutPicker(false);
                                    if (selectedDate) {
                                      setCheckOutSafe(formatDate(selectedDate));
                                    }
                                  }}
                                  minimumDate={today}
                                />
                              )}
                            </>
                          )}
                        </View>
                      </View>

                      {/* Calculate and show nights */}
                      {numNights > 0 && (
                        <View style={{ marginTop: 10, backgroundColor: "#141414", borderRadius: 6, padding: 8 }}>
                          <Text style={{ color: "#aaa", fontSize: 12 }}>
                            Duration: <Text style={{ color: "#f5f2e8", fontWeight: "700" }}>{Math.ceil(numNights)} night{Math.ceil(numNights) !== 1 ? "s" : ""}</Text>
                          </Text>
                        </View>
                      )}

                      {isHotelClosed && (
                        <View style={{ marginTop: 8, backgroundColor: "#1a1a1a", borderRadius: 6, padding: 8, borderWidth: 1, borderColor: "#333" }}>
                          <Text style={{ color: "#ffb4b4", fontSize: 12, fontWeight: "700" }}>
                            Selected dates are closed for this property.
                          </Text>
                        </View>
                      )}

                      {typeof roomInventory === "number" && (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ color: "#aaa", fontSize: 12 }}>
                            Rooms available for {roomType}: <Text style={{ color: "#f5f2e8", fontWeight: "700" }}>{roomInventory}</Text>
                          </Text>
                        </View>
                      )}

                      {(item?.raw?.minNights || item?.raw?.maxNights || item?.raw?.childPolicy) && (
                        <View style={{ marginTop: 8 }}>
                          {item?.raw?.minNights ? (
                            <Text style={{ color: "#aaa", fontSize: 12 }}>Min nights: {item.raw.minNights}</Text>
                          ) : null}
                          {item?.raw?.maxNights ? (
                            <Text style={{ color: "#aaa", fontSize: 12 }}>Max nights: {item.raw.maxNights}</Text>
                          ) : null}
                          {item?.raw?.childPolicy ? (
                            <Text style={{ color: "#777", fontSize: 11, marginTop: 4 }}>{item.raw.childPolicy}</Text>
                          ) : null}
                        </View>
                      )}
                    </View>

                    {/* Guests Section */}
                    <View style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#007c00" }}>
                      <Text style={{ color: "#f5f2e8", fontSize: 12, fontWeight: "700", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Guests</Text>
                      <Text style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>Max capacity: {maxGuests} person{maxGuests !== 1 ? "s" : ""}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Pressable
                          onPress={() => setGuests(Math.max(1, parseInt(guests || "1", 10) - 1).toString())}
                          style={{
                            backgroundColor: "#007c00",
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
                        </Pressable>
                        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center", backgroundColor: "#141414", paddingVertical: 8, borderRadius: 6 }}>
                          {guests}
                        </Text>
                        <Pressable
                          onPress={() => setGuests(Math.min(maxGuests, parseInt(guests || "1", 10) + 1).toString())}
                          style={{
                            backgroundColor: "#007c00",
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </>
                ) : (
                  /* Tour Fields */
                  <View style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#007c00" }}>
                    <Text style={{ color: "#f5f2e8", fontSize: 12, fontWeight: "700", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Tour Date</Text>
                    {isWeb ? (
                      <View>
                        <Text style={{ color: "#ddd", marginBottom: 6, fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>Tour Date (YYYY-MM-DD)</Text>
                        <WebDateField
                          placeholder="YYYY-MM-DD"
                          value={tourDate}
                          onPress={() => openWebPicker("tourDate")}
                        />
                      </View>
                    ) : (
                      <>
                        <Pressable
                          onPress={() => setShowTourDatePicker(true)}
                          style={{
                            backgroundColor: "#141414",
                            paddingHorizontal: 12,
                            paddingVertical: isMobile ? 10 : 12,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: "#007c00",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between"
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>{tourDate}</Text>
                          <Text style={{ color: "#f5f2e8", fontSize: 16 }}>ðŸ“…</Text>
                        </Pressable>
                        {showTourDatePicker && (
                          <DateTimePicker
                            value={parseDate(tourDate) || new Date()}
                            mode="date"
                            display="calendar"
                            onChange={(event, selectedDate) => {
                              setShowTourDatePicker(false);
                              if (selectedDate) {
                                setTourDate(formatDate(selectedDate));
                              }
                            }}
                            minimumDate={today}
                          />
                        )}
                      </>
                    )}

                    {isTourClosed && (
                      <View style={{ marginTop: 8, backgroundColor: "#1a1a1a", borderRadius: 6, padding: 8, borderWidth: 1, borderColor: "#333" }}>
                        <Text style={{ color: "#ffb4b4", fontSize: 12, fontWeight: "700" }}>
                          Tour is closed on the selected date.
                        </Text>
                      </View>
                    )}

                    {tourCapacity ? (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ color: "#aaa", fontSize: 12 }}>
                          Capacity for {tourDate}: <Text style={{ color: "#f5f2e8", fontWeight: "700" }}>{tourCapacity}</Text>
                        </Text>
                      </View>
                    ) : null}
                    
                    <Text style={{ color: "#ddd", marginTop: 10, marginBottom: 6, fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>Number of Guests</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable
                        onPress={() => setGuests(Math.max(1, parseInt(guests || "1", 10) - 1).toString())}
                        style={{
                          backgroundColor: "#007c00",
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
                      </Pressable>
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center", backgroundColor: "#141414", paddingVertical: 8, borderRadius: 6 }}>
                        {guests}
                      </Text>
                      <Pressable
                        onPress={() => setGuests((parseInt(guests || "1", 10) + 1).toString())}
                        style={{
                          backgroundColor: "#007c00",
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Aadhaar Upload */}
                <View style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#007c00" }}>
                  <Text style={{ color: "#f5f2e8", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Aadhaar Card
                  </Text>
                  <Text style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>
                    Required for all tour and hotel bookings.
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Pressable
                      onPress={openAadhaarPicker}
                      style={{
                        backgroundColor: "#f5f2e8",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8
                      }}
                      disabled={aadhaarUploading}
                    >
                      <Text style={{ color: "#111", fontWeight: "800", fontSize: 12 }}>
                        {aadhaarUploading ? "Uploading..." : aadhaarUrl ? "Replace Aadhaar" : "Upload Aadhaar"}
                      </Text>
                    </Pressable>
                    {aadhaarUrl ? (
                      <Text style={{ color: "#9ef1a6", fontSize: 12, fontWeight: "700" }}>
                        Uploaded: {aadhaarFileName || "Aadhaar card"}
                      </Text>
                    ) : (
                      <Text style={{ color: "#aaa", fontSize: 12 }}>JPG/PNG only, max 5MB.</Text>
                    )}
                  </View>
                  {aadhaarError ? (
                    <Text style={{ color: "#ff6b6b", fontSize: 12, marginTop: 6 }}>{aadhaarError}</Text>
                  ) : null}
                </View>

                {/* Special Requests */}
                <View style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#007c00" }}>
                  <Text style={{ color: "#f5f2e8", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Special Requests</Text>
                  <TextInput
                    value={specialRequests}
                    onChangeText={(v) => setSpecialRequests(autoCapitalizeNewLineStarts(v))}
                    placeholder="Any special requirements..."
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: "#141414",
                      color: "#fff",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#222",
                      fontSize: isMobile ? 12 : 14,
                      textAlignVertical: "top"
                    }}
                  />
                </View>

                {(meta?.coupons?.length || meta?.policies) && (
                  <View style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#007c00" }}>
                    <Text style={{ color: "#f5f2e8", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Offers & Policies</Text>
                    {meta?.coupons && (
                      <View style={{ marginBottom: 8, gap: 6 }}>
                        <Text style={{ color: "#aaa", fontSize: 12, fontWeight: "600" }}>Coupons</Text>
                        {meta.coupons
                          .filter((c: any) => c.category === "all" || c.category === (isHotel ? "hotel" : "tour"))
                          .slice(0, 3)
                          .map((c: any) => (
                            <Text key={c.code} style={{ color: "#ddd", fontSize: 12 }}>
                              {c.code} Â· {c.type === "flat" ? `â‚¹${c.amount}` : `${c.amount}%`} off Â· Min â‚¹{c.minCart}
                            </Text>
                          ))}
                      </View>
                    )}
                    {meta?.policies && (
                      <View style={{ gap: 4 }}>
                        <Text style={{ color: "#aaa", fontSize: 12, fontWeight: "600" }}>Cancellation</Text>
                        {isHotel ? (
                          <Text style={{ color: "#ddd", fontSize: 12 }}>
                            Free cancellation up to {meta.policies.hotel.freeCancelHours}h before check-in. Fee after: {Math.round(meta.policies.hotel.feeAfter * 100)}%.
                          </Text>
                        ) : (
                          <Text style={{ color: "#ddd", fontSize: 12 }}>
                            Free cancellation up to {meta.policies.tour.freeCancelHours}h before departure. Fee after: {Math.round(meta.policies.tour.feeAfter * 100)}%.
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Error and Success Messages */}
              {err ? (
                <Text style={{ color: "#ff6b6b", marginTop: 12, fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>{err}</Text>
              ) : null}
              {result ? (
                <Text style={{ color: "#9ef1a6", marginTop: 12, fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>
                   Submitted! ID: {result.id}
                </Text>
              ) : null}

              {/* Price Summary and Submit */}
              {isHotel && totalPrice > 0 && (
                <View style={{
                  marginTop: 14,
                  backgroundColor: "#007c00",
                  borderRadius: 10,
                  padding: 14,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8
                }}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Booking Summary</Text>
                  
                  <View style={{ gap: 8, marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 12 : 13 }}>â‚¹5,000 Ã— {Math.ceil(numNights)} night{Math.ceil(numNights) !== 1 ? "s" : ""}</Text>
                      <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 12 : 13, fontWeight: "600" }}>â‚¹{(5000 * Math.ceil(numNights)).toLocaleString()}</Text>
                    </View>
                    
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 12 : 13 }}>Ã— {numRooms} room{Number(numRooms) !== 1 ? "s" : ""}</Text>
                      <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 12 : 13, fontWeight: "600" }}>Ã—{numRooms}</Text>
                    </View>
                    {selectedTier && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 12 : 13 }}>Tier: {selectedTier.name}</Text>
                        <Text style={{ color: "#f5f2e8", fontSize: isMobile ? 12 : 13, fontWeight: "600" }}>
                          {Math.round(tierMultiplier * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={{ borderTopWidth: 1, borderTopColor: "#f5f2e8", paddingTop: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View>
                        <Text style={{ color: "#fff", fontSize: isMobile ? 14 : 16, fontWeight: "700" }}>Total</Text>
                        {selectedTier ? (
                          <Text style={{ color: "#e7ffe7", fontSize: 11 }}>
                            Preview: â‚¹{tierPreviewTotal.toLocaleString("en-IN")}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={{ color: "#fff", fontSize: isMobile ? 24 : 28, fontWeight: "900" }}>â‚¹{totalPrice.toLocaleString("en-IN")}</Text>
                    </View>
                  </View>
                </View>
              )}

              <Pressable
                disabled={busy}
                onPress={submit}
                style={({ hovered }) => [
                  {
                    marginTop: 16,
                    backgroundColor: "#fff",
                    paddingVertical: isMobile ? 12 : 14,
                    borderRadius: 10,
                    alignItems: "center",
                    opacity: busy ? 0.6 : 1,
                    shadowColor: "#007c00",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: hovered ? 0.4 : 0.2,
                    shadowRadius: 8,
                    elevation: 5
                  },
                  hovered ? { backgroundColor: "#007c00" } : null
                ]}
              >
                {({ hovered }) => (
                  <Text style={{ fontWeight: "800", fontSize: isMobile ? 14 : 16, color: hovered ? "#fff" : "#1c1c1c" }}>
                    {busy ? "Booking..." : "Confirm Booking"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
        </ScrollView>

        {isWeb && webPickerVisible && (
          <View style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <View style={{
              backgroundColor: "#0f0f0f",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#1f1f1f",
              padding: 14,
              width: isMobile ? "90%" : 360
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <Pressable
                  onPress={() => setWebPickerMonth(new Date(webPickerMonth.getFullYear(), webPickerMonth.getMonth() - 1, 1))}
                  style={{ padding: 6, borderRadius: 6, backgroundColor: "#1a1a1a" }}
                >
                  <Text style={{ color: "#fff", fontSize: 16 }}>{"<"}</Text>
                </Pressable>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                  {webPickerMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
                </Text>
                <Pressable
                  onPress={() => setWebPickerMonth(new Date(webPickerMonth.getFullYear(), webPickerMonth.getMonth() + 1, 1))}
                  style={{ padding: 6, borderRadius: 6, backgroundColor: "#1a1a1a" }}
                >
                  <Text style={{ color: "#fff", fontSize: 16 }}>{">"}</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (
                  <View key={d} style={{ width: "14.285%", alignItems: "center", marginBottom: 6 }}>
                    <Text style={{ color: "#777", fontSize: 11, fontWeight: "700" }}>{d}</Text>
                  </View>
                ))}
                {(() => {
                  const year = webPickerMonth.getFullYear();
                  const month = webPickerMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const cells = [] as any[];
                  for (let i = 0; i < firstDay; i += 1) {
                    cells.push(<View key={`empty_${i}`} style={{ width: "14.285%", height: 32 }} />);
                  }
                  for (let d = 1; d <= daysInMonth; d += 1) {
                    const dayDate = new Date(year, month, d);
                    const disabled = isPastDate(dayDate);
                    cells.push(
                      <Pressable
                        key={`day_${d}`}
                        onPress={() => !disabled && applyWebDate(dayDate)}
                        disabled={disabled}
                        style={{
                          width: "14.285%",
                          height: 32,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: disabled ? 0.35 : 1
                        }}
                      >
                        <Text style={{ color: disabled ? "#555" : "#fff", fontSize: 12 }}>{d}</Text>
                      </Pressable>
                    );
                  }
                  return cells;
                })()}
              </View>

              <Pressable
                onPress={() => setWebPickerVisible(false)}
                style={{ marginTop: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: "#1a1a1a", alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function Field({ label, ...props }: any) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { style, ...inputProps } = props;

  return (
    <View style={style}>
      <Text style={{ color: "#ddd", marginBottom: 6, fontSize: isMobile ? 12 : 14, fontWeight: "600" }}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor="#666"
        style={{
          backgroundColor: "#141414",
          color: "#fff",
          paddingHorizontal: 12,
          paddingVertical: isMobile ? 10 : 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#222",
          fontSize: isMobile ? 14 : 16
        }}
      />
    </View>
  );
}

