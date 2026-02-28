import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Modal, View, Text, Pressable, TextInput, Platform, Image, ScrollView, useWindowDimensions } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiGet, apiPost, resolveAssetUrl, trackEvent, uploadAadhaar } from "../lib/api";
import { getAuthMode } from "../lib/auth";
import { trackOrder } from "../lib/orders";
import { autoCapitalizeNewLineStarts } from "../lib/text";
import { bookingModalColors, bookingModalInlineStyles as bmIn } from "../styles/BookingModal.styles";
import { bookingModalData as t } from "../staticData/bookingModal.staticData";

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
  const [guests, setGuests] = useState(t.defaults.guests);
  const [numRooms, setNumRooms] = useState(t.defaults.numRooms);
  const [checkIn, setCheckIn] = useState(t.defaults.checkIn);
  const [checkOut, setCheckOut] = useState(t.defaults.checkOut);
  const [tourDate, setTourDate] = useState(t.defaults.tourDate);
  const [roomType, setRoomType] = useState(item.kind === "hotel" ? (item.raw.roomTypes?.[0]?.type || t.defaults.roomTypeFallback) : "");
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
  const maxGuestsByRoom: { [key: string]: number } = t.maxGuestsByRoom;
  const maxGuests = isHotel ? (maxGuestsByRoom[roomType] || t.defaults.maxGuestsFallback) : t.defaults.maxGuestsTourFallback;
  
  // Pricing calculation
  const pricePerRoom = t.pricing.pricePerRoom; // Base price per room per night
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
    console.log(t.logs.openWebPicker, { target, isWeb, isHotel });
    const currentValue = target === "checkIn" ? checkIn : target === "checkOut" ? checkOut : tourDate;
    const currentDate = parseDate(currentValue) || new Date();
    console.log(t.logs.openWebPickerValue, { currentValue, currentDate: currentDate.toISOString() });
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
        description: Array.isArray(d?.activities) ? d.activities.join(t.itinerary.activityJoiner) : String(d?.description || "")
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
        resolveAssetUrl(src)
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
        title: String(match?.title || backendTitles[i] || `${item?.title || t.labels.imageFallback} ${i + 1}`),
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
      const data = await uploadAadhaar(file);
      setAadhaarUrl(String(data?.url || ""));
      setAadhaarFileName(file.name || t.labels.aadhaarFallbackName);
    } catch (e: any) {
      setAadhaarError(String(e?.message || e));
    } finally {
      setAadhaarUploading(false);
    }
  };

  const openAadhaarPicker = () => {
    if (!isWeb) {
      setAadhaarError(t.errors.aadhaarWebOnly);
      return;
    }
    const input = document.createElement("input");
    input.type = t.fields.fileInputType;
    input.accept = t.fields.fileAccept;
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
      setErr(t.errors.loginRequired);
      return;
    }
    if (!aadhaarUrl) {
      setErr(t.errors.aadhaarRequired);
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
      const r = await apiPost<{ success: boolean; id: string }>(t.api.bookings, payload);
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
    apiGet<any>(t.api.meta)
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
      style={bmIn.s1({ isMobile })}
      pointerEvents="auto"
      onStartShouldSetResponder={() => true}
      onResponderRelease={onPress}
    >
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={bookingModalColors.placeholder}
        editable={false}
        onFocus={onPress}
        onPressIn={onPress}
        style={bmIn.s2({ isMobile, value })}
      />
      <Text style={bmIn.s3()}>{t.icons.calendar}</Text>
    </View>
  );

  useEffect(() => {
    console.log(t.logs.webPickerChanged, {
      webPickerVisible,
      webPickerTarget,
      webPickerMonth: webPickerMonth?.toISOString?.(),
    });
  }, [webPickerVisible, webPickerTarget, webPickerMonth]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={bmIn.s4()}>
        <ScrollView style={bmIn.s5()}>
          <View style={bmIn.s6({ Platform, isMobile })}>
          <View style={bmIn.s7()}>
            <Text style={bmIn.s8({ isMobile })}>
              {t.labels.bookPrefix} {item.title}
            </Text>
            <Pressable
              onPress={onClose}
              style={bmIn.s9({ isMobile })}
            >
              <Text style={bmIn.s10({ isMobile })}>{t.labels.close}</Text>
            </Pressable>
          </View>

          <Text style={bmIn.s11({ isMobile })}>
            {t.labels.gstNote}
          </Text>

          <View style={bmIn.s12({ isMobile })}>
            {/* Left Panel - Overview */}
            <View style={bmIn.s13({ isMobile })}>
              <Text style={bmIn.s14()}>{t.labels.overview}</Text>

              <View style={bmIn.s15()}>
                <Text style={bmIn.s16({ isMobile })}>
                  {item.title || leftContent.title}
                </Text>
                {category === "tour" ? (
                  <Text style={bmIn.s17({ isMobile })}>
                    {(item.raw?.destination || item.raw?.location) ?
                      `${t.labels.destination} ${item.raw?.destination || item.raw?.location}` : ""}
                  </Text>
                ) : (
                  <Text style={bmIn.s18({ isMobile })}>
                    {(item.raw?.location) ? `${t.labels.location} ${item.raw?.location}` : ""}
                  </Text>
                )}
                {(category === "tour" ? item.raw?.duration : leftContent.duration) ? (
                  <Text style={bmIn.s19({ isMobile })}>
                    {t.labels.duration} {category === "tour" ? item.raw?.duration : leftContent.duration}
                  </Text>
                ) : null}
              </View>

              <Text style={bmIn.s20({ isMobile })}>
                {item.priceLabel}
              </Text>

              {/* Image Gallery */}
              <View style={bmIn.s21()}>
                {/* Main Image */}
                <View style={bmIn.s22()}>
                  {selectedImage ? (
                    <>
                      <Image
                        source={{ uri: selectedImage }}
                        resizeMode="cover"
                        onError={() => handleImageError(selectedImage)}
                        style={bmIn.s23({ mainImageHeight })}
                      />
                      {imageErrors.has(selectedImage) && (
                        <View style={bmIn.s24()}>
                          <Text style={bmIn.s25()}>
                            {category.toUpperCase()}
                          </Text>
                          <Text style={bmIn.s26()}>{t.labels.previewUnavailable}</Text>
                        </View>
                      )}
                    </>
                  ) : null}
                </View>

                {/* Image Info */}
                {selectedMeta ? (
                  <View style={bmIn.s27()}>
                    <Text style={bmIn.s28({ isMobile })}>
                      {selectedMeta.title}
                    </Text>
                    <Text style={bmIn.s29({ isMobile })}>
                      {selectedMeta.description}
                    </Text>
                  </View>
                ) : null}

                {/* Thumbnails */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={bmIn.s209()}
                  scrollEventThrottle={16}
                  style={bmIn.s30({ thumbnailHeight })}
                >
                  {imageMeta.map((img: any, i: number) => (
                    <Pressable 
                      key={`thumb_${i}_${img.src}`}
                      onPress={() => setSelectedImage(img.src)}
                      style={bmIn.s31()}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={bmIn.s32()}>
                        <Image
                          source={{ uri: img.src }}
                          resizeMode="cover"
                          onError={() => handleImageError(img.src)}
                          style={bmIn.s33({ img, selectedImage, thumbnailHeight, thumbnailWidth })}
                        />
                        {imageErrors.has(img.src) && (
                          <View style={bmIn.s34()}>
                            <Text style={bmIn.s35()}>
                              {category.toUpperCase()}
                            </Text>
                            <Text style={bmIn.s36()}>{t.labels.unavailable}</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {(highlightsList.length > 0 || inclusionsList.length > 0 || exclusionsList.length > 0) ? (
                <View style={bmIn.s37()}>
                  <View style={bmIn.s38({ isMobile })}>
                    <View style={bmIn.s39()}>
                      <Text style={bmIn.s40({ isMobile })}>{t.labels.highlights}</Text>
                      {highlightsList.length ? highlightsList.map((h: string, i: number) => (
                        <Text key={`hl_${h}_${i}`} style={bmIn.s41({ isMobile })}>
                          {t.badges.bullet} {h}
                        </Text>
                      )) : <Text style={bmIn.s42({ isMobile })}>{t.badges.empty}</Text>}
                    </View>
                    <View style={bmIn.s43()}>
                      <Text style={bmIn.s44({ isMobile })}>{t.labels.inclusions}</Text>
                      {inclusionsList.length ? inclusionsList.map((h: string, i: number) => (
                        <Text key={`inc_${h}_${i}`} style={bmIn.s45({ isMobile })}>
                          {t.badges.bullet} {h}
                        </Text>
                      )) : <Text style={bmIn.s46({ isMobile })}>{t.badges.empty}</Text>}
                    </View>
                    <View style={bmIn.s47()}>
                      <Text style={bmIn.s48({ isMobile })}>{t.labels.exclusions}</Text>
                      {exclusionsList.length ? exclusionsList.map((h: string, i: number) => (
                        <Text key={`exc_${h}_${i}`} style={bmIn.s49({ isMobile })}>
                          {t.badges.bullet} {h}
                        </Text>
                      )) : <Text style={bmIn.s50({ isMobile })}>{t.badges.empty}</Text>}
                    </View>
                  </View>
                </View>
              ) : null}

              {Array.isArray(item.raw?.quick_info) && item.raw.quick_info.length > 0 ? (
                <View style={bmIn.s51()}>
                  <Text style={bmIn.s52({ isMobile })}>{t.labels.quickInfo}</Text>
                  {item.raw.quick_info.map((h: string, i: number) => (
                    <View key={`${h}_${i}`} style={bmIn.s53()}>
                      <Text style={bmIn.s54({ isMobile })}>{t.icons.info}</Text>
                      <Text style={bmIn.s55({ isMobile })}>{h}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {itineraryCards.length > 0 ? (
                <View style={bmIn.s56()}>
                  <Text style={bmIn.s57({ isMobile })}>{t.labels.itinerary}</Text>
                  <View style={bmIn.s58()}>
                    {/* Left Arrow */}
                    <Pressable
                      onPress={scrollItineraryLeft}
                      style={({ hovered }) => [bmIn.s210("left", !!hovered)]}
                    >
                      <Text style={bmIn.s59()}></Text>
                    </Pressable>

                    {/* Itinerary ScrollView */}
                    <ScrollView
                      ref={itineraryScrollRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={bmIn.s211()}
                      scrollEventThrottle={16}
                    >
                      {itineraryCards.map((d: any, i: number) => (
                        <View
                          key={`day_card_${i}`}
                          style={bmIn.s60({ isMobile })}
                        >
                          <View>
                            <Text
                              style={bmIn.s61({ isMobile })}
                            >
                              {t.itinerary.day(d.day)}
                            </Text>
                            <Text
                              style={bmIn.s62({ isMobile })}
                              numberOfLines={2}
                            >
                              {d.title}
                            </Text>
                            <Text
                              style={bmIn.s63({ isMobile })}
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
                      style={({ hovered }) => [bmIn.s210("right", !!hovered)]}
                    >
                      <Text style={bmIn.s64()}></Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {Array.isArray(item.raw?.amenities) && item.raw.amenities.length > 0 ? (
                <View style={bmIn.s65()}>
                  <Text style={bmIn.s66({ isMobile })}>{t.labels.amenities}</Text>
                  <View style={bmIn.s67()}>
                    {item.raw.amenities.map((a: string, i: number) => (
                      <View key={`${a}_${i}`} style={bmIn.s68()}>
                        <Text style={bmIn.s69({ isMobile })}></Text>
                        <Text style={bmIn.s70({ isMobile })}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>

            {/* Right Panel - Booking Form */}
            <View style={bmIn.s71({ isMobile })}>
              <Text style={bmIn.s72()}>{t.labels.bookingDetails}</Text>

              <View style={bmIn.s73()}>
                {/* Guest Info Section */}
                <View style={bmIn.s74()}>
                  <Text style={bmIn.s75()}>{t.labels.guestInfo}</Text>
                  <Field label={t.labels.fullName} value={userName} onChangeText={setUserName} />
                  <Field label={t.labels.email} value={email} onChangeText={setEmail} style={bmIn.s76()} />
                  <Field label={t.labels.phoneNumber} value={phone} onChangeText={setPhone} style={bmIn.s77()} />
                </View>

                {/* Hotel Specific Fields */}
                {isHotel ? (
                  <>
                    {/* Room Selection */}
                    {item.raw?.roomTypes && item.raw.roomTypes.length > 0 && (
                      <View style={bmIn.s78()}>
                        <Text style={bmIn.s79()}>{t.labels.roomSelection}</Text>
                        <View style={bmIn.s80()}>
                          <Text style={bmIn.s81({ isMobile })}>{t.labels.roomType}</Text>
                          <View style={bmIn.s82()}>
                            {item.raw.roomTypes.map((rt: any, i: number) => (
                              <Pressable
                                key={i}
                                onPress={() => setRoomType(rt.type)}
                                style={bmIn.s83({ i, item, roomType, rt })}
                              >
                                <Text style={bmIn.s84({ isMobile, roomType, rt })}>
                                  {rt.type} {rt.capacity ? `(${rt.capacity} ${t.labels.person})` : ""}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>

                        {/* Number of Rooms */}
                        <View>
                          <Text style={bmIn.s85({ isMobile })}>{t.labels.numberOfRooms}</Text>
                          <View style={bmIn.s86()}>
                            <Pressable
                              onPress={() => setNumRooms(Math.max(1, parseInt(numRooms || "1", 10) - 1).toString())}
                              style={bmIn.s87()}
                            >
                              <Text style={bmIn.s88()}>{t.icons.plus}</Text>
                            </Pressable>
                            <Text style={bmIn.s89()}>
                              {numRooms}
                            </Text>
                            <Pressable
                              onPress={() => setNumRooms((parseInt(numRooms || "1", 10) + 1).toString())}
                              style={bmIn.s90()}
                            >
                              <Text style={bmIn.s91()}>{t.icons.plus}</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    )}

                    {pricingTiers.length > 0 && (
                      <View style={bmIn.s92()}>
                        <Text style={bmIn.s93()}>{t.labels.pricingTier}</Text>
                        <View style={bmIn.s94()}>
                          {pricingTiers.map((tier: any) => (
                            <Pressable
                              key={tier.name}
                              onPress={() => setTierName(tier.name)}
                              style={bmIn.s95({ tier, tierName })}
                            >
                              <Text style={bmIn.s96({ isMobile })}>
                                {tier.name} {t.policy.couponSeparator} {Math.round(tier.multiplier * 100)}%
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Text style={bmIn.s97()}>
                          {t.labels.pricingTierNote}
                        </Text>
                      </View>
                    )}

                    {/* Dates Section */}
                    <View style={bmIn.s98()}>
                      <Text style={bmIn.s99()}>{t.labels.stayDates}</Text>
                      
                      {/* Check In and Check Out in Row */}
                      <View style={bmIn.s100()}>
                        <View style={bmIn.s101()}>
                          <Text style={bmIn.s102({ isMobile })}>{t.labels.checkIn}</Text>
                          {isWeb ? (
                            <WebDateField
                              placeholder={t.date.webPlaceholder}
                              value={checkIn}
                              onPress={() => openWebPicker("checkIn")}
                            />
                          ) : (
                            <>
                              <Pressable
                                onPress={() => setShowCheckInPicker(true)}
                                style={bmIn.s103({ isMobile })}
                              >
                                <Text style={bmIn.s104({ isMobile })}>{checkIn}</Text>
                                <Text style={bmIn.s105()}>{t.icons.calendar}</Text>
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

                        <View style={bmIn.s106()}>
                          <Text style={bmIn.s107({ isMobile })}>{t.labels.checkOut}</Text>
                          {isWeb ? (
                            <WebDateField
                              placeholder={t.date.webPlaceholder}
                              value={checkOut}
                              onPress={() => openWebPicker("checkOut")}
                            />
                          ) : (
                            <>
                              <Pressable
                                onPress={() => setShowCheckOutPicker(true)}
                                style={bmIn.s108({ isMobile })}
                              >
                                <Text style={bmIn.s109({ isMobile })}>{checkOut}</Text>
                                <Text style={bmIn.s110()}>{t.icons.calendar}</Text>
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
                        <View style={bmIn.s111()}>
                          <Text style={bmIn.s112()}>
                            {t.labels.duration} <Text style={bmIn.s113()}>{Math.ceil(numNights)} {Math.ceil(numNights) !== 1 ? t.labels.nightsPlural : t.labels.nights}</Text>
                          </Text>
                        </View>
                      )}

                      {isHotelClosed && (
                        <View style={bmIn.s114()}>
                          <Text style={bmIn.s115()}>
                            {t.labels.closedDates}
                          </Text>
                        </View>
                      )}

                      {typeof roomInventory === "number" && (
                        <View style={bmIn.s116()}>
                          <Text style={bmIn.s117()}>
                            {t.labels.roomsAvailable(roomType)} <Text style={bmIn.s118()}>{roomInventory}</Text>
                          </Text>
                        </View>
                      )}

                      {(item?.raw?.minNights || item?.raw?.maxNights || item?.raw?.childPolicy) && (
                        <View style={bmIn.s119()}>
                          {item?.raw?.minNights ? (
                            <Text style={bmIn.s120()}>{t.labels.minNights} {item.raw.minNights}</Text>
                          ) : null}
                          {item?.raw?.maxNights ? (
                            <Text style={bmIn.s121()}>{t.labels.maxNights} {item.raw.maxNights}</Text>
                          ) : null}
                          {item?.raw?.childPolicy ? (
                            <Text style={bmIn.s122()}>{item.raw.childPolicy}</Text>
                          ) : null}
                        </View>
                      )}
                    </View>

                    {/* Guests Section */}
                    <View style={bmIn.s123()}>
                      <Text style={bmIn.s124()}>{t.labels.guests}</Text>
                      <Text style={bmIn.s125()}>{t.labels.maxCapacity} {maxGuests} {maxGuests !== 1 ? t.labels.people : t.labels.person}</Text>
                      <View style={bmIn.s126()}>
                        <Pressable
                          onPress={() => setGuests(Math.max(1, parseInt(guests || "1", 10) - 1).toString())}
                          style={bmIn.s127()}
                        >
                          <Text style={bmIn.s128()}>{t.icons.plus}</Text>
                        </Pressable>
                        <Text style={bmIn.s129()}>
                          {guests}
                        </Text>
                        <Pressable
                          onPress={() => setGuests(Math.min(maxGuests, parseInt(guests || "1", 10) + 1).toString())}
                          style={bmIn.s130()}
                        >
                          <Text style={bmIn.s131()}>{t.icons.plus}</Text>
                        </Pressable>
                      </View>
                    </View>
                  </>
                ) : (
                  /* Tour Fields */
                  <View style={bmIn.s132()}>
                    <Text style={bmIn.s133()}>{t.labels.tourDate}</Text>
                    {isWeb ? (
                      <View>
                        <Text style={bmIn.s134({ isMobile })}>{t.labels.tourDateHelp}</Text>
                        <WebDateField
                          placeholder={t.date.tourDatePlaceholder}
                          value={tourDate}
                          onPress={() => openWebPicker("tourDate")}
                        />
                      </View>
                    ) : (
                      <>
                        <Pressable
                          onPress={() => setShowTourDatePicker(true)}
                          style={bmIn.s135({ isMobile })}
                        >
                          <Text style={bmIn.s136({ isMobile })}>{tourDate}</Text>
                          <Text style={bmIn.s137()}>{t.icons.calendar}</Text>
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
                      <View style={bmIn.s138()}>
                        <Text style={[bmIn.s139(), bmIn.s212()]}>
                          {t.labels.tourClosed}
                        </Text>
                      </View>
                    )}

                    {tourCapacity ? (
                      <View style={bmIn.s140()}>
                        <Text style={bmIn.s141()}>
                          {t.labels.capacityForDate(tourDate)} <Text style={bmIn.s142()}>{tourCapacity}</Text>
                        </Text>
                      </View>
                    ) : null}
                    
                    <Text style={bmIn.s143({ isMobile })}>{t.labels.numberOfGuests}</Text>
                    <View style={bmIn.s144()}>
                      <Pressable
                        onPress={() => setGuests(Math.max(1, parseInt(guests || "1", 10) - 1).toString())}
                        style={bmIn.s145()}
                      >
                        <Text style={bmIn.s146()}>{t.icons.plus}</Text>
                      </Pressable>
                      <Text style={bmIn.s147()}>
                        {guests}
                      </Text>
                      <Pressable
                        onPress={() => setGuests((parseInt(guests || "1", 10) + 1).toString())}
                        style={bmIn.s148()}
                      >
                        <Text style={bmIn.s149()}>{t.icons.plus}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Aadhaar Upload */}
                <View style={bmIn.s150()}>
                  <Text style={bmIn.s151()}>
                    {t.labels.aadhaarCard}
                  </Text>
                  <Text style={bmIn.s152()}>
                    {t.labels.aadhaarRequired}
                  </Text>
                  <View style={bmIn.s153()}>
                    <Pressable
                      onPress={openAadhaarPicker}
                      style={bmIn.s154()}
                      disabled={aadhaarUploading}
                    >
                      <Text style={bmIn.s155()}>
                        {aadhaarUploading ? t.labels.uploading : aadhaarUrl ? t.labels.replaceAadhaar : t.labels.uploadAadhaar}
                      </Text>
                    </Pressable>
                    {aadhaarUrl ? (
                      <Text style={bmIn.s156()}>
                        {t.labels.uploadedPrefix} {aadhaarFileName || t.labels.aadhaarFallbackName}
                      </Text>
                    ) : (
                      <Text style={bmIn.s157()}>{t.labels.aadhaarHint}</Text>
                    )}
                  </View>
                  {aadhaarError ? (
                    <Text style={bmIn.s158()}>{aadhaarError}</Text>
                  ) : null}
                </View>

                {/* Special Requests */}
                <View style={bmIn.s159()}>
                  <Text style={bmIn.s160()}>{t.labels.specialRequests}</Text>
                  <TextInput
                    value={specialRequests}
                    onChangeText={(v) => setSpecialRequests(autoCapitalizeNewLineStarts(v))}
                    placeholder={t.labels.specialRequestsPlaceholder}
                    placeholderTextColor={bookingModalColors.placeholder}
                    multiline
                    numberOfLines={3}
                    style={bmIn.s161({ isMobile })}
                  />
                </View>

                {(meta?.coupons?.length || meta?.policies) && (
                  <View style={bmIn.s162()}>
                    <Text style={bmIn.s163()}>{t.labels.offersPolicies}</Text>
                    {meta?.coupons && (
                      <View style={bmIn.s164()}>
                        <Text style={bmIn.s165()}>{t.labels.coupons}</Text>
                        {meta.coupons
                          .filter((c: any) => c.category === "all" || c.category === (isHotel ? "hotel" : "tour"))
                          .slice(0, 3)
                          .map((c: any) => (
                            <Text key={c.code} style={bmIn.s166()}>
                              {c.code} {t.policy.couponSeparator} {c.type === "flat" ? `${t.policy.currencySymbol}${c.amount}` : `${c.amount}%`} {t.policy.offSuffix} {t.policy.couponSeparator} {t.policy.minPrefix} {t.policy.currencySymbol}{c.minCart}
                            </Text>
                          ))}
                      </View>
                    )}
                    {meta?.policies && (
                      <View style={bmIn.s167()}>
                        <Text style={bmIn.s168()}>{t.labels.cancellation}</Text>
                        {isHotel ? (
                          <Text style={bmIn.s169()}>
                            {t.policy.hotelCancel(meta.policies.hotel.freeCancelHours, Math.round(meta.policies.hotel.feeAfter * 100))}
                          </Text>
                        ) : (
                          <Text style={bmIn.s170()}>
                            {t.policy.tourCancel(meta.policies.tour.freeCancelHours, Math.round(meta.policies.tour.feeAfter * 100))}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Error and Success Messages */}
              {err ? (
                <Text style={bmIn.s171({ isMobile })}>{err}</Text>
              ) : null}
              {result ? (
                <Text style={bmIn.s172({ isMobile })}>
                   {t.labels.submitted(result.id)}
                </Text>
              ) : null}

              {/* Price Summary and Submit */}
              {isHotel && totalPrice > 0 && (
                <View style={bmIn.s173()}>
                  <Text style={bmIn.s174()}>{t.labels.bookingSummary}</Text>
                  
                  <View style={bmIn.s175()}>
                    <View style={bmIn.s176()}>
                      <Text style={bmIn.s177({ isMobile })}>
                        {t.summary.priceLine(t.pricing.pricePerRoom, Math.ceil(numNights), Math.ceil(numNights) !== 1 ? t.labels.nightsPlural : t.labels.nights)}
                      </Text>
                      <Text style={bmIn.s178({ isMobile })}>{t.summary.priceTotal(t.pricing.pricePerRoom * Math.ceil(numNights))}</Text>
                    </View>
                    
                    <View style={bmIn.s179()}>
                      <Text style={bmIn.s180({ isMobile })}>
                        {t.summary.roomsLine(numRooms, Number(numRooms) !== 1 ? t.labels.rooms : t.labels.room)}
                      </Text>
                      <Text style={bmIn.s181({ isMobile })}>{t.summary.roomsCount(numRooms)}</Text>
                    </View>
                    {selectedTier && (
                      <View style={bmIn.s182()}>
                        <Text style={bmIn.s183({ isMobile })}>{t.summary.tierLine(selectedTier.name)}</Text>
                        <Text style={bmIn.s184({ isMobile })}>
                          {t.summary.percent(Math.round(tierMultiplier * 100))}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={bmIn.s185()}>
                    <View style={bmIn.s186()}>
                      <View>
                        <Text style={bmIn.s187({ isMobile })}>{t.labels.total}</Text>
                        {selectedTier ? (
                          <Text style={bmIn.s188()}>
                            {t.labels.preview} {t.summary.previewPrice(tierPreviewTotal)}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={bmIn.s189({ isMobile })}>{t.summary.totalPrice(totalPrice)}</Text>
                    </View>
                  </View>
                </View>
              )}

              <Pressable
                disabled={busy}
                onPress={submit}
                style={({ hovered }) => [bmIn.s213({ isMobile, hovered, busy })]}
              >
                {({ hovered }) => (
                  <Text style={bmIn.s190({ hovered, isMobile })}>
                    {busy ? t.labels.booking : t.labels.confirmBooking}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
        </ScrollView>

        {isWeb && webPickerVisible && (
          <View style={bmIn.s191()}>
            <View style={bmIn.s192({ isMobile })}>
              <View style={bmIn.s193()}>
                <Pressable
                  onPress={() => setWebPickerMonth(new Date(webPickerMonth.getFullYear(), webPickerMonth.getMonth() - 1, 1))}
                  style={bmIn.s194()}
                >
                  <Text style={bmIn.s195()}>{t.date.webPickerPrev}</Text>
                </Pressable>
                <Text style={bmIn.s196()}>
                  {webPickerMonth.toLocaleString(t.monthsLocale, { month: "long", year: "numeric" })}
                </Text>
                <Pressable
                  onPress={() => setWebPickerMonth(new Date(webPickerMonth.getFullYear(), webPickerMonth.getMonth() + 1, 1))}
                  style={bmIn.s197()}
                >
                  <Text style={bmIn.s198()}>{t.date.webPickerNext}</Text>
                </Pressable>
              </View>

              <View style={bmIn.s199()}>
                {t.date.webPickerDays.map((d) => (
                  <View key={d} style={bmIn.s200()}>
                    <Text style={bmIn.s201()}>{d}</Text>
                  </View>
                ))}
                {(() => {
                  const year = webPickerMonth.getFullYear();
                  const month = webPickerMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const cells = [] as any[];
                  for (let i = 0; i < firstDay; i += 1) {
                    cells.push(<View key={`empty_${i}`} style={bmIn.s202()} />);
                  }
                  for (let d = 1; d <= daysInMonth; d += 1) {
                    const dayDate = new Date(year, month, d);
                    const disabled = isPastDate(dayDate);
                    cells.push(
                      <Pressable
                        key={`day_${d}`}
                        onPress={() => !disabled && applyWebDate(dayDate)}
                        disabled={disabled}
                        style={bmIn.s203({ disabled })}
                      >
                        <Text style={bmIn.s204({ disabled })}>{d}</Text>
                      </Pressable>
                    );
                  }
                  return cells;
                })()}
              </View>

              <Pressable
                onPress={() => setWebPickerVisible(false)}
                style={bmIn.s205()}
              >
                <Text style={bmIn.s206()}>{t.labels.close}</Text>
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
      <Text style={bmIn.s207({ isMobile })}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={bookingModalColors.placeholder}
        style={bmIn.s208({ isMobile })}
      />
    </View>
  );
}
