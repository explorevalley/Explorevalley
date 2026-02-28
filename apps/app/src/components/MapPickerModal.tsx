import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - optional dependency for native
import { WebView } from "react-native-webview";
import { mapPickerStyles as styles } from "../styles/MapPickerModal.styles";
import { mapPickerModalData as t } from "../staticData/mapPickerModal.staticData";

const GOOGLE_MAPS_KEY = String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "").trim();

type PickResult = {
  lat: number;
  lng: number;
  address: string;
};

export default function MapPickerModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (r: PickResult) => void;
}) {
  if (Platform.OS === "web") {
    return <WebMapPicker visible={visible} onClose={onClose} onPick={onPick} />;
  }
  return <NativeMapPicker visible={visible} onClose={onClose} onPick={onPick} />;
}

function WebMapPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (r: PickResult) => void }) {
  const [ready, setReady] = useState(false);
  const mapRef = useRef<any>(null);
  const mapObj = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) return;
    if (!GOOGLE_MAPS_KEY) return;
    const g = (globalThis as any)?.google;
    if (g?.maps?.places || g?.maps) {
      setReady(true);
      return;
    }
    const id = t.googleMapsScriptId;
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&libraries=places`;
    s.async = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, [visible]);

  useEffect(() => {
    if (!ready || !visible || !mapRef.current) return;
    const g = (globalThis as any)?.google;
    if (!g?.maps) return;
    const center = t.mapCenter;
    mapObj.current = new g.maps.Map(mapRef.current, {
      center,
      zoom: t.mapZoom,
      disableDefaultUI: true,
      zoomControl: true,
    });
    geocoderRef.current = new g.maps.Geocoder();
    mapObj.current.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      if (!markerRef.current) {
        markerRef.current = new g.maps.Marker({ position: { lat, lng }, map: mapObj.current });
      } else {
        markerRef.current.setPosition({ lat, lng });
      }
      geocoderRef.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        const address = status === "OK" && results?.[0]?.formatted_address ? results[0].formatted_address : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        onPick({ lat, lng, address });
        onClose();
      });
    });
  }, [ready, visible, onPick, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.labels.title}</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeText}>{t.labels.close}</Text>
          </Pressable>
        </View>
        <View style={styles.mapWrap}>
          {GOOGLE_MAPS_KEY ? (
            <View ref={mapRef} style={styles.flex1} />
          ) : (
            <View style={styles.centerWrap}>
              <Text style={styles.errorText}>
                {t.labels.missingKey}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.helperText}>
          {GOOGLE_MAPS_KEY ? t.labels.helperReady : t.labels.helperMissing}
        </Text>
      </View>
    </Modal>
  );
}

function NativeMapPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (r: PickResult) => void }) {
  const html = useMemo(() => t.htmlTemplate(GOOGLE_MAPS_KEY), []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.labels.title}</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeText}>{t.labels.close}</Text>
          </Pressable>
        </View>
        <View style={styles.mapWrap}>
          {GOOGLE_MAPS_KEY ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html }}
              onMessage={(e: any) => {
                try {
                  const data = JSON.parse(e.nativeEvent.data);
                  if (data?.lat && data?.lng) {
                    onPick(data);
                    onClose();
                  }
                } catch {
                  // ignore
                }
              }}
            />
          ) : (
            <View style={styles.centerWrap}>
              <Text style={styles.errorText}>
                {t.labels.missingKey}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
