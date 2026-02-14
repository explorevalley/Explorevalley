import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - optional dependency for native
import { WebView } from "react-native-webview";

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
    const id = "google-maps-script";
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
    const center = { lat: 15.2993, lng: 74.124 }; // Goa
    mapObj.current = new g.maps.Map(mapRef.current, {
      center,
      zoom: 12,
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
      <View style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
        <View style={{ padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Pick on Map</Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: "#fff" }}>Close</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: "#222" }}>
          {GOOGLE_MAPS_KEY ? (
            <View ref={mapRef} style={{ flex: 1 }} />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
              <Text style={{ color: "#f66", textAlign: "center" }}>
                Map is unavailable. Missing EXPO_PUBLIC_GOOGLE_MAPS_KEY.
              </Text>
            </View>
          )}
        </View>
        <Text style={{ color: "#888", padding: 12 }}>
          {GOOGLE_MAPS_KEY ? "Tap anywhere on the map to drop a pin." : "Configure Google Maps key in environment to enable map picker."}
        </Text>
      </View>
    </Modal>
  );
}

function NativeMapPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (r: PickResult) => void }) {
  const html = useMemo(() => {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <style>
      html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#000; }
      .hint { position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%); color: #fff; background: rgba(0,0,0,0.6); padding: 6px 10px; border-radius: 999px; font-family: sans-serif; font-size: 12px; }
    </style>
    <script src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&libraries=places"></script>
  </head>
  <body>
    <div id="map"></div>
    <div class="hint">Tap anywhere to drop a pin</div>
    <script>
      const center = { lat: 15.2993, lng: 74.124 };
      const map = new google.maps.Map(document.getElementById('map'), {
        center,
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
      });
      const geocoder = new google.maps.Geocoder();
      let marker = null;
      map.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        if (!marker) marker = new google.maps.Marker({ position: { lat, lng }, map });
        else marker.setPosition({ lat, lng });
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          const address = (status === 'OK' && results && results[0] && results[0].formatted_address) ? results[0].formatted_address : (lat.toFixed(6) + ', ' + lng.toFixed(6));
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng, address }));
        });
      });
    </script>
  </body>
</html>`;
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
        <View style={{ padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Pick on Map</Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: "#fff" }}>Close</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: "#222" }}>
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
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
              <Text style={{ color: "#f66", textAlign: "center" }}>
                Map is unavailable. Missing EXPO_PUBLIC_GOOGLE_MAPS_KEY.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
