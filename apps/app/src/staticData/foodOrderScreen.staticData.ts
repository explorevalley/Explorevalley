export const foodOrderScreenData = {
  steps: {
    vendors: "vendors",
    menu: "menu",
    checkout: "checkout",
    success: "success",
  },
  defaults: {
    all: "All",
    places: ["All"],
  },
  hero: {
    kicker: "EXPLOREVALLEY FOOD",
    title: "Premium Food Ordering",
    subtitle: "Curated restaurants, fast delivery, and clear pricing.",
  },
  place: {
    title: "Select Place",
    emptySelect: "Select Jibhi or Tandi to view restaurants.",
    emptyForPlace: (place: string) => `No restaurants found for ${place}`,
  },
  search: {
    restaurants: "Search restaurants...",
    menu: "Search menu items...",
  },
  menu: {
    backArrow: "\u2190",
    ratingStar: "\u2b50",
    zonesLabel: "Zones:",
    hoursLabel: "Hours:",
    loading: "Loading menu...",
    empty: "No items found",
  },
  checkout: {
    title: "Checkout",
    orderFrom: (name: string | undefined) => `Your Order from ${name || ""}`,
  },
  success: {
    icon: "\u2713",
    title: "Order Placed Successfully!",
    subtitle: "Your order has been confirmed",
    orderIdLabel: "Order ID:",
    etaLabel: "Estimated delivery:",
    orderMore: "Order More Food",
  },
  loading: {
    restaurants: "Loading restaurants...",
  },
  errors: {
    loadRestaurants: "Failed to load restaurants",
    loadMenu: "Failed to load menu",
    selectRestaurant: "Please select a restaurant.",
    loginRequired: "Please login with Google to continue.",
  },
  actions: {
    retry: "Retry",
  },
  policy: {
    cancellation: (minutes: number, fee: number) => `Cancellations within ${minutes} min. Fee after \u20b9${fee}.`,
  },
  currency: {
    inr: "\u20b9",
    multiply: "\u00d7",
  },
  api: {
    meta: "/api/meta",
    places: "/api/places",
    restaurants: (place: string) => `/api/restaurants?place=${encodeURIComponent(place)}`,
    menuItems: (restaurantId: string) => `/api/menu-items?restaurantId=${encodeURIComponent(restaurantId)}`,
    orders: "/api/orders",
  },
};
