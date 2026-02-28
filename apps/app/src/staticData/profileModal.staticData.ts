export const profileModalData = {
  kicker: "PROFILE",
  title: "Edit Profile",
  subtitle: "Update your display name and contact details.",
  nameLabel: "Name",
  phoneLabel: "Phone",
  emailLabel: "Email",
  namePlaceholder: "Your name",
  phonePlaceholder: "Phone number",
  emailPlaceholder: "Email (optional)",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving...",
  idPrefix: "ID:",
  requiredName: "Name is required.",
  api: {
    profile: "/api/profile",
  },
} as const;
