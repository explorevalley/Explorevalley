export const navigationDemoData = {
  initial: {
    activeTab: "travel",
    searchQuery: "",
    notificationCount: 3,
  },
  tabs: {
    travel: "travel",
    taxi: "taxi",
    food: "food",
    profile: "profile",
  },
  navItems: [
    { key: "travel", label: "Explore", icon: "\ud83d\uddfa\ufe0f" },
    { key: "taxi", label: "Taxi", icon: "\ud83d\ude95", badge: 2 },
    { key: "food", label: "Food", icon: "\ud83c\udf7d\ufe0f", badge: 5 },
    { key: "profile", label: "Profile", icon: "\ud83d\udc64" },
  ],
  logs: {
    filter: "Filter pressed",
    notifications: "Notifications pressed",
    tabChanged: "Tab changed to:",
  },
  header: {
    title: "\ud83c\udfc6 Award-Winning Navigation",
    subtitle:
      "Experience modern mobile navigation with glassmorphism, smooth\nanimations, and delightful micro-interactions.",
  },
  card: {
    titleByTab: {
      travel: "\ud83d\uddfa\ufe0f Explore Amazing Places",
      taxi: "\ud83d\ude95 Book Your Ride",
      food: "\ud83c\udf7d\ufe0f Delicious Food",
      profile: "\ud83d\udc64 Your Profile",
    },
    descByTab: {
      travel: "Discover beautiful destinations, hotels, and cottages in the valley.",
      taxi: "Quick and reliable cab booking service. 2 pending bookings.",
      food: "Order from the best restaurants. 5 items in your cart.",
      profile: "Manage your account, bookings, and preferences.",
    },
  },
  features: {
    title: "\u2728 Key Features",
    items: [
      {
        icon: "\ud83c\udfa8",
        name: "Glassmorphism Design",
        desc: "Frosted glass effect with backdrop blur",
      },
      {
        icon: "\u26a1",
        name: "Smooth Animations",
        desc: "60fps native-driven spring animations",
      },
      {
        icon: "\ud83d\udc46",
        name: "Thumb-Friendly",
        desc: "Bottom navigation for easy reach",
      },
      {
        icon: "\ud83d\udd14",
        name: "Smart Badges",
        desc: "Notification counts with overflow handling",
      },
      {
        icon: "\ud83d\udcf1",
        name: "Responsive",
        desc: "Auto-hides on desktop and tablet",
      },
    ],
  },
  controls: {
    title: "\ud83c\udfae Try It Out",
    addNotification: (count: number) => `Add Notification (${count})`,
    fillSearch: "Fill Search Bar",
    cycleTabs: "Cycle Through Tabs",
    sampleQuery: "Sample search query",
  },
};
