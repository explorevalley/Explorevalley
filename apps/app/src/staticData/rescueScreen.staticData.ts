export const rescueScreenData = {
  placeholder: "TBD",
  hero: {
    title: "Kullu Rescue Guide",
    body:
      "Verified rescue contacts and ambulance numbers for Kullu. Replace TBD with official numbers from your local authority.",
  },
  sections: {
    teams: "Rescue Teams",
    ambulance: "Ambulance Numbers",
    tips: "Quick Safety Tips",
  },
  labels: {
    coverage: "Coverage:",
    call: "Call",
  },
  tips:
    "Share your live location, keep a power bank ready, and stay on marked routes. In case of emergency, call the nearest control room first.",
  rescueTeams: [
    {
      name: "Kullu District Emergency Control Room",
      role: "Central coordination, dispatch, and incident logging.",
      coverage: "All of Kullu district",
      numbers: [
        { label: "Control Room", value: "TBD" },
        { label: "Alternate", value: "TBD" },
      ],
    },
    {
      name: "Mountain Rescue Team",
      role: "High-altitude rescue, trekking incidents, and evacuation support.",
      coverage: "Kullu valley and nearby routes",
      numbers: [{ label: "Hotline", value: "TBD" }],
    },
    {
      name: "River Safety and Flood Response",
      role: "Swift-water rescue, flood support, and river safety operations.",
      coverage: "Beas river stretch and tributaries",
      numbers: [{ label: "Dispatch", value: "TBD" }],
    },
    {
      name: "Forest and Wildlife Rescue",
      role: "Forest incident response and wilderness assistance.",
      coverage: "Forest zones in Kullu district",
      numbers: [{ label: "Control", value: "TBD" }],
    },
  ],
  ambulanceServices: [
    {
      name: "Government Ambulance",
      coverage: "District hospitals and emergency pickup",
      numbers: [{ label: "Emergency", value: "TBD" }],
    },
    {
      name: "Private Ambulance Network",
      coverage: "Local pickups and intercity transfers",
      numbers: [{ label: "24x7", value: "TBD" }],
    },
  ],
};
