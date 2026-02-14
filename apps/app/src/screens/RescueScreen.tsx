import React from "react";
import { View, Text, ScrollView, Pressable, Linking, useWindowDimensions } from "react-native";
import { BASE_URL } from "../lib/api";

type ContactNumber = {
  label: string;
  value: string;
};

type RescueTeam = {
  name: string;
  role: string;
  coverage: string;
  numbers: ContactNumber[];
};

type AmbulanceService = {
  name: string;
  coverage: string;
  numbers: ContactNumber[];
};

const RESCUE_TEAMS: RescueTeam[] = [
  {
    name: "Kullu District Emergency Control Room",
    role: "Central coordination, dispatch, and incident logging.",
    coverage: "All of Kullu district",
    numbers: [
      { label: "Control Room", value: "TBD" },
      { label: "Alternate", value: "TBD" }
    ]
  },
  {
    name: "Mountain Rescue Team",
    role: "High-altitude rescue, trekking incidents, and evacuation support.",
    coverage: "Kullu valley and nearby routes",
    numbers: [
      { label: "Hotline", value: "TBD" }
    ]
  },
  {
    name: "River Safety and Flood Response",
    role: "Swift-water rescue, flood support, and river safety operations.",
    coverage: "Beas river stretch and tributaries",
    numbers: [
      { label: "Dispatch", value: "TBD" }
    ]
  },
  {
    name: "Forest and Wildlife Rescue",
    role: "Forest incident response and wilderness assistance.",
    coverage: "Forest zones in Kullu district",
    numbers: [
      { label: "Control", value: "TBD" }
    ]
  }
];

const AMBULANCE_SERVICES: AmbulanceService[] = [
  {
    name: "Government Ambulance",
    coverage: "District hospitals and emergency pickup",
    numbers: [
      { label: "Emergency", value: "TBD" }
    ]
  },
  {
    name: "Private Ambulance Network",
    coverage: "Local pickups and intercity transfers",
    numbers: [
      { label: "24x7", value: "TBD" }
    ]
  }
];

const INFO_PAGES = [
  { title: "Affiliate Program", slug: "affiliate-program" },
  { title: "Contact Us", slug: "contact-us" },
  { title: "Privacy Policy", slug: "privacy-policy" },
  { title: "Refund Policy", slug: "refund-policy" },
  { title: "Terms and Conditions", slug: "terms-and-conditions" }
];

function canCall(value: string) {
  return Boolean(value && value !== "TBD");
}

function callNumber(value: string) {
  if (!canCall(value)) return;
  Linking.openURL(`tel:${value}`);
}

function openInfoPage(slug: string) {
  Linking.openURL(`${BASE_URL}/api/pages/${slug}`);
}

export default function RescueScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: 110,
        paddingHorizontal: isMobile ? 16 : 32,
        paddingBottom: 40,
        backgroundColor: "#000",
        minHeight: "100%"
      }}
    >
      <View
        style={{
          borderRadius: 18,
          padding: isMobile ? 18 : 24,
          backgroundColor: "rgba(10, 10, 10, 0.92)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.12)",
          marginBottom: 18
        }}
      >
        <Text style={{ color: "#fff", fontSize: isMobile ? 22 : 28, fontWeight: "800" }}>
          Kullu Rescue Guide
        </Text>
        <Text style={{ color: "#bdbdbd", marginTop: 8, fontSize: isMobile ? 14 : 16, lineHeight: 22 }}>
          Verified rescue contacts and ambulance numbers for Kullu. Replace TBD with official numbers from your local authority.
        </Text>
      </View>

      <View style={{ marginBottom: 18 }}>
        <Text style={{ color: "#e6ffe8", fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
          Rescue Teams
        </Text>
        {RESCUE_TEAMS.map((team) => (
          <View
            key={team.name}
            style={{
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              backgroundColor: "rgba(12, 12, 12, 0.9)",
              borderWidth: 1,
              borderColor: "rgba(46, 204, 113, 0.25)"
            }}
          >
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>{team.name}</Text>
            <Text style={{ color: "#cfd8dc", marginTop: 6 }}>{team.role}</Text>
            <Text style={{ color: "#9aa5b1", marginTop: 6 }}>Coverage: {team.coverage}</Text>
            <View style={{ marginTop: 10 }}>
              {team.numbers.map((num) => (
                <View key={`${team.name}-${num.label}`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <View>
                    <Text style={{ color: "#b9f6ca", fontSize: 12 }}>{num.label}</Text>
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{num.value}</Text>
                  </View>
                  <Pressable
                    disabled={!canCall(num.value)}
                    onPress={() => callNumber(num.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: canCall(num.value) ? "#22c55e" : "rgba(255,255,255,0.2)",
                      backgroundColor: canCall(num.value) ? "rgba(34, 197, 94, 0.2)" : "transparent"
                    }}
                  >
                    <Text style={{ color: canCall(num.value) ? "#dcfce7" : "#9aa5b1", fontWeight: "700" }}>
                      {canCall(num.value) ? "Call" : "TBD"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={{ marginBottom: 18 }}>
        <Text style={{ color: "#e6ffe8", fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
          Ambulance Numbers
        </Text>
        {AMBULANCE_SERVICES.map((service) => (
          <View
            key={service.name}
            style={{
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              backgroundColor: "rgba(12, 12, 12, 0.9)",
              borderWidth: 1,
              borderColor: "rgba(56, 189, 248, 0.25)"
            }}
          >
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>{service.name}</Text>
            <Text style={{ color: "#9aa5b1", marginTop: 6 }}>Coverage: {service.coverage}</Text>
            <View style={{ marginTop: 10 }}>
              {service.numbers.map((num) => (
                <View key={`${service.name}-${num.label}`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <View>
                    <Text style={{ color: "#bae6fd", fontSize: 12 }}>{num.label}</Text>
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{num.value}</Text>
                  </View>
                  <Pressable
                    disabled={!canCall(num.value)}
                    onPress={() => callNumber(num.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: canCall(num.value) ? "#38bdf8" : "rgba(255,255,255,0.2)",
                      backgroundColor: canCall(num.value) ? "rgba(56, 189, 248, 0.2)" : "transparent"
                    }}
                  >
                    <Text style={{ color: canCall(num.value) ? "#e0f2fe" : "#9aa5b1", fontWeight: "700" }}>
                      {canCall(num.value) ? "Call" : "TBD"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View
        style={{
          borderRadius: 16,
          padding: 16,
          backgroundColor: "rgba(10, 10, 10, 0.92)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.12)"
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Quick Safety Tips</Text>
        <Text style={{ color: "#bdbdbd", marginTop: 8, lineHeight: 20 }}>
          Share your live location, keep a power bank ready, and stay on marked routes. In case of emergency, call the nearest control room first.
        </Text>
        <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {INFO_PAGES.map((page) => (
            <Pressable
              key={page.slug}
              onPress={() => openInfoPage(page.slug)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(34, 197, 94, 0.45)",
                backgroundColor: "rgba(34, 197, 94, 0.16)",
                paddingVertical: 7,
                paddingHorizontal: 12
              }}
            >
              <Text style={{ color: "#dcfce7", fontWeight: "700", fontSize: 12 }}>{page.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
