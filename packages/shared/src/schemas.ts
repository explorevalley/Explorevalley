import { z } from "zod";

export const TaxRuleSlabSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().nullable(),
  gst: z.number().min(0).max(1)
});

export const SettingsSchema = z.object({
  currency: z.literal("INR").default("INR"),
  taxRules: z.object({
    hotel: z.object({
      slabs: z.array(TaxRuleSlabSchema).min(1)
    }),
    tour: z.object({ gst: z.number().min(0).max(1), mode: z.enum(["NO_ITC", "WITH_ITC"]).default("NO_ITC") }),
    food: z.object({ gst: z.number().min(0).max(1), mode: z.string().default("DEFAULT") }),
    cab: z.object({ gst: z.number().min(0).max(1), mode: z.string().default("DEFAULT") })
  })
});

export const TourSchema = z.object({
  id: z.string(),
  title: z.string().min(2),
  description: z.string().min(10),
  price: z.number().nonnegative(),
  duration: z.string().min(1),
  images: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  itinerary: z.string().default(""),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  maxGuests: z.number().int().positive(),
  available: z.boolean().default(true),
  createdAt: z.string(),
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
  pricePerNight: z.number().nonnegative(),
  images: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
  roomTypes: z.array(HotelRoomTypeSchema).min(1),
  rating: z.number().min(0).max(5).default(0),
  reviews: z.number().int().nonnegative().default(0),
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("11:00"),
  available: z.boolean().default(true),
  createdAt: z.string()
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
  guests: z.number().int().positive(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  roomType: z.string().optional(),
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
  pricing: z.object({
    baseAmount: z.number().nonnegative(),
    tax: TaxBreakupSchema,
    totalAmount: z.number().nonnegative()
  }),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  createdAt: z.string()
});

export const MenuItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  description: z.string().default(""),
  price: z.number().nonnegative(),
  image: z.string().optional(),
  available: z.boolean().default(true),
  isVeg: z.boolean().default(false)
});

export const FoodOrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative()
});

export const FoodOrderSchema = z.object({
  id: z.string(),
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

export const DatabaseSchema = z.object({
  settings: SettingsSchema,
  tours: z.array(TourSchema).default([]),
  hotels: z.array(HotelSchema).default([]),
  bookings: z.array(BookingSchema).default([]),
  cabBookings: z.array(CabBookingSchema).default([]),
  foodOrders: z.array(FoodOrderSchema).default([]),
  queries: z.array(QuerySchema).default([]),
  menuItems: z.array(MenuItemSchema).default([]),
  auditLog: z.array(AuditLogSchema).default([])
});

export type Database = z.infer<typeof DatabaseSchema>;
export type Tour = z.infer<typeof TourSchema>;
export type Hotel = z.infer<typeof HotelSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type CabBooking = z.infer<typeof CabBookingSchema>;
export type FoodOrder = z.infer<typeof FoodOrderSchema>;
export type Query = z.infer<typeof QuerySchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
