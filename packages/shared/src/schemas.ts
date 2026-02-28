import { z } from "zod";

export const TaxRuleSlabSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().nullable(),
  gst: z.number().min(0).max(1)
});

export const PricingTierSchema = z.object({
  name: z.string().min(1),
  multiplier: z.number().positive()
});

export const ImageMetaSchema = z.object({
  url: z.string(),
  title: z.string().default(""),
  description: z.string().default("")
});

export const CabProviderSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  vehicleType: z.string().min(1),
  plateNumber: z.string().min(4),
  capacity: z.number().int().positive(),
  vendorMobile: z.string().default(""),
  additionalComments: z.string().default(""),
  priceDropped: z.boolean().default(false),
  priceDropPercent: z.number().min(0).max(100).default(0),
  heroImage: z.string().default(""),
  active: z.boolean().default(true),
  serviceAreaId: z.string().optional()
});

export const CabRateSchema = z.object({
  id: z.string().optional(),
  origin: z.string().default(""),
  destination: z.string().default(""),
  routeLabel: z.string().default(""),
  ordinary4_1: z.number().nonnegative().optional(),
  luxury4_1: z.number().nonnegative().optional(),
  ordinary6_1: z.number().nonnegative().optional(),
  luxury6_1: z.number().nonnegative().optional(),
  traveller: z.number().nonnegative().optional()
});

export const CabPricingSchema = z.object({
  baseFare: z.number().nonnegative(),
  perKm: z.number().nonnegative(),
  perMin: z.number().nonnegative(),
  surgeRules: z.array(z.object({
    from: z.string(),
    to: z.string(),
    multiplier: z.number().positive()
  })).default([]),
  nightCharges: z.object({
    start: z.string(),
    end: z.string(),
    multiplier: z.number().positive()
  }),
  tolls: z.object({
    enabled: z.boolean().default(false),
    defaultFee: z.number().nonnegative().default(0)
  })
});

export const ServiceAreaSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  city: z.string().min(2),
  enabled: z.boolean().default(true)
});

export const CouponSchema = z.object({
  code: z.string().min(3),
  type: z.enum(["flat", "percent"]),
  amount: z.number().nonnegative(),
  minCart: z.number().nonnegative().default(0),
  category: z.enum(["hotel", "tour", "cab", "food", "all"]).default("all"),
  expiry: z.string(),
  maxUses: z.number().int().positive().optional()
});

export const PoliciesSchema = z.object({
  hotel: z.object({
    freeCancelHours: z.number().int().nonnegative(),
    feeAfter: z.number().min(0).max(1)
  }),
  tour: z.object({
    freeCancelHours: z.number().int().nonnegative(),
    feeAfter: z.number().min(0).max(1)
  }),
  cab: z.object({
    freeCancelMinutes: z.number().int().nonnegative(),
    feeAfter: z.number().nonnegative()
  }),
  food: z.object({
    allowCancelMinutes: z.number().int().nonnegative(),
    feeAfter: z.number().nonnegative()
  })
});

export const PaymentsSchema = z.object({
  walletEnabled: z.boolean().default(false),
  refundMethod: z.enum(["original", "wallet"]).default("original"),
  refundWindowHours: z.number().int().nonnegative().default(72)
});

export const SitePageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().default(""),
  updatedAt: z.string().optional()
});

export const SitePagesSchema = z.object({
  affiliateProgram: SitePageSchema.default({ title: "Affiliate Program", slug: "affiliate-program", content: "" }),
  contactUs: SitePageSchema.default({ title: "Contact Us", slug: "contact-us", content: "" }),
  privacyPolicy: SitePageSchema.default({ title: "Privacy Policy", slug: "privacy-policy", content: "" }),
  refundPolicy: SitePageSchema.default({ title: "Refund Policy", slug: "refund-policy", content: "" }),
  termsAndConditions: SitePageSchema.default({ title: "Terms and Conditions", slug: "terms-and-conditions", content: "" })
});

export const SettingsSchema = z.object({
  currency: z.literal("INR").default("INR"),
  // Controls which slug the frontend/admin should treat as the canonical URL for each CMS page.
  // This keeps slugs stable even if you rename a page, and lets you change routes without code changes.
  pageSlugs: z.object({
    affiliateProgram: z.string().min(1).default("affiliate-program"),
    contactUs: z.string().min(1).default("contact-us"),
    privacyPolicy: z.string().min(1).default("privacy-policy"),
    refundPolicy: z.string().min(1).default("refund-policy"),
    termsAndConditions: z.string().min(1).default("terms-and-conditions")
  }).default({
    affiliateProgram: "affiliate-program",
    contactUs: "contact-us",
    privacyPolicy: "privacy-policy",
    refundPolicy: "refund-policy",
    termsAndConditions: "terms-and-conditions"
  }),
  taxRules: z.object({
    hotel: z.object({
      slabs: z.array(TaxRuleSlabSchema).min(1)
    }),
    tour: z.object({ gst: z.number().min(0).max(1), mode: z.enum(["NO_ITC", "WITH_ITC"]).default("NO_ITC") }),
    food: z.object({ gst: z.number().min(0).max(1), mode: z.string().default("DEFAULT") }),
    cab: z.object({ gst: z.number().min(0).max(1), mode: z.string().default("DEFAULT") })
  }),
  pricingTiers: z.array(PricingTierSchema).default([
    { name: "Economic", multiplier: 0.85 },
    { name: "Premium", multiplier: 1.15 },
    { name: "Luxury", multiplier: 1.4 }
  ])
});

export const TourSchema = z.object({
  id: z.string(),
  title: z.string().min(2),
  description: z.string().min(10),
  price: z.number().nonnegative(),
  vendorMobile: z.string().default(""),
  additionalComments: z.string().default(""),
  priceDropped: z.boolean().default(false),
  priceDropPercent: z.number().min(0).max(100).default(0),
  heroImage: z.string().default(""),
  duration: z.string().min(1),
  images: z.array(z.string()).default([]),
  imageTitles: z.array(z.string()).default([]),
  imageDescriptions: z.array(z.string()).default([]),
  imageMeta: z.array(ImageMetaSchema).default([]),
  highlights: z.array(z.string()).default([]),
  itinerary: z.string().default(""),
  // WP-Travel-like richer content (all optional/backward compatible).
  mapEmbedUrl: z.string().default(""),
  faqs: z.array(z.object({
    question: z.string().min(1),
    answer: z.string().default("")
  })).default([]),
  itineraryItems: z.array(z.object({
    day: z.union([z.number().int().positive(), z.string()]).optional(),
    title: z.string().default(""),
    content: z.string().default("")
  })).default([]),
  facts: z.array(z.object({
    label: z.string().min(1),
    value: z.string().default("")
  })).default([]),
  // Flexible blocks for future growth (e.g. tabbed content, includes/excludes html, etc).
  contentBlocks: z.record(z.any()).default({}),
  // Translation-ready storage (locale => overrides).
  i18n: z.record(z.any()).default({}),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  maxGuests: z.number().int().positive(),
  availability: z.object({
    closedDates: z.array(z.string()).default([]),
    capacityByDate: z.record(z.number().int().positive()).default({})
  }).default({ closedDates: [], capacityByDate: {} }),
  available: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});

export const FestivalSchema = z.object({
  id: z.string(),
  title: z.string().min(2),
  description: z.string().min(5).default(""),
  location: z.string().min(2).default(""),
  vendorMobile: z.string().default(""),
  additionalComments: z.string().default(""),
  priceDropped: z.boolean().default(false),
  priceDropPercent: z.number().min(0).max(100).default(0),
  heroImage: z.string().default(""),
  month: z.string().min(2).default("All Season"),
  date: z.string().optional(),
  vibe: z.string().default(""),
  ticket: z.union([z.string(), z.number()]).default("On request"),
  images: z.array(z.string()).default([]),
  imageTitles: z.array(z.string()).default([]),
  imageDescriptions: z.array(z.string()).default([]),
  imageMeta: z.array(ImageMetaSchema).default([]),
  highlights: z.array(z.string()).default([]),
  available: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const HotelRoomTypeSchema = z.object({
  type: z.string(),
  price: z.number().nonnegative(),
  capacity: z.number().int().positive()
});

export const HotelSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  description: z.string().min(10),
  location: z.string().min(2),
  vendorMobile: z.string().default(""),
  additionalComments: z.string().default(""),
  pricePerNight: z.number().nonnegative(),
  priceDropped: z.boolean().default(false),
  priceDropPercent: z.number().min(0).max(100).default(0),
  heroImage: z.string().default(""),
  images: z.array(z.string()).default([]),
  imageTitles: z.array(z.string()).default([]),
  imageDescriptions: z.array(z.string()).default([]),
  imageMeta: z.array(ImageMetaSchema).default([]),
  amenities: z.array(z.string()).default([]),
  roomTypes: z.array(HotelRoomTypeSchema).min(1),
  rating: z.number().min(0).max(5).default(0),
  reviews: z.number().int().nonnegative().default(0),
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("11:00"),
  availability: z.object({
    closedDates: z.array(z.string()).default([]),
    roomsByType: z.record(z.number().int().nonnegative()).default({})
  }).default({ closedDates: [], roomsByType: {} }),
  seasonalPricing: z.array(z.object({
    from: z.string(),
    to: z.string(),
    multiplier: z.number().positive()
  })).default([]),
  dateOverrides: z.record(z.object({
    priceMultiplier: z.number().positive().optional(),
    priceOverride: z.number().nonnegative().optional()
  })).default({}),
  minNights: z.number().int().positive().default(1),
  maxNights: z.number().int().positive().default(30),
  childPolicy: z.string().default("Children allowed with extra bedding charges if required."),
  available: z.boolean().default(true),
  createdAt: z.string()
});

export const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  description: z.string(),
  vendorMobile: z.string().default(""),
  additionalComments: z.string().default(""),
  cuisine: z.array(z.string()),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  deliveryTime: z.string(),
  minimumOrder: z.number().nonnegative(),
  priceDropped: z.boolean().default(false),
  priceDropPercent: z.number().min(0).max(100).default(0),
  heroImage: z.string().default(""),
  images: z.array(z.string()),
  imageTitles: z.array(z.string()).default([]),
  imageDescriptions: z.array(z.string()).default([]),
  imageMeta: z.array(ImageMetaSchema).default([]),
  available: z.boolean().default(true),
  isVeg: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  location: z.string(),
  serviceRadiusKm: z.number().nonnegative().default(0),
  deliveryZones: z.array(z.string()).default([]),
  openHours: z.string().default("09:00"),
  closingHours: z.string().default("22:00"),
  menu: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    category: z.string().default("General"),
    description: z.string().default(""),
    image: z.string().default(""),
    price: z.number().nonnegative().default(0),
    rating: z.number().min(0).max(5).default(0),
    maxOrders: z.number().int().positive().default(10),
    addons: z.array(z.object({
      name: z.string(),
      price: z.number().nonnegative().default(0),
      comment: z.string().optional()
    })).default([])
  })).default([])
});

export const TaxBreakupSchema = z.object({
  gstRate: z.number().min(0).max(1),
  taxableValue: z.number().nonnegative(),
  gstAmount: z.number().nonnegative(),
  cgst: z.number().nonnegative(),
  sgst: z.number().nonnegative(),
  igst: z.number().nonnegative()
});

export const BookingSchema = z.object({
  id: z.string(),
  type: z.enum(["hotel", "tour"]),
  itemId: z.string(),
  userName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  // Legacy records may not have Aadhaar storage URLs populated.
  aadhaarUrl: z.string().default(""),
  // WP-Travel-like booking metadata (optional/backward compatible).
  countryCode: z.string().default(""),
  paidAmount: z.number().nonnegative().optional(),
  guests: z.number().int().positive(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  roomType: z.string().optional(),
  numRooms: z.number().int().positive().default(1),
  tourDate: z.string().optional(),
  specialRequests: z.string().default(""),
  pricing: z.object({
    baseAmount: z.number().nonnegative(),
    tax: TaxBreakupSchema,
    totalAmount: z.number().nonnegative()
  }),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  bookingDate: z.string()
});

export const CabBookingSchema = z.object({
  id: z.string(),
  userName: z.string().min(2),
  phone: z.string().min(8),
  pickupLocation: z.string().min(2),
  dropLocation: z.string().min(2),
  datetime: z.string(),
  passengers: z.number().int().positive(),
  vehicleType: z.string().min(1),
  estimatedFare: z.number().nonnegative(),
  serviceAreaId: z.string().optional(),
  pricing: z.object({
    baseAmount: z.number().nonnegative(),
    tax: TaxBreakupSchema,
    totalAmount: z.number().nonnegative()
  }),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  createdAt: z.string()
});

export const BusSeatSchema = z.object({
  code: z.string().min(1),
  seatType: z.string().default("regular")
});

export const BusRouteSchema = z.object({
  id: z.string(),
  operatorName: z.string().min(2),
  operatorCode: z.string().default(""),
  fromCity: z.string().min(2),
  fromCode: z.string().default(""),
  toCity: z.string().min(2),
  toCode: z.string().default(""),
  departureTime: z.string().default(""),
  arrivalTime: z.string().default(""),
  durationText: z.string().default(""),
  busType: z.string().default("Non AC"),
  fare: z.number().nonnegative(),
  totalSeats: z.number().int().positive().default(20),
  seatLayout: z.array(BusSeatSchema).default([]),
  serviceDates: z.array(z.string()).default([]),
  seatsBookedByDate: z.record(z.array(z.string())).default({}),
  heroImage: z.string().default(""),
  active: z.boolean().default(true),
  createdAt: z.string()
});

export const BusBookingSchema = z.object({
  id: z.string(),
  routeId: z.string(),
  userName: z.string().min(2),
  phone: z.string().min(8),
  fromCity: z.string().min(2),
  toCity: z.string().min(2),
  travelDate: z.string(),
  seats: z.array(z.string()).min(1),
  farePerSeat: z.number().nonnegative(),
  totalFare: z.number().nonnegative(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  createdAt: z.string()
});

export const BikeRentalSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  location: z.string().min(2),
  bikeType: z.string().default("Scooter"),
  pricePerHour: z.number().nonnegative().default(0),
  pricePerDay: z.number().nonnegative().default(0),
  availableQty: z.number().int().nonnegative().default(0),
  securityDeposit: z.number().nonnegative().default(0),
  helmetIncluded: z.boolean().default(true),
  vendorMobile: z.string().default(""),
  image: z.string().default(""),
  active: z.boolean().default(true),
  createdAt: z.string()
});

export const BikeBookingSchema = z.object({
  id: z.string(),
  bikeRentalId: z.string(),
  userName: z.string().min(2),
  phone: z.string().min(8),
  startDateTime: z.string(),
  hours: z.number().int().positive(),
  qty: z.number().int().positive().default(1),
  totalFare: z.number().nonnegative(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  createdAt: z.string()
});

export const MenuItemSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  category: z.string(),
  name: z.string(),
  description: z.string().default(""),
  price: z.number().nonnegative(),
  priceDropped: z.boolean().default(false),
  priceDropPercent: z.number().min(0).max(100).default(0),
  heroImage: z.string().default(""),
  image: z.string().optional(),
  imageTitles: z.array(z.string()).default([]),
  imageDescriptions: z.array(z.string()).default([]),
  imageMeta: z.array(ImageMetaSchema).default([]),
  available: z.boolean().default(true),
  isVeg: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  stock: z.number().int().nonnegative().default(0),
  maxPerOrder: z.number().int().positive().default(10),
  addons: z.array(z.object({
    name: z.string(),
    price: z.number().nonnegative()
  })).default([]),
  variants: z.array(z.object({
    name: z.string(),
    price: z.number().nonnegative()
  })).default([])
});

export const CartLineItemSchema = z.object({
  menuItemId: z.string(),
  restaurantId: z.string().default(""),
  name: z.string(),
  price: z.number().nonnegative().default(0),
  quantity: z.number().int().nonnegative(),
  isVeg: z.boolean().default(false),
  addedAt: z.string().default("")
});

export const CartSchema = z.object({
  id: z.string(),
  userId: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  restaurantId: z.string().default(""),
  items: z.array(CartLineItemSchema).default([]),
  updatedAt: z.string()
});

export const FoodOrderItemSchema = z.object({
  menuItemId: z.string().optional(),
  restaurantId: z.string().optional(),
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative()
});

export const FoodOrderSchema = z.object({
  id: z.string(),
  userId: z.string().default(""),
  restaurantId: z.string().default(""),
  userName: z.string().min(2),
  phone: z.string().min(8),
  items: z.array(FoodOrderItemSchema).min(1),
  deliveryAddress: z.string().min(5),
  specialInstructions: z.string().default(""),
  pricing: z.object({
    baseAmount: z.number().nonnegative(),
    tax: TaxBreakupSchema,
    totalAmount: z.number().nonnegative()
  }),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  orderTime: z.string()
});

export const QuerySchema = z.object({
  id: z.string(),
  userName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  subject: z.string().min(2),
  message: z.string().min(5),
  status: z.enum(["pending", "resolved", "spam"]).default("pending"),
  submittedAt: z.string(),
  respondedAt: z.string().nullable().default(null),
  response: z.string().nullable().default(null)
});

export const AuditLogSchema = z.object({
  id: z.string(),
  at: z.string(),
  adminChatId: z.number().optional(),
  action: z.string(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  meta: z.record(z.any()).optional()
});

export const UserOrderRefSchema = z.object({
  type: z.enum(["booking", "cab", "food", "query"]),
  id: z.string(),
  status: z.string().default("pending"),
  at: z.string().default(""),
  amount: z.number().nonnegative().default(0)
});

export const AnalyticsEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  category: z.string().default(""),
  userId: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  at: z.string(),
  meta: z.record(z.any()).default({})
});

export const UserProfileSchema = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string().default(""),
  email: z.string().default(""),
  ipAddress: z.string().default(""),
  browser: z.string().default(""),
  password: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  orders: z.array(UserOrderRefSchema).default([])
});

export const UserBehaviorProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  phone: z.string().default(""),
  name: z.string().default(""),
  email: z.string().default(""),
  coreIdentity: z.object({
    profilePhoto: z.string().default(""),
    accountId: z.string().default(""),
    linkedSocialAccounts: z.array(z.string()).default([]),
    kycData: z.record(z.any()).default({}),
    referralCode: z.string().default(""),
    referralHistory: z.array(z.record(z.any())).default([])
  }).default({}),
  deviceFingerprinting: z.object({
    deviceId: z.string().default(""),
    osVersion: z.string().default(""),
    appVersion: z.string().default(""),
    screenSize: z.string().default(""),
    language: z.string().default(""),
    timezone: z.string().default(""),
    ipAddress: z.string().default(""),
    ipHistory: z.array(z.string()).default([]),
    networkType: z.string().default(""),
    isp: z.string().default(""),
    rootJailbreakSignals: z.array(z.string()).default([])
  }).default({}),
  locationMobility: z.object({
    realtimeGps: z.record(z.any()).default({}),
    pickupDropLocations: z.array(z.record(z.any())).default([]),
    savedAddresses: z.array(z.record(z.any())).default([]),
    routeHistory: z.array(z.record(z.any())).default([]),
    localityPatterns: z.array(z.string()).default([]),
    travelFrequency: z.number().nonnegative().default(0),
    travelDistanceKm: z.number().nonnegative().default(0)
  }).default({}),
  behavioralAnalytics: z.object({
    appOpenFrequency: z.number().nonnegative().default(0),
    timeSpentPerScreen: z.record(z.number()).default({}),
    clicksScrollsHesitations: z.record(z.number()).default({}),
    searchQueries: z.array(z.string()).default([]),
    abandonedCarts: z.number().nonnegative().default(0),
    cancelledRides: z.number().nonnegative().default(0),
    retryBehavior: z.record(z.number()).default({})
  }).default({}),
  transactionPayment: z.object({
    orderHistory: z.array(z.record(z.any())).default([]),
    bookingTimestamps: z.array(z.string()).default([]),
    paymentMethods: z.array(z.string()).default([]),
    failedPayments: z.number().nonnegative().default(0),
    refunds: z.number().nonnegative().default(0),
    chargebacks: z.number().nonnegative().default(0),
    tipBehavior: z.record(z.any()).default({}),
    promoCouponUsage: z.array(z.string()).default([])
  }).default({}),
  preferencePersonalization: z.object({
    cuisinePreferences: z.array(z.string()).default([]),
    preferredVendors: z.array(z.string()).default([]),
    priceSensitivity: z.string().default(""),
    timeBasedHabits: z.array(z.string()).default([]),
    rideTypePreference: z.string().default("")
  }).default({}),
  ratingsReviewsFeedback: z.object({
    ratingsGiven: z.array(z.record(z.any())).default([]),
    ratingsReceived: z.array(z.record(z.any())).default([]),
    complaintCategories: z.array(z.string()).default([]),
    supportChatLogs: z.array(z.record(z.any())).default([]),
    callRecordingRefs: z.array(z.string()).default([])
  }).default({}),
  marketingAttribution: z.object({
    adSource: z.string().default(""),
    campaignId: z.string().default(""),
    pushInteraction: z.record(z.any()).default({}),
    emailOpenClicks: z.record(z.any()).default({}),
    inAppBannerClicks: z.number().nonnegative().default(0),
    abTestGroups: z.array(z.string()).default([])
  }).default({}),
  trustSafetyFraud: z.object({
    suspiciousBehaviorPatterns: z.array(z.string()).default([]),
    multipleAccountDetection: z.boolean().default(false),
    locationSpoofingSignals: z.array(z.string()).default([]),
    couponAbuseFlags: z.array(z.string()).default([]),
    fakeReviewFlags: z.array(z.string()).default([]),
    accountBansFlags: z.array(z.string()).default([]),
    lawEnforcementMetadata: z.array(z.record(z.any())).default([])
  }).default({}),
  derivedInferred: z.object({
    spendingCapacityScore: z.number().default(0),
    loyaltyScore: z.number().default(0),
    churnProbability: z.number().default(0),
    fraudRiskScore: z.number().default(0),
    priceElasticity: z.number().default(0),
    deliveryDelayTolerance: z.number().default(0),
    surgeAcceptanceLikelihood: z.number().default(0)
  }).default({}),
  orders: z.array(UserOrderRefSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const DatabaseSchema = z.object({
  settings: SettingsSchema,
  tours: z.array(TourSchema).default([]),
  festivals: z.array(FestivalSchema).default([]),
  hotels: z.array(HotelSchema).default([]),
  restaurants: z.array(RestaurantSchema).default([]),
  bookings: z.array(BookingSchema).default([]),
  cabBookings: z.array(CabBookingSchema).default([]),
  busRoutes: z.array(BusRouteSchema).default([]),
  busBookings: z.array(BusBookingSchema).default([]),
  bikeRentals: z.array(BikeRentalSchema).default([]),
  bikeBookings: z.array(BikeBookingSchema).default([]),
  foodOrders: z.array(FoodOrderSchema).default([]),
  carts: z.array(CartSchema).default([]),
  queries: z.array(QuerySchema).default([]),
  menuItems: z.array(MenuItemSchema).default([]),
  auditLog: z.array(AuditLogSchema).default([]),
  cabProviders: z.array(CabProviderSchema).default([]),
  cabRates: z.array(CabRateSchema).default([]),
  cabPricing: CabPricingSchema.default({
    baseFare: 120,
    perKm: 14,
    perMin: 2,
    surgeRules: [],
    nightCharges: {
      start: "22:00",
      end: "06:00",
      multiplier: 1.25
    },
    tolls: {
      enabled: false,
      defaultFee: 0
    }
  }),
  serviceAreas: z.array(ServiceAreaSchema).default([]),
  coupons: z.array(CouponSchema).default([]),
  policies: PoliciesSchema.default({
    hotel: { freeCancelHours: 24, feeAfter: 0.5 },
    tour: { freeCancelHours: 24, feeAfter: 0.5 },
    cab: { freeCancelMinutes: 15, feeAfter: 50 },
    food: { allowCancelMinutes: 5, feeAfter: 20 }
  }),
  payments: PaymentsSchema.default({
    walletEnabled: false,
    refundMethod: "original",
    refundWindowHours: 72
  }),
  userProfiles: z.array(UserProfileSchema).default([]),
  userBehaviorProfiles: z.array(UserBehaviorProfileSchema).default([]),
  analyticsEvents: z.array(AnalyticsEventSchema).default([]),
  sitePages: SitePagesSchema.default({
    affiliateProgram: { title: "Affiliate Program", slug: "affiliate-program", content: "" },
    contactUs: { title: "Contact Us", slug: "contact-us", content: "" },
    privacyPolicy: { title: "Privacy Policy", slug: "privacy-policy", content: "" },
    refundPolicy: { title: "Refund Policy", slug: "refund-policy", content: "" },
    termsAndConditions: { title: "Terms and Conditions", slug: "terms-and-conditions", content: "" }
  })
});

export type Database = z.infer<typeof DatabaseSchema>;
export type Tour = z.infer<typeof TourSchema>;
export type Festival = z.infer<typeof FestivalSchema>;
export type Hotel = z.infer<typeof HotelSchema>;
export type Restaurant = z.infer<typeof RestaurantSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type CabBooking = z.infer<typeof CabBookingSchema>;
export type BusRoute = z.infer<typeof BusRouteSchema>;
export type BusBooking = z.infer<typeof BusBookingSchema>;
export type BikeRental = z.infer<typeof BikeRentalSchema>;
export type BikeBooking = z.infer<typeof BikeBookingSchema>;
export type FoodOrder = z.infer<typeof FoodOrderSchema>;
export type Query = z.infer<typeof QuerySchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type SitePages = z.infer<typeof SitePagesSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserBehaviorProfile = z.infer<typeof UserBehaviorProfileSchema>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
