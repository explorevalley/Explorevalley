export const mapPickerModalData = {
  googleMapsScriptId: "google-maps-script",
  datepickerClass: "ev-datepicker",
  datepickerPopperClass: "ev-datepicker-popper",
  labels: {
    title: "Pick on Map",
    close: "Close",
    missingKey: "Map is unavailable. Missing EXPO_PUBLIC_GOOGLE_MAPS_KEY.",
    helperReady: "Tap anywhere on the map to drop a pin.",
    helperMissing: "Configure Google Maps key in environment to enable map picker.",
  },
  mapCenter: { lat: 15.2993, lng: 74.124 },
  mapZoom: 12,
  htmlTemplate: (mapsKey: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <style>
      html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#000; }
      .hint { position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%); color: #fff; background: rgba(0,0,0,0.6); padding: 6px 10px; border-radius: 999px; font-family: sans-serif; font-size: 12px; }
    </style>
    <script src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&libraries=places"></script>
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
</html>`,
};
