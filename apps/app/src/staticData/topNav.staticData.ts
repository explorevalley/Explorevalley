export const topNavData = {
  primaryNav: [
    { key: "travel", label: "Travel", icon: "🗺️" },
    { key: "taxi", label: "Taxi", icon: "🚕" },
    { key: "bike", label: "Bike", icon: "🏍️" },
    { key: "food", label: "Food", icon: "🍽️" },
    { key: "mart", label: "Mart", icon: "🛒" },
  ] as const,
  filters: [
    { key: "all", label: "All" },
    { key: "hotel", label: "Hotels" },
    { key: "cottages", label: "Cottages" },
    { key: "tour", label: "Tour" },
  ] as const,
  logoUrl:
    "https://pmqlpbqwyxmfuvcrwoan.supabase.co/storage/v1/object/public/explorevalley-uploads/logo/ev_logo.png",
  userFallback: "User",
  ordersTab: "orders",
  authLogin: "Login",
  authLogout: "Logout",
  evMark: "EV",
} as const;
