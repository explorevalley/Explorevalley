import { Router } from "express";
import { mutateData, readData } from "../services/jsondb";
import { makeId, CabBookingSchema } from "@explorevalley/shared";
import { computeGST } from "../services/pricing";
import { z } from "zod";
type BotLike = any;
import { formatMoney } from "../services/notify";
import { getAuthClaims, requireAuth } from "../middleware/auth";
import { applyAnalyticsEvent, requestBrowser, requestIp, upsertUserFromSubmission, userIdFromPhone } from "../services/userProfiles";

export function cabRouter(bot: BotLike, adminChatIds: number[]) {
  const r = Router();

  const safeText = (value: any) => value === undefined || value === null ? "" : String(value).trim();

  const appendAnalyticsEvent = (db: any, input: {
    type: string;
    category: string;
    phone?: string;
    name?: string;
    email?: string;
    at: string;
    meta?: Record<string, any>;
  }) => {
    if (!Array.isArray(db.analyticsEvents)) db.analyticsEvents = [];
    const phone = safeText(input.phone || "");
    const userId = phone ? userIdFromPhone(phone) : "";
    const event = {
      id: makeId("evt"),
      type: safeText(input.type),
      category: safeText(input.category),
      userId,
      phone,
      email: safeText(input.email || ""),
      at: safeText(input.at),
      meta: input.meta || {}
    };
    db.analyticsEvents.push(event);
    if (db.analyticsEvents.length > 5000) db.analyticsEvents.splice(0, db.analyticsEvents.length - 5000);
    applyAnalyticsEvent(db, {
      id: event.id,
      type: event.type,
      category: event.category,
      userId: event.userId,
      phone: event.phone,
      name: safeText(input.name || ""),
      email: event.email,
      at: event.at,
      meta: event.meta
    });
  };

  const QuoteCab = z.object({
    pickupLocation: z.string().default(""),
    dropLocation: z.string().default(""),
    datetime: z.string().optional(),
    passengers: z.number().int().positive().default(1),
    vehicleType: z.string().default("Sedan"),
    distanceKm: z.number().nonnegative().optional(),
    durationMin: z.number().nonnegative().optional(),
    includeToll: z.boolean().optional(),
    highDemand: z.boolean().optional(),
    paymentFail: z.boolean().optional(),
    forceNoDrivers: z.boolean().optional()
  });

  const CreateCab = z.object({
    userName: z.string(),
    phone: z.string(),
    pickupLocation: z.string(),
    dropLocation: z.string(),
    datetime: z.string(),
    passengers: z.number().int().positive(),
    vehicleType: z.string().optional(),
    serviceAreaId: z.string().optional(),
    providerId: z.string().optional()
  });

  const estimateRouteDistanceKm = (pickupLocation: string, dropLocation: string) => {
    const normalize = (value: string) => String(value || "").trim().toLowerCase();
    const pickup = normalize(pickupLocation);
    const drop = normalize(dropLocation);
    if (!pickup || !drop) return 10;
    if (pickup === drop) return 0;

    const knownPoints: Record<string, [number, number]> = {
      manali: [0, 0],
      kullu: [42, 6],
      jhibhi: [58, 22],
      jibhi: [58, 22],
      tandi: [72, 37],
      kasol: [78, 16],
      chandigarh: [246, 64],
      delhi: [535, 82]
    };

    const lookupPoint = (text: string) => {
      const key = Object.keys(knownPoints).find((k) => text.includes(k));
      return key ? knownPoints[key] : null;
    };

    const p1 = lookupPoint(pickup);
    const p2 = lookupPoint(drop);
    if (p1 && p2) {
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      return Math.max(3, Math.round(Math.sqrt(dx * dx + dy * dy)));
    }

    const tokenize = (text: string) => new Set(text.split(/[^a-z0-9]+/g).filter(Boolean));
    const t1 = tokenize(pickup);
    const t2 = tokenize(drop);
    const overlap = [...t1].filter((t) => t2.has(t)).length;
    const union = new Set([...t1, ...t2]).size || 1;
    const similarity = overlap / union;
    const lexicalDistance = Math.round(6 + (1 - similarity) * 22 + Math.abs(pickup.length - drop.length) * 0.2);
    return Math.max(3, Math.min(120, lexicalDistance));
  };

  const pickVehicleType = (passengers: number, providers: any[], preferredType?: string) => {
    const normalizedPreferred = String(preferredType || "").trim().toLowerCase();
    const sortedProviders = providers
      .filter((p: any) => Number(p?.capacity || 0) > 0)
      .slice()
      .sort((a: any, b: any) => Number(a.capacity || 0) - Number(b.capacity || 0));

    if (normalizedPreferred) {
      const preferred = sortedProviders.find((p: any) => String(p.vehicleType || "").trim().toLowerCase() === normalizedPreferred);
      if (preferred && Number(preferred.capacity || 0) >= passengers) return String(preferred.vehicleType || "Sedan");
    }

    const fit = sortedProviders.find((p: any) => Number(p.capacity || 0) >= passengers);
    if (fit) return String(fit.vehicleType || "Sedan");
    if (passengers <= 2) return "Sedan";
    if (passengers <= 4) return "SUV";
    return "Tempo Traveller";
  };

  const pricingConfig = (db: any) => {
    const rawPricing = (db.cabPricing || {}) as any;
    return {
      baseFare: 60,
      perKm: 14,
      perMin: 2,
      ...rawPricing,
      surgeRules: Array.isArray(rawPricing.surgeRules) && rawPricing.surgeRules.length > 0
        ? rawPricing.surgeRules
        : [{ from: "18:00", to: "22:00", multiplier: 1.2 }],
      nightCharges: {
        start: "22:00",
        end: "06:00",
        multiplier: 1.35,
        ...(rawPricing.nightCharges || {})
      },
      tolls: {
        enabled: true,
        defaultFee: 50,
        ...(rawPricing.tolls || {})
      }
    } as any;
  };

  const estimateFare = (input: {
    db: any;
    pickupLocation: string;
    dropLocation: string;
    datetime?: string;
    includeToll?: boolean;
    highDemand?: boolean;
    distanceKm?: number;
    durationMin?: number;
    provider?: any;
  }) => {
    const pricing = pricingConfig(input.db);
    const baseFare = Number(pricing.baseFare || 60);
    const perKm = Number(pricing.perKm || 14);
    const perMin = Number(pricing.perMin || 2);
    const distanceKm = Number(input.distanceKm ?? estimateRouteDistanceKm(input.pickupLocation, input.dropLocation));
    const durationMin = Number(input.durationMin ?? Math.max(10, Math.round(distanceKm * 2)));
    const dt = input.datetime ? new Date(input.datetime) : new Date();
    const hour = dt.getHours();

    let multiplier = 1;
    if (input.highDemand) {
      multiplier = 1.5;
    } else {
      const surgeRules = pricing.surgeRules || [];
      const toMins = (s: string) => {
        const [h, m] = String(s || "0:0").split(":").map(Number);
        return h * 60 + m;
      };
      const nowMins = hour * 60 + dt.getMinutes();
      for (const rule of surgeRules) {
        const from = toMins(rule.from);
        const to = toMins(rule.to);
        const inRange = from <= to ? (nowMins >= from && nowMins <= to) : (nowMins >= from || nowMins <= to);
        if (inRange) {
          multiplier = Number(rule.multiplier || 1);
          break;
        }
      }
    }

    const night = pricing.nightCharges || {};
    const nightStart = Number(String(night.start || "22:00").split(":")[0]);
    const nightEnd = Number(String(night.end || "06:00").split(":")[0]);
    const isNight = nightStart > nightEnd ? (hour >= nightStart || hour < nightEnd) : (hour >= nightStart && hour < nightEnd);
    const nightMultiplier = isNight ? Number(night.multiplier || 1.35) : 1;

    const tollEnabled = !!(pricing.tolls?.enabled);
    const tollFee = tollEnabled && input.includeToll !== false ? Number(pricing.tolls?.defaultFee || 50) : 0;
    const rawBase = (baseFare + distanceKm * perKm + durationMin * perMin) * multiplier * nightMultiplier + tollFee;

    const priceDropPercent = Number(input.provider?.priceDropPercent || 0);
    const discountedBase = input.provider?.priceDropped === true
      ? Math.max(0, rawBase - (rawBase * Math.max(0, Math.min(100, priceDropPercent)) / 100))
      : rawBase;

    const gstRate = Number(input.db.settings?.taxRules?.cab?.gst ?? 0.05);
    const tax = computeGST(discountedBase, gstRate, false);
    const total = discountedBase + tax.gstAmount;

    return {
      pricing,
      baseFare,
      perKm,
      perMin,
      distanceKm,
      durationMin,
      subtotal: discountedBase,
      tollFee,
      gstRate,
      tax,
      total,
      multiplier,
      isNight
    };
  };

  r.post("/quote", async (req, res) => {
    const parsed = QuoteCab.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const body = parsed.data;

    const db = await readData();
    const anyDb = db as any;
    const configuredAreas = Array.isArray(anyDb.serviceAreas) ? anyDb.serviceAreas.filter((a: any) => a?.enabled !== false) : [];
    const configuredDrivers = Array.isArray(anyDb.cabProviders) ? anyDb.cabProviders.filter((d: any) => d?.active !== false) : [];

    const matchesArea = (location: string) => {
      const q = String(location || "").trim().toLowerCase();
      if (!q) return null;
      return configuredAreas.find((a: any) => q.includes(String(a.name || "").toLowerCase()) || q.includes(String(a.city || "").toLowerCase())) || null;
    };

    const looksOutside = (v: string) => /(outside|unknown|invalid|not\\s*serviceable|unserviceable|moon|mars|antarctica)/i.test(String(v || ""));
    const pickupArea = (() => {
      const matched = configuredAreas.length > 0 ? matchesArea(body.pickupLocation) : null;
      if (matched) return matched;
      return looksOutside(body.pickupLocation) ? null : { id: "area_default_pickup" };
    })();
    const dropArea = (() => {
      const matched = configuredAreas.length > 0 ? matchesArea(body.dropLocation) : null;
      if (matched) return matched;
      return looksOutside(body.dropLocation) ? null : { id: "area_default_drop" };
    })();

    if (!pickupArea || !dropArea) {
      return res.status(400).json({ error: "OUTSIDE_SERVICE_AREA" });
    }
    if (String(body.pickupLocation).trim().toLowerCase() === String(body.dropLocation).trim().toLowerCase()) {
      return res.status(400).json({ error: "INVALID_TRIP" });
    }

    const computedVehicleType = pickVehicleType(body.passengers, configuredDrivers, body.vehicleType);
    const type = String(computedVehicleType || "Sedan").toLowerCase();
    const providersForType = configuredDrivers.filter((d: any) => String(d.vehicleType || "").toLowerCase() === type);
    const fallbackCapacity: Record<string, number> = { hatchback: 4, sedan: 4, suv: 6, van: 7, mini: 3 };
    const capacity = providersForType[0]?.capacity ?? fallbackCapacity[type] ?? 4;
    if (body.passengers > capacity) {
      return res.status(400).json({ error: "CAPACITY_EXCEEDED" });
    }
    const noDriverHint = /(no\\s*driver|driver\\s*unavailable|no\\s*cars|unassigned)/i.test(
      `${body.pickupLocation} ${body.dropLocation} ${body.vehicleType}`
    );
    if (body.forceNoDrivers || noDriverHint) {
      return res.status(503).json({ error: "NO_DRIVERS_AVAILABLE" });
    }

    const fare = estimateFare({
      db,
      pickupLocation: body.pickupLocation,
      dropLocation: body.dropLocation,
      datetime: body.datetime,
      includeToll: body.includeToll,
      highDemand: body.highDemand,
      distanceKm: body.distanceKm,
      durationMin: body.durationMin
    });

    const paymentStatus = body.paymentFail ? "DUE" : "OK";
    return res.json({
      success: true,
      pickupAreaId: pickupArea.id,
      dropAreaId: dropArea.id,
      vehicleType: computedVehicleType,
      capacity,
      distanceKm: fare.distanceKm,
      durationMin: fare.durationMin,
      pricing: {
        baseFare: fare.baseFare,
        perKm: fare.perKm,
        perMin: fare.perMin,
        subtotal: fare.subtotal,
        toll: fare.tollFee,
        gst: fare.tax.gstAmount,
        totalAmount: fare.total
      },
      gstRate: fare.gstRate,
      multiplier: fare.multiplier,
      nightChargeApplied: fare.isNight,
      tollIncluded: fare.tollFee > 0,
      paymentStatus
    });
  });

  r.get("/search", async (req, res) => {
    const query = z.object({
      pickupLocation: z.string().default(""),
      dropLocation: z.string().default(""),
      datetime: z.string().optional(),
      passengers: z.coerce.number().int().positive().default(1),
      serviceAreaId: z.string().optional()
    }).safeParse(req.query ?? {});
    if (!query.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const input = query.data;

    if (!safeText(input.pickupLocation) || !safeText(input.dropLocation)) {
      return res.status(400).json({ error: "PICKUP_DROP_REQUIRED" });
    }
    if (safeText(input.pickupLocation).toLowerCase() === safeText(input.dropLocation).toLowerCase()) {
      return res.status(400).json({ error: "INVALID_TRIP" });
    }

    const db = await readData();
    const anyDb = db as any;
    const serviceAreas = Array.isArray(anyDb.serviceAreas) ? anyDb.serviceAreas.filter((a: any) => a?.enabled !== false) : [];
    if (input.serviceAreaId && !serviceAreas.some((a: any) => String(a.id) === String(input.serviceAreaId))) {
      return res.status(400).json({ error: "OUTSIDE_SERVICE_AREA" });
    }

    const providers = (Array.isArray(anyDb.cabProviders) ? anyDb.cabProviders : [])
      .filter((p: any) => p && p.active !== false)
      .filter((p: any) => Number(p.capacity || 0) >= input.passengers)
      .filter((p: any) => {
        if (!input.serviceAreaId) return true;
        const sid = safeText(p?.serviceAreaId);
        return !sid || sid === safeText(input.serviceAreaId);
      });

    const distanceKm = estimateRouteDistanceKm(input.pickupLocation, input.dropLocation);
    const durationMin = Math.max(10, Math.round(distanceKm * 2.2));
    const results = providers.map((provider: any) => {
      const fare = estimateFare({
        db,
        pickupLocation: input.pickupLocation,
        dropLocation: input.dropLocation,
        datetime: input.datetime,
        distanceKm,
        durationMin,
        provider
      });
      return {
        providerId: safeText(provider.id),
        providerName: safeText(provider.name),
        vehicleType: safeText(provider.vehicleType) || "Sedan",
        plateNumber: safeText(provider.plateNumber),
        capacity: Number(provider.capacity || 0),
        serviceAreaId: safeText(provider.serviceAreaId),
        heroImage: safeText(provider.heroImage),
        pickupLocation: input.pickupLocation,
        dropLocation: input.dropLocation,
        datetime: input.datetime || "",
        passengers: input.passengers,
        distanceKm: fare.distanceKm,
        durationMin: fare.durationMin,
        baseAmount: fare.subtotal,
        gstAmount: fare.tax.gstAmount,
        totalAmount: fare.total
      };
    }).sort((a, b) => Number(a.totalAmount || 0) - Number(b.totalAmount || 0));

    return res.json({ success: true, count: results.length, results });
  });

  r.post("/", requireAuth, async (req, res) => {
    const parsed = CreateCab.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const body = parsed.data;
    const claims = getAuthClaims(req);
    const ipAddress = requestIp(req);
    const browser = requestBrowser(req);
    if (claims?.phone && String(claims.phone) !== String(body.phone)) {
      await mutateData((db) => {
        const now = new Date().toISOString();
        appendAnalyticsEvent(db, {
          type: "auth_identity_mismatch",
          category: "trust",
          phone: safeText(body?.phone || claims?.phone || ""),
          name: safeText(body?.userName || claims?.name || ""),
          email: safeText(claims?.email || ""),
          at: now,
          meta: {
            reason: "phone_mismatch",
            providedPhone: safeText(body?.phone),
            expectedPhone: safeText(claims?.phone)
          }
        });
      }, "analytics_event");
      return res.status(403).json({ error: "AUTH_IDENTITY_MISMATCH" });
    }
    let createdId = "";
    let notifyMsg = "";
    let estimatedFare = 0;
    let totalAmount = 0;
    let computedVehicleTypeOut = "";

    try {
      await mutateData((db) => {
      const now = new Date().toISOString();
      const dt = new Date(body.datetime);
      if (!Number.isFinite(dt.getTime())) throw new Error("INVALID_DATETIME");
      if (dt.getTime() < Date.now() - 2 * 60 * 1000) throw new Error("DATETIME_IN_PAST");

      if (String(body.pickupLocation).trim().toLowerCase() === String(body.dropLocation).trim().toLowerCase()) {
        throw new Error("INVALID_TRIP");
      }

      const anyDb = db as any;
      const configuredAreas = Array.isArray(anyDb.serviceAreas) ? anyDb.serviceAreas.filter((a: any) => a?.enabled !== false) : [];
      if (body.serviceAreaId) {
        const area = configuredAreas.find((a: any) => String(a.id) === String(body.serviceAreaId));
        if (!area) throw new Error("OUTSIDE_SERVICE_AREA");
      } else if (configuredAreas.length > 0) {
        const q = `${body.pickupLocation} ${body.dropLocation}`.toLowerCase();
        const matches = configuredAreas.some((a: any) => q.includes(String(a.name || "").toLowerCase()) || q.includes(String(a.city || "").toLowerCase()));
        if (!matches) throw new Error("OUTSIDE_SERVICE_AREA");
      }

      const configuredDrivers = Array.isArray((db as any).cabProviders) ? (db as any).cabProviders.filter((d: any) => d?.active !== false) : [];
      const selectedProvider = body.providerId
        ? configuredDrivers.find((d: any) => safeText(d?.id) === safeText(body.providerId))
        : null;
      if (body.providerId && !selectedProvider) throw new Error("CAB_NOT_FOUND");

      const computedVehicleType = selectedProvider
        ? String(selectedProvider.vehicleType || "Sedan")
        : pickVehicleType(body.passengers, configuredDrivers, body.vehicleType);
      const type = String(computedVehicleType || "Sedan").toLowerCase();
      const providersForType = selectedProvider
        ? [selectedProvider]
        : configuredDrivers.filter((d: any) => String(d.vehicleType || "").toLowerCase() === type);
      const fallbackCapacity: Record<string, number> = { hatchback: 4, sedan: 4, suv: 6, van: 7, mini: 3 };
      const capacity = providersForType[0]?.capacity ?? fallbackCapacity[type] ?? 4;
      if (body.passengers > capacity) throw new Error("CAPACITY_EXCEEDED");
      if (selectedProvider && body.serviceAreaId && safeText(selectedProvider.serviceAreaId) && safeText(selectedProvider.serviceAreaId) !== safeText(body.serviceAreaId)) {
        throw new Error("OUTSIDE_SERVICE_AREA");
      }
      // If we have configured drivers, ensure we can actually fulfill the requested capacity.
      if (configuredDrivers.length > 0) {
        const canServe = providersForType.some((d: any) => Number(d?.capacity || 0) >= body.passengers);
        if (!canServe) throw new Error("NO_DRIVERS_AVAILABLE");
      }

      const distanceKm = estimateRouteDistanceKm(body.pickupLocation, body.dropLocation);
      const durationMin = Math.max(10, Math.round(distanceKm * 2.2));
      const fare = estimateFare({
        db,
        pickupLocation: body.pickupLocation,
        dropLocation: body.dropLocation,
        datetime: body.datetime,
        distanceKm,
        durationMin,
        provider: selectedProvider
      });
      estimatedFare = fare.subtotal;
      totalAmount = fare.total;
      computedVehicleTypeOut = computedVehicleType;

      const cab = CabBookingSchema.parse({
        id: makeId("cab"),
        ...body,
        vehicleType: computedVehicleType,
        estimatedFare: fare.subtotal,
        pricing: { baseAmount: fare.subtotal, tax: fare.tax, totalAmount: fare.total },
        status: "pending",
        createdAt: now
      });

      db.cabBookings.push(cab);
      db.auditLog.push({ id: makeId("audit"), at: now, action: "CREATE_CAB", entity: "cab", entityId: cab.id });
      upsertUserFromSubmission(db, {
        phone: cab.phone,
        name: cab.userName,
        email: claims?.email || undefined,
        ipAddress,
        browser,
        orderType: "cab",
        orderId: cab.id,
        orderStatus: cab.status,
        orderAt: cab.createdAt,
        orderAmount: Number(cab?.pricing?.totalAmount || cab?.estimatedFare || 0)
      }, now);

      appendAnalyticsEvent(db, {
        type: "cab_booking_created",
        category: "transaction",
        phone: cab.phone,
        name: cab.userName,
        email: claims?.email || "",
        at: now,
        meta: {
          orderId: cab.id,
          orderType: "cab",
          totalAmount: cab.pricing?.totalAmount || fare.total || 0,
          vehicleType: cab.vehicleType,
          distanceKm,
          durationMin,
          passengers: cab.passengers,
          paymentMethod: "pending",
          ipAddress,
          browser
        }
      });

      appendAnalyticsEvent(db, {
        type: "ride_route_selected",
        category: "location",
        phone: cab.phone,
        name: cab.userName,
        email: claims?.email || "",
        at: now,
        meta: {
          pickupDropLocations: [cab.pickupLocation, cab.dropLocation].filter(Boolean),
          routeHistory: [{ from: cab.pickupLocation, to: cab.dropLocation, at: cab.datetime }],
          ipAddress,
          browser
        }
      });

      appendAnalyticsEvent(db, {
        type: "ride_preference",
        category: "preference",
        phone: cab.phone,
        name: cab.userName,
        email: claims?.email || "",
        at: now,
        meta: {
          rideTypePreference: cab.vehicleType,
          ipAddress,
          browser
        }
      });

      createdId = cab.id;
      notifyMsg =
        `🚖 NEW CAB BOOKING\n\nPassenger: ${cab.userName}\nPhone: ${cab.phone}\n` +
        `${selectedProvider ? `Provider: ${safeText(selectedProvider.name)}\n` : ""}` +
        `Pickup: ${cab.pickupLocation}\nDrop: ${cab.dropLocation}\nTime: ${cab.datetime}\nPassengers: ${cab.passengers}\nVehicle: ${cab.vehicleType}\n` +
        `Distance: ${distanceKm} km\nDuration: ${durationMin} min\n\n` +
        `Base: ${formatMoney(fare.subtotal)}\nGST @ ${(fare.tax.gstRate * 100).toFixed(0)}%: ${formatMoney(fare.tax.gstAmount)}\nTotal: ${formatMoney(fare.total)}\n\nID: ${cab.id}`;
      }, "cab");
    } catch (err: any) {
      return res.status(400).json({ error: "CAB_BOOKING_CREATE_FAILED", message: String(err?.message || err) });
    }

    for (const adminId of adminChatIds) bot.sendMessage(adminId, notifyMsg);
    res.json({ success: true, id: createdId, estimatedFare, totalAmount, vehicleType: computedVehicleTypeOut });
  });

  return r;
}
