import type { Database } from "@explorevalley/shared";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

export function normalizePhone(phone: string) {
  const raw = safeText(phone);
  const digits = raw.replace(/\D+/g, "");
  return digits || raw.toLowerCase();
}

export function normalizeEmail(email: string) {
  return safeText(email).toLowerCase();
}

export function normalizeIp(ip: string) {
  return safeText(ip).toLowerCase();
}

export function userIdFromPhone(phone: string) {
  const key = normalizePhone(phone);
  return `user_${key || "unknown"}`;
}

export function userIdFromEmail(email: string) {
  const key = normalizeEmail(email);
  return `user_${key || "unknown"}`;
}

export function userIdFromIp(ip: string) {
  const key = normalizeIp(ip);
  return `user_${key || "unknown"}`;
}

export function requestIp(req: any) {
  const xff = safeText(req?.headers?.["x-forwarded-for"]);
  if (xff) return xff.split(",")[0].trim();
  return safeText(req?.ip || req?.socket?.remoteAddress || req?.connection?.remoteAddress || "");
}

export function requestBrowser(req: any) {
  return safeText(req?.headers?.["user-agent"]);
}

function upsertOrder(orders: any[], entry: any) {
  const idx = orders.findIndex((x: any) => x?.type === entry.type && x?.id === entry.id);
  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...entry };
  } else {
    orders.push(entry);
  }
}

function ensureProfile(db: Database, input: {
  phone: string;
  name?: string;
  email?: string;
  ipAddress?: string;
  browser?: string;
}, nowIso = new Date().toISOString()) {
  if (!Array.isArray((db as any).userProfiles)) (db as any).userProfiles = [];
  const phone = safeText(input.phone);
  if (!phone) return null;
  const key = normalizePhone(phone);
  const id = userIdFromPhone(phone);
  const list = (db as any).userProfiles as any[];
  const idx = list.findIndex((u: any) => normalizePhone(u?.phone) === key || safeText(u?.id) === id);
  const current = idx >= 0 ? list[idx] : null;
  const next = {
    id,
    phone,
    name: safeText(input.name || current?.name),
    email: safeText(input.email || current?.email),
    ipAddress: safeText(input.ipAddress || current?.ipAddress),
    browser: safeText(input.browser || current?.browser),
    createdAt: safeText(current?.createdAt || nowIso),
    updatedAt: nowIso,
    orders: Array.isArray(current?.orders) ? current.orders : []
  };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  return next;
}

function ensureGenericProfile(db: Database, input: {
  userId: string;
  phone?: string;
  name?: string;
  email?: string;
  ipAddress?: string;
  browser?: string;
}, nowIso = new Date().toISOString()) {
  if (!Array.isArray((db as any).userProfiles)) (db as any).userProfiles = [];
  const id = safeText(input.userId);
  if (!id) return null;
  const phone = safeText(input.phone || "");
  const list = (db as any).userProfiles as any[];
  const idx = list.findIndex((u: any) => safeText(u?.id) === id || (phone && normalizePhone(u?.phone) === normalizePhone(phone)));
  const current = idx >= 0 ? list[idx] : null;
  const next = {
    id,
    phone: phone || safeText(current?.phone || ""),
    name: safeText(input.name || current?.name),
    email: safeText(input.email || current?.email),
    ipAddress: safeText(input.ipAddress || current?.ipAddress),
    browser: safeText(input.browser || current?.browser),
    createdAt: safeText(current?.createdAt || nowIso),
    updatedAt: nowIso,
    orders: Array.isArray(current?.orders) ? current.orders : []
  };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  return next;
}

export function upsertUserFromSubmission(db: Database, payload: {
  phone: string;
  name?: string;
  email?: string;
  ipAddress?: string;
  browser?: string;
  orderType: "booking" | "cab" | "food" | "query";
  orderId: string;
  orderStatus?: string;
  orderAt?: string;
  orderAmount?: number;
}, nowIso = new Date().toISOString()) {
  const profile = ensureProfile(db, payload, nowIso);
  if (!profile) return;
  upsertOrder(profile.orders, {
    type: payload.orderType,
    id: safeText(payload.orderId),
    status: safeText(payload.orderStatus || "pending"),
    at: safeText(payload.orderAt || nowIso),
    amount: Number(payload.orderAmount || 0)
  });
  profile.updatedAt = nowIso;
}

export function syncUserProfilesFromOrders(db: Database) {
  const now = new Date().toISOString();
  const existing = Array.isArray((db as any).userProfiles) ? (db as any).userProfiles : [];
  const byPhone = new Map<string, any>();

  existing.forEach((u: any) => {
    const phone = safeText(u?.phone);
    if (!phone) return;
    byPhone.set(normalizePhone(phone), {
      id: safeText(u?.id || userIdFromPhone(phone)),
      phone,
      name: safeText(u?.name),
      email: safeText(u?.email),
      ipAddress: safeText(u?.ipAddress),
      browser: safeText(u?.browser),
      createdAt: safeText(u?.createdAt || now),
      updatedAt: safeText(u?.updatedAt || now),
      orders: []
    });
  });

  const pull = (phone: string, seed: any) => {
    const key = normalizePhone(phone);
    let user = byPhone.get(key);
    if (!user) {
      user = {
        id: userIdFromPhone(phone),
        phone: safeText(phone),
        name: "",
        email: "",
        ipAddress: "",
        browser: "",
        createdAt: now,
        updatedAt: now,
        orders: []
      };
      byPhone.set(key, user);
    }
    if (seed.name) user.name = safeText(seed.name);
    if (seed.email) user.email = safeText(seed.email);
    upsertOrder(user.orders, seed.order);
    user.updatedAt = now;
  };

  (db.bookings || []).forEach((x: any) => {
    pull(x.phone, {
      name: x.userName,
      email: x.email,
      order: {
        type: "booking",
        id: x.id,
        status: x.status || "pending",
        at: x.bookingDate || "",
        amount: Number(x?.pricing?.totalAmount || 0)
      }
    });
  });
  (db.cabBookings || []).forEach((x: any) => {
    pull(x.phone, {
      name: x.userName,
      order: {
        type: "cab",
        id: x.id,
        status: x.status || "pending",
        at: x.createdAt || "",
        amount: Number(x?.pricing?.totalAmount || x?.estimatedFare || 0)
      }
    });
  });
  (db.foodOrders || []).forEach((x: any) => {
    pull(x.phone, {
      name: x.userName,
      order: {
        type: "food",
        id: x.id,
        status: x.status || "pending",
        at: x.orderTime || "",
        amount: Number(x?.pricing?.totalAmount || 0)
      }
    });
  });
  (db.queries || []).forEach((x: any) => {
    pull(x.phone, {
      name: x.userName,
      email: x.email,
      order: {
        type: "query",
        id: x.id,
        status: x.status || "pending",
        at: x.submittedAt || "",
        amount: 0
      }
    });
  });

  (db as any).userProfiles = Array.from(byPhone.values())
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}

function ensureBehaviorProfile(base: any, now: string) {
  return {
    id: safeText(base?.id || ""),
    userId: safeText(base?.userId || ""),
    phone: safeText(base?.phone || ""),
    name: safeText(base?.name || ""),
    email: safeText(base?.email || ""),
    coreIdentity: {
      profilePhoto: safeText(base?.coreIdentity?.profilePhoto || ""),
      accountId: safeText(base?.coreIdentity?.accountId || safeText(base?.userId || "")),
      linkedSocialAccounts: Array.isArray(base?.coreIdentity?.linkedSocialAccounts) ? base.coreIdentity.linkedSocialAccounts : [],
      kycData: base?.coreIdentity?.kycData && typeof base.coreIdentity.kycData === "object" ? base.coreIdentity.kycData : {},
      referralCode: safeText(base?.coreIdentity?.referralCode || ""),
      referralHistory: Array.isArray(base?.coreIdentity?.referralHistory) ? base.coreIdentity.referralHistory : []
    },
    deviceFingerprinting: {
      deviceId: safeText(base?.deviceFingerprinting?.deviceId || ""),
      osVersion: safeText(base?.deviceFingerprinting?.osVersion || ""),
      appVersion: safeText(base?.deviceFingerprinting?.appVersion || ""),
      screenSize: safeText(base?.deviceFingerprinting?.screenSize || ""),
      language: safeText(base?.deviceFingerprinting?.language || ""),
      timezone: safeText(base?.deviceFingerprinting?.timezone || ""),
      ipAddress: safeText(base?.deviceFingerprinting?.ipAddress || ""),
      ipHistory: Array.isArray(base?.deviceFingerprinting?.ipHistory) ? base.deviceFingerprinting.ipHistory : [],
      networkType: safeText(base?.deviceFingerprinting?.networkType || ""),
      isp: safeText(base?.deviceFingerprinting?.isp || ""),
      rootJailbreakSignals: Array.isArray(base?.deviceFingerprinting?.rootJailbreakSignals) ? base.deviceFingerprinting.rootJailbreakSignals : []
    },
    locationMobility: {
      realtimeGps: base?.locationMobility?.realtimeGps && typeof base.locationMobility.realtimeGps === "object" ? base.locationMobility.realtimeGps : {},
      pickupDropLocations: Array.isArray(base?.locationMobility?.pickupDropLocations) ? base.locationMobility.pickupDropLocations : [],
      savedAddresses: Array.isArray(base?.locationMobility?.savedAddresses) ? base.locationMobility.savedAddresses : [],
      routeHistory: Array.isArray(base?.locationMobility?.routeHistory) ? base.locationMobility.routeHistory : [],
      localityPatterns: Array.isArray(base?.locationMobility?.localityPatterns) ? base.locationMobility.localityPatterns : [],
      travelFrequency: Number(base?.locationMobility?.travelFrequency || 0),
      travelDistanceKm: Number(base?.locationMobility?.travelDistanceKm || 0)
    },
    behavioralAnalytics: {
      appOpenFrequency: Number(base?.behavioralAnalytics?.appOpenFrequency || 0),
      timeSpentPerScreen: base?.behavioralAnalytics?.timeSpentPerScreen && typeof base.behavioralAnalytics.timeSpentPerScreen === "object" ? base.behavioralAnalytics.timeSpentPerScreen : {},
      clicksScrollsHesitations: base?.behavioralAnalytics?.clicksScrollsHesitations && typeof base.behavioralAnalytics.clicksScrollsHesitations === "object" ? base.behavioralAnalytics.clicksScrollsHesitations : {},
      searchQueries: Array.isArray(base?.behavioralAnalytics?.searchQueries) ? base.behavioralAnalytics.searchQueries : [],
      abandonedCarts: Number(base?.behavioralAnalytics?.abandonedCarts || 0),
      cancelledRides: Number(base?.behavioralAnalytics?.cancelledRides || 0),
      retryBehavior: base?.behavioralAnalytics?.retryBehavior && typeof base.behavioralAnalytics.retryBehavior === "object" ? base.behavioralAnalytics.retryBehavior : {}
    },
    transactionPayment: {
      orderHistory: Array.isArray(base?.transactionPayment?.orderHistory) ? base.transactionPayment.orderHistory : [],
      bookingTimestamps: Array.isArray(base?.transactionPayment?.bookingTimestamps) ? base.transactionPayment.bookingTimestamps : [],
      paymentMethods: Array.isArray(base?.transactionPayment?.paymentMethods) ? base.transactionPayment.paymentMethods : [],
      failedPayments: Number(base?.transactionPayment?.failedPayments || 0),
      refunds: Number(base?.transactionPayment?.refunds || 0),
      chargebacks: Number(base?.transactionPayment?.chargebacks || 0),
      tipBehavior: base?.transactionPayment?.tipBehavior && typeof base.transactionPayment.tipBehavior === "object" ? base.transactionPayment.tipBehavior : {},
      promoCouponUsage: Array.isArray(base?.transactionPayment?.promoCouponUsage) ? base.transactionPayment.promoCouponUsage : []
    },
    preferencePersonalization: {
      cuisinePreferences: Array.isArray(base?.preferencePersonalization?.cuisinePreferences) ? base.preferencePersonalization.cuisinePreferences : [],
      preferredVendors: Array.isArray(base?.preferencePersonalization?.preferredVendors) ? base.preferencePersonalization.preferredVendors : [],
      priceSensitivity: safeText(base?.preferencePersonalization?.priceSensitivity || ""),
      timeBasedHabits: Array.isArray(base?.preferencePersonalization?.timeBasedHabits) ? base.preferencePersonalization.timeBasedHabits : [],
      rideTypePreference: safeText(base?.preferencePersonalization?.rideTypePreference || "")
    },
    ratingsReviewsFeedback: {
      ratingsGiven: Array.isArray(base?.ratingsReviewsFeedback?.ratingsGiven) ? base.ratingsReviewsFeedback.ratingsGiven : [],
      ratingsReceived: Array.isArray(base?.ratingsReviewsFeedback?.ratingsReceived) ? base.ratingsReviewsFeedback.ratingsReceived : [],
      complaintCategories: Array.isArray(base?.ratingsReviewsFeedback?.complaintCategories) ? base.ratingsReviewsFeedback.complaintCategories : [],
      supportChatLogs: Array.isArray(base?.ratingsReviewsFeedback?.supportChatLogs) ? base.ratingsReviewsFeedback.supportChatLogs : [],
      callRecordingRefs: Array.isArray(base?.ratingsReviewsFeedback?.callRecordingRefs) ? base.ratingsReviewsFeedback.callRecordingRefs : []
    },
    marketingAttribution: {
      adSource: safeText(base?.marketingAttribution?.adSource || ""),
      campaignId: safeText(base?.marketingAttribution?.campaignId || ""),
      pushInteraction: base?.marketingAttribution?.pushInteraction && typeof base.marketingAttribution.pushInteraction === "object" ? base.marketingAttribution.pushInteraction : {},
      emailOpenClicks: base?.marketingAttribution?.emailOpenClicks && typeof base.marketingAttribution.emailOpenClicks === "object" ? base.marketingAttribution.emailOpenClicks : {},
      inAppBannerClicks: Number(base?.marketingAttribution?.inAppBannerClicks || 0),
      abTestGroups: Array.isArray(base?.marketingAttribution?.abTestGroups) ? base.marketingAttribution.abTestGroups : []
    },
    trustSafetyFraud: {
      suspiciousBehaviorPatterns: Array.isArray(base?.trustSafetyFraud?.suspiciousBehaviorPatterns) ? base.trustSafetyFraud.suspiciousBehaviorPatterns : [],
      multipleAccountDetection: !!base?.trustSafetyFraud?.multipleAccountDetection,
      locationSpoofingSignals: Array.isArray(base?.trustSafetyFraud?.locationSpoofingSignals) ? base.trustSafetyFraud.locationSpoofingSignals : [],
      couponAbuseFlags: Array.isArray(base?.trustSafetyFraud?.couponAbuseFlags) ? base.trustSafetyFraud.couponAbuseFlags : [],
      fakeReviewFlags: Array.isArray(base?.trustSafetyFraud?.fakeReviewFlags) ? base.trustSafetyFraud.fakeReviewFlags : [],
      accountBansFlags: Array.isArray(base?.trustSafetyFraud?.accountBansFlags) ? base.trustSafetyFraud.accountBansFlags : [],
      lawEnforcementMetadata: Array.isArray(base?.trustSafetyFraud?.lawEnforcementMetadata) ? base.trustSafetyFraud.lawEnforcementMetadata : []
    },
    derivedInferred: {
      spendingCapacityScore: Number(base?.derivedInferred?.spendingCapacityScore || 0),
      loyaltyScore: Number(base?.derivedInferred?.loyaltyScore || 0),
      churnProbability: Number(base?.derivedInferred?.churnProbability || 0),
      fraudRiskScore: Number(base?.derivedInferred?.fraudRiskScore || 0),
      priceElasticity: Number(base?.derivedInferred?.priceElasticity || 0),
      deliveryDelayTolerance: Number(base?.derivedInferred?.deliveryDelayTolerance || 0),
      surgeAcceptanceLikelihood: Number(base?.derivedInferred?.surgeAcceptanceLikelihood || 0)
    },
    orders: Array.isArray(base?.orders) ? base.orders : [],
    createdAt: safeText(base?.createdAt || now),
    updatedAt: safeText(base?.updatedAt || now)
  };
}

function pushUnique(list: any[], value: any, limit = 50) {
  if (!value) return list;
  const str = safeText(value);
  if (!str) return list;
  if (!list.includes(str)) list.push(str);
  if (list.length > limit) list.splice(0, list.length - limit);
  return list;
}

function incRecordValue(record: Record<string, number>, key: string, delta = 1) {
  if (!key) return;
  const curr = Number(record[key] || 0);
  record[key] = curr + delta;
}

export function applyAnalyticsEvent(db: Database, event: {
  id: string;
  type: string;
  category?: string;
  userId?: string;
  phone?: string;
  name?: string;
  email?: string;
  at?: string;
  meta?: Record<string, any>;
}) {
  const now = safeText(event.at || new Date().toISOString());
  const phone = safeText(event.phone || "");
  const email = safeText(event.email || "");
  const ipAddress = safeText(event.meta?.ipAddress || "");
  const userId = safeText(
    event.userId ||
    (phone ? userIdFromPhone(phone) : "") ||
    (email ? userIdFromEmail(email) : "") ||
    (ipAddress ? userIdFromIp(ipAddress) : "")
  );
  if (!userId) return;

  // Persist a lightweight customer profile even when phone isn't provided.
  // Supabase schema allows empty string for phone (NOT NULL, but "" is OK).
  ensureGenericProfile(db, {
    userId,
    phone,
    name: safeText(event.name || ""),
    email,
    ipAddress,
    browser: safeText(event.meta?.browser || "")
  }, now);

  if (!Array.isArray((db as any).userBehaviorProfiles)) (db as any).userBehaviorProfiles = [];
  const list = (db as any).userBehaviorProfiles as any[];
  const idx = list.findIndex((x: any) => safeText(x?.userId) === userId || normalizePhone(x?.phone) === normalizePhone(phone));
  const base = idx >= 0 ? list[idx] : {
    id: `behavior_${userId}`,
    userId,
    phone,
    name: safeText(event.name || ""),
    email: safeText(event.email || ""),
    orders: [],
    createdAt: now,
    updatedAt: now
  };
  const profile = ensureBehaviorProfile(base, now);
  profile.userId = userId;
  if (phone) profile.phone = phone;
  if (event.name) profile.name = safeText(event.name);
  if (email) profile.email = email;

  const type = safeText(event.type).toLowerCase();
  const category = safeText(event.category || "").toLowerCase();
  const meta = event.meta || {};

  if (category === "core" || type.includes("identity")) {
    if (meta.profilePhoto) profile.coreIdentity.profilePhoto = safeText(meta.profilePhoto);
    if (meta.accountId) profile.coreIdentity.accountId = safeText(meta.accountId);
    if (Array.isArray(meta.linkedSocialAccounts)) profile.coreIdentity.linkedSocialAccounts = meta.linkedSocialAccounts;
    if (meta.kycData && typeof meta.kycData === "object") profile.coreIdentity.kycData = meta.kycData;
    if (meta.referralCode) profile.coreIdentity.referralCode = safeText(meta.referralCode);
    if (Array.isArray(meta.referralHistory)) profile.coreIdentity.referralHistory = meta.referralHistory;
  }

  if (category === "device" || type.includes("device") || type.includes("fingerprint")) {
    const df = profile.deviceFingerprinting;
    if (meta.deviceId) df.deviceId = safeText(meta.deviceId);
    if (meta.osVersion) df.osVersion = safeText(meta.osVersion);
    if (meta.appVersion) df.appVersion = safeText(meta.appVersion);
    if (meta.screenSize) df.screenSize = safeText(meta.screenSize);
    if (meta.language) df.language = safeText(meta.language);
    if (meta.timezone) df.timezone = safeText(meta.timezone);
    if (meta.ipAddress) df.ipAddress = safeText(meta.ipAddress);
    if (meta.networkType) df.networkType = safeText(meta.networkType);
    if (meta.isp) df.isp = safeText(meta.isp);
    if (Array.isArray(meta.rootJailbreakSignals)) df.rootJailbreakSignals = meta.rootJailbreakSignals;
    if (df.ipAddress) df.ipHistory = pushUnique(Array.isArray(df.ipHistory) ? df.ipHistory : [], df.ipAddress, 50);
  }

  if (category === "location" || type.includes("location") || type.includes("gps")) {
    const lm = profile.locationMobility;
    const normalizeObjArray = (arr: any[]) =>
      arr
        .map((v) => (typeof v === "string" ? { value: safeText(v) } : v))
        .filter((v) => v && typeof v === "object" && !Array.isArray(v));
    if (meta.realtimeGps && typeof meta.realtimeGps === "object") lm.realtimeGps = meta.realtimeGps;
    if (Array.isArray(meta.pickupDropLocations)) lm.pickupDropLocations = normalizeObjArray(meta.pickupDropLocations);
    if (Array.isArray(meta.savedAddresses)) lm.savedAddresses = normalizeObjArray(meta.savedAddresses);
    if (Array.isArray(meta.routeHistory)) lm.routeHistory = normalizeObjArray(meta.routeHistory);
    if (Array.isArray(meta.localityPatterns)) lm.localityPatterns = meta.localityPatterns;
    if (meta.travelFrequency !== undefined) lm.travelFrequency = Number(meta.travelFrequency || 0);
    if (meta.travelDistanceKm !== undefined) lm.travelDistanceKm = Number(meta.travelDistanceKm || 0);
  }

  if (category === "behavior" || type.includes("screen") || type.includes("search") || type.includes("click")) {
    const ba = profile.behavioralAnalytics;
    if (type === "app_open") ba.appOpenFrequency = Number(ba.appOpenFrequency || 0) + 1;
    if (type === "screen_time") {
      const screen = safeText(meta.screen || "unknown");
      const seconds = Number(meta.seconds || 0);
      if (!ba.timeSpentPerScreen) ba.timeSpentPerScreen = {};
      incRecordValue(ba.timeSpentPerScreen, screen, seconds);
    }
    if (type === "click" || type === "scroll") {
      const key = safeText(meta.target || meta.screen || "unknown");
      if (!ba.clicksScrollsHesitations) ba.clicksScrollsHesitations = {};
      incRecordValue(ba.clicksScrollsHesitations, key, 1);
    }
    if (type === "search" && meta.query) {
      ba.searchQueries = pushUnique(Array.isArray(ba.searchQueries) ? ba.searchQueries : [], meta.query, 100);
    }
    if (type === "abandoned_cart") ba.abandonedCarts = Number(ba.abandonedCarts || 0) + 1;
    if (type === "cancelled_ride") ba.cancelledRides = Number(ba.cancelledRides || 0) + 1;
    if (type === "retry") {
      if (!ba.retryBehavior) ba.retryBehavior = {};
      incRecordValue(ba.retryBehavior, safeText(meta.key || "retry"), 1);
    }
  }

  if (category === "transaction" || type.includes("payment") || type.includes("order")) {
    const tp = profile.transactionPayment;
    if (Array.isArray(meta.orderHistory)) tp.orderHistory = meta.orderHistory;
    if (Array.isArray(meta.bookingTimestamps)) tp.bookingTimestamps = meta.bookingTimestamps;
    if (meta.paymentMethod) tp.paymentMethods = pushUnique(Array.isArray(tp.paymentMethods) ? tp.paymentMethods : [], meta.paymentMethod, 25);
    if (meta.failedPayments) tp.failedPayments = Number(tp.failedPayments || 0) + Number(meta.failedPayments || 0);
    if (meta.refunds) tp.refunds = Number(tp.refunds || 0) + Number(meta.refunds || 0);
    if (meta.chargebacks) tp.chargebacks = Number(tp.chargebacks || 0) + Number(meta.chargebacks || 0);
    if (meta.tipBehavior && typeof meta.tipBehavior === "object") tp.tipBehavior = meta.tipBehavior;
    if (meta.promoCoupon) tp.promoCouponUsage = pushUnique(Array.isArray(tp.promoCouponUsage) ? tp.promoCouponUsage : [], meta.promoCoupon, 50);
  }

  if (category === "preference" || type.includes("preference")) {
    const pref = profile.preferencePersonalization;
    if (Array.isArray(meta.cuisinePreferences)) pref.cuisinePreferences = meta.cuisinePreferences;
    if (Array.isArray(meta.preferredVendors)) pref.preferredVendors = meta.preferredVendors;
    if (meta.priceSensitivity) pref.priceSensitivity = safeText(meta.priceSensitivity);
    if (Array.isArray(meta.timeBasedHabits)) pref.timeBasedHabits = meta.timeBasedHabits;
    if (meta.rideTypePreference) pref.rideTypePreference = safeText(meta.rideTypePreference);
  }

  if (category === "ratings" || type.includes("rating") || type.includes("review")) {
    const rr = profile.ratingsReviewsFeedback;
    if (Array.isArray(meta.ratingsGiven)) rr.ratingsGiven = meta.ratingsGiven;
    if (Array.isArray(meta.ratingsReceived)) rr.ratingsReceived = meta.ratingsReceived;
    if (Array.isArray(meta.complaintCategories)) rr.complaintCategories = meta.complaintCategories;
    if (Array.isArray(meta.supportChatLogs)) rr.supportChatLogs = meta.supportChatLogs;
    if (Array.isArray(meta.callRecordingRefs)) rr.callRecordingRefs = meta.callRecordingRefs;
  }

  if (category === "marketing" || type.includes("campaign") || type.includes("push")) {
    const mk = profile.marketingAttribution;
    if (meta.adSource) mk.adSource = safeText(meta.adSource);
    if (meta.campaignId) mk.campaignId = safeText(meta.campaignId);
    if (meta.pushInteraction && typeof meta.pushInteraction === "object") mk.pushInteraction = meta.pushInteraction;
    if (meta.emailOpenClicks && typeof meta.emailOpenClicks === "object") mk.emailOpenClicks = meta.emailOpenClicks;
    if (meta.inAppBannerClicks !== undefined) mk.inAppBannerClicks = Number(mk.inAppBannerClicks || 0) + Number(meta.inAppBannerClicks || 0);
    if (Array.isArray(meta.abTestGroups)) mk.abTestGroups = meta.abTestGroups;
  }

  if (category === "trust" || type.includes("fraud") || type.includes("safety")) {
    const ts = profile.trustSafetyFraud;
    if (Array.isArray(meta.suspiciousBehaviorPatterns)) ts.suspiciousBehaviorPatterns = meta.suspiciousBehaviorPatterns;
    if (meta.multipleAccountDetection !== undefined) ts.multipleAccountDetection = !!meta.multipleAccountDetection;
    if (Array.isArray(meta.locationSpoofingSignals)) ts.locationSpoofingSignals = meta.locationSpoofingSignals;
    if (Array.isArray(meta.couponAbuseFlags)) ts.couponAbuseFlags = meta.couponAbuseFlags;
    if (Array.isArray(meta.fakeReviewFlags)) ts.fakeReviewFlags = meta.fakeReviewFlags;
    if (Array.isArray(meta.accountBansFlags)) ts.accountBansFlags = meta.accountBansFlags;
    if (Array.isArray(meta.lawEnforcementMetadata)) ts.lawEnforcementMetadata = meta.lawEnforcementMetadata;
  }

  if (category === "derived" || type.includes("score")) {
    const di = profile.derivedInferred;
    if (meta.spendingCapacityScore !== undefined) di.spendingCapacityScore = Number(meta.spendingCapacityScore || 0);
    if (meta.loyaltyScore !== undefined) di.loyaltyScore = Number(meta.loyaltyScore || 0);
    if (meta.churnProbability !== undefined) di.churnProbability = Number(meta.churnProbability || 0);
    if (meta.fraudRiskScore !== undefined) di.fraudRiskScore = Number(meta.fraudRiskScore || 0);
    if (meta.priceElasticity !== undefined) di.priceElasticity = Number(meta.priceElasticity || 0);
    if (meta.deliveryDelayTolerance !== undefined) di.deliveryDelayTolerance = Number(meta.deliveryDelayTolerance || 0);
    if (meta.surgeAcceptanceLikelihood !== undefined) di.surgeAcceptanceLikelihood = Number(meta.surgeAcceptanceLikelihood || 0);
  }

  profile.updatedAt = now;
  if (idx >= 0) list[idx] = profile;
  else list.push(profile);
}

export function syncUserBehaviorProfilesFromData(db: Database) {
  const now = new Date().toISOString();
  const profiles = Array.isArray((db as any).userProfiles) ? (db as any).userProfiles : [];
  const existing = Array.isArray((db as any).userBehaviorProfiles) ? (db as any).userBehaviorProfiles : [];
  const byUserId = new Map<string, any>();
  existing.forEach((x: any) => {
    const id = safeText(x?.userId);
    if (!id) return;
    byUserId.set(id, ensureBehaviorProfile(x, now));
  });

  profiles.forEach((u: any) => {
    const userId = safeText(u?.id || userIdFromPhone(u?.phone || ""));
    if (!userId) return;
    const current = byUserId.get(userId) || ensureBehaviorProfile({
      id: `behavior_${userId}`,
      userId,
      phone: safeText(u?.phone),
      name: safeText(u?.name),
      email: safeText(u?.email),
      orders: Array.isArray(u?.orders) ? u.orders : [],
      createdAt: safeText(u?.createdAt || now),
      updatedAt: now
    }, now);
    current.userId = userId;
    current.phone = safeText(u?.phone || current.phone);
    current.name = safeText(u?.name || current.name);
    current.email = safeText(u?.email || current.email);
    current.coreIdentity.accountId = userId;
    current.deviceFingerprinting.ipAddress = safeText(u?.ipAddress || current.deviceFingerprinting.ipAddress);
    if (u?.ipAddress) {
      const hist = Array.isArray(current.deviceFingerprinting.ipHistory) ? current.deviceFingerprinting.ipHistory : [];
      if (!hist.includes(String(u.ipAddress))) hist.push(String(u.ipAddress));
      current.deviceFingerprinting.ipHistory = hist.slice(-30);
    }
    current.orders = Array.isArray(u?.orders) ? u.orders : [];
    current.transactionPayment.orderHistory = current.orders.map((o: any) => ({ ...o }));
    current.transactionPayment.bookingTimestamps = current.orders.map((o: any) => safeText(o?.at)).filter(Boolean);
    current.transactionPayment.paymentMethods = Array.from(new Set(current.transactionPayment.paymentMethods || []));
    current.transactionPayment.failedPayments = Number(current.transactionPayment.failedPayments || 0);
    current.transactionPayment.refunds = Number(current.transactionPayment.refunds || 0);
    current.transactionPayment.chargebacks = Number(current.transactionPayment.chargebacks || 0);
    const totalSpend = current.orders.reduce((s: number, o: any) => s + Number(o?.amount || 0), 0);
    const orderCount = current.orders.length;
    current.derivedInferred.spendingCapacityScore = Math.round(totalSpend);
    current.derivedInferred.loyaltyScore = Math.min(100, orderCount * 5);
    current.derivedInferred.churnProbability = orderCount > 0 ? Number((1 / (orderCount + 1)).toFixed(4)) : 1;
    current.derivedInferred.fraudRiskScore = current.trustSafetyFraud.multipleAccountDetection ? 70 : 10;
    current.derivedInferred.priceElasticity = Number((orderCount > 0 ? Math.min(1, 1000 / (totalSpend + 1)) : 0).toFixed(4));
    current.derivedInferred.deliveryDelayTolerance = Number(current.derivedInferred.deliveryDelayTolerance || 0);
    current.derivedInferred.surgeAcceptanceLikelihood = Number((orderCount > 0 ? Math.min(1, totalSpend / (orderCount * 1000 + 1)) : 0).toFixed(4));
    current.updatedAt = now;
    byUserId.set(userId, current);
  });

  (db as any).userBehaviorProfiles = Array.from(byUserId.values())
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}
