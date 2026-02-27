import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  FaBed,
  FaBus,
  FaCar,
  FaChartLine,
  FaClipboardList,
  FaCog,
  FaDownload,
  FaHome,
  FaHotel,
  FaLock,
  FaMapMarkerAlt,
  FaPlus,
  FaRedo,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaStore,
  FaTable,
  FaUtensils,
  FaFileCode,
  FaPen,
  FaFileAlt,
  FaSignInAlt,
  FaBuilding,
  FaGoogle,
  FaEnvelopeOpenText,
  FaUsers,
  FaRobot,
  FaTruck,
  FaUndoAlt,
  FaEnvelope,
  FaComments,
  FaTelegramPlane,
  FaStar,
  FaMotorcycle,
  FaBell
} from "react-icons/fa";

const PAGE_SIZE = 20;

function safeText(v) {
  return v === undefined || v === null ? "" : String(v);
}

function displayText(v, fallback = "—") {
  const s = safeText(v);
  return s.trim() ? s : fallback;
}

function titleCaseLabel(raw) {
  const s = safeText(raw).trim();
  if (!s) return "";
  const cleaned = s
    .replace(/^ev_/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean);
  return words.map((w) => {
    const lw = w.toLowerCase();
    if (["id", "ip", "url", "kyc", "aadhaar", "api", "cms", "seo", "utc"].includes(lw)) return lw.toUpperCase();
    if (lw === "inr") return "INR";
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join(" ");
}

const COMMON_COLUMN_LABELS = {
  id: "ID",
  code: "Code",
  slug: "Slug",
  title: "Title",
  name: "Name",
  description: "Description",
  content: "Content",
  email: "Email",
  phone: "Phone",
  user_id: "User ID",
  userId: "User ID",
  user_name: "Customer Name",
  userName: "Customer Name",
  restaurant_id: "Vendor ID",
  restaurantId: "Vendor ID",
  item_id: "Item ID",
  itemId: "Item ID",
  location: "Location",
  city: "City",
  price: "Price",
  price_per_night: "Price / Night",
  pricePerNight: "Price / Night",
  hero_image: "Hero Image",
  heroImage: "Hero Image",
  image: "Image",
  images: "Images",
  image_meta: "Image Details",
  imageMeta: "Image Details",
  rating: "Rating",
  review_count: "Reviews",
  reviews: "Reviews",
  available: "Available",
  active: "Active",
  status: "Status",
  created_at: "Created",
  updated_at: "Updated",
  booking_date: "Booking Date",
  order_time: "Order Time",
  submitted_at: "Submitted",
  responded_at: "Responded",
  ip_address: "IP Address",
  browser: "Browser",
  vendor_mobile: "Vendor Mobile",
  additional_comments: "Notes",
  price_dropped: "Discount Active",
  price_drop_percent: "Discount (%)",
  delivery_address: "Delivery Address",
  pickup_location: "Pickup Location",
  drop_location: "Drop Location",
  datetime: "Date/Time"
};

const TABLES = Object.freeze({
  SETTINGS: "opsSettings",
  PAYMENTS: "billingSettings",
  POLICIES: "policyPages",
  SITE_PAGES: "contentPages",
  FESTIVALS: "festivalDeck",
  TOURS: "tourDeck",
  HOTELS: "stayCatalog",
  RESTAURANTS: "foodPartners",
  MARTS: "martPartners",
  PRODUCTS: "martProducts",
  MENU_ITEMS: "foodItems",
  FOOD_ORDERS: "foodOrders",
  BOOKINGS: "travelBookings",
  CAB_BOOKINGS: "cabBookings",
  BUS_BOOKINGS: "busBookings",
  CAB_PROVIDERS: "cabPartners",
  BIKE_RENTALS: "bikeRentals",
  BUSES: "busRoutes",
  USER_PROFILES: "userProfiles",
  USER_BEHAVIOR_PROFILES: "userSignals",
  ANALYTICS_EVENTS: "securityEvents",
  QUERIES: "supportQueries",
  AUDIT_LOG: "auditTrail",
  COUPONS: "promoCodes",
  SERVICE_AREAS: "serviceZones",
  TELEGRAM_MESSAGES: "telegramLogs",
  AI_CONVERSATIONS: "aiChats",
  DELIVERY_TRACKING: "deliveryTracking",
  VENDOR_MESSAGES: "vendorComms",
  EMAIL_NOTIFICATIONS: "emailOutbox",
  REVIEWS: "reviewsBoard",
  REFUNDS: "refundQueue"
});

const TABLE_LABELS = {
  [TABLES.SETTINGS]: "Settings",
  [TABLES.PAYMENTS]: "Payments",
  [TABLES.POLICIES]: "Policies",
  [TABLES.SITE_PAGES]: "Site Pages",
  [TABLES.FESTIVALS]: "Festivals",
  [TABLES.TOURS]: "Tours",
  [TABLES.HOTELS]: "Hotels & Cottages",
  [TABLES.RESTAURANTS]: "Food Vendors",
  [TABLES.MARTS]: "Marts",
  [TABLES.PRODUCTS]: "Products",
  [TABLES.MENU_ITEMS]: "Menu Items",
  [TABLES.FOOD_ORDERS]: "Food Orders",
  [TABLES.BOOKINGS]: "Hotel Booking",
  [TABLES.CAB_BOOKINGS]: "Cab Bookings",
  [TABLES.BUS_BOOKINGS]: "Bus Bookings",
  [TABLES.CAB_PROVIDERS]: "Cab Providers",
  [TABLES.BIKE_RENTALS]: "Bike Rentals",
  [TABLES.BUSES]: "Buses",
  [TABLES.USER_PROFILES]: "Customer Profiles",
  [TABLES.USER_BEHAVIOR_PROFILES]: "Customer Signals",
  [TABLES.ANALYTICS_EVENTS]: "Security Events",
  [TABLES.QUERIES]: "Enquiries",
  [TABLES.AUDIT_LOG]: "Audit Log",
  [TABLES.COUPONS]: "Coupons",
  [TABLES.SERVICE_AREAS]: "Service Areas",
  [TABLES.TELEGRAM_MESSAGES]: "Telegram Messages",
  [TABLES.AI_CONVERSATIONS]: "AI Conversations",
  [TABLES.DELIVERY_TRACKING]: "Delivery Tracking",
  [TABLES.VENDOR_MESSAGES]: "Vendor Messages",
  [TABLES.EMAIL_NOTIFICATIONS]: "Email Notifications",
  [TABLES.REVIEWS]: "Reviews",
  [TABLES.REFUNDS]: "Refunds"
};

const DB_TABLE_BY_ALIAS = Object.freeze({
  [TABLES.SETTINGS]: "ev_settings",
  [TABLES.PAYMENTS]: "ev_payments",
  [TABLES.POLICIES]: "ev_policies",
  [TABLES.SITE_PAGES]: "ev_site_pages",
  [TABLES.FESTIVALS]: "ev_festivals",
  [TABLES.TOURS]: "ev_tours",
  [TABLES.HOTELS]: "ev_hotels",
  [TABLES.RESTAURANTS]: "ev_restaurants",
  [TABLES.MARTS]: "ev_mart_partners",
  [TABLES.PRODUCTS]: "ev_mart_products",
  [TABLES.MENU_ITEMS]: "ev_menu_items",
  [TABLES.FOOD_ORDERS]: "ev_food_orders",
  [TABLES.BOOKINGS]: "ev_bookings",
  [TABLES.CAB_BOOKINGS]: "ev_cab_bookings",
  [TABLES.BUS_BOOKINGS]: "ev_bus_bookings",
  [TABLES.CAB_PROVIDERS]: "ev_cab_rates",
  [TABLES.BIKE_RENTALS]: "ev_rental_vehicles",
  [TABLES.BUSES]: "ev_buses",
  [TABLES.USER_PROFILES]: "ev_user_profiles",
  [TABLES.USER_BEHAVIOR_PROFILES]: "ev_user_behavior_profiles",
  [TABLES.ANALYTICS_EVENTS]: "ev_analytics_events",
  [TABLES.QUERIES]: "ev_queries",
  [TABLES.AUDIT_LOG]: "ev_audit_log",
  [TABLES.COUPONS]: "ev_coupons",
  [TABLES.SERVICE_AREAS]: "ev_service_areas",
  [TABLES.TELEGRAM_MESSAGES]: "ev_telegram_messages",
  [TABLES.AI_CONVERSATIONS]: "ev_ai_conversations",
  [TABLES.DELIVERY_TRACKING]: "ev_delivery_tracking",
  [TABLES.VENDOR_MESSAGES]: "ev_vendor_messages",
  [TABLES.EMAIL_NOTIFICATIONS]: "ev_email_notifications",
  [TABLES.REVIEWS]: "ev_reviews",
  [TABLES.REFUNDS]: "ev_refunds"
});

const ALIAS_BY_DB_TABLE = Object.freeze(
  Object.fromEntries(Object.entries(DB_TABLE_BY_ALIAS).map(([alias, db]) => [db, alias]))
);

function tableAlias(tableName) {
  const key = safeText(tableName);
  return ALIAS_BY_DB_TABLE[key] || key;
}

function tableDb(tableName) {
  const key = safeText(tableName);
  return DB_TABLE_BY_ALIAS[key] || key;
}

function tableLabel(tableName) {
  const key = tableAlias(tableName);
  return TABLE_LABELS[key] || titleCaseLabel(key);
}

function columnLabel(tableName, colName) {
  const key = safeText(colName);
  return COMMON_COLUMN_LABELS[key] || titleCaseLabel(key);
}

function safeJsonParse(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (!(t.startsWith("{") || t.startsWith("["))) return null;
  try { return JSON.parse(t); } catch { return null; }
}

function uniqStrings(list) {
  const out = [];
  const seen = new Set();
  (list || []).forEach((x) => {
    const s = safeText(x).trim();
    if (!s) return;
    if (seen.has(s)) return;
    seen.add(s);
    out.push(s);
  });
  return out;
}

function normalizeStringList(raw) {
  if (Array.isArray(raw)) return raw.map((x) => safeText(x)).filter((x) => x.trim());
  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw);
    if (Array.isArray(parsed)) return parsed.map((x) => safeText(x)).filter((x) => x.trim());
    return raw
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeObjectList(raw) {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object");
  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => x && typeof x === "object");
  }
  return [];
}

function ListEditor({ title, values, onChange, placeholder = "Add item..." }) {
  const [draft, setDraft] = useState("");
  const list = Array.isArray(values) ? values : [];
  const add = () => {
    const v = safeText(draft).trim();
    if (!v) return;
    onChange([...(list || []), v]);
    setDraft("");
  };
  const removeAt = (idx) => {
    onChange(list.filter((_, i) => i !== idx));
  };
  return (
    <div className="field full">
      <label>{title}</label>
      <div className="list-editor-row">
        <input
          className="input flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" className="btn small" onClick={add}><FaPlus /> Add</button>
      </div>
      <div className="chip-wrap">
        {(list || []).map((item, idx) => (
          <span key={`${item}-${idx}`} className="chip">
            {item}
            <button type="button" className="chip-x" onClick={() => removeAt(idx)} aria-label="Remove item">x</button>
          </span>
        ))}
        {!list.length ? <span className="small">No items yet.</span> : null}
      </div>
    </div>
  );
}

function FestivalGalleryEditor({ images, titles, descriptions, onChange }) {
  const rows = useMemo(() => {
    const img = normalizeStringList(images);
    const ttl = normalizeStringList(titles);
    const desc = normalizeStringList(descriptions);
    const count = Math.max(img.length, ttl.length, desc.length, 1);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      out.push({
        image: safeText(img[i]),
        title: safeText(ttl[i]),
        description: safeText(desc[i])
      });
    }
    return out;
  }, [images, titles, descriptions]);

  const applyRows = (nextRows) => {
    const cleaned = (nextRows || [])
      .map((r) => ({
        image: safeText(r?.image).trim(),
        title: safeText(r?.title).trim(),
        description: safeText(r?.description).trim()
      }))
      .filter((r) => r.image || r.title || r.description);
    onChange({
      images: cleaned.map((r) => r.image).filter(Boolean),
      image_titles: cleaned.map((r) => r.title),
      image_descriptions: cleaned.map((r) => r.description),
      image_meta: cleaned.map((r) => ({ url: r.image, title: r.title, description: r.description }))
    });
  };

  const update = (index, key, value) => {
    const next = rows.map((r, i) => (i === index ? { ...r, [key]: value } : r));
    applyRows(next);
  };

  const removeAt = (index) => {
    applyRows(rows.filter((_, i) => i !== index));
  };

  const uploadGalleryImage = async (index, file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "images/gallery");
      const r = await fetch("/api/admin/upload-image", { method: "POST", credentials: "include", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "UPLOAD_FAILED");
      update(index, "image", j.url || j.path || "");
    } catch (err) {
      alert(String(err?.message || err));
    }
  };

  return (
    <div className="field full">
      <label>Gallery</label>
      <div className="gallery-grid">
        {rows.map((r, idx) => (
          <div key={`gallery-${idx}`} className="gallery-card">
            <div className="gallery-head">
              <span>Image {idx + 1}</span>
              <button type="button" className="btn small danger" onClick={() => removeAt(idx)}>Remove</button>
            </div>
            <div className="field">
              <label>Image</label>
              <div className="flex-gap10-center">
                <input className="input flex-1" value={r.image} readOnly placeholder="Upload image" />
                <label className="btn small pointer">
                  Upload
                  <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadGalleryImage(idx, e.target.files?.[0])} />
                </label>
              </div>
            </div>
            <div className="field">
              <label>Title</label>
              <input className="input" value={r.title} onChange={(e) => update(idx, "title", e.target.value)} placeholder="Optional image title" />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea gallery-textarea" value={r.description} onChange={(e) => update(idx, "description", e.target.value)} placeholder="Optional image note" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <button
          type="button"
          className="btn small"
          onClick={() => applyRows([...(rows || []), { image: "", title: "", description: "" }])}
        >
          <FaPlus /> Add Image
        </button>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  return (
    <div className="pagination">
      <button className="btn small" disabled={prevDisabled} onClick={() => onChange(page - 1)}>Prev</button>
      <div className="small">Page {page} / {totalPages}</div>
      <button className="btn small" disabled={nextDisabled} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}

function CabRatesTable({ rows, onUpsert, onDelete, onReload }) {
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [newRow, setNewRow] = useState({
    id: "",
    name: "",
    section: "",
    origin: "",
    destination: "",
    route_label: "",
    ordinary_4_1: "",
    luxury_4_1: "",
    ordinary_6_1: "",
    luxury_6_1: "",
    traveller: "",
    vehicle_type: "",
    plate_number: "",
    capacity: "",
    vendor_mobile: "",
    additional_comments: "",
    price_dropped: false,
    price_drop_percent: "",
    hero_image: "",
    active: true,
    service_area_id: ""
  });

  const totalPages = Math.max(1, Math.ceil((rows || []).length / PAGE_SIZE));
  const pageRows = (rows || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateEdit = (id, key, value) => {
    setEdits((prev) => {
      const base = prev[id] || rows.find((r) => String(r.id) === String(id)) || {};
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const saveRow = async (row) => {
    const id = safeText(row?.id) || `cab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const origin = safeText(row?.origin || "").trim() || "Unknown";
    const destination = safeText(row?.destination || "").trim() || "Unknown";
    const fallbackRoute = safeText(row?.route_label || `${origin} to ${destination}`.trim()) || `${origin} to ${destination}`;
    const toNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const payload = {
      id,
      name: safeText(row?.name || fallbackRoute || ""),
      section: safeText(row?.section || "General"),
      origin,
      destination,
      route_label: fallbackRoute,
      ordinary_4_1: toNumber(row?.ordinary_4_1),
      luxury_4_1: toNumber(row?.luxury_4_1),
      ordinary_6_1: toNumber(row?.ordinary_6_1),
      luxury_6_1: toNumber(row?.luxury_6_1),
      traveller: toNumber(row?.traveller),
      vehicle_type: safeText(row?.vehicle_type || ""),
      plate_number: safeText(row?.plate_number || ""),
      capacity: toNumber(row?.capacity),
      vendor_mobile: safeText(row?.vendor_mobile || ""),
      additional_comments: safeText(row?.additional_comments || ""),
      price_dropped: row?.price_dropped === true,
      price_drop_percent: toNumber(row?.price_drop_percent),
      hero_image: safeText(row?.hero_image || ""),
      active: row?.active !== false,
      service_area_id: safeText(row?.service_area_id || "")
    };
    setBusyId(id);
    setError("");
    try {
      await onUpsert(TABLES.CAB_PROVIDERS, [payload]);
      if (onReload) await onReload();
      setEdits((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setNewRow({
        id: "",
        name: "",
        section: "",
        origin: "",
        destination: "",
        route_label: "",
        ordinary_4_1: "",
        luxury_4_1: "",
        ordinary_6_1: "",
        luxury_6_1: "",
        traveller: "",
        vehicle_type: "",
        plate_number: "",
        capacity: "",
        vendor_mobile: "",
        additional_comments: "",
        price_dropped: false,
        price_drop_percent: "",
        hero_image: "",
        active: true,
        service_area_id: ""
      });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  const deleteRow = async (id) => {
    const confirmText = window.prompt("Type DELETE to remove this cab rate");
    if (confirmText !== "DELETE") return;
    setBusyId(id);
    setError("");
    try {
      await onDelete(TABLES.CAB_PROVIDERS, id, "id", confirmText);
      if (onReload) await onReload();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="table-wrap mt-10">
      {error ? <div className="warn">{error}</div> : null}
      <table className="table menu-table">
        <thead>
          <tr>
            <th>Origin</th>
            <th>Destination</th>
            <th>Route</th>
            <th>Ord 4+1</th>
            <th>Lux 4+1</th>
            <th>Ord 6+1</th>
            <th>Lux 6+1</th>
            <th>Traveller</th>
            <th>Vehicle Type</th>
            <th>Capacity</th>
            <th>Vendor Mobile</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input className="input" value={newRow.origin} onChange={(e) => setNewRow((p) => ({ ...p, origin: e.target.value }))} placeholder="Origin" /></td>
            <td><input className="input" value={newRow.destination} onChange={(e) => setNewRow((p) => ({ ...p, destination: e.target.value }))} placeholder="Destination" /></td>
            <td><input className="input" value={newRow.route_label} onChange={(e) => setNewRow((p) => ({ ...p, route_label: e.target.value }))} placeholder="Route label" /></td>
            <td><input className="input" value={newRow.ordinary_4_1} onChange={(e) => setNewRow((p) => ({ ...p, ordinary_4_1: e.target.value }))} /></td>
            <td><input className="input" value={newRow.luxury_4_1} onChange={(e) => setNewRow((p) => ({ ...p, luxury_4_1: e.target.value }))} /></td>
            <td><input className="input" value={newRow.ordinary_6_1} onChange={(e) => setNewRow((p) => ({ ...p, ordinary_6_1: e.target.value }))} /></td>
            <td><input className="input" value={newRow.luxury_6_1} onChange={(e) => setNewRow((p) => ({ ...p, luxury_6_1: e.target.value }))} /></td>
            <td><input className="input" value={newRow.traveller} onChange={(e) => setNewRow((p) => ({ ...p, traveller: e.target.value }))} /></td>
            <td><input className="input" value={newRow.vehicle_type} onChange={(e) => setNewRow((p) => ({ ...p, vehicle_type: e.target.value }))} /></td>
            <td><input className="input" value={newRow.capacity} onChange={(e) => setNewRow((p) => ({ ...p, capacity: e.target.value }))} /></td>
            <td><input className="input" value={newRow.vendor_mobile} onChange={(e) => setNewRow((p) => ({ ...p, vendor_mobile: e.target.value }))} /></td>
            <td><input type="checkbox" checked={newRow.active !== false} onChange={(e) => setNewRow((p) => ({ ...p, active: e.target.checked }))} /></td>
            <td><button className="btn small primary" onClick={() => saveRow(newRow)} disabled={!!busyId}>Save</button></td>
          </tr>
          {pageRows.map((r) => {
            const edit = edits[r.id] || r;
            return (
              <tr key={safeText(r.id || "")}>
                <td><input className="input" value={safeText(edit.origin)} onChange={(e) => updateEdit(r.id, "origin", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.destination)} onChange={(e) => updateEdit(r.id, "destination", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.route_label)} onChange={(e) => updateEdit(r.id, "route_label", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.ordinary_4_1)} onChange={(e) => updateEdit(r.id, "ordinary_4_1", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.luxury_4_1)} onChange={(e) => updateEdit(r.id, "luxury_4_1", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.ordinary_6_1)} onChange={(e) => updateEdit(r.id, "ordinary_6_1", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.luxury_6_1)} onChange={(e) => updateEdit(r.id, "luxury_6_1", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.traveller)} onChange={(e) => updateEdit(r.id, "traveller", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.vehicle_type)} onChange={(e) => updateEdit(r.id, "vehicle_type", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.capacity)} onChange={(e) => updateEdit(r.id, "capacity", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.vendor_mobile)} onChange={(e) => updateEdit(r.id, "vendor_mobile", e.target.value)} /></td>
                <td><input type="checkbox" checked={edit.active !== false} onChange={(e) => updateEdit(r.id, "active", e.target.checked)} /></td>
                <td>
                  <div className="flex-gap6">
                    <button className="btn small primary" onClick={() => saveRow(edit)} disabled={busyId === r.id}>Save</button>
                    <button className="btn small danger" onClick={() => deleteRow(r.id)} disabled={busyId === r.id}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

function BusesTable({ rows, onUpsert, onDelete, onReload }) {
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [newRow, setNewRow] = useState({
    id: "",
    operator_name: "",
    from_city: "",
    to_city: "",
    departure_time: "",
    arrival_time: "",
    duration_text: "",
    bus_type: "Non AC",
    fare: "",
    total_seats: "",
    hero_image: "",
    active: true
  });

  const uploadBusImage = async (file, onDone) => {
    if (!file) return;
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "images/buses");
      const r = await fetch("/api/admin/upload-image", { method: "POST", credentials: "include", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "UPLOAD_FAILED");
      onDone(j.url || j.path || "");
    } catch (err) {
      setError(String(err?.message || err));
    }
  };

  const totalPages = Math.max(1, Math.ceil((rows || []).length / PAGE_SIZE));
  const pageRows = (rows || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateEdit = (id, key, value) => {
    setEdits((prev) => {
      const base = prev[id] || rows.find((r) => String(r.id) === String(id)) || {};
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const toNumber = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const saveRow = async (row) => {
    const id = safeText(row?.id) || `bus_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const payload = {
      id,
      operator_name: safeText(row?.operator_name || ""),
      operator_code: safeText(row?.operator_code || ""),
      from_city: safeText(row?.from_city || ""),
      from_code: safeText(row?.from_code || ""),
      to_city: safeText(row?.to_city || ""),
      to_code: safeText(row?.to_code || ""),
      departure_time: safeText(row?.departure_time || ""),
      arrival_time: safeText(row?.arrival_time || ""),
      duration_text: safeText(row?.duration_text || ""),
      bus_type: safeText(row?.bus_type || "Non AC"),
      fare: toNumber(row?.fare, 0),
      total_seats: toNumber(row?.total_seats, 20),
      seat_layout: row?.seat_layout || [],
      service_dates: row?.service_dates || [],
      seats_booked_by_date: row?.seats_booked_by_date || {},
      hero_image: safeText(row?.hero_image || ""),
      active: row?.active !== false
    };
    setBusyId(id);
    setError("");
    try {
      await onUpsert(TABLES.BUSES, [payload]);
      if (onReload) await onReload();
      setEdits((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setNewRow({
        id: "",
        operator_name: "",
        from_city: "",
        to_city: "",
        departure_time: "",
        arrival_time: "",
        duration_text: "",
        bus_type: "Non AC",
        fare: "",
        total_seats: "",
        hero_image: "",
        active: true
      });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  const deleteRow = async (id) => {
    const confirmText = window.prompt("Type DELETE to remove this bus route");
    if (confirmText !== "DELETE") return;
    setBusyId(id);
    setError("");
    try {
      await onDelete(TABLES.BUSES, id, "id", confirmText);
      if (onReload) await onReload();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="table-wrap mt-10">
      {error ? <div className="warn">{error}</div> : null}
      <table className="table menu-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Operator</th>
            <th>From</th>
            <th>To</th>
            <th>Departure</th>
            <th>Arrival</th>
            <th>Duration</th>
            <th>Type</th>
            <th>Fare</th>
            <th>Seats</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="thumb-cell">
              {newRow.hero_image ? <img className="thumb" src={newRow.hero_image} alt="" /> : null}
              <label className="btn small pointer mt-4">
                Upload
                <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadBusImage(e.target.files?.[0], (url) => setNewRow((p) => ({ ...p, hero_image: url })))} />
              </label>
            </td>
            <td><input className="input" value={newRow.operator_name} onChange={(e) => setNewRow((p) => ({ ...p, operator_name: e.target.value }))} placeholder="Operator" /></td>
            <td><input className="input" value={newRow.from_city} onChange={(e) => setNewRow((p) => ({ ...p, from_city: e.target.value }))} placeholder="From" /></td>
            <td><input className="input" value={newRow.to_city} onChange={(e) => setNewRow((p) => ({ ...p, to_city: e.target.value }))} placeholder="To" /></td>
            <td><input className="input" value={newRow.departure_time} onChange={(e) => setNewRow((p) => ({ ...p, departure_time: e.target.value }))} placeholder="06:30" /></td>
            <td><input className="input" value={newRow.arrival_time} onChange={(e) => setNewRow((p) => ({ ...p, arrival_time: e.target.value }))} placeholder="12:30" /></td>
            <td><input className="input" value={newRow.duration_text} onChange={(e) => setNewRow((p) => ({ ...p, duration_text: e.target.value }))} placeholder="6h" /></td>
            <td><input className="input" value={newRow.bus_type} onChange={(e) => setNewRow((p) => ({ ...p, bus_type: e.target.value }))} placeholder="Non AC" /></td>
            <td><input className="input" value={newRow.fare} onChange={(e) => setNewRow((p) => ({ ...p, fare: e.target.value }))} placeholder="0" /></td>
            <td><input className="input" value={newRow.total_seats} onChange={(e) => setNewRow((p) => ({ ...p, total_seats: e.target.value }))} placeholder="20" /></td>
            <td><input type="checkbox" checked={newRow.active !== false} onChange={(e) => setNewRow((p) => ({ ...p, active: e.target.checked }))} /></td>
            <td><button className="btn small primary" onClick={() => saveRow(newRow)} disabled={!!busyId}>Save</button></td>
          </tr>
          {pageRows.map((r) => {
            const edit = edits[r.id] || r;
            return (
              <tr key={safeText(r.id || "")}>
                <td className="thumb-cell">
                  {edit.hero_image ? <img className="thumb" src={edit.hero_image} alt="" /> : null}
                  <label className="btn small pointer mt-4">
                    Upload
                    <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadBusImage(e.target.files?.[0], (url) => updateEdit(r.id, "hero_image", url))} />
                  </label>
                </td>
                <td><input className="input" value={safeText(edit.operator_name)} onChange={(e) => updateEdit(r.id, "operator_name", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.from_city)} onChange={(e) => updateEdit(r.id, "from_city", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.to_city)} onChange={(e) => updateEdit(r.id, "to_city", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.departure_time)} onChange={(e) => updateEdit(r.id, "departure_time", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.arrival_time)} onChange={(e) => updateEdit(r.id, "arrival_time", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.duration_text)} onChange={(e) => updateEdit(r.id, "duration_text", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.bus_type)} onChange={(e) => updateEdit(r.id, "bus_type", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.fare)} onChange={(e) => updateEdit(r.id, "fare", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.total_seats)} onChange={(e) => updateEdit(r.id, "total_seats", e.target.value)} /></td>
                <td><input type="checkbox" checked={edit.active !== false} onChange={(e) => updateEdit(r.id, "active", e.target.checked)} /></td>
                <td>
                  <div className="flex-gap6">
                    <button className="btn small primary" onClick={() => saveRow(edit)} disabled={busyId === r.id}>Save</button>
                    <button className="btn small danger" onClick={() => deleteRow(r.id)} disabled={busyId === r.id}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

function BikeRentalsTable({ rows, onUpsert, onDelete, onReload }) {
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [newRow, setNewRow] = useState({
    id: "",
    name: "",
    category: "",
    bike_model: "",
    max_days: "",
    availability_rates: "",
    vendor_details: "",
    pricing: "",
    available: true
  });

  const totalPages = Math.max(1, Math.ceil((rows || []).length / PAGE_SIZE));
  const pageRows = (rows || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateEdit = (id, key, value) => {
    setEdits((prev) => {
      const base = prev[id] || rows.find((r) => String(r.id) === String(id)) || {};
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const saveRow = async (row) => {
    const id = safeText(row?.id) || `bike_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const payload = {
      id,
      name: safeText(row?.name || ""),
      category: safeText(row?.category || ""),
      bike_model: safeText(row?.bike_model || ""),
      max_days: Number(row?.max_days || 0) || 0,
      availability_rates: safeText(row?.availability_rates || ""),
      vendor_details: safeText(row?.vendor_details || ""),
      pricing: safeText(row?.pricing || ""),
      available: row?.available !== false
    };
    setBusyId(id);
    try {
      await onUpsert(TABLES.BIKE_RENTALS, [payload]);
      setEdits((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setNewRow({
        id: "",
        name: "",
        category: "",
        bike_model: "",
        max_days: "",
        availability_rates: "",
        vendor_details: "",
        pricing: "",
        available: true
      });
    } finally {
      setBusyId("");
    }
  };

  const deleteRow = async (id) => {
    const confirmText = window.prompt("Type DELETE to remove this rental");
    if (confirmText !== "DELETE") return;
    setBusyId(id);
    try {
      await onDelete(TABLES.BIKE_RENTALS, id, "id", confirmText);
      if (onReload) await onReload();
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="table-wrap mt-10">
      {error ? <div className="warn">{error}</div> : null}
      <table className="table menu-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Bike Model</th>
            <th>Max Days</th>
            <th>Availability Rates</th>
            <th>Pricing</th>
            <th>Vendor Details</th>
            <th>Available</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input className="input" value={newRow.name} onChange={(e) => setNewRow((p) => ({ ...p, name: e.target.value }))} placeholder="Name" /></td>
            <td><input className="input" value={newRow.category} onChange={(e) => setNewRow((p) => ({ ...p, category: e.target.value }))} placeholder="Category" /></td>
            <td><input className="input" value={newRow.bike_model} onChange={(e) => setNewRow((p) => ({ ...p, bike_model: e.target.value }))} placeholder="Model" /></td>
            <td><input className="input" value={newRow.max_days} onChange={(e) => setNewRow((p) => ({ ...p, max_days: e.target.value }))} placeholder="0" /></td>
            <td><input className="input" value={newRow.availability_rates} onChange={(e) => setNewRow((p) => ({ ...p, availability_rates: e.target.value }))} placeholder="₹1200/day" /></td>
            <td><input className="input" value={newRow.pricing} onChange={(e) => setNewRow((p) => ({ ...p, pricing: e.target.value }))} placeholder="₹1200/day" /></td>
            <td><input className="input" value={newRow.vendor_details} onChange={(e) => setNewRow((p) => ({ ...p, vendor_details: e.target.value }))} placeholder="Vendor details" /></td>
            <td><input type="checkbox" checked={newRow.available !== false} onChange={(e) => setNewRow((p) => ({ ...p, available: e.target.checked }))} /></td>
            <td><button className="btn small primary" onClick={() => saveRow(newRow)} disabled={!!busyId}>Save</button></td>
          </tr>
          {pageRows.map((r) => {
            const edit = edits[r.id] || r;
            return (
              <tr key={safeText(r.id || "")}>
                <td><input className="input" value={safeText(edit.name)} onChange={(e) => updateEdit(r.id, "name", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.category)} onChange={(e) => updateEdit(r.id, "category", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.bike_model)} onChange={(e) => updateEdit(r.id, "bike_model", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.max_days)} onChange={(e) => updateEdit(r.id, "max_days", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.availability_rates)} onChange={(e) => updateEdit(r.id, "availability_rates", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.pricing)} onChange={(e) => updateEdit(r.id, "pricing", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.vendor_details)} onChange={(e) => updateEdit(r.id, "vendor_details", e.target.value)} /></td>
                <td><input type="checkbox" checked={edit.available !== false} onChange={(e) => updateEdit(r.id, "available", e.target.checked)} /></td>
                <td>
                  <div className="flex-gap6">
                    <button className="btn small primary" onClick={() => saveRow(edit)} disabled={busyId === r.id}>Save</button>
                    <button className="btn small danger" onClick={() => deleteRow(r.id)} disabled={busyId === r.id}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

function ObjectListEditor({ title, items, onChange, fields, addLabel = "Add Item" }) {
  const list = Array.isArray(items) ? items : [];
  const updateItem = (idx, key, value) => {
    onChange(list.map((item, i) => (i === idx ? { ...(item || {}), [key]: value } : item)));
  };
  const removeAt = (idx) => onChange(list.filter((_, i) => i !== idx));
  const addNew = () => {
    const blank = {};
    fields.forEach((f) => {
      blank[f.key] = f.type === "number" ? null : "";
    });
    onChange([...(list || []), blank]);
  };

  return (
    <div className="field full">
      <label>{title}</label>
      <div className="obj-grid">
        {list.map((item, idx) => (
          <div key={`${title}-${idx}`} className="obj-card">
            <div className="obj-head">
              <span>{title} #{idx + 1}</span>
              <button type="button" className="btn small danger" onClick={() => removeAt(idx)}>Remove</button>
            </div>
            {fields.map((f) => (
              <div key={f.key} className="field">
                <label>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    className="textarea gallery-textarea"
                    value={safeText(item?.[f.key])}
                    onChange={(e) => updateItem(idx, f.key, e.target.value)}
                    placeholder={f.placeholder || ""}
                  />
                ) : (
                  <input
                    className="input"
                    type={f.type === "number" ? "number" : "text"}
                    value={safeText(item?.[f.key])}
                    onChange={(e) => updateItem(idx, f.key, f.type === "number" ? Number(e.target.value || 0) : e.target.value)}
                    placeholder={f.placeholder || ""}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-8">
        <button type="button" className="btn small" onClick={addNew}><FaPlus /> {addLabel}</button>
      </div>
    </div>
  );
}

function extractImageUrlsFromRow(row) {
  if (!row || typeof row !== "object") return [];
  const urls = [];
  const take = (u) => {
    if (!u) return;
    if (Array.isArray(u)) { u.forEach(take); return; }
    if (typeof u === "object") {
      const cand = u.url || u.src || u.image || u.heroImage || u.hero_image;
      if (cand) take(cand);
      return;
    }
    urls.push(String(u));
  };

  const candidates = [
    row.hero_image, row.heroImage,
    row.image, row.main_image, row.mainImage,
    row.aadhaar_url, row.aadhaarUrl,
    row.avatar_url, row.avatarUrl,
    row.images, row.image_urls, row.imageUrls,
    row.image_meta, row.imageMeta
  ];

  candidates.forEach((c) => {
    if (typeof c === "string") {
      const parsed = safeJsonParse(c);
      if (parsed) take(parsed);
      else take(c);
    } else {
      take(c);
    }
  });

  return uniqStrings(urls);
}

function keyColumnForTable(table) {
  const cols = (table?.columns || []).map((c) => c.name);
  const preferred = ["id", "code", "slug", "restaurant_id"];
  for (const p of preferred) if (cols.includes(p)) return p;
  return cols[0] || "id";
}

function makeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isLikelyCottage(row) {
  if (!row || typeof row !== "object") return false;
  const id = safeText(row.id).trim().toLowerCase();
  if (id.startsWith("cottage_")) return true;
  if (id.startsWith("hotel_")) return false;
  const name = safeText(row.name).trim().toLowerCase();
  const desc = safeText(row.description).trim().toLowerCase();
  if (name.includes("cottage") || desc.includes("cottage")) return true;
  const kind = safeText(row.property_type || row.propertyType || row.kind || row.type).trim().toLowerCase();
  if (kind === "cottage" || kind === "cottages") return true;
  return false;
}

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: FaHome },
  { key: "explorevalley", label: "ExploreValley", icon: FaFileAlt },
  { key: "tours", label: "Tours", icon: FaMapMarkerAlt },
  { key: "hotels", label: "Hotels", icon: FaHotel },
  { key: "cottages", label: "Cottages", icon: FaBed },
  { key: "food_vendors", label: "Food Vendors", icon: FaUtensils },
  { key: "mart_catalog", label: "Marts & Products", icon: FaStore },
  { key: "cab_providers", label: "Cab Providers", icon: FaCar },
  { key: "bike_rentals", label: "Bike Rentals", icon: FaMotorcycle },
  { key: "buses", label: "Buses", icon: FaBus },
  { key: "orders", label: "Orders", icon: FaStore },
  { key: "delivery", label: "Delivery", icon: FaTruck },
  { key: "customers", label: "Customers", icon: FaUsers },
  { key: "ai_support", label: "AI Support", icon: FaRobot },
  { key: "refunds", label: "Refunds", icon: FaUndoAlt },
  { key: "notifications", label: "Notifications", icon: FaEnvelope },
  { key: "tracking", label: "Tracking", icon: FaShieldAlt },
  { key: "analytics", label: "Analytics", icon: FaChartLine },
  { key: "settings", label: "Settings", icon: FaCog }
];

const PAGE_TABLES = {
  explorevalley: [TABLES.FESTIVALS],
  tours: [TABLES.TOURS],
  hotels: [TABLES.HOTELS],
  cottages: [TABLES.HOTELS],
  food_vendors: [TABLES.RESTAURANTS, TABLES.MENU_ITEMS],
  mart_catalog: [TABLES.MARTS, TABLES.PRODUCTS],
  cab_providers: [TABLES.CAB_PROVIDERS],
  bike_rentals: [TABLES.BIKE_RENTALS],
  buses: [TABLES.BUSES, TABLES.BUS_BOOKINGS],
  orders: [TABLES.BOOKINGS, TABLES.CAB_BOOKINGS, TABLES.BUS_BOOKINGS, TABLES.FOOD_ORDERS],
  delivery: [TABLES.DELIVERY_TRACKING, TABLES.VENDOR_MESSAGES],
  customers: [TABLES.USER_PROFILES, TABLES.USER_BEHAVIOR_PROFILES],
  ai_support: [TABLES.AI_CONVERSATIONS, TABLES.TELEGRAM_MESSAGES],
  refunds: [TABLES.REFUNDS],
  notifications: [TABLES.EMAIL_NOTIFICATIONS],
  tracking: [TABLES.ANALYTICS_EVENTS],
  analytics: [TABLES.ANALYTICS_EVENTS],
  settings: [TABLES.SITE_PAGES, TABLES.SETTINGS, TABLES.PAYMENTS, TABLES.POLICIES]
};

const PAGE_TITLE = {
  dashboard: "Dashboard",
  explorevalley: "ExploreValley",
  tours: "Tours",
  hotels: "Hotels",
  cottages: "Cottages",
  food_vendors: "Food Vendors",
  mart_catalog: "Marts & Products",
  cab_providers: "Cab Providers",
  bike_rentals: "Bike Rentals",
  buses: "Buses",
  orders: "Orders",
  delivery: "Delivery Management",
  customers: "Customers",
  ai_support: "AI Support",
  refunds: "Refunds",
  notifications: "Notifications",
  tracking: "Tracking",
  analytics: "Analytics",
  settings: "Settings"
};

function EnquiriesWorkspace({ table, onReload, onOpenImages, onUpsert }) {
  const [filter, setFilter] = useState("pending");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const rows = Array.isArray(table?.rows) ? table.rows : [];

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => String(r?.status || "pending") === filter);
  }, [rows, filter]);

  const selected = useMemo(() => {
    if (!filtered.length) return null;
    if (!selectedId) return filtered[0];
    return filtered.find((r) => String(r?.id || "") === selectedId) || filtered[0];
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft("");
      return;
    }
    setSelectedId(String(selected.id || ""));
    setDraft(String(selected.response || ""));
  }, [selected?.id]);

  const saveResponse = async (status) => {
    if (!selected) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await onUpsert(TABLES.QUERIES, [{
        ...selected,
        response: draft ? String(draft) : null,
        responded_at: draft ? now : (selected.responded_at || null),
        status: status || (draft ? "resolved" : (selected.status || "pending"))
      }]);
      await onReload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="split">
      <div className="split-left">
        <div className="toolbar">
          <div className="seg">
            {["pending", "resolved", "spam", "all"].map((k) => (
              <button key={k} className={`btn small ${filter === k ? "primary" : "ghost"}`} onClick={() => setFilter(k)}>
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="list">
          {filtered.length ? filtered.map((q) => (
            <button
              key={q.id}
              className={`list-item ${String(q.id) === String(selected?.id) ? "active" : ""}`}
              onClick={() => setSelectedId(String(q.id || ""))}
            >
              <div className="list-title">{safeText(q.subject || "Enquiry")}</div>
              <div className="small">{displayText(q.user_name || q.userName)} • {displayText(q.email)} • {displayText(q.phone)}</div>
              <div className={`badge ${String(q.status || "pending") === "pending" ? "warn" : "green"}`}>{safeText(q.status || "pending")}</div>
            </button>
          )) : (
            <div className="small small pad-12">No enquiries.</div>
          )}
        </div>
      </div>

      <div className="split-right">
        {!selected ? (
          <div className="card"><div className="small">No enquiry selected.</div></div>
        ) : (
          <div className="card">
            <div className="row">
              <h3 className="m-0">{safeText(selected.subject || "Enquiry")}</h3>
              <div className="mini-row">
                <button className="btn small ghost" onClick={() => {
                  const urls = extractImageUrlsFromRow(selected);
                  if (urls.length) onOpenImages("Enquiry Attachments", urls, 0);
                }}>Images</button>
                <button className="btn small primary" disabled={saving} onClick={() => saveResponse("resolved")}>Save + Resolve</button>
                <button className="btn small ghost" disabled={saving} onClick={() => saveResponse("spam")}>Mark Spam</button>
              </div>
            </div>
            <div className="small mt-8">
              From: <b>{displayText(selected.user_name || selected.userName)}</b> ({displayText(selected.email)}) • {displayText(selected.phone)}
            </div>
            <div className="small mt-6">
              Submitted: {displayText(selected.submitted_at || selected.submittedAt || "")}
            </div>
            <div className="field mt-12">
              <label>Message</label>
              <div className="readonly">{safeText(selected.message)}</div>
            </div>
            <div className="field">
              <label>Response</label>
              <textarea className="input" rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your response..." />
            </div>
            <div className="small">
              Responded at: {displayText(selected.responded_at || selected.respondedAt || "", "not yet")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function http(path, init) {
  const r = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init
  });
  let payload = null;
  try {
    payload = await r.json();
  } catch {
    payload = null;
  }
  if (!r.ok) {
    const message = payload?.message || payload?.error || `HTTP_${r.status}`;
    throw new Error(message);
  }
  return payload;
}

function ImageLightbox({ title, urls, index, onClose, onPick }) {
  if (!urls?.length) return null;
  const i = Math.max(0, Math.min(urls.length - 1, index || 0));
  const active = urls[i];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title || "Images"}</div>
          <button className="btn small" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">
          <img className="modal-img" src={active} alt="" />
        </div>
        <div className="modal-foot">
          <div className="small">{i + 1} / {urls.length}</div>
          <div className="mini-row">
            {urls.slice(0, 16).map((u, idx) => (
              <img
                key={u}
                className={`mini ${idx === i ? "active" : ""}`}
                src={u}
                alt=""
                onClick={() => onPick(idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function statCard(label, count, tag) {
  return (
    <div className="stat" key={label}>
      <h4>{label}</h4>
      <div className="num">{count}</div>
      <div className={`badge ${tag === "live" ? "green" : "warn"}`}>{tag === "live" ? "Live" : "Catalog"}</div>
    </div>
  );
}

function LoginView({ onSuccess }) {
  const [adminKey, setAdminKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(false);
  const [googleVerified, setGoogleVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [googleConfig, setGoogleConfig] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const cfg = await http("/api/admin/google/config");
        setGoogleConfig(cfg);
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, []);

  useEffect(() => {
    const rawHash = String(window.location.hash || "").replace(/^#/, "");
    if (!rawHash) return;
    const params = new URLSearchParams(rawHash);
    const accessToken = params.get("access_token") || "";
    if (!accessToken) return;

    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    setCheckingGoogle(true);
    setError("");
    http("/api/admin/google/verify", {
      method: "POST",
      body: JSON.stringify({ supabaseAccessToken: accessToken })
    }).then((payload) => {
      setGoogleVerified(true);
      setVerifiedEmail(String(payload?.email || ""));
    }).catch((e) => {
      setError(String(e.message || e));
    }).finally(() => {
      setCheckingGoogle(false);
    });
  }, []);

  const startGoogleSignIn = () => {
    if (!googleConfig?.supabaseUrl) return;
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const url =
      `${googleConfig.supabaseUrl}/auth/v1/authorize` +
      `?provider=google&redirect_to=${encodeURIComponent(redirectTo)}` +
      `&prompt=select_account&scopes=${encodeURIComponent("email profile")}`;
    window.location.assign(url);
  };

  const unlockWithAdminKey = async () => {
    setBusy(true);
    setError("");
    try {
      await http("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ adminKey })
      });
      onSuccess();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="page-title"><FaShieldAlt /> ExploreValley Admin</h1>
        <div className="small">Secure session - IP and browser bound</div>
        <button className="btn" disabled={!googleConfig || checkingGoogle} onClick={startGoogleSignIn}>
          <FaGoogle /> {checkingGoogle ? "Verifying Google..." : (googleVerified ? "Google Verified" : "Continue with Google")}
        </button>
        {googleVerified ? <div className="badge green">Verified as {verifiedEmail || "allowed admin"}</div> : null}
        <div className="field">
          <label>Admin Dashboard Key</label>
          <input className="input" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Enter ADMIN_DASHBOARD_KEY" />
        </div>
        {error ? <div className="warn">{error}</div> : null}
        <button className="btn primary" disabled={busy || !adminKey || !googleVerified} onClick={unlockWithAdminKey}>
          <FaSignInAlt /> {busy ? "Unlocking..." : "Unlock Dashboard"}
        </button>
      </div>
    </div>
  );
}

function DashboardView({ snapshot, tablesByName, onReload, onOpenImages, onUpsert }) {
  const [dashTab, setDashTab] = useState("bookings");
  const [ordersTab, setOrdersTab] = useState("bookings");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [dashPage, setDashPage] = useState(1);
  const [dashSection, setDashSection] = useState("live");

  useEffect(() => {
    setDashPage(1);
  }, [dashTab, ordersTab, bookingSearch, bookingStatus, dashSection]);

  const enquiriesTable = tablesByName.get(TABLES.QUERIES);
  const bookingsRows = (tablesByName.get(TABLES.BOOKINGS)?.rows || []);
  const cabBookingRows = (tablesByName.get(TABLES.CAB_BOOKINGS)?.rows || []);
  const foodOrderRows = (tablesByName.get(TABLES.FOOD_ORDERS)?.rows || []);
  const toursRows = (tablesByName.get(TABLES.TOURS)?.rows || []);
  const busBookingRows = (tablesByName.get(TABLES.BUS_BOOKINGS)?.rows || []);

  const filteredBookings = useMemo(() => {
    const q = safeText(bookingSearch).trim().toLowerCase();
    const status = safeText(bookingStatus).trim().toLowerCase();
    const rows = Array.isArray(bookingsRows) ? bookingsRows : [];
    return rows
      .filter((b) => status === "all" ? true : safeText(b?.status).toLowerCase() === status)
      .filter((b) => q ? JSON.stringify(b).toLowerCase().includes(q) : true);
  }, [bookingsRows, bookingSearch, bookingStatus]);

  const statCards = [
    { label: "Bookings", count: (tablesByName.get(TABLES.BOOKINGS)?.rowCount) || 0, tag: "live" },
    { label: "Cab Bookings", count: (tablesByName.get(TABLES.CAB_BOOKINGS)?.rowCount) || 0, tag: "live" },
    { label: "Food Orders", count: (tablesByName.get(TABLES.FOOD_ORDERS)?.rowCount) || 0, tag: "live" },
    { label: "Enquiries", count: (tablesByName.get(TABLES.QUERIES)?.rowCount) || 0, tag: "live" },
    { label: "Tours", count: (tablesByName.get(TABLES.TOURS)?.rowCount) || 0, tag: "catalog" },
    { label: "Hotels", count: (tablesByName.get(TABLES.HOTELS)?.rowCount) || 0, tag: "catalog" },
    { label: "Food Vendors", count: (tablesByName.get(TABLES.RESTAURANTS)?.rowCount) || 0, tag: "catalog" }
  ];

  const renderSimpleTable = (rows, cols, emptyText) => {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return <div className="small pad-10">{emptyText || "No data yet."}</div>;
    const head = cols.map((c) => c.key);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const start = (dashPage - 1) * PAGE_SIZE;
    const pageRows = list.slice(start, start + PAGE_SIZE);
    return (
      <div className="table-wrap mt-10">
        <table className="table">
          <thead>
            <tr>
              {head.map((k) => <th key={k}>{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, idx) => (
              <tr key={safeText(r?.id || idx)}>
                {cols.map((c) => {
                  const val = c.value(r);
                  if (c.kind === "img") {
                    const urls = Array.isArray(val) ? val : (val ? [val] : []);
                    return (
                      <td key={c.key} className="thumb-cell">
                        {urls[0] ? <img className="thumb" src={urls[0]} alt="" onClick={() => onOpenImages(c.key, urls, 0)} /> : null}
                      </td>
                    );
                  }
                  return <td key={c.key}>{displayText(val).slice(0, 120)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={dashPage} totalPages={totalPages} onChange={setDashPage} />
      </div>
    );
  };

  return (
    <>
      <div className="card">
        <h2 className="mt-0">Welcome back</h2>
        <div className="small">Everything below is loaded directly from Supabase tables and fields.</div>
        <div className="stat-grid mt-12">
          {statCards.map((x) => statCard(x.label, x.count, x.tag))}
        </div>
      </div>

      <div className="dash-nav">
        <button className={`tab ${dashSection === "live" ? "active" : ""}`} onClick={() => setDashSection("live")}><FaClipboardList /> Live Queue</button>
        <button className={`tab ${dashSection === "pricing" ? "active" : ""}`} onClick={() => setDashSection("pricing")}><FaChartLine /> Pricing Controls</button>
        <button className={`tab ${dashSection === "orders" ? "active" : ""}`} onClick={() => setDashSection("orders")}><FaStore /> Orders</button>
        <button className={`tab ${dashSection === "refunds" ? "active" : ""}`} onClick={() => setDashSection("refunds")}><FaUndoAlt /> Refunds</button>
        <button className={`tab ${dashSection === "notifications" ? "active" : ""}`} onClick={() => setDashSection("notifications")}><FaEnvelope /> Notifications</button>
      </div>

      {dashSection === "pricing" ? (
        <PricingControlsWorkspace
          snapshot={snapshot}
          onReload={onReload}
          onUpsert={onUpsert}
        />
      ) : null}

      {dashSection === "live" ? (
      <div className="card">
        <div className="row mb-8">
          <h3 className="m-0">Live Queue</h3>
          <button className="btn small" onClick={onReload}><FaRedo /> Reload</button>
        </div>
        <div className="tabs mt-8">
          <button className={`tab ${dashTab === "bookings" ? "active" : ""}`} onClick={() => setDashTab("bookings")}><FaClipboardList />Travel Bookings</button>
          <button className={`tab ${dashTab === "food" ? "active" : ""}`} onClick={() => setDashTab("food")}><FaStore /> Food Orders</button>
          <button className={`tab ${dashTab === "cab" ? "active" : ""}`} onClick={() => setDashTab("cab")}><FaCar /> Cab Bookings</button>
          <button className={`tab ${dashTab === "tours" ? "active" : ""}`} onClick={() => setDashTab("tours")}><FaMapMarkerAlt /> Tours</button>
          <button className={`tab ${dashTab === "enquiries" ? "active" : ""}`} onClick={() => setDashTab("enquiries")}><FaEnvelopeOpenText /> Enquiries</button>
        </div>

        {dashTab === "bookings" ? (
          <>
            <div className="filters mt-10">
              <div className="pos-rel">
                <FaSearch className="search-icon" />
                <input className="input input-search" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Search bookings..." />
              </div>
              <select className="input" value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                {["all", "pending", "confirmed", "cancelled", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="badge">{filteredBookings.length} rows</div>
            </div>
            <div className="table-wrap mt-10">
              <BookingsTable
                rows={filteredBookings.slice((dashPage - 1) * PAGE_SIZE, dashPage * PAGE_SIZE)}
                onOpenRow={() => {}}
                onOpenImages={onOpenImages}
                onUpsert={onUpsert}
                onReload={onReload}
              />
              <Pagination page={dashPage} totalPages={Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE))} onChange={setDashPage} />
            </div>
          </>
        ) : null}

        {dashTab === "food" ? (
          <>
            <div className="small mt-10">Latest food orders</div>
            {renderSimpleTable(
              foodOrderRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "status", value: (r) => r?.status },
                { key: "name", value: (r) => r?.user_name || r?.userName },
                { key: "phone", value: (r) => r?.phone },
                { key: "restaurant_id", value: (r) => r?.restaurant_id || r?.restaurantId },
                { key: "total", value: (r) => r?.pricing?.totalAmount ?? r?.pricing?.total_amount ?? "" },
                { key: "order_time", value: (r) => r?.order_time || r?.orderTime }
              ],
              "No food orders yet. Place an order from the frontend to see it here."
            )}
          </>
        ) : null}

        {dashTab === "cab" ? (
          <>
            <div className="small mt-10">Latest cab bookings</div>
            {renderSimpleTable(
              cabBookingRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "status", value: (r) => r?.status },
                { key: "name", value: (r) => r?.user_name || r?.userName },
                { key: "phone", value: (r) => r?.phone },
                { key: "pickup", value: (r) => r?.pickup_location || r?.pickupLocation },
                { key: "drop", value: (r) => r?.drop_location || r?.dropLocation },
                { key: "datetime", value: (r) => r?.datetime },
                { key: "fare", value: (r) => r?.estimated_fare ?? r?.estimatedFare ?? "" }
              ],
              "No cab bookings yet. Add cab providers + book from frontend to see it here."
            )}
          </>
        ) : null}

        {dashTab === "tours" ? (
          <>
            <div className="small mt-10">Tours catalog</div>
            {renderSimpleTable(
              toursRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "image", kind: "img", value: (r) => r?.hero_image || (Array.isArray(r?.images) ? r.images[0] : "") },
                { key: "title", value: (r) => r?.title },
                { key: "price", value: (r) => r?.price },
                { key: "available", value: (r) => r?.available }
              ],
              "No tours yet. Add tours from Admin: Tours section."
            )}
          </>
        ) : null}

        {dashTab === "enquiries" ? (
          <div className="mt-10">
            <EnquiriesWorkspace
              table={enquiriesTable}
              onReload={onReload}
              onOpenImages={onOpenImages}
              onUpsert={onUpsert}
            />
          </div>
        ) : null}
      </div>
      ) : null}

      {dashSection === "orders" ? (
        <div className="card">
          <div className="row mb-8">
            <h3 className="m-0">Orders</h3>
            <button className="btn small" onClick={onReload}><FaRedo /> Reload</button>
          </div>
          <div className="tabs mt-8">
            <button className={`tab ${ordersTab === "bookings" ? "active" : ""}`} onClick={() => setOrdersTab("bookings")}><FaClipboardList /> Hotel Bookings</button>
            <button className={`tab ${ordersTab === "food" ? "active" : ""}`} onClick={() => setOrdersTab("food")}><FaStore /> Food Orders</button>
            <button className={`tab ${ordersTab === "cab" ? "active" : ""}`} onClick={() => setOrdersTab("cab")}><FaCar /> Cab Bookings</button>
            <button className={`tab ${ordersTab === "bus" ? "active" : ""}`} onClick={() => setOrdersTab("bus")}><FaBus /> Bus Bookings</button>
          </div>

          {ordersTab === "bookings" ? (
            <>
              <div className="filters mt-10">
                <div className="pos-rel">
                  <FaSearch className="search-icon" />
                  <input className="input input-search" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Search bookings..." />
                </div>
                <select className="input" value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                  {["all", "pending", "confirmed", "cancelled", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="badge">{filteredBookings.length} rows</div>
              </div>
              <div className="table-wrap mt-10">
                <BookingsTable
                  rows={filteredBookings.slice((dashPage - 1) * PAGE_SIZE, dashPage * PAGE_SIZE)}
                  onOpenRow={() => {}}
                  onOpenImages={onOpenImages}
                  onUpsert={onUpsert}
                  onReload={onReload}
                />
                <Pagination page={dashPage} totalPages={Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE))} onChange={setDashPage} />
              </div>
            </>
          ) : null}

          {ordersTab === "food" ? (
            <>
              <div className="small mt-10">Latest food orders</div>
              {renderSimpleTable(
                foodOrderRows,
                [
                  { key: "id", value: (r) => r?.id },
                  { key: "status", value: (r) => r?.status },
                  { key: "name", value: (r) => r?.user_name || r?.userName },
                  { key: "phone", value: (r) => r?.phone },
                  { key: "restaurant_id", value: (r) => r?.restaurant_id || r?.restaurantId },
                  { key: "total", value: (r) => r?.pricing?.totalAmount ?? r?.pricing?.total_amount ?? "" },
                  { key: "order_time", value: (r) => r?.order_time || r?.orderTime }
                ],
                "No food orders yet."
              )}
            </>
          ) : null}

          {ordersTab === "cab" ? (
            <>
              <div className="small mt-10">Latest cab bookings</div>
              {renderSimpleTable(
                cabBookingRows,
                [
                  { key: "id", value: (r) => r?.id },
                  { key: "status", value: (r) => r?.status },
                  { key: "name", value: (r) => r?.user_name || r?.userName },
                  { key: "phone", value: (r) => r?.phone },
                  { key: "pickup", value: (r) => r?.pickup_location || r?.pickupLocation },
                  { key: "drop", value: (r) => r?.drop_location || r?.dropLocation },
                  { key: "datetime", value: (r) => r?.datetime },
                  { key: "fare", value: (r) => r?.estimated_fare ?? r?.estimatedFare ?? "" }
                ],
                "No cab bookings yet."
              )}
            </>
          ) : null}

          {ordersTab === "bus" ? (
            <>
              <div className="small mt-10">Latest bus bookings</div>
              {renderSimpleTable(
                busBookingRows,
                [
                  { key: "id", value: (r) => r?.id },
                  { key: "status", value: (r) => r?.status },
                  { key: "name", value: (r) => r?.user_name || r?.userName },
                  { key: "phone", value: (r) => r?.phone },
                  { key: "from", value: (r) => r?.from_city || r?.fromCity },
                  { key: "to", value: (r) => r?.to_city || r?.toCity },
                  { key: "travel_date", value: (r) => r?.travel_date || r?.travelDate },
                  { key: "total_fare", value: (r) => r?.total_fare ?? r?.totalFare ?? "" }
                ],
                "No bus bookings yet."
              )}
            </>
          ) : null}
        </div>
      ) : null}

      {dashSection === "refunds" ? (
        <RefundsWorkspace snapshot={snapshot} onReload={onReload} />
      ) : null}

      {dashSection === "notifications" ? (
        <NotificationsWorkspace snapshot={snapshot} />
      ) : null}
    </>
  );
}

function normalizePhone(phone) {
  const raw = safeText(phone);
  const digits = raw.replace(/\\D+/g, "");
  return digits || raw.toLowerCase();
}

function normalizeEmail(email) {
  return safeText(email).toLowerCase();
}

function normalizeIp(ip) {
  return safeText(ip).toLowerCase();
}

function userIdFromPhone(phone) {
  const key = normalizePhone(phone);
  return `user_${key || "unknown"}`;
}

function userIdFromEmail(email) {
  const key = normalizeEmail(email);
  return `user_${key || "unknown"}`;
}

function userIdFromIp(ip) {
  const key = normalizeIp(ip);
  return `user_${key || "unknown"}`;
}

function uniqList(list) {
  const out = [];
  const seen = new Set();
  (list || []).forEach((x) => {
    const s = safeText(x);
    if (!s) return;
    if (seen.has(s)) return;
    seen.add(s);
    out.push(s);
  });
  return out;
}

function CustomersWorkspace({ snapshot }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const profiles = useMemo(() => (byName.get(TABLES.USER_PROFILES)?.rows || []), [byName]);
  const behavior = useMemo(() => (byName.get(TABLES.USER_BEHAVIOR_PROFILES)?.rows || []), [byName]);
  const bookings = useMemo(() => (byName.get(TABLES.BOOKINGS)?.rows || []), [byName]);
  const cabBookings = useMemo(() => (byName.get(TABLES.CAB_BOOKINGS)?.rows || []), [byName]);
  const foodOrders = useMemo(() => (byName.get(TABLES.FOOD_ORDERS)?.rows || []), [byName]);
  const events = useMemo(() => (byName.get(TABLES.ANALYTICS_EVENTS)?.rows || []), [byName]);

  const [showAnonymous, setShowAnonymous] = useState(false);
  const [detail, setDetail] = useState(null);

  const rows = useMemo(() => {
    const map = new Map(); // userId -> aggregate

    const upsert = (userId, patch) => {
      const id = safeText(userId);
      if (!id) return;
      const prev = map.get(id) || { userId: id, addresses: [], sources: [] };
      const next = { ...prev, ...patch };
      next.addresses = uniqList([...(prev.addresses || []), ...(patch.addresses || [])]);
      next.sources = uniqList([...(prev.sources || []), ...(patch.sources || [])]);
      map.set(id, next);
    };

    // Base profiles
    (profiles || []).forEach((p) => {
      const userId = safeText(p?.id) || (p?.phone ? userIdFromPhone(p.phone) : "");
      upsert(userId, {
        name: safeText(p?.name),
        phone: safeText(p?.phone),
        email: safeText(p?.email),
        ipAddress: safeText(p?.ip_address || p?.ipAddress),
        browser: safeText(p?.browser),
        createdAt: safeText(p?.created_at || p?.createdAt),
        updatedAt: safeText(p?.updated_at || p?.updatedAt),
        sources: ["profiles"]
      });
    });

    // Behavior profiles (may contain saved addresses)
    (behavior || []).forEach((b) => {
      const userId = safeText(b?.user_id || b?.userId || b?.id);
      const saved = b?.location_mobility?.savedAddresses || b?.locationMobility?.savedAddresses;
      upsert(userId, {
        name: safeText(b?.name),
        phone: safeText(b?.phone),
        email: safeText(b?.email),
        addresses: Array.isArray(saved) ? saved.map((x) => safeText(x)).filter(Boolean) : [],
        sources: ["behavior"]
      });
    });

    // Orders -> addresses
    (foodOrders || []).forEach((o) => {
      const phone = safeText(o?.phone);
      const email = safeText(o?.email);
      const userId =
        safeText(o?.user_id || o?.userId) ||
        (phone ? userIdFromPhone(phone) : "") ||
        (email ? userIdFromEmail(email) : "");
      const addr = safeText(o?.delivery_address || o?.deliveryAddress);
      upsert(userId, {
        name: safeText(o?.user_name || o?.userName),
        phone,
        email,
        addresses: addr ? [addr] : [],
        lastOrderAt: safeText(o?.order_time || o?.orderTime),
        sources: ["food"]
      });
    });

    (cabBookings || []).forEach((o) => {
      const phone = safeText(o?.phone);
      const userId = safeText(o?.user_id || o?.userId) || (phone ? userIdFromPhone(phone) : "");
      const pickup = safeText(o?.pickup_location || o?.pickupLocation);
      const drop = safeText(o?.drop_location || o?.dropLocation);
      upsert(userId, {
        name: safeText(o?.user_name || o?.userName),
        phone,
        addresses: uniqList([pickup, drop]),
        lastOrderAt: safeText(o?.created_at || o?.createdAt),
        sources: ["cab"]
      });
    });

    (bookings || []).forEach((o) => {
      const phone = safeText(o?.phone);
      const email = safeText(o?.email);
      const userId = safeText(o?.user_id || o?.userId) || (phone ? userIdFromPhone(phone) : "") || (email ? userIdFromEmail(email) : "");
      upsert(userId, {
        name: safeText(o?.user_name || o?.userName),
        phone,
        email,
        sources: ["bookings"]
      });
    });

    // Events -> last seen + login status + ip/browser/page
    const lastByUser = new Map();
    const lastAuthByUser = new Map(); // user -> {type, at}
    (events || []).forEach((e) => {
      const meta = (e?.meta && typeof e.meta === "object") ? e.meta : (safeJsonParse(e?.meta) || {});
      const phone = safeText(e?.phone);
      const email = safeText(e?.email);
      const ip = safeText(meta?.ipAddress || meta?.ip || "");
      const userId =
        safeText(e?.user_id || e?.userId) ||
        (phone ? userIdFromPhone(phone) : "") ||
        (email ? userIdFromEmail(email) : "") ||
        (ip ? userIdFromIp(ip) : "");
      const at = safeText(e?.at);
      const prevAt = safeText(lastByUser.get(userId)?.at || "");
      if (!prevAt || new Date(at).getTime() >= new Date(prevAt).getTime()) {
        lastByUser.set(userId, {
          at,
          ipAddress: ip,
          browser: safeText(meta?.browser || ""),
          page: safeText(meta?.screen || meta?.path || meta?.url || "")
        });
      }
      const type = safeText(e?.type).toLowerCase();
      if (type === "auth_login" || type === "auth_logout") {
        const prev = lastAuthByUser.get(userId);
        if (!prev || new Date(at).getTime() >= new Date(prev.at).getTime()) {
          lastAuthByUser.set(userId, { type, at });
        }
      }
    });

    for (const [userId, last] of lastByUser.entries()) {
      const auth = lastAuthByUser.get(userId);
      upsert(userId, {
        lastSeenAt: last.at,
        ipAddress: last.ipAddress,
        browser: last.browser,
        lastPage: last.page,
        loggedIn: auth ? (auth.type === "auth_login") : null,
        sources: ["events"]
      });
    }

    const list = Array.from(map.values());
    const filtered = showAnonymous
      ? list
      : list.filter((u) => safeText(u.phone) || safeText(u.email) || (u.sources || []).some((s) => s !== "events"));
    filtered.sort((a, b) => new Date(b.lastSeenAt || b.updatedAt || 0).getTime() - new Date(a.lastSeenAt || a.updatedAt || 0).getTime());
    return filtered;
  }, [profiles, behavior, bookings, cabBookings, foodOrders, events, showAnonymous]);

  return (
    <div className="card">
      <div className="filters">
        <div className="small">Customers aggregated from orders + analytics + profiles</div>
        <div className="flex-1" />
        <button className={`btn small ${showAnonymous ? "primary" : "ghost"}`} onClick={() => setShowAnonymous((p) => !p)}>
          {showAnonymous ? "Showing anonymous" : "Hide anonymous"}
        </button>
      </div>

      <div className="table-wrap mt-10">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Logged In</th>
              <th>Last Seen</th>
              <th>Last Page</th>
              <th>IP</th>
              <th>Browser</th>
              <th>Addresses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={safeText(u.userId)} onClick={() => setDetail(u)}>
                <td>{displayText(u.userId).slice(0, 36)}</td>
                <td>{displayText(u.name).slice(0, 40)}</td>
                <td>{displayText(u.phone).slice(0, 20)}</td>
                <td>{displayText(u.email).slice(0, 40)}</td>
                <td>{u.loggedIn === null ? "" : (u.loggedIn ? "Yes" : "No")}</td>
                <td>{displayText(u.lastSeenAt || u.updatedAt).slice(0, 19).replace("T", " ")}</td>
                <td>{displayText(u.lastPage).slice(0, 50)}</td>
                <td>{displayText(u.ipAddress).slice(0, 32)}</td>
                <td>{displayText(u.browser).slice(0, 48)}</td>
                <td>{Array.isArray(u.addresses) ? `${u.addresses.length}` : "0"}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={10} className="small">No customers yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {detail ? (
        <div className="card mt-12">
          <div className="flex-between-gap10-center">
            <div>
              <div className="fw-800">Customer Detail</div>
              <div className="small">{safeText(detail.userId)}</div>
            </div>
            <button className="btn small" onClick={() => setDetail(null)}>Close</button>
          </div>
          <div className="small mt-10">Addresses</div>
          <div className="mt-6 flex-col-gap6">
            {(detail.addresses || []).slice(0, 30).map((a) => (
              <div key={a} className="img-chip"><span>{a}</span></div>
            ))}
            {!((detail.addresses || []).length) ? <div className="small">No addresses collected yet (food delivery + cab pickup/drop populate this).</div> : null}
          </div>
          <div className="small mt-10">Raw</div>
          <textarea className="textarea json-mini mt-6" value={JSON.stringify(detail, null, 2)} readOnly />
        </div>
      ) : null}
    </div>
  );
}

/* ─── Delivery Management Workspace ─── */
function DeliveryWorkspace({ snapshot, onReload }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const deliveryRows = useMemo(() => (byName.get(TABLES.DELIVERY_TRACKING)?.rows || []), [byName]);
  const vendorMsgRows = useMemo(() => (byName.get(TABLES.VENDOR_MESSAGES)?.rows || []), [byName]);
  const [activeTab, setActiveTab] = useState("tracking");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updateForm, setUpdateForm] = useState({ orderId: "", status: "confirmed", notes: "" });
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  const filteredDelivery = useMemo(() => {
    const rows = Array.isArray(deliveryRows) ? deliveryRows : [];
    if (statusFilter === "all") return rows;
    return rows.filter((r) => safeText(r?.status).toLowerCase() === statusFilter);
  }, [deliveryRows, statusFilter]);

  const handleStatusUpdate = async () => {
    if (!updateForm.orderId || !updateForm.status) return;
    setUpdating(true);
    setUpdateMsg("");
    try {
      const res = await http("/api/delivery/update-status", {
        method: "POST",
        body: JSON.stringify({
          orderId: updateForm.orderId,
          status: updateForm.status,
          notes: updateForm.notes || undefined,
          orderType: "food"
        })
      });
      setUpdateMsg("Status updated successfully!");
      setUpdateForm({ orderId: "", status: "confirmed", notes: "" });
      onReload();
    } catch (err) {
      setUpdateMsg("Error: " + (err.message || "Failed to update"));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className="card">
        <h3 className="mt-0"><FaTruck /> Update Order Status</h3>
        <div className="flex-gap10-wrap mt-10">
          <input className="input w-220" placeholder="Order ID" value={updateForm.orderId} onChange={(e) => setUpdateForm((p) => ({ ...p, orderId: e.target.value }))} />
          <select className="input" value={updateForm.status} onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}>
            {["pending", "confirmed", "preparing", "ready", "picked_up", "in_transit", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input flex-1 minw-200" placeholder="Notes (optional)" value={updateForm.notes} onChange={(e) => setUpdateForm((p) => ({ ...p, notes: e.target.value }))} />
          <button className="btn primary" disabled={updating} onClick={handleStatusUpdate}>{updating ? "Updating..." : "Update"}</button>
        </div>
        {updateMsg ? <div className={`small mt-8 ${updateMsg.startsWith("Error") ? "text-danger" : "text-success"}`}>{updateMsg}</div> : null}
      </div>

      <div className="card">
        <div className="tabs">
          <button className={`tab ${activeTab === "tracking" ? "active" : ""}`} onClick={() => setActiveTab("tracking")}><FaTruck /> Tracking</button>
          <button className={`tab ${activeTab === "vendor_msgs" ? "active" : ""}`} onClick={() => setActiveTab("vendor_msgs")}><FaComments /> Vendor Messages</button>
        </div>

        {activeTab === "tracking" ? (
          <>
            <div className="filters mt-10">
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {["all", "pending", "confirmed", "preparing", "ready", "picked_up", "in_transit", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="badge">{filteredDelivery.length} records</div>
            </div>
            <div className="table-wrap mt-10">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Status</th>
                    <th>Driver</th>
                    <th>Driver Phone</th>
                    <th>Company</th>
                    <th>Updated</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDelivery.map((r, idx) => (
                    <tr key={safeText(r?.id || idx)}>
                      <td>{displayText(r?.order_id || r?.orderId).slice(0, 20)}</td>
                      <td><span className="badge">{safeText(r?.status)}</span></td>
                      <td>{displayText(r?.driver_name || r?.driverName)}</td>
                      <td>{displayText(r?.driver_phone || r?.driverPhone)}</td>
                      <td>{displayText(r?.delivery_company || r?.deliveryCompany)}</td>
                      <td>{displayText(r?.updated_at || r?.updatedAt).slice(0, 19).replace("T", " ")}</td>
                      <td>{displayText(r?.notes).slice(0, 80)}</td>
                    </tr>
                  ))}
                  {!filteredDelivery.length ? <tr><td colSpan={7} className="small">No delivery records yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {activeTab === "vendor_msgs" ? (
          <div className="table-wrap mt-10">
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor ID</th>
                  <th>Order ID</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {vendorMsgRows.map((r, idx) => (
                  <tr key={safeText(r?.id || idx)}>
                    <td>{displayText(r?.vendor_id || r?.vendorId).slice(0, 20)}</td>
                    <td>{displayText(r?.order_id || r?.orderId).slice(0, 20)}</td>
                    <td>{displayText(r?.channel)}</td>
                    <td><span className="badge">{safeText(r?.status)}</span></td>
                    <td>{displayText(r?.sent_at || r?.sentAt).slice(0, 19).replace("T", " ")}</td>
                    <td>{displayText(typeof r?.message_body === "object" ? JSON.stringify(r.message_body) : r?.message_body).slice(0, 100)}</td>
                  </tr>
                ))}
                {!vendorMsgRows.length ? <tr><td colSpan={6} className="small">No vendor messages sent yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ─── AI Support Workspace ─── */
function AISupportWorkspace({ snapshot }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const aiConversations = useMemo(() => (byName.get(TABLES.AI_CONVERSATIONS)?.rows || []), [byName]);
  const telegramMessages = useMemo(() => (byName.get(TABLES.TELEGRAM_MESSAGES)?.rows || []), [byName]);
  const [activeTab, setActiveTab] = useState("conversations");
  const [detail, setDetail] = useState(null);

  const sortedConversations = useMemo(() => {
    return [...aiConversations].sort((a, b) =>
      new Date(b?.created_at || b?.createdAt || 0).getTime() - new Date(a?.created_at || a?.createdAt || 0).getTime()
    );
  }, [aiConversations]);

  const sortedTelegram = useMemo(() => {
    return [...telegramMessages].sort((a, b) =>
      new Date(b?.created_at || b?.createdAt || 0).getTime() - new Date(a?.created_at || a?.createdAt || 0).getTime()
    );
  }, [telegramMessages]);

  return (
    <>
      <div className="card">
        <div className="stat-grid">
          {statCard("AI Conversations", aiConversations.length, "live")}
          {statCard("Telegram Messages", telegramMessages.length, "live")}
          {statCard("Escalated", aiConversations.filter((c) => c?.escalated || c?.should_escalate).length, "alert")}
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          <button className={`tab ${activeTab === "conversations" ? "active" : ""}`} onClick={() => setActiveTab("conversations")}><FaRobot /> AI Conversations</button>
          <button className={`tab ${activeTab === "telegram" ? "active" : ""}`} onClick={() => setActiveTab("telegram")}><FaTelegramPlane /> Telegram Messages</button>
        </div>

        {activeTab === "conversations" ? (
          <div className="table-wrap mt-10">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Intent</th>
                  <th>Message</th>
                  <th>AI Reply</th>
                  <th>Escalated</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sortedConversations.slice(0, 100).map((r, idx) => (
                  <tr key={safeText(r?.id || idx)} onClick={() => setDetail(r)} className="cursor-pointer">
                    <td>{displayText(r?.user_id || r?.userId || r?.phone).slice(0, 24)}</td>
                    <td><span className="badge">{safeText(r?.intent || r?.detected_intent)}</span></td>
                    <td>{displayText(r?.user_message || r?.message).slice(0, 80)}</td>
                    <td>{displayText(r?.ai_reply || r?.reply).slice(0, 80)}</td>
                    <td>{(r?.escalated || r?.should_escalate) ? "Yes" : "No"}</td>
                    <td>{displayText(r?.created_at || r?.createdAt).slice(0, 19).replace("T", " ")}</td>
                  </tr>
                ))}
                {!sortedConversations.length ? <tr><td colSpan={6} className="small">No AI conversations yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "telegram" ? (
          <div className="table-wrap mt-10">
            <table className="table">
              <thead>
                <tr>
                  <th>Chat ID</th>
                  <th>Direction</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sortedTelegram.slice(0, 100).map((r, idx) => (
                  <tr key={safeText(r?.id || idx)}>
                    <td>{displayText(r?.chat_id || r?.chatId).slice(0, 16)}</td>
                    <td><span className="badge">{safeText(r?.direction)}</span></td>
                    <td>{safeText(r?.message_type || r?.messageType)}</td>
                    <td>{displayText(typeof r?.content === "object" ? JSON.stringify(r.content) : r?.content).slice(0, 100)}</td>
                    <td>{displayText(r?.created_at || r?.createdAt).slice(0, 19).replace("T", " ")}</td>
                  </tr>
                ))}
                {!sortedTelegram.length ? <tr><td colSpan={5} className="small">No Telegram messages logged yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {detail ? (
        <div className="card mt-12">
          <div className="flex-between-center">
            <div className="fw-800">Conversation Detail</div>
            <button className="btn small" onClick={() => setDetail(null)}>Close</button>
          </div>
          <textarea className="textarea json-mini mt-8" value={JSON.stringify(detail, null, 2)} readOnly />
        </div>
      ) : null}
    </>
  );
}

function BotsAgentsCard() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  const refresh = async () => {
    setError("");
    try {
      const payload = await http("/api/admin/bots/status");
      setStatus(payload || null);
    } catch (err) {
      setError(String(err?.message || err || "Failed to load bot status"));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const bots = status?.bots || {};
  const webhookPaths = status?.webhookPaths || {};
  const mode = safeText(status?.mode || "off");
  const webhookBase = safeText(status?.webhookBase || "");
  const agentModel = safeText(status?.agentModel || "gpt-4o-mini");
  const transcribeModel = safeText(status?.transcribeModel || "whisper-1");

  return (
    <div className="card">
      <div className="row mb-6">
        <h3 className="m-0"><FaRobot /> Bots & Agents</h3>
        <div className="flex-1" />
        <button className="btn small" onClick={refresh}><FaRedo /> Refresh</button>
      </div>
      {error ? <div className="warn mb-8">{error}</div> : null}
      <div className="grid-2">
        <div>
          <div className="small">Telegram Mode</div>
          <div className="badge">{mode || "off"}</div>
          <div className="small mt-8">Webhook Base</div>
          <div className="small">{webhookBase || "Not set"}</div>
          <div className="small mt-8">Webhook Paths</div>
          <div className="small">Admin: {safeText(webhookPaths.admin || "/telegram/admin")}</div>
          <div className="small">Support: {safeText(webhookPaths.support || "/telegram/support")}</div>
          <div className="small">Sales: {safeText(webhookPaths.sales || "/telegram/sales")}</div>
          <div className="small">Ops: {safeText(webhookPaths.ops || "/telegram/ops")}</div>
          <div className="small">Finance: {safeText(webhookPaths.finance || "/telegram/finance")}</div>
        </div>
        <div>
          <div className="small">Agent Model</div>
          <div className="badge">{agentModel}</div>
          <div className="small mt-8">Transcribe Model</div>
          <div className="badge">{transcribeModel}</div>
          <div className="small mt-8">Bots Enabled</div>
          <div className="mini-row wrap">
            {["admin", "support", "sales", "ops", "finance"].map((key) => (
              <span key={key} className={`badge cap ${bots[key] ? "green" : "warn"}`}>
                {key}: {bots[key] ? "on" : "off"}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Refunds Workspace ─── */
function RefundsWorkspace({ snapshot, onReload }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const refunds = useMemo(() => {
    const rows = byName.get(TABLES.REFUNDS)?.rows || [];
    return [...rows].sort((a, b) =>
      new Date(b?.created_at || b?.createdAt || 0).getTime() - new Date(a?.created_at || a?.createdAt || 0).getTime()
    );
  }, [byName]);

  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRefunds = useMemo(() => {
    if (statusFilter === "all") return refunds;
    return refunds.filter((r) => safeText(r?.status).toLowerCase() === statusFilter);
  }, [refunds, statusFilter]);

  const statCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0, processed: 0 };
    refunds.forEach((r) => {
      const s = safeText(r?.status).toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [refunds]);

  const handleAction = async (refundId, newStatus) => {
    try {
      await http("/api/admin/supabase/upsert", {
        method: "POST",
        body: JSON.stringify({ table: tableDb(TABLES.REFUNDS), rows: [{ id: refundId, status: newStatus }] })
      });
      onReload();
    } catch (err) {
      alert("Error updating refund: " + (err.message || "Unknown"));
    }
  };

  return (
    <>
      <div className="card">
        <div className="stat-grid">
          {statCard("Pending", statCounts.pending, "alert")}
          {statCard("Approved", statCounts.approved, "live")}
          {statCard("Rejected", statCounts.rejected, "catalog")}
          {statCard("Processed", statCounts.processed, "live")}
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <h3 className="m-0"><FaUndoAlt /> Refund Requests</h3>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {["all", "pending", "approved", "rejected", "processed"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="badge">{filteredRefunds.length} refunds</div>
        </div>
        <div className="table-wrap mt-10">
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Reason</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRefunds.map((r, idx) => (
                <tr key={safeText(r?.id || idx)}>
                  <td>{displayText(r?.order_id || r?.orderId).slice(0, 20)}</td>
                  <td>{displayText(r?.customer_name || r?.customerName || r?.user_id).slice(0, 30)}</td>
                  <td>{displayText(r?.reason).slice(0, 60)}</td>
                  <td>{displayText(r?.amount)}</td>
                  <td>
                    <select
                      className="input"
                      value={safeText(r?.status) || "pending"}
                      onChange={(e) => handleAction(r?.id, e.target.value)}
                    >
                      {["pending", "approved", "rejected", "processed"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{displayText(r?.created_at || r?.createdAt).slice(0, 19).replace("T", " ")}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {safeText(r?.status).toLowerCase() === "pending" ? (
                      <div className="flex-gap6">
                        <button className="btn small primary" onClick={() => handleAction(r?.id, "approved")}>Approve</button>
                        <button className="btn small" onClick={() => handleAction(r?.id, "rejected")}>Reject</button>
                      </div>
                    ) : safeText(r?.status).toLowerCase() === "approved" ? (
                      <button className="btn small primary" onClick={() => handleAction(r?.id, "processed")}>Mark Processed</button>
                    ) : (
                      <span className="small">{safeText(r?.status)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filteredRefunds.length ? <tr><td colSpan={7} className="small">No refund requests yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── Notifications Workspace ─── */
function NotificationsWorkspace({ items, onOpen, onDismiss }) {
  return (
    <div className="card">
      <div className="filters">
        <h3 className="m-0"><FaBell /> Notifications</h3>
        <div className="badge">{items.length} items</div>
      </div>
      <div className="notif-list">
        {items.map((n) => (
          <div key={`${n.type}:${n.id}`} className="notif-item">
            <div className="notif-meta">
              <div className="notif-type">{n.type}</div>
              <div className="notif-status">{n.status || "pending"}</div>
            </div>
            <div className="notif-title-row">{n.title || n.id || "New request"}</div>
            <div className="notif-date">{n.date ? n.date.toString().slice(0, 19).replace("T", " ") : ""}</div>
            <div className="flex-gap6">
              <button className="btn small" onClick={() => onOpen(n)}>View</button>
              <button className="btn small danger" onClick={() => onDismiss(n)}>Dismiss</button>
            </div>
          </div>
        ))}
        {!items.length ? <div className="small">No notifications.</div> : null}
      </div>
    </div>
  );
}

/* ─── Reviews Workspace (used on dashboard) ─── */
function ReviewsWidget({ snapshot }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const reviews = useMemo(() => {
    const rows = byName.get(TABLES.REVIEWS)?.rows || [];
    return [...rows].sort((a, b) =>
      new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
    );
  }, [byName]);

  if (!reviews.length) return null;

  return (
    <div className="card mt-12">
      <h3 className="mt-0"><FaStar className="review-star" /> Recent Reviews</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Entity</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.slice(0, 20).map((r, idx) => (
              <tr key={safeText(r?.id || idx)}>
                <td>{displayText(r?.user_name || r?.user_id).slice(0, 24)}</td>
                <td>{"★".repeat(Math.min(5, Math.max(0, parseInt(r?.rating) || 0)))}</td>
                <td>{displayText(r?.comment).slice(0, 80)}</td>
                <td>{displayText(r?.entity_type)}: {displayText(r?.entity_id).slice(0, 16)}</td>
                <td>{displayText(r?.created_at).slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const [authed, setAuthed] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("table");
  const [tablePage, setTablePage] = useState(1);
  const [page, setPage] = useState("dashboard");
  const [snapshot, setSnapshot] = useState({ tables: [] });
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedRowKey, setSelectedRowKey] = useState("");
  const [jsonDraft, setJsonDraft] = useState("[]");
  const [lightbox, setLightbox] = useState({ open: false, title: "", urls: [], index: 0 });
  const loadingRef = React.useRef(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState(() => new Set());

  const tablesByName = useMemo(() => {
    const map = new Map();
    (snapshot.tables || []).forEach((t) => map.set(t.name, t));
    return map;
  }, [snapshot]);

  const catalogLookup = useMemo(() => {
    const tours = (tablesByName.get(TABLES.TOURS)?.rows || []).slice();
    const hotels = (tablesByName.get(TABLES.HOTELS)?.rows || []).slice();
    const toursById = new Map();
    const hotelsById = new Map();
    tours.forEach((t) => toursById.set(String(t?.id || ""), t));
    hotels.forEach((h) => hotelsById.set(String(h?.id || ""), h));
    return { toursById, hotelsById };
  }, [tablesByName]);

  const currentTables = useMemo(() => {
    const names = PAGE_TABLES[page] || [];
    return names.map((n) => tablesByName.get(n)).filter(Boolean);
  }, [page, tablesByName]);

  const activeTable = useMemo(() => {
    if (!currentTables.length) return null;
    if (selectedTable) {
      const hit = currentTables.find((t) => t.name === selectedTable);
      if (hit) return hit;
    }
    return currentTables[0];
  }, [currentTables, selectedTable]);

  // Some admin sections intentionally re-use the same underlying Supabase table.
  // Example: Hotels + Cottages both map to ev_hotels, but must show different rows.
  const effectiveTable = useMemo(() => {
    if (!activeTable) return null;
    if (activeTable.name === TABLES.HOTELS && (page === "hotels" || page === "cottages")) {
      const rows = Array.isArray(activeTable.rows) ? activeTable.rows : [];
      const filtered = page === "cottages"
        ? rows.filter(isLikelyCottage)
        : rows.filter((r) => !isLikelyCottage(r));
      return { ...activeTable, rows: filtered, rowCount: filtered.length };
    }
    return activeTable;
  }, [activeTable, page]);

  // Reset selection only when changing page/table, not when switching to Form tab.
  useEffect(() => {
    if (!effectiveTable) {
      setJsonDraft("[]");
      return;
    }
    setSelectedTable(effectiveTable.name);
    setSelectedRowKey("");
  }, [page, effectiveTable?.name]);

  // Keep JSON draft synced for table/form views, but don't clobber edits while in JSON tab.
  useEffect(() => {
    if (!effectiveTable) return;
    if (tab === "json") return;
    setJsonDraft(JSON.stringify(effectiveTable.rows || [], null, 2));
  }, [effectiveTable?.name, effectiveTable?.rowCount, tab]);

  const checkSession = async () => {
    setLoadingSession(true);
    try {
      await http("/api/admin/whoami");
      setAuthed(true);
    } catch {
      setAuthed(false);
    } finally {
      setLoadingSession(false);
    }
  };

  const reload = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingData(true);
    setError("");
    try {
      const data = await http("/api/admin/supabase/snapshot");
      const tables = Array.isArray(data?.tables)
        ? data.tables.map((t) => ({ ...t, name: tableAlias(t?.name) }))
        : [];
      setSnapshot({ ...(data || {}), tables });
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoadingData(false);
      loadingRef.current = false;
    }
  };

  const openImages = (title, urls, index = 0) => {
    const normalized = uniqStrings(urls || []);
    if (!normalized.length) return;
    setLightbox({ open: true, title: safeText(title), urls: normalized, index });
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (authed) reload();
  }, [authed]);

  useEffect(() => {
    if (!authed) return undefined;
    const id = setInterval(() => {
      reload();
    }, 30000);
    return () => clearInterval(id);
  }, [authed]);

  const saveJson = async () => {
    if (!activeTable) return; // always save to the real underlying table
    try {
      const parsed = JSON.parse(jsonDraft);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array of rows");
      await http("/api/admin/supabase/upsert", {
        method: "POST",
        body: JSON.stringify({ table: tableDb(activeTable.name), rows: parsed })
      });
      await reload();
      setTab("table");
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  const saveForm = async (row) => {
    if (!activeTable) return;
    try {
      await http("/api/admin/supabase/upsert", {
        method: "POST",
        body: JSON.stringify({ table: tableDb(activeTable.name), rows: [row] })
      });
      await reload();
      setTab("table");
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  const upsertPartial = async (tableName, rows) => {
    await http("/api/admin/supabase/upsert", {
      method: "POST",
      body: JSON.stringify({ table: tableDb(tableName), rows })
    });
    await reload();
  };

  const filteredRows = useMemo(() => {
    if (!effectiveTable) return [];
    const q = search.trim().toLowerCase();
    if (!q) return effectiveTable.rows || [];
    return (effectiveTable.rows || []).filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [effectiveTable, search]);
  useEffect(() => {
    setTablePage(1);
  }, [selectedTable, search, page, tab]);

  const selectedRow = useMemo(() => {
    if (!effectiveTable) return null;
    const rows = effectiveTable.rows || [];
    if (!rows.length) return null;
    if (selectedRowKey === "__new__") return null;
    if (!selectedRowKey) return rows[0];
    return rows.find((r) => String(r.id || r.slug || r.code || r.restaurant_id || "") === selectedRowKey) || rows[0];
  }, [effectiveTable, selectedRowKey]);

  const hasImages = useMemo(() => {
    if (!effectiveTable) return false;
    const rows = (effectiveTable.rows || []).slice(0, 25);
    return rows.some((r) => extractImageUrlsFromRow(r).length > 0);
  }, [effectiveTable?.name, effectiveTable?.rowCount]);

  const keyCol = effectiveTable ? keyColumnForTable(effectiveTable) : "id";
  const heavyCols = new Set(["images", "image_meta", "hero_image", "image", "content"]);
  const baseCols = effectiveTable ? (effectiveTable.columns || []).map((c) => c.name) : [];
  const firstDisplayCol = (page === "tours" && baseCols.includes("title")) ? "title" : keyCol;
  const orderedCols = effectiveTable
    ? [firstDisplayCol, ...baseCols.filter((n) => n !== firstDisplayCol && !heavyCols.has(n)).slice(0, 7)]
    : [];
  const ActivePageIcon = NAV_ITEMS.find((item) => item.key === page)?.icon || FaHome;
  const notificationCount = useMemo(() => {
    const pending = new Set(["pending", "new", "open", "unread"]);
    const countByStatus = (rows) => (rows || []).filter((r) => pending.has(safeText(r?.status).toLowerCase())).length;
    const bookings = countByStatus(tablesByName.get(TABLES.BOOKINGS)?.rows || []);
    const cab = countByStatus(tablesByName.get(TABLES.CAB_BOOKINGS)?.rows || []);
    const bus = countByStatus(tablesByName.get(TABLES.BUS_BOOKINGS)?.rows || []);
    const food = countByStatus(tablesByName.get(TABLES.FOOD_ORDERS)?.rows || []);
    const queries = countByStatus(tablesByName.get(TABLES.QUERIES)?.rows || []);
    const total = bookings + cab + bus + food + queries;
    return Math.max(0, total - dismissedNotifs.size);
  }, [tablesByName, dismissedNotifs]);
  const notificationItems = useMemo(() => {
    const pending = new Set(["pending", "new", "open", "unread"]);
    const normalize = (rows, type, pageKey, titleKey, dateKey) => (rows || [])
      .filter((r) => pending.has(safeText(r?.status).toLowerCase()))
      .map((r) => ({
        id: safeText(r?.id || ""),
        type,
        status: safeText(r?.status || ""),
        title: safeText(r?.[titleKey] || r?.user_name || r?.userName || r?.customer_name || r?.customerName || r?.order_id || r?.orderId || ""),
        date: safeText(r?.[dateKey] || r?.created_at || r?.createdAt || r?.order_time || r?.orderTime || r?.submitted_at || r?.submittedAt || ""),
        pageKey
      }));
    const list = [
      ...normalize(tablesByName.get(TABLES.BOOKINGS)?.rows || [], "Hotel Booking", "orders", "user_name", "booking_date"),
      ...normalize(tablesByName.get(TABLES.CAB_BOOKINGS)?.rows || [], "Cab Booking", "orders", "user_name", "datetime"),
      ...normalize(tablesByName.get(TABLES.BUS_BOOKINGS)?.rows || [], "Bus Booking", "orders", "user_name", "travel_date"),
      ...normalize(tablesByName.get(TABLES.FOOD_ORDERS)?.rows || [], "Food Order", "orders", "user_name", "order_time"),
      ...normalize(tablesByName.get(TABLES.QUERIES)?.rows || [], "Customer Query", "dashboard", "customer_name", "created_at")
    ];
    return list
      .filter((n) => !dismissedNotifs.has(`${n.type}:${n.id}`))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 50);
  }, [tablesByName, dismissedNotifs]);

  if (loadingSession) {
    return <div className="login-wrap"><div className="small">Checking admin session...</div></div>;
  }

  if (!authed) {
    return <LoginView onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">ExploreValley</div>
        <div className="brand-sub">Admin command center</div>
        <div className="nav">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`nav-btn ${page === key ? "active" : ""}`} onClick={() => setPage(key)}>
              <Icon /> {label}
            </button>
          ))}
        </div>
      </aside>
      <main className="main">
        <div className="header">
          <div>
            <h1 className="page-title"><ActivePageIcon color="#16a34a" /> {PAGE_TITLE[page]}</h1>
            <div className="page-sub">Secure session - IP and browser bound</div>
          </div>
          <div className="actions">
            <div className="notif-wrap">
              <button className="notif-bell" title="Notifications" onClick={() => setNotifOpen((v) => !v)}>
                <FaBell />
                {notificationCount > 0 ? <span className="notif-badge">{notificationCount}</span> : null}
              </button>
              {notifOpen ? (
                <div className="notif-popover" onMouseLeave={() => setNotifOpen(false)}>
                  <div className="notif-head">
                    <div className="notif-title">Notifications</div>
                    <button className="btn small" onClick={() => { setNotifOpen(false); reload(); }} disabled={loadingData}><FaRedo /> Refresh</button>
                  </div>
                  {!notificationItems.length ? (
                    <div className="small">No new notifications.</div>
                  ) : (
                    <div className="notif-list">
                      {notificationItems.map((n) => (
                        <div key={`${n.type}-${n.id}`} className="notif-item">
                          <div className="notif-meta">
                            <div className="notif-type">{n.type}</div>
                            <div className="notif-status">{n.status || "pending"}</div>
                          </div>
                          <div className="notif-title-row">{n.title || n.id || "New request"}</div>
                          <div className="notif-date">{n.date ? n.date.toString().slice(0, 19).replace("T", " ") : ""}</div>
                          <button
                            className="btn small"
                            onClick={() => {
                              setNotifOpen(false);
                              setDismissedNotifs((prev) => {
                                const next = new Set(prev);
                                next.add(`${n.type}:${n.id}`);
                                return next;
                              });
                              setPage(n.pageKey);
                            }}
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <button className="btn primary" onClick={reload} disabled={loadingData}><FaRedo /> {loadingData ? "Reloading" : "Reload"}</button>
            <button className="btn ghost" onClick={() => setTab("json")}><FaSave /> Save All</button>
          </div>
        </div>

        <div className="content">
          {error ? <div className="warn">{error}</div> : null}

          {page === "dashboard" ? (
            <>
            <DashboardView
              snapshot={snapshot}
              tablesByName={tablesByName}
              onReload={reload}
              onOpenImages={openImages}
              onUpsert={async (tableName, rows) => {
                await http("/api/admin/supabase/upsert", {
                  method: "POST",
                  body: JSON.stringify({ table: tableDb(tableName), rows })
                });
              }}
            />
            <ReviewsWidget snapshot={snapshot} />
            </>
          ) : page === "customers" ? (
            <CustomersWorkspace snapshot={snapshot} />
          ) : page === "delivery" ? (
            <DeliveryWorkspace snapshot={snapshot} onReload={reload} />
          ) : page === "ai_support" ? (
            <AISupportWorkspace snapshot={snapshot} />
          ) : page === "refunds" ? (
            <RefundsWorkspace snapshot={snapshot} onReload={reload} />
          ) : page === "notifications" ? (
            <NotificationsWorkspace
              items={notificationItems}
              onOpen={(n) => {
                setDismissedNotifs((prev) => {
                  const next = new Set(prev);
                  next.add(`${n.type}:${n.id}`);
                  return next;
                });
                setPage(n.pageKey);
              }}
              onDismiss={(n) => {
                setDismissedNotifs((prev) => {
                  const next = new Set(prev);
                  next.add(`${n.type}:${n.id}`);
                  return next;
                });
              }}
            />
          ) : page === "pricing_controls" ? (
            <PricingControlsWorkspace
              snapshot={snapshot}
              onReload={reload}
              onUpsert={async (tableName, rows) => {
                await http("/api/admin/supabase/upsert", {
                  method: "POST",
                  body: JSON.stringify({ table: tableDb(tableName), rows })
                });
              }}
            />
          ) : (
            <>
              {page === "settings" ? <BotsAgentsCard /> : null}
              {page === "food_vendors" ? (
                <FoodVendorsWorkspace
                  snapshot={snapshot}
                  onReload={reload}
                  onOpenImages={openImages}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                  onDelete={async (tableName, id, keyColumn, confirmText) => {
                    await http("/api/admin/supabase/delete", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                    });
                  }}
                />
              ) : page === "mart_catalog" ? (
                <MartCatalogWorkspace
                  snapshot={snapshot}
                  onReload={reload}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                  onDelete={async (tableName, id, keyColumn, confirmText) => {
                    await http("/api/admin/supabase/delete", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                    });
                  }}
                />
              ) : (
                <>
              {currentTables.length > 1 ? (
                <div className="tabs">
                  {currentTables.map((t) => (
                    <button key={t.name} className={`tab ${selectedTable === t.name ? "active" : ""}`} onClick={() => setSelectedTable(t.name)}>
                      <FaBuilding /> {tableLabel(t.name)}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="tabs">
                <button className={`tab ${tab === "table" ? "active" : ""}`} onClick={() => setTab("table")}><FaTable /> Table</button>
                <button className={`tab ${tab === "form" ? "active" : ""}`} onClick={() => setTab("form")}><FaPen /> Form</button>
                <button className={`tab ${tab === "json" ? "active" : ""}`} onClick={() => setTab("json")}><FaFileCode /> JSON</button>
              </div>

              {!effectiveTable ? (
                <div className="card">No Supabase table mapped for this section.</div>
              ) : null}

              {effectiveTable && tab === "table" ? (
                <div className="card">
                  <div className="filters">
                    <div className="pos-rel">
                      <FaSearch className="search-icon" />
                      <input className="input input-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
                    </div>
                    <div className="badge">{effectiveTable.rowCount} rows</div>
                    <button className="btn" onClick={() => { setSelectedRowKey("__new__"); setTab("form"); }}><FaPlus /> Create</button>
                    <button className="btn" onClick={() => {
                      const blob = new Blob([JSON.stringify(filteredRows, null, 2)], { type: "application/json" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `${activeTable.name}.json`;
                      a.click();
                    }}><FaDownload /> Export</button>
                  </div>

                  <div className="table-wrap mt-10">
                    {page === "cab_providers" ? (
                      <CabRatesTable
                        rows={filteredRows}
                        onUpsert={async (tableName, rows) => {
                          await http("/api/admin/supabase/upsert", {
                            method: "POST",
                            body: JSON.stringify({ table: tableDb(tableName), rows })
                          });
                        }}
                        onDelete={async (tableName, id, keyColumn, confirmText) => {
                          await http("/api/admin/supabase/delete", {
                            method: "POST",
                            body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                          });
                        }}
                        onReload={reload}
                      />
                    ) : page === "bike_rentals" ? (
                      <BikeRentalsTable
                        rows={filteredRows}
                        onUpsert={async (tableName, rows) => {
                          await http("/api/admin/supabase/upsert", {
                            method: "POST",
                            body: JSON.stringify({ table: tableDb(tableName), rows })
                          });
                        }}
                        onDelete={async (tableName, id, keyColumn, confirmText) => {
                          await http("/api/admin/supabase/delete", {
                            method: "POST",
                            body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                          });
                        }}
                        onReload={reload}
                      />
                    ) : effectiveTable.name === TABLES.BUSES ? (
                      <BusesTable
                        rows={filteredRows}
                        onUpsert={async (tableName, rows) => {
                          await http("/api/admin/supabase/upsert", {
                            method: "POST",
                            body: JSON.stringify({ table: tableDb(tableName), rows })
                          });
                        }}
                        onDelete={async (tableName, id, keyColumn, confirmText) => {
                          await http("/api/admin/supabase/delete", {
                            method: "POST",
                            body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                          });
                        }}
                        onReload={reload}
                      />
                    ) : effectiveTable.name === TABLES.BOOKINGS ? (
                      <BookingsTable
                        rows={filteredRows.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE)}
                        onOpenRow={(rowKey) => { setSelectedRowKey(rowKey); setTab("form"); }}
                        onOpenImages={openImages}
                        onUpsert={async (tableName, rows) => {
                          await http("/api/admin/supabase/upsert", {
                            method: "POST",
                            body: JSON.stringify({ table: tableDb(tableName), rows })
                          });
                        }}
                        onReload={reload}
                        catalogLookup={catalogLookup}
                      />
                    ) : effectiveTable.name === TABLES.ANALYTICS_EVENTS && page === "tracking" ? (
                      <TrackingTable rows={filteredRows.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE)} />
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>{columnLabel(effectiveTable.name, firstDisplayCol)}</th>
                            {hasImages ? <th className="thumb-cell">image</th> : null}
                            {orderedCols.filter((n) => n !== firstDisplayCol).map((name) => <th key={name}>{columnLabel(effectiveTable.name, name)}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE).map((row, idx) => {
                            const rowKey = String(row[keyCol] || row.id || row.slug || row.code || row.restaurant_id || idx);
                            const urls = hasImages ? extractImageUrlsFromRow(row) : [];
                            return (
                              <tr key={rowKey} onClick={() => { setSelectedRowKey(rowKey); setTab("form"); }}>
                                <td>{displayText(row[firstDisplayCol] ?? "").slice(0, 120)}</td>
                                {hasImages ? (
                                  <td className="thumb-cell" onClick={(e) => e.stopPropagation()}>
                                    {urls[0] ? (
                                      <img className="thumb" src={urls[0]} alt="" onClick={() => openImages(effectiveTable.name, urls, 0)} />
                                    ) : null}
                                  </td>
                                ) : null}
                                {orderedCols.filter((n) => n !== firstDisplayCol).map((name) => {
                                  const value = row[name];
                                  const text = typeof value === "object" ? JSON.stringify(value) : displayText(value);
                                  return <td key={name}>{text.slice(0, 100)}</td>;
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    {page === "cab_providers" || page === "bike_rentals" ? null : (
                      <Pagination
                        page={tablePage}
                        totalPages={Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))}
                        onChange={setTablePage}
                      />
                    )}
                  </div>
                </div>
              ) : null}

              {effectiveTable && tab === "form" ? (
                <FormEditor
                  table={effectiveTable}
                  selectedRow={selectedRow}
                  onSave={saveForm}
                  onOpenImages={openImages}
                  onUpsertPartial={upsertPartial}
                  contextPage={page}
                  catalogLookup={catalogLookup}
                />
              ) : null}

              {activeTable && tab === "json" ? (
                <div className="card">
                  <div className="small">Advanced: edit entire table as JSON array</div>
                  <textarea className="textarea json-box mt-10" value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} />
                  <div className="mt-10 flex-gap10">
                    <button className="btn primary" onClick={saveJson}><FaLock /> Save JSON Changes</button>
                    <button className="btn" onClick={() => setJsonDraft(JSON.stringify((effectiveTable?.rows) || (activeTable.rows || []), null, 2))}><FaRedo /> Reset</button>
                  </div>
                </div>
              ) : null}
                </>
              )}
            </>
          )}
        </div>
      </main>
      {lightbox.open ? (
        <ImageLightbox
          title={lightbox.title}
          urls={lightbox.urls}
          index={lightbox.index}
          onClose={() => setLightbox({ open: false, title: "", urls: [], index: 0 })}
          onPick={(i) => setLightbox((p) => ({ ...p, index: i }))}
        />
      ) : null}
    </div>
  );
}

function FoodVendorsWorkspace({ snapshot, onReload, onOpenImages, onUpsert, onDelete }) {
  const restaurants = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.RESTAURANTS);
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);
  const menuItems = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.MENU_ITEMS);
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);

  const [vendorQuery, setVendorQuery] = useState("");
  const [vendorId, setVendorId] = useState(restaurants[0]?.id || "");
  const [vendorMode, setVendorMode] = useState("edit"); // edit | new
  const [menuQuery, setMenuQuery] = useState("");
  const [rightTab, setRightTab] = useState("visual"); // visual | json
  const [draft, setDraft] = useState({
    id: "",
    name: "",
    category: "General",
    description: "",
    price: "",
    image: "",
    available: true,
    isVeg: false
  });
  const [vendorDraft, setVendorDraft] = useState({
    id: "",
    name: "",
    location: "",
    description: "",
    cuisineCsv: "",
    heroImage: "",
    available: true
  });
  const [menuJson, setMenuJson] = useState("[]");
  const [menuEdits, setMenuEdits] = useState({});
  const [newMenuItem, setNewMenuItem] = useState({
    id: "",
    name: "",
    category: "General",
    description: "",
    price: "",
    image: "",
    available: true,
    isVeg: false
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vendorId && restaurants[0]?.id) setVendorId(restaurants[0].id);
  }, [restaurants?.length]);

  const filteredVendors = useMemo(() => {
    const q = vendorQuery.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [restaurants, vendorQuery]);

  const vendor = useMemo(() => restaurants.find((r) => String(r.id) === String(vendorId)) || null, [restaurants, vendorId]);

  const vendorItems = useMemo(() => {
    const rid = String(vendorId || "");
    const list = menuItems.filter((m) => String(m.restaurant_id || "") === rid);
    const q = menuQuery.trim().toLowerCase();
    const filtered = q ? list.filter((m) => JSON.stringify(m).toLowerCase().includes(q)) : list;
    return filtered.slice().sort((a, b) => String(a.category || "").localeCompare(String(b.category || "")) || String(a.name || "").localeCompare(String(b.name || "")));
  }, [menuItems, vendorId, menuQuery]);
  const [menuPage, setMenuPage] = useState(1);
  useEffect(() => {
    setMenuPage(1);
  }, [menuQuery, vendorId]);

  const vendorImages = useMemo(() => extractImageUrlsFromRow(vendor || {}), [vendorId, vendor]);

  useEffect(() => {
    if (!vendor || vendorMode === "new") return;
    setVendorMode("edit");
    setVendorDraft({
      id: safeText(vendor.id || ""),
      name: safeText(vendor.name || ""),
      location: safeText(vendor.location || ""),
      description: safeText(vendor.description || ""),
      cuisineCsv: Array.isArray(vendor.cuisine) ? vendor.cuisine.join(", ") : safeText(vendor.cuisine || ""),
      heroImage: safeText(vendor.hero_image || vendor.heroImage || ""),
      available: vendor.available !== false
    });
    setMenuJson(JSON.stringify(vendorItems, null, 2));
  }, [vendorId, vendor?.id, vendorItems.length]);

  const startNew = () => {
    setDraft({ id: "", name: "", category: "General", description: "", price: "", image: "", available: true, isVeg: false });
  };
  const startNewMenuRow = () => {
    setNewMenuItem({
      id: "",
      name: "",
      category: "General",
      description: "",
      price: "",
      image: "",
      available: true,
      isVeg: false
    });
  };
  const startNewVendor = () => {
    const newId = `vendor_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setVendorMode("new");
    setVendorId("");
    setVendorDraft({
      id: newId,
      name: "",
      location: "",
      description: "",
      cuisineCsv: "",
      heroImage: "",
      available: true
    });
  };

  const editItem = (item) => {
    setDraft({
      id: safeText(item?.id || ""),
      name: safeText(item?.name || ""),
      category: safeText(item?.category || "General"),
      description: safeText(item?.description || ""),
      price: safeText(item?.price ?? ""),
      image: safeText(item?.image || item?.hero_image || ""),
      available: item?.available !== false,
      isVeg: item?.is_veg === true || item?.isVeg === true
    });
  };

  const saveItem = async () => {
    if (!vendorId) return;
    if (!draft.name.trim()) { setError("Item name is required"); return; }
    setBusy(true);
    setError("");
    try {
      const id = draft.id.trim() ? draft.id.trim() : `menu_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const row = {
        id,
        restaurant_id: vendorId,
        category: draft.category || "General",
        name: draft.name,
        description: draft.description || "",
        price: Number(draft.price || 0),
        image: draft.image || null,
        available: !!draft.available,
        is_veg: !!draft.isVeg
      };
      await onUpsert(TABLES.MENU_ITEMS, [row]);
      await onReload();
      setDraft((p) => ({ ...p, id }));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveMenuRow = async (row) => {
    if (!vendorId) { setError("Select a vendor first."); return; }
    if (!safeText(row?.name).trim()) { setError("Item name is required"); return; }
    setBusy(true);
    setError("");
    try {
      const id = safeText(row?.id) || `menu_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const payload = {
        id,
        restaurant_id: vendorId,
        category: safeText(row?.category || "General"),
        name: safeText(row?.name || ""),
        description: safeText(row?.description || ""),
        price: Number(row?.price || 0),
        image: row?.image || null,
        available: row?.available !== false,
        is_veg: row?.isVeg === true || row?.is_veg === true
      };
      await onUpsert(TABLES.MENU_ITEMS, [payload]);
      await onReload();
      setMenuEdits((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      startNewMenuRow();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const updateMenuEdit = (id, key, value) => {
    setMenuEdits((prev) => {
      const base = prev[id] || vendorItems.find((m) => String(m.id) === String(id)) || {};
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const deleteItem = async (id) => {
    const ok = window.confirm("Delete this menu item?");
    if (!ok) return;
    const typed = window.prompt("Type DELETE to confirm menu item deletion", "");
    if (safeText(typed) !== "DELETE") {
      setError("Delete cancelled: confirmation text did not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onDelete(TABLES.MENU_ITEMS, id, "id", "DELETE");
      await onReload();
      startNew();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveVendor = async () => {
    const nextId = vendorDraft.id || `vendor_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    if (!vendorDraft.name.trim()) { setError("Vendor name is required"); return; }
    setBusy(true);
    setError("");
    try {
      const row = {
        id: nextId,
        name: vendorDraft.name,
        location: vendorDraft.location || "",
        description: vendorDraft.description || "",
        cuisine: vendorDraft.cuisineCsv.split(",").map((x) => x.trim()).filter(Boolean),
        hero_image: vendorDraft.heroImage || "",
        available: !!vendorDraft.available
      };
      await onUpsert(TABLES.RESTAURANTS, [row]);
      await onReload();
      setVendorId(nextId);
      setVendorMode("edit");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteVendor = async () => {
    if (!vendorDraft.id) return;
    const ok = window.confirm("Delete vendor and all its menu items?");
    if (!ok) return;
    const typed = window.prompt("Type DELETE_VENDOR to confirm vendor deletion", "");
    if (safeText(typed) !== "DELETE_VENDOR") {
      setError("Delete cancelled: confirmation text did not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await http("/api/admin/food-vendors/delete-vendor", {
        method: "POST",
        body: JSON.stringify({ restaurantId: vendorDraft.id, confirmText: "DELETE_VENDOR" })
      });
      await onReload();
      setVendorId("");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const uploadVendorHero = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "images/food");
      const r = await fetch("/api/admin/upload-image", { method: "POST", credentials: "include", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "UPLOAD_FAILED");
      setVendorDraft((p) => ({ ...p, heroImage: j.url || j.path || "" }));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const uploadMenuImage = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "images/food/menu");
      const r = await fetch("/api/admin/upload-image", { method: "POST", credentials: "include", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "UPLOAD_FAILED");
      setDraft((p) => ({ ...p, image: j.url || j.path || "" }));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const uploadMenuTableImage = async (file, onDone) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "images/food/menu");
      const r = await fetch("/api/admin/upload-image", { method: "POST", credentials: "include", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "UPLOAD_FAILED");
      onDone(j.url || j.path || "");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveMenuJsonReplace = async () => {
    if (!vendorId) return;
    setBusy(true);
    setError("");
    try {
      const parsed = JSON.parse(menuJson);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
      // Normalize: ensure ids exist and coerce a few fields.
      const normalized = parsed.map((x) => ({
        id: safeText(x?.id || ""),
        category: safeText(x?.category || "General"),
        name: safeText(x?.name || ""),
        description: safeText(x?.description || ""),
        price: Number(x?.price || 0),
        image: x?.image ?? x?.hero_image ?? null,
        available: x?.available !== false,
        is_veg: x?.is_veg === true || x?.isVeg === true
      })).filter((x) => x.id && x.name);
      if (!normalized.length) throw new Error("At least 1 item with {id,name} is required");

      await http("/api/admin/food-vendors/replace-menu", {
        method: "POST",
        body: JSON.stringify({ restaurantId: vendorId, items: normalized })
      });
      await onReload();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workspace compact-workspace">
      <div className="pane">
        <div className="pane-title">
          <div>Vendors</div>
          <button className="btn small" onClick={startNewVendor} disabled={busy}>+ Add</button>
        </div>
        <input className="input" value={vendorQuery} onChange={(e) => setVendorQuery(e.target.value)} placeholder="Search vendors..." />
        <div className="list mt-10">
          {filteredVendors.map((r) => (
            <div
              key={r.id}
              className={`vendor-card ${String(r.id) === String(vendorId) ? "active" : ""}`}
              onClick={() => { setVendorId(r.id); }}
              role="button"
              tabIndex={0}
            >
              <div className="vendor-name">{safeText(r.name || "").slice(0, 60) || r.id}</div>
              <div className="vendor-sub">{safeText(r.location || "").slice(0, 40)}</div>
              <div className="vendor-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn small" onClick={() => { setVendorId(r.id); setVendorMode("edit"); startNew(); }} disabled={busy}>Edit</button>
                <button className="btn small danger" onClick={() => { setVendorId(r.id); setTimeout(() => deleteVendor(), 0); }} disabled={busy}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pane">
        <div className="pane-title">
          <div>Vendor Frontend Preview</div>
          <div className="mini-row">
            <button className="btn small primary" onClick={onReload} disabled={busy}>Reload</button>
            <button className="btn small" onClick={() => {}} disabled={true}>Save All</button>
          </div>
        </div>
        {vendor ? (
          <div className="vendor-preview">
            {vendorImages[0] ? (
              <img className="img" src={vendorImages[0]} alt="" onClick={() => onOpenImages(vendor?.name || "Vendor images", vendorImages, 0)} />
            ) : (
              <div className="img-chip"><span>No image</span></div>
            )}
            <div>
              <div className="vendor-name fs-18">{safeText(vendor.name || vendor.id)}</div>
              <div className="vendor-sub">{safeText(vendor.location || "").slice(0, 60)}</div>
              <div className="small mt-6">{safeText(vendor.description || "").slice(0, 180)}</div>
            </div>
          </div>
        ) : vendorMode === "new" ? (
          <div className="small">Creating a new vendor.</div>
        ) : (
          <div className="small">Select a vendor.</div>
        )}

        <div className="menu-grid">
          <div className="pane-title mt-2">
            <div>Vendor Menu</div>
            <button className="btn small" onClick={() => { /* fallback to table view handled by main tabs */ }} disabled>Table</button>
          </div>

          {error ? <div className="warn">{error}</div> : null}

          {(vendorMode === "new" || vendorMode === "edit") ? (
            <div className="card m-0">
              <div className="small mb-8">{vendorMode === "new" ? "Add Vendor" : "Edit Vendor"}</div>
              <div className="split-row">
                <div className="field">
                  <label>Name *</label>
                  <input className="input" value={vendorDraft.name} onChange={(e) => setVendorDraft((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input className="input" value={vendorDraft.location} onChange={(e) => setVendorDraft((p) => ({ ...p, location: e.target.value }))} />
                </div>
              </div>
              <div className="split-row mt-10">
                <div className="field">
                  <label>Cuisine (comma separated)</label>
                  <input className="input" value={vendorDraft.cuisineCsv} onChange={(e) => setVendorDraft((p) => ({ ...p, cuisineCsv: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Hero Image (URL)</label>
                  <div className="flex-gap10-center">
                    <input className="input flex-1" value={vendorDraft.heroImage} onChange={(e) => setVendorDraft((p) => ({ ...p, heroImage: e.target.value }))} placeholder="https://..." />
                    <label className="btn small pointer">
                      Upload
                      <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadVendorHero(e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="field full mt-10">
                <label>Description</label>
                <textarea className="textarea" value={vendorDraft.description} onChange={(e) => setVendorDraft((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="toggle-row">
                <div className={`pill-toggle ${vendorDraft.available ? "on" : ""}`} onClick={() => setVendorDraft((p) => ({ ...p, available: !p.available }))}>Available</div>
                {vendorDraft.heroImage ? (
                  <button className="btn small" onClick={() => onOpenImages("Hero image", [vendorDraft.heroImage], 0)} disabled={busy}>Preview</button>
                ) : null}
              </div>
              <div className="mt-10 flex-gap10-wrap">
                <button className="btn primary" onClick={saveVendor} disabled={busy}>Save Vendor</button>
                <button className="btn danger" onClick={deleteVendor} disabled={busy}>Delete Vendor</button>
              </div>
            </div>
          ) : null}

          <div className="two-tabs">
            <button className={`tab ${rightTab === "visual" ? "active" : ""}`} onClick={() => setRightTab("visual")}>Visual</button>
            <button className={`tab ${rightTab === "json" ? "active" : ""}`} onClick={() => setRightTab("json")}>JSON</button>
          </div>

          {rightTab === "visual" ? (
            <div className="card m-0">
              <div className="row mb-8">
                <input className="input" value={menuQuery} onChange={(e) => setMenuQuery(e.target.value)} placeholder="Search..." />
                <button className="btn small" onClick={startNewMenuRow} disabled={busy}><FaPlus /> Add</button>
              </div>
              <div className="table-wrap mt-10">
                <table className="table menu-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Available</th>
                      <th>Veg</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="thumb-cell">
                        {newMenuItem.image ? <img className="thumb" src={newMenuItem.image} alt="" /> : null}
                        <label className="btn small pointer mt-4">
                          Upload
                          <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadMenuTableImage(e.target.files?.[0], (url) => setNewMenuItem((p) => ({ ...p, image: url })))} />
                        </label>
                      </td>
                      <td><input className="input" value={newMenuItem.id} onChange={(e) => setNewMenuItem((p) => ({ ...p, id: e.target.value }))} placeholder="auto" /></td>
                      <td><input className="input" value={newMenuItem.name} onChange={(e) => setNewMenuItem((p) => ({ ...p, name: e.target.value }))} placeholder="Item name" /></td>
                      <td><input className="input" value={newMenuItem.category} onChange={(e) => setNewMenuItem((p) => ({ ...p, category: e.target.value }))} placeholder="General" /></td>
                      <td><input className="input" value={newMenuItem.price} onChange={(e) => setNewMenuItem((p) => ({ ...p, price: e.target.value }))} placeholder="0" /></td>
                      <td>
                        <input type="checkbox" checked={newMenuItem.available !== false} onChange={(e) => setNewMenuItem((p) => ({ ...p, available: e.target.checked }))} />
                      </td>
                      <td>
                        <input type="checkbox" checked={newMenuItem.isVeg === true} onChange={(e) => setNewMenuItem((p) => ({ ...p, isVeg: e.target.checked }))} />
                      </td>
                      <td>
                        <button className="btn small primary" onClick={() => saveMenuRow(newMenuItem)} disabled={busy || !vendorId}>Save</button>
                      </td>
                    </tr>
                    {vendorItems.slice((menuPage - 1) * PAGE_SIZE, menuPage * PAGE_SIZE).map((m) => {
                      const edit = menuEdits[m.id] || m;
                      const urls = extractImageUrlsFromRow(edit);
                      return (
                        <tr key={m.id}>
                          <td className="thumb-cell">
                            {urls[0] ? <img className="thumb" src={urls[0]} alt="" onClick={() => onOpenImages("Menu item images", urls, 0)} /> : null}
                            <label className="btn small pointer mt-4">
                              Upload
                              <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadMenuTableImage(e.target.files?.[0], (url) => updateMenuEdit(m.id, "image", url))} />
                            </label>
                          </td>
                          <td><input className="input" value={safeText(edit.id)} onChange={(e) => updateMenuEdit(m.id, "id", e.target.value)} /></td>
                          <td><input className="input" value={safeText(edit.name)} onChange={(e) => updateMenuEdit(m.id, "name", e.target.value)} /></td>
                          <td><input className="input" value={safeText(edit.category)} onChange={(e) => updateMenuEdit(m.id, "category", e.target.value)} /></td>
                          <td><input className="input" value={safeText(edit.price)} onChange={(e) => updateMenuEdit(m.id, "price", e.target.value)} /></td>
                          <td>
                            <input type="checkbox" checked={edit.available !== false} onChange={(e) => updateMenuEdit(m.id, "available", e.target.checked)} />
                          </td>
                          <td>
                            <input type="checkbox" checked={edit.is_veg === true || edit.isVeg === true} onChange={(e) => updateMenuEdit(m.id, "isVeg", e.target.checked)} />
                          </td>
                          <td>
                            <div className="flex-gap6">
                              <button className="btn small primary" onClick={() => saveMenuRow(edit)} disabled={busy}>Save</button>
                              <button className="btn small danger" onClick={() => deleteItem(safeText(m.id))} disabled={busy}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!vendorItems.length ? (
                      <tr><td colSpan={8} className="small">No menu items yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
                <Pagination
                  page={menuPage}
                  totalPages={Math.max(1, Math.ceil(vendorItems.length / PAGE_SIZE))}
                  onChange={setMenuPage}
                />
              </div>
            </div>
          ) : (
            <div className="card m-0">
              <div className="small">Replace vendor menu as JSON (array of items)</div>
              <textarea className="textarea json-mini mt-10" value={menuJson} onChange={(e) => setMenuJson(e.target.value)} />
              <div className="mt-10 flex-gap10-wrap">
                <button className="btn primary" onClick={saveMenuJsonReplace} disabled={busy || !vendorId}>Save JSON</button>
                <button className="btn" onClick={() => setMenuJson(JSON.stringify(vendorItems, null, 2))} disabled={busy}>Reset</button>
              </div>
              <div className="small mt-8">
                Required fields per item: <code>id</code>, <code>name</code>. Optional: <code>category_id</code>, <code>quantity</code>, <code>description</code>, <code>price</code>, <code>image</code>, <code>available</code>, <code>is_veg</code>.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MartCatalogWorkspace({ snapshot, onReload, onUpsert, onDelete }) {
  const marts = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.MARTS);
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);

  const products = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.PRODUCTS);
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);

  const [martQuery, setMartQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [martId, setMartId] = useState("");
  const [rightTab, setRightTab] = useState("visual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [martMode, setMartMode] = useState("none"); // none | edit | new
  const [martDraft, setMartDraft] = useState({
    id: "",
    name: "",
    location: "",
    phone: "",
    category: "",
    description: "",
    available: true
  });
  const [productDraft, setProductDraft] = useState({
    id: "",
    name: "",
    categoryId: "",
    subCategory: "",
    unit: "",
    description: "",
    price: "",
    mrp: "",
    stock: "",
    maxPerOrder: "",
    isVeg: false,
    brand: "",
    tags: "",
    deliveryPincodes: "",
    type: "",
    rating: "",
    image: "",
    available: true
  });
  const [productEdits, setProductEdits] = useState({});
  const [newProductRow, setNewProductRow] = useState({
    id: "",
    name: "",
    categoryId: "",
    subCategory: "",
    unit: "",
    description: "",
    price: "",
    mrp: "",
    stock: "",
    maxPerOrder: "",
    isVeg: false,
    brand: "",
    tags: "",
    deliveryPincodes: "",
    type: "",
    rating: "",
    image: "",
    available: true
  });
  const [productsJson, setProductsJson] = useState("[]");

  const productMartId = (x) => safeText(x?.mart_partner_id || x?.martPartnerId || "");

  useEffect(() => {
    if (!martId && marts[0]?.id) setMartId(String(marts[0].id));
  }, [marts, martId]);

  const filteredMarts = useMemo(() => {
    const q = martQuery.trim().toLowerCase();
    if (!q) return marts;
    return marts.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
  }, [marts, martQuery]);

  const selectedMart = useMemo(
    () => marts.find((m) => String(m?.id || "") === String(martId || "")) || null,
    [marts, martId]
  );

  const martProducts = useMemo(() => {
    const list = products.filter((p) => productMartId(p) === String(martId || ""));
    const q = productQuery.trim().toLowerCase();
    const filtered = q ? list.filter((p) => JSON.stringify(p).toLowerCase().includes(q)) : list;
    return filtered.slice().sort((a, b) => String(a?.category_id || a?.categoryId || "").localeCompare(String(b?.category_id || b?.categoryId || "")) || String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [products, martId, productQuery]);
  const [productPage, setProductPage] = useState(1);
  useEffect(() => {
    setProductPage(1);
  }, [productQuery, martId]);

  useEffect(() => {
    if (!selectedMart) return;
    if (martMode !== "edit") return;
    setMartDraft({
      id: safeText(selectedMart?.id || ""),
      name: safeText(selectedMart?.name || ""),
      location: safeText(selectedMart?.location || ""),
      phone: safeText(selectedMart?.phone || selectedMart?.phone_number || ""),
      category: safeText(selectedMart?.category || ""),
      description: safeText(selectedMart?.description || ""),
      available: selectedMart?.available !== false
    });
    setProductsJson(JSON.stringify(martProducts, null, 2));
  }, [selectedMart?.id, martProducts.length, martMode]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const v = safeText(p?.category_id || p?.categoryId || "");
      if (v) set.add(v);
    });
    return Array.from(set);
  }, [products]);
  const productNameOptions = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const v = safeText(p?.name || "");
      if (v) set.add(v);
    });
    return Array.from(set);
  }, [products]);

  const resetProductDraft = () => {
    setProductDraft({
      id: "",
      name: "",
      categoryId: "",
      subCategory: "",
      unit: "",
      description: "",
      price: "",
      mrp: "",
      stock: "",
      maxPerOrder: "",
      isVeg: false,
      brand: "",
      tags: "",
      deliveryPincodes: "",
      type: "",
      rating: "",
      image: "",
      available: true
    });
  };

  const editProduct = (item) => {
    setProductDraft({
      id: safeText(item?.id || ""),
      name: safeText(item?.name || ""),
      martPartnerId: safeText(item?.mart_partner_id || item?.martPartnerId || ""),
      categoryId: safeText(item?.category_id || item?.categoryId || ""),
      subCategory: safeText(item?.sub_category || item?.subCategory || ""),
      unit: safeText(item?.unit || ""),
      description: safeText(item?.description || ""),
      price: safeText(item?.price ?? ""),
      mrp: safeText(item?.mrp ?? ""),
      stock: safeText(item?.stock ?? ""),
      maxPerOrder: safeText(item?.max_per_order ?? item?.maxPerOrder ?? ""),
      isVeg: item?.is_veg === true || item?.isVeg === true,
      brand: safeText(item?.brand || ""),
      tags: Array.isArray(item?.tags) ? item.tags.join(", ") : safeText(item?.tags || ""),
      deliveryPincodes: safeText(item?.delivery_pincodes || ""),
      type: safeText(item?.type || ""),
      rating: safeText(item?.rating ?? ""),
      image: safeText(item?.image || item?.hero_image || ""),
      available: item?.available !== false
    });
  };

  const startNewProductRow = () => {
    setNewProductRow({
      id: "",
      name: "",
      categoryId: "",
      subCategory: "",
      unit: "",
      description: "",
      price: "",
      mrp: "",
      stock: "",
      maxPerOrder: "",
      isVeg: false,
      brand: "",
      tags: "",
      deliveryPincodes: "",
      type: "",
      rating: "",
      image: "",
      available: true
    });
  };

  const updateProductEdit = (id, key, value) => {
    setProductEdits((prev) => {
      const base = prev[id] || martProducts.find((p) => String(p.id) === String(id)) || {};
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const saveMart = async () => {
    if (!martDraft.name.trim()) { setError("Mart name is required"); return; }
    setBusy(true);
    setError("");
    try {
      const id = martDraft.id || `mart_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      await onUpsert(TABLES.MARTS, [{
        id,
        name: martDraft.name,
        location: martDraft.location || "",
        phone: martDraft.phone || "",
        category: martDraft.category || "",
        description: martDraft.description || "",
        available: !!martDraft.available
      }]);
      await onReload();
      setMartId(id);
      setMartMode("edit");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async () => {
    if (!martId) { setError("Select a mart first."); return; }
    if (!productDraft.name.trim()) { setError("Product name is required"); return; }
    setBusy(true);
    setError("");
    try {
      const id = productDraft.id || `prod_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const image = safeText(productDraft.image || "").trim() || "https://placehold.co/600x400?text=Image";
      await onUpsert(TABLES.PRODUCTS, [{
        id,
        mart_partner_id: martId,
        name: productDraft.name,
        category_id: productDraft.categoryId || null,
        sub_category: productDraft.subCategory || "",
        unit: productDraft.unit || "",
        description: productDraft.description || "",
        price: Number(productDraft.price || 0),
        mrp: Number(productDraft.mrp || 0) || null,
        stock: Number(productDraft.stock || 0) || null,
        max_per_order: Number(productDraft.maxPerOrder || 0) || 0,
        is_veg: !!productDraft.isVeg,
        tags: productDraft.tags ? productDraft.tags.split(",").map((x) => x.trim()).filter(Boolean) : [],
        brand: productDraft.brand || "",
        delivery_pincodes: productDraft.deliveryPincodes || "",
        type: productDraft.type || "",
        rating: Number(productDraft.rating || 0) || 0,
        image,
        available: !!productDraft.available
      }]);
      await onReload();
      setProductDraft((p) => ({ ...p, id }));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveProductRow = async (row) => {
    if (!martId) { setError("Select a mart first."); return; }
    if (!safeText(row?.name).trim()) { setError("Product name is required"); return; }
    setBusy(true);
    setError("");
    try {
      const id = safeText(row?.id) || `prod_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const image = safeText(row?.image || "").trim() || "https://placehold.co/600x400?text=Image";
      await onUpsert(TABLES.PRODUCTS, [{
        id,
        mart_partner_id: martId,
        name: safeText(row?.name || ""),
        category_id: safeText(row?.categoryId || row?.category_id || "") || null,
        sub_category: safeText(row?.subCategory || row?.sub_category || ""),
        unit: safeText(row?.unit || ""),
        description: safeText(row?.description || ""),
        price: Number(row?.price || 0),
        mrp: Number(row?.mrp || 0) || null,
        stock: Number(row?.stock || 0) || null,
        max_per_order: Number(row?.maxPerOrder || row?.max_per_order || 0) || 0,
        is_veg: row?.isVeg === true || row?.is_veg === true,
        tags: safeText(row?.tags || "").split(",").map((x) => x.trim()).filter(Boolean),
        brand: safeText(row?.brand || ""),
        delivery_pincodes: safeText(row?.deliveryPincodes || row?.delivery_pincodes || ""),
        type: safeText(row?.type || ""),
        rating: Number(row?.rating || 0) || 0,
        image,
        available: row?.available !== false
      }]);
      await onReload();
      setProductEdits((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      startNewProductRow();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const uploadProductImage = async (file, onDone) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "images/marts");
      const r = await fetch("/api/admin/upload-image", { method: "POST", credentials: "include", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "UPLOAD_FAILED");
      onDone(j.url || j.path || "");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteProduct = async (id) => {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;
    const typed = window.prompt("Type DELETE to confirm product deletion", "");
    if (safeText(typed) !== "DELETE") { setError("Delete cancelled: confirmation text did not match."); return; }
    setBusy(true);
    setError("");
    try {
      await onDelete(TABLES.PRODUCTS, id, "id", "DELETE");
      await onReload();
      resetProductDraft();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteMart = async () => {
    if (!martId) return;
    const ok = window.confirm("Delete this mart and all of its products?");
    if (!ok) return;
    const typed = window.prompt("Type DELETE_MART to confirm mart deletion", "");
    if (safeText(typed) !== "DELETE_MART") { setError("Delete cancelled: confirmation text did not match."); return; }
    setBusy(true);
    setError("");
    try {
      const rows = products.filter((p) => productMartId(p) === String(martId));
      for (const p of rows) {
        const id = safeText(p?.id || "");
        if (!id) continue;
        await onDelete(TABLES.PRODUCTS, id, "id", "DELETE");
      }
      await onDelete(TABLES.MARTS, martId, "id", "DELETE");
      await onReload();
      setMartId("");
      resetProductDraft();
      setMartMode("none");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveProductsJson = async () => {
    if (!martId) { setError("Select a mart first."); return; }
    setBusy(true);
    setError("");
    try {
      const parsed = JSON.parse(productsJson);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
      const normalized = parsed.map((x) => ({
        id: safeText(x?.id || ""),
        mart_partner_id: martId,
        name: safeText(x?.name || ""),
        category_id: safeText(x?.category_id || x?.categoryId || ""),
        sub_category: safeText(x?.sub_category || x?.subCategory || ""),
        unit: safeText(x?.unit || ""),
        description: safeText(x?.description || ""),
        price: Number(x?.price || 0),
        mrp: Number(x?.mrp || 0) || null,
        stock: Number(x?.stock || 0) || null,
        max_per_order: Number(x?.max_per_order || x?.maxPerOrder || 0) || null,
        is_veg: x?.is_veg === true || x?.isVeg === true,
        tags: Array.isArray(x?.tags) ? x.tags : safeText(x?.tags || "").split(",").map((s) => s.trim()).filter(Boolean),
        brand: safeText(x?.brand || ""),
        delivery_pincodes: safeText(x?.delivery_pincodes || x?.deliveryPincodes || ""),
        type: safeText(x?.type || ""),
        rating: Number(x?.rating || 0) || null,
        image: x?.image ?? x?.hero_image ?? null,
        available: x?.available !== false
      })).filter((x) => x.id && x.name);
      if (!normalized.length) throw new Error("At least 1 item with {id,name} is required");
      await onUpsert(TABLES.PRODUCTS, normalized);
      await onReload();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workspace">
      <div className="pane">
        <div className="pane-title">
          <div>Marts</div>
          <button className="btn small" onClick={() => { setMartDraft({ id: "", name: "", location: "", phone: "", category: "", description: "", available: true }); setMartId(""); setMartMode("new"); }} disabled={busy}>+ Add</button>
        </div>
        <input className="input" value={martQuery} onChange={(e) => setMartQuery(e.target.value)} placeholder="Search marts..." />
        <div className="list mt-10">
          {filteredMarts.map((m) => (
            <div
              key={safeText(m?.id || "")}
              className={`vendor-card ${String(m?.id || "") === String(martId || "") ? "active" : ""}`}
              onClick={() => { setMartId(String(m?.id || "")); }}
              role="button"
              tabIndex={0}
            >
              <div className="vendor-name">{safeText(m?.name || m?.id || "")}</div>
              <div className="vendor-sub">{safeText(m?.location || "").slice(0, 40)}</div>
              <div className="vendor-actions">
                <button
                  className="btn small"
                  onClick={() => {
                    setMartId(String(m?.id || ""));
                    setMartMode("edit");
                    resetProductDraft();
                    setMartDraft({
                      id: safeText(m?.id || ""),
                      name: safeText(m?.name || ""),
                      location: safeText(m?.location || ""),
                      phone: safeText(m?.phone || m?.phone_number || ""),
                      category: safeText(m?.category || ""),
                      description: safeText(m?.description || ""),
                      available: m?.available !== false
                    });
                  }}
                  disabled={busy}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pane">
          <div className="pane-title">
            <div>Mart Products</div>
            <div className="mini-row">
              <button className="btn small primary" onClick={onReload} disabled={busy}>Reload</button>
              <button className="btn small" onClick={() => setRightTab("pricing")}>Pricing Controls</button>
            </div>
          </div>

        {error ? <div className="warn">{error}</div> : null}

        {martMode === "none" ? (
          <div className="small">Select a mart or click Add.</div>
        ) : (
        <div className="card m-0">
          <div className="small mb-8">{martMode === "new" ? "Add Mart" : "Edit Mart"}</div>
          <div className="split-row">
            <div className="field">
              <label>Mart Name *</label>
              <input className="input" value={martDraft.name} onChange={(e) => setMartDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Location</label>
              <input className="input" value={martDraft.location} onChange={(e) => setMartDraft((p) => ({ ...p, location: e.target.value }))} />
            </div>
          </div>
          <div className="split-row mt-10">
            <div className="field">
              <label>Phone</label>
              <input className="input" value={martDraft.phone} onChange={(e) => setMartDraft((p) => ({ ...p, phone: e.target.value }))} placeholder="+91-00000-00000" />
            </div>
            <div className="field">
              <label>Category</label>
              <input className="input" value={martDraft.category || ""} onChange={(e) => setMartDraft((p) => ({ ...p, category: e.target.value }))} placeholder="General" />
            </div>
          </div>
          <div className="field full mt-10">
            <label>Description</label>
            <textarea className="textarea" value={martDraft.description} onChange={(e) => setMartDraft((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="toggle-row">
            <div className={`pill-toggle ${martDraft.available ? "on" : ""}`} onClick={() => setMartDraft((p) => ({ ...p, available: !p.available }))}>Available</div>
          </div>
          <div className="mt-10 flex-gap10-wrap">
            <button className="btn primary" onClick={saveMart} disabled={busy}>Save Mart</button>
            <button className="btn danger" onClick={deleteMart} disabled={busy || !martId}>Delete Mart</button>
          </div>
        </div>
        )}

        <div className="two-tabs">
          <button className={`tab ${rightTab === "visual" ? "active" : ""}`} onClick={() => setRightTab("visual")}>Visual</button>
          <button className={`tab ${rightTab === "json" ? "active" : ""}`} onClick={() => setRightTab("json")}>JSON</button>
          <button className={`tab ${rightTab === "pricing" ? "active" : ""}`} onClick={() => setRightTab("pricing")}>Pricing</button>
        </div>

        {rightTab === "pricing" ? (
          <PricingControlsWorkspace
            snapshot={snapshot}
            onReload={onReload}
            onUpsert={onUpsert}
          />
        ) : rightTab === "visual" ? (
          <div className="card m-0">
            <div className="row mb-8">
              <input className="input" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products..." />
              <button className="btn small" onClick={startNewProductRow} disabled={busy}><FaPlus /> Add</button>
            </div>
            <div className="table-wrap mt-10">
              <table className="table menu-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th className="col-name">Name</th>
                    <th>Category ID</th>
                    <th>Unit</th>
                    <th>MRP</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="thumb-cell">
                      {newProductRow.image ? <img className="thumb" src={newProductRow.image} alt="" /> : null}
                      <label className="btn small pointer mt-4">
                        Upload
                        <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadProductImage(e.target.files?.[0], (url) => setNewProductRow((p) => ({ ...p, image: url })))} />
                      </label>
                    </td>
                    <td>
                      <input
                        className="input"
                        value={newProductRow.name}
                        onChange={(e) => setNewProductRow((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Product name"
                        list="mart-product-name-options"
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={newProductRow.categoryId}
                        onChange={(e) => setNewProductRow((p) => ({ ...p, categoryId: e.target.value }))}
                        placeholder="cat_dairy"
                        list="mart-category-options"
                      />
                    </td>
                    <td><input className="input" value={newProductRow.unit} onChange={(e) => setNewProductRow((p) => ({ ...p, unit: e.target.value }))} placeholder="1L / 500g" /></td>
                    <td><input className="input" value={newProductRow.mrp} onChange={(e) => setNewProductRow((p) => ({ ...p, mrp: e.target.value }))} placeholder="0" /></td>
                    <td><input className="input" value={newProductRow.price} onChange={(e) => setNewProductRow((p) => ({ ...p, price: e.target.value }))} placeholder="0" /></td>
                    <td><input className="input" value={newProductRow.stock} onChange={(e) => setNewProductRow((p) => ({ ...p, stock: e.target.value }))} placeholder="0" /></td>
                    <td>
                      <input type="checkbox" checked={newProductRow.available !== false} onChange={(e) => setNewProductRow((p) => ({ ...p, available: e.target.checked }))} />
                    </td>
                    <td>
                      <button className="btn small primary" onClick={() => saveProductRow({ ...newProductRow, id: newProductRow.id || `prod_${Date.now()}_${Math.random().toString(16).slice(2)}` })} disabled={busy || !martId}>Save</button>
                    </td>
                  </tr>
                  {martProducts.slice((productPage - 1) * PAGE_SIZE, productPage * PAGE_SIZE).map((p) => {
                    const edit = productEdits[p.id] || p;
                    return (
                      <tr key={safeText(p?.id || "")}>
                        <td className="thumb-cell">
                          {edit.image ? <img className="thumb" src={edit.image} alt="" /> : null}
                          <label className="btn small pointer mt-4">
                            Upload
                            <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadProductImage(e.target.files?.[0], (url) => updateProductEdit(p.id, "image", url))} />
                          </label>
                        </td>
                        <td>
                          <input
                            className="input"
                            value={safeText(edit.name)}
                            onChange={(e) => updateProductEdit(p.id, "name", e.target.value)}
                            list="mart-product-name-options"
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            value={safeText(edit.category_id || edit.categoryId)}
                            onChange={(e) => updateProductEdit(p.id, "categoryId", e.target.value)}
                            list="mart-category-options"
                          />
                        </td>
                        <td><input className="input" value={safeText(edit.unit)} onChange={(e) => updateProductEdit(p.id, "unit", e.target.value)} /></td>
                        <td><input className="input" value={safeText(edit.mrp)} onChange={(e) => updateProductEdit(p.id, "mrp", e.target.value)} /></td>
                        <td><input className="input" value={safeText(edit.price)} onChange={(e) => updateProductEdit(p.id, "price", e.target.value)} /></td>
                        <td><input className="input" value={safeText(edit.stock)} onChange={(e) => updateProductEdit(p.id, "stock", e.target.value)} /></td>
                        <td>
                          <input type="checkbox" checked={edit.available !== false} onChange={(e) => updateProductEdit(p.id, "available", e.target.checked)} />
                        </td>
                        <td>
                          <div className="flex-gap6">
                            <button className="btn small primary" onClick={() => saveProductRow(edit)} disabled={busy}>Save</button>
                            <button className="btn small danger" onClick={() => deleteProduct(safeText(p?.id || ""))} disabled={busy}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!martProducts.length ? <tr><td colSpan={9} className="small">No products yet.</td></tr> : null}
                </tbody>
              </table>
              <datalist id="mart-category-options">
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              <datalist id="mart-product-name-options">
                {productNameOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              <Pagination
                page={productPage}
                totalPages={Math.max(1, Math.ceil(martProducts.length / PAGE_SIZE))}
                onChange={setProductPage}
              />
            </div>
          </div>
        ) : (
          <div className="card m-0">
            <div className="small">Edit products for selected mart as JSON array</div>
            <textarea className="textarea json-mini mt-10" value={productsJson} onChange={(e) => setProductsJson(e.target.value)} />
            <div className="mt-10 flex-gap10-wrap">
              <button className="btn primary" onClick={saveProductsJson} disabled={busy || !martId}>Save JSON</button>
              <button className="btn" onClick={() => setProductsJson(JSON.stringify(martProducts, null, 2))} disabled={busy}>Reset</button>
            </div>
            <div className="small mt-8">
              Required fields per item: <code>id</code>, <code>name</code>. Optional: <code>category_id</code>, <code>quantity</code>, <code>description</code>, <code>price</code>, <code>image</code>, <code>available</code>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getRowPriceValue(row) {
  const directKeys = ["price", "price_per_night", "pricePerNight", "rate_per_km", "ratePerKm", "daily_rate", "dailyRate", "amount", "rent", "fare"];
  for (const k of directKeys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  const pricing = row?.pricing && typeof row.pricing === "object" ? row.pricing : safeJsonParse(row?.pricing || "") || {};
  const pv = pricing?.selling_price ?? pricing?.sellingPrice ?? pricing?.price ?? pricing?.market_price ?? pricing?.marketPrice;
  if (pv !== undefined && pv !== null && pv !== "" && !Number.isNaN(Number(pv))) return Number(pv);
  return null;
}

function withUpdatedRowPrice(row, nextPrice) {
  const out = { ...(row || {}) };
  const n = Math.max(0, Number(nextPrice || 0));
  const directKeys = ["price", "price_per_night", "pricePerNight", "rate_per_km", "ratePerKm", "daily_rate", "dailyRate", "amount", "rent", "fare"];
  let wroteDirect = false;
  for (const k of directKeys) {
    if (Object.prototype.hasOwnProperty.call(out, k)) {
      out[k] = n;
      wroteDirect = true;
    }
  }
  let pricing = out?.pricing;
  if (typeof pricing === "string") pricing = safeJsonParse(pricing) || {};
  if (Array.isArray(pricing)) pricing = pricing[0] || {};
  if (pricing && typeof pricing === "object") {
    const market = Number(pricing.market_price ?? pricing.marketPrice ?? n);
    const cost = Number(pricing.cost_price ?? pricing.costPrice ?? 0);
    const safeSelling = Math.max(cost, n);
    out.pricing = {
      ...pricing,
      market_price: Number.isNaN(market) ? n : market,
      cost_price: Number.isNaN(cost) ? 0 : cost,
      selling_price: safeSelling
    };
  } else if (!wroteDirect) {
    out.price = n;
  }
  return out;
}

function PricingControlsWorkspace({ snapshot, onReload, onUpsert }) {
  const byName = useMemo(() => new Map((snapshot?.tables || []).map((t) => [t.name, t])), [snapshot?.generatedAt]);
  const groups = useMemo(() => ([
    { key: "tours", label: "Tours", table: TABLES.TOURS, rows: byName.get(TABLES.TOURS)?.rows || [] },
    { key: "hotels", label: "Hotels", table: TABLES.HOTELS, rows: (byName.get(TABLES.HOTELS)?.rows || []).filter((r) => !isLikelyCottage(r)) },
    { key: "cottages", label: "Cottages", table: TABLES.HOTELS, rows: (byName.get(TABLES.HOTELS)?.rows || []).filter((r) => isLikelyCottage(r)) },
    { key: "cab", label: "Cab Rates", table: TABLES.CAB_PROVIDERS, rows: byName.get(TABLES.CAB_PROVIDERS)?.rows || [] },
    { key: "bike", label: "Bike Rentals", table: TABLES.BIKE_RENTALS, rows: byName.get(TABLES.BIKE_RENTALS)?.rows || [] }
  ]), [byName]);
  const [activeGroup, setActiveGroup] = useState("tours");
  const [adjustPct, setAdjustPct] = useState("0");
  const [gstPct, setGstPct] = useState("5");
  const [reason, setReason] = useState("");
  const [basePrice, setBasePrice] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const pct = Number(adjustPct || 0);
  const gst = Number(gstPct || 0);
  const base = Number(basePrice || 0);
  const afterAdjust = base + (base * (Number.isNaN(pct) ? 0 : pct) / 100);
  const customer = afterAdjust + (afterAdjust * (Number.isNaN(gst) ? 0 : gst) / 100);
  const active = groups.find((g) => g.key === activeGroup) || groups[0];

  const applyPricing = async () => {
    if (!active || !active.rows.length) {
      setMsg("No rows available for selected category.");
      return;
    }
    const factor = 1 + ((Number.isNaN(pct) ? 0 : pct) / 100);
    const gstFactor = 1 + ((Number.isNaN(gst) ? 0 : gst) / 100);
    const updated = active.rows.map((row) => {
      const current = getRowPriceValue(row);
      if (current === null) return row;
      const next = Math.round(current * factor * gstFactor * 100) / 100;
      const out = withUpdatedRowPrice(row, next);
      out.price_dropped = pct < 0;
      out.price_drop_percent = pct < 0 ? Math.abs(pct) : 0;
      if (reason.trim()) out.additional_comments = reason.trim();
      return out;
    });
    setBusy(true);
    setMsg("");
    try {
      await onUpsert(active.table, updated);
      await onReload();
      setMsg(`Saved pricing for ${active.label}.`);
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pricing-wrap">
      <div className="pricing-card">
        <h3 className="m-0">ExploreValley Pricing Controls</h3>
        <div className="small mt-8">Set global price adjustment and GST. Customer pricing = base value +/- adjustment + GST.</div>
        <div className="tabs mt-10">
          {groups.map((g) => (
            <button key={g.key} className={`tab ${activeGroup === g.key ? "active" : ""}`} onClick={() => setActiveGroup(g.key)}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="form-grid mt-10">
          <div className="field">
            <label>Price Adjustment (%)</label>
            <input className="input" type="number" value={adjustPct} onChange={(e) => setAdjustPct(e.target.value)} />
          </div>
          <div className="field">
            <label>GST (%)</label>
            <input className="input" type="number" value={gstPct} onChange={(e) => setGstPct(e.target.value)} />
          </div>
          <div className="field full">
            <label>Reason (optional)</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this price update was applied" />
          </div>
        </div>

        <div className="pricing-preview mt-10">
          <div className="small mb-6">Base vs Customer Price Preview</div>
          <div className="form-grid">
            <div className="field">
              <label>Base Price (INR)</label>
              <input className="input" type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
            <div className="field">
              <label>Customer Price (INR)</label>
              <input className="input" readOnly value={Number.isFinite(customer) ? Math.round(customer).toLocaleString("en-IN") : "0"} />
            </div>
          </div>
          <div className="small mt-8">
            Base: INR {Number.isFinite(base) ? Math.round(base).toLocaleString("en-IN") : 0} {"->"} After {pct || 0}%: INR {Number.isFinite(afterAdjust) ? Math.round(afterAdjust).toLocaleString("en-IN") : 0} {"->"} After GST {gst || 0}%: INR {Number.isFinite(customer) ? Math.round(customer).toLocaleString("en-IN") : 0}
          </div>
        </div>

        <div className="flex-gap10-wrap mt-12">
          <button className="btn primary" onClick={applyPricing} disabled={busy}><FaSave /> {busy ? "Saving..." : "Save Pricing Config"}</button>
          <button className="btn" onClick={onReload} disabled={busy}><FaRedo /> Reload Config</button>
        </div>
        {msg ? <div className="small mt-10">{msg}</div> : <div className="small mt-10">Loaded from Supabase settings.</div>}
      </div>
    </div>
  );
}

function FormEditor({ table, selectedRow, onSave, onOpenImages, onUpsertPartial, contextPage, catalogLookup }) {
  const initial = useMemo(() => {
    const out = {};
    (table.columns || []).forEach((c) => {
      out[c.name] = selectedRow?.[c.name] ?? "";
    });
    // Default ID for new rows when creating from pages that share a table.
    if (!selectedRow && out.id !== undefined) {
      const prefix = (contextPage === "cottages" && table.name === TABLES.HOTELS) ? "cottage_" : "";
      out.id = `${prefix}${makeUuid()}`;
    }
    return out;
  }, [table, selectedRow, contextPage]);

  const [form, setForm] = useState(initial);
  const tableColSet = useMemo(() => new Set((table.columns || []).map((c) => c.name)), [table.columns]);
  const hasCol = (name) => tableColSet.has(name);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const parseValue = (raw) => {
    if (raw === null || raw === undefined) return raw;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "object") return raw;
    if (typeof raw === "number" || typeof raw === "boolean") return raw;
    if (raw === "") return null;
    const trimmed = String(raw).trim();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try { return JSON.parse(trimmed); } catch { return raw; }
    }
    return raw;
  };
  const parseValueForColumn = (col, raw) => {
    const t = safeText(col?.type).toLowerCase();
    if (raw === null || raw === undefined) return raw;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "object") return raw;
    if (typeof raw === "number" || typeof raw === "boolean") return raw;
    const rawText = String(raw);
    const trimmed = rawText.trim();
    if (trimmed === "") {
      if (t === "array") return [];
      if (t === "object" || t === "json" || t === "jsonb") return {};
      if (t === "number" || t === "integer" || t === "float" || t === "double") return null;
      // Keep empty text as empty string to avoid NOT NULL text-column failures.
      return "";
    }
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if ((t === "number" || t === "integer" || t === "float" || t === "double") && !Number.isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try { return JSON.parse(trimmed); } catch { return rawText; }
    }
    return rawText;
  };

  const isUploadableField = (name) => {
    const n = safeText(name).toLowerCase();
    if (!n) return false;
    if (n.includes("image")) return true;
    if (n.endsWith("_url") || n.endsWith("url")) return true;
    if (n.includes("aadhaar")) return true;
    if (n.includes("avatar")) return true;
    return false;
  };

  const uploadForField = async (fieldName, file) => {
    if (!file) return;
    const keyCol = keyColumnForTable(table);
    const keyVal = safeText(form?.[keyCol] ?? selectedRow?.[keyCol] ?? selectedRow?.id ?? "");
    const fd = new FormData();
    fd.append("image", file);
    fd.append("folder", `images/${safeText(table.name || "admin")}`);
    const r = await fetch("/api/admin/upload-image", { method: "POST", credentials: "include", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.message || j?.error || "UPLOAD_FAILED");
    const url = safeText(j?.url || j?.path || "");
    if (!url) throw new Error("UPLOAD_FAILED");
    setField(fieldName, url);
    // Auto-persist for existing rows with full-row merge to avoid NOT NULL violations.
    if (selectedRow && keyVal && onUpsertPartial) {
      const merged = { ...form, [fieldName]: url };
      const fullRow = {};
      (table.columns || []).forEach((c) => {
        const v = merged[c.name];
        fullRow[c.name] = parseValueForColumn(c, v);
      });
      if (fullRow[keyCol] === null || fullRow[keyCol] === undefined || String(fullRow[keyCol]).trim() === "") {
        fullRow[keyCol] = keyVal;
      }
      await onUpsertPartial(table.name, [fullRow]);
    }
  };

  const imageUrls = useMemo(() => extractImageUrlsFromRow(form), [form]);
  const isFestivalForm = table?.name === TABLES.FESTIVALS;
  const isTourForm = table?.name === TABLES.TOURS;
  const isHotelForm = table?.name === TABLES.HOTELS;
  const festivalHandledCols = useMemo(() => new Set([
    "title",
    "description",
    "location",
    "month",
    "date",
    "vibe",
    "ticket",
    "hero_image",
    "highlights",
    "inclusions",
    "images",
    "image_titles",
    "image_descriptions",
    "image_meta",
    "available",
    "price_dropped",
    "price_drop_percent",
    "vendor_mobile",
    "additional_comments",
    "pricing"
  ]), []);
  const tourHandledCols = useMemo(() => new Set([
    "title",
    "description",
    "location",
    "month",
    "date",
    "duration",
    "vibe",
    "ticket",
    "hero_image",
    "highlights",
    "inclusions",
    "itinerary",
    "images",
    "image_titles",
    "image_descriptions",
    "image_meta",
    "available",
    "price_dropped",
    "price_drop_percent",
    "vendor_mobile",
    "additional_comments",
    "pricing",
    "price",
    "exclusions",
    "max_guests",
    "availability",
    "map_embed_url",
    "faqs",
    "itinerary_items",
    "facts",
    "content_blocks",
    "i18n"
  ]), []);
  const hotelHandledCols = useMemo(() => new Set([
    "name",
    "description",
    "location",
    "category",
    "price_per_night",
    "pricePerNight",
    "rating",
    "reviews",
    "check_in_time",
    "check_out_time",
    "min_nights",
    "max_nights",
    "child_policy",
    "amenities",
    "room_types",
    "availability",
    "seasonal_pricing",
    "date_overrides",
    "hero_image",
    "images",
    "image_titles",
    "image_descriptions",
    "image_meta",
    "vendor_mobile",
    "additional_comments",
    "private_spaces",
    "shared_spaces",
    "room_amenities",
    "popular_with_guests",
    "room_features",
    "basic_facilities",
    "beds_and_blanket",
    "food_and_drinks",
    "safety_and_security",
    "media_and_entertainment",
    "bathroom",
    "other_facilities",
    "inclusion",
    "exclusion",
    "available",
    "price_dropped",
    "price_drop_percent"
  ]), []);
  const festivalPricing = useMemo(() => {
    const raw = form?.pricing;
    let src = raw;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (Array.isArray(src)) src = src[0] || {};
    if (!src || typeof src !== "object") src = {};
    const market = src.market_price ?? src.marketPrice ?? src.mrp ?? form?.price ?? "";
    const cost = src.cost_price ?? src.costPrice ?? src.base_price ?? src.basePrice ?? "";
    const selling = src.selling_price ?? src.sellingPrice ?? src.price ?? form?.price ?? "";
    return { market, cost, selling };
  }, [form?.pricing, form?.price]);
  const asNumberOrNull = (v) => {
    const t = safeText(v).trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  };
  const computeSellingFromDrop = (marketRaw, costRaw, dropRaw) => {
    const market = asNumberOrNull(marketRaw);
    const cost = asNumberOrNull(costRaw);
    const drop = asNumberOrNull(dropRaw);
    if (market === null || drop === null) return null;
    const pct = Math.max(0, Math.min(100, drop));
    const dropped = market - (market * pct / 100);
    const floor = cost === null ? dropped : Math.max(cost, dropped);
    return Math.round(floor * 100) / 100;
  };
  const toPricingObject = () => {
    let src = form?.pricing;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (Array.isArray(src)) src = src[0] || {};
    if (!src || typeof src !== "object") src = {};
    return src;
  };
  const setFestivalCostPrice = (nextRaw) => {
    const nextCost = asNumberOrNull(nextRaw);
    const src = toPricingObject();
    const nextSelling = computeSellingFromDrop(src?.market_price ?? festivalPricing.market, nextCost, form?.price_drop_percent);
    const currentSelling = asNumberOrNull(src?.selling_price ?? festivalPricing.selling);
    setField("pricing", {
      ...src,
      cost_price: nextCost,
      market_price: asNumberOrNull(src?.market_price ?? festivalPricing.market),
      selling_price: nextSelling === null ? (currentSelling === null ? null : Math.max(currentSelling, nextCost ?? currentSelling)) : nextSelling
    });
    if (isTourForm && hasCol("price") && nextSelling !== null) setField("price", nextSelling);
  };
  const setFestivalMarketPrice = (nextRaw) => {
    const nextMarket = asNumberOrNull(nextRaw);
    const src = toPricingObject();
    const nextSelling = computeSellingFromDrop(nextMarket, src?.cost_price ?? festivalPricing.cost, form?.price_drop_percent);
    setField("pricing", {
      ...src,
      market_price: nextMarket,
      cost_price: asNumberOrNull(src?.cost_price ?? festivalPricing.cost),
      selling_price: nextSelling
    });
    if (isTourForm && hasCol("price") && nextSelling !== null) setField("price", nextSelling);
  };
  const setFestivalPriceDropPercent = (nextRaw) => {
    const nextPct = asNumberOrNull(nextRaw);
    const clamped = nextPct === null ? 0 : Math.max(0, Math.min(100, nextPct));
    const nextSelling = computeSellingFromDrop(festivalPricing.market, festivalPricing.cost, clamped);
    setField("price_drop_percent", clamped);
    setField("price_dropped", clamped > 0);
    const src = toPricingObject();
    setField("pricing", {
      ...src,
      market_price: asNumberOrNull(festivalPricing.market),
      cost_price: asNumberOrNull(festivalPricing.cost),
      selling_price: nextSelling
    });
    if (isTourForm && hasCol("price") && nextSelling !== null) setField("price", nextSelling);
  };
  const tourAvailability = useMemo(() => {
    const raw = form?.availability;
    let src = raw;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (!src || typeof src !== "object" || Array.isArray(src)) src = {};
    return {
      closedDates: normalizeStringList(src.closedDates)
    };
  }, [form?.availability]);
  const setTourAvailability = (next) => {
    setField("availability", {
      closedDates: normalizeStringList(next?.closedDates)
    });
  };
  const tourContentBlocks = useMemo(() => {
    const raw = form?.content_blocks;
    let src = raw;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (!src || typeof src !== "object" || Array.isArray(src)) src = {};
    return {
      overview: safeText(src.overview),
      notes: safeText(src.notes),
      best_time: safeText(src.best_time),
      who_is_this_for: safeText(src.who_is_this_for),
      what_to_carry: normalizeStringList(src.what_to_carry)
    };
  }, [form?.content_blocks]);
  const setTourContentBlocks = (next) => {
    setField("content_blocks", {
      overview: safeText(next?.overview),
      notes: safeText(next?.notes),
      best_time: safeText(next?.best_time),
      who_is_this_for: safeText(next?.who_is_this_for),
      what_to_carry: normalizeStringList(next?.what_to_carry)
    });
  };
  const tourI18nEn = useMemo(() => {
    const raw = form?.i18n;
    let src = raw;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (!src || typeof src !== "object" || Array.isArray(src)) src = {};
    const en = src?.en && typeof src.en === "object" ? src.en : {};
    return {
      title: safeText(en.title),
      description: safeText(en.description)
    };
  }, [form?.i18n]);
  const setTourI18nEn = (next) => {
    setField("i18n", {
      en: {
        title: safeText(next?.title),
        description: safeText(next?.description)
      }
    });
  };
  const relatedItem = useMemo(() => {
    if (table?.name !== TABLES.BOOKINGS) return null;
    const type = safeText(form?.type || selectedRow?.type || "").toLowerCase();
    const itemId = safeText(form?.item_id || form?.itemId || selectedRow?.item_id || selectedRow?.itemId || "");
    if (!type || !itemId) return null;
    if (type === "tour") return catalogLookup?.toursById?.get(itemId) || null;
    if (type === "hotel") return catalogLookup?.hotelsById?.get(itemId) || null;
    return null;
  }, [catalogLookup, form?.type, form?.item_id, form?.itemId, selectedRow?.type, selectedRow?.item_id, selectedRow?.itemId, table?.name]);
  const relatedItemUrls = useMemo(() => uniqStrings(extractImageUrlsFromRow(relatedItem || {})), [relatedItem]);

  return (
    <div className="card">
      <h3 className="mt-0">Create / Edit {tableLabel(table.name)}</h3>
      {relatedItemUrls.length ? (
        <div className="img-strip">
          <div className="img-chip"><span>Booked Item</span></div>
          {relatedItemUrls.slice(0, 10).map((u, i) => (
            <img key={u} className="thumb" src={u} alt="" onClick={() => onOpenImages?.("Booked item images", relatedItemUrls, i)} />
          ))}
        </div>
      ) : null}
      {imageUrls.length ? (
        <div className="img-strip">
          <div className="img-chip"><span>Images</span></div>
          {imageUrls.slice(0, 10).map((u, i) => (
            <img key={u} className="thumb" src={u} alt="" onClick={() => onOpenImages?.(table.name, imageUrls, i)} />
          ))}
        </div>
      ) : null}
      {isFestivalForm ? (
        <div className="festival-form">
          <div className="form-section">
            <div className="section-title">Festival Basics</div>
            <div className="form-grid">
              <div className="field full">
                <label>Title</label>
                <input className="input" value={safeText(form.title)} onChange={(e) => setField("title", e.target.value)} placeholder="Kullu Dussehra Festival" />
              </div>
              <div className="field full">
                <label>Description</label>
                <textarea className="textarea" value={safeText(form.description)} onChange={(e) => setField("description", e.target.value)} placeholder="Tell users what this festival is about..." />
              </div>
              <div className="field">
                <label>Location</label>
                <input className="input" value={safeText(form.location)} onChange={(e) => setField("location", e.target.value)} placeholder="Kullu, Himachal Pradesh" />
              </div>
              <div className="field">
                <label>Month</label>
                <input className="input" value={safeText(form.month)} onChange={(e) => setField("month", e.target.value)} placeholder="October" />
              </div>
              <div className="field">
                <label>Date</label>
                <input className="input" type="date" value={safeText(form.date).slice(0, 10)} onChange={(e) => setField("date", e.target.value)} />
              </div>
              <div className="field">
                <label>Vendor Mobile</label>
                <input className="input" value={safeText(form.vendor_mobile)} onChange={(e) => setField("vendor_mobile", e.target.value)} placeholder="+919999000001" />
              </div>
              <div className="field full">
                <label>Vibe</label>
                <input className="input" value={safeText(form.vibe)} onChange={(e) => setField("vibe", e.target.value)} placeholder="Cultural, festive, traditional..." />
              </div>
              <div className="field full">
                <label>Ticket Info</label>
                <textarea className="textarea" value={safeText(form.ticket)} onChange={(e) => setField("ticket", e.target.value)} placeholder="Entry details and pass information" />
              </div>
              <div className="field full">
                <label>Additional Comments</label>
                <textarea className="textarea" value={safeText(form.additional_comments)} onChange={(e) => setField("additional_comments", e.target.value)} placeholder="Operational notes, schedule caveats..." />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Media</div>
            <div className="form-grid">
              <div className="field full">
                <label>Hero Image</label>
                <div className="flex-gap10-center">
                  <input className="input flex-1" value={safeText(form.hero_image)} onChange={(e) => setField("hero_image", e.target.value)} placeholder="/uploads/images/..." />
                  <label className="btn small pointer">
                    <FaDownload /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden-input"
                      onChange={async (e) => {
                        const file = e.target.files && e.target.files[0];
                        e.target.value = "";
                        try {
                          await uploadForField("hero_image", file);
                        } catch (err) {
                          alert(String(err?.message || err));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <FestivalGalleryEditor
                images={form.images}
                titles={form.image_titles}
                descriptions={form.image_descriptions}
                onChange={(next) => {
                  setField("images", next.images);
                  setField("image_titles", next.image_titles);
                  setField("image_descriptions", next.image_descriptions);
                  setField("image_meta", next.image_meta);
                }}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Highlights & Inclusions</div>
            <div className="form-grid">
              <ListEditor
                title="Highlights"
                values={normalizeStringList(form.highlights)}
                onChange={(list) => setField("highlights", list)}
                placeholder="Traditional Rath Yatra and deity processions"
              />
              <ListEditor
                title="Inclusions"
                values={normalizeStringList(form.inclusions)}
                onChange={(list) => setField("inclusions", list)}
                placeholder="Entry to main festival ground"
              />
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Availability & Pricing</div>
            <div className="form-grid">
              <div className="field full">
                <label>Price Drop %</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={safeText(form.price_drop_percent)}
                  onChange={(e) => setFestivalPriceDropPercent(e.target.value)}
                />
              </div>
              <label className={`pill-toggle ${form.available !== false ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={form.available !== false}
                  onChange={(e) => setField("available", e.target.checked)}
                />
                Available
              </label>
              <label className={`pill-toggle ${form.price_dropped ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={!!form.price_dropped}
                  onChange={(e) => setField("price_dropped", e.target.checked)}
                />
                Price Dropped
              </label>
              <div className="field">
                <label>Market Price</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={safeText(festivalPricing.market)}
                  onChange={(e) => setFestivalMarketPrice(e.target.value)}
                  placeholder="1999"
                />
              </div>
              <div className="field">
                <label>Cost Price</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={safeText(festivalPricing.cost)}
                  onChange={(e) => setFestivalCostPrice(e.target.value)}
                  placeholder="1200"
                />
              </div>
              <div className="field">
                <label>Selling Price</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={safeText(festivalPricing.selling)}
                  readOnly
                  placeholder="1499"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {isTourForm ? (
        <div className="festival-form">
          <div className="form-section">
            <div className="section-title">Tour Basics</div>
            <div className="form-grid">
              {hasCol("title") ? (
                <div className="field full">
                  <label>Title</label>
                  <input className="input" value={safeText(form.title)} onChange={(e) => setField("title", e.target.value)} placeholder="Great Himalayan Tour" />
                </div>
              ) : null}
              {hasCol("description") ? (
                <div className="field full">
                  <label>Description</label>
                  <textarea className="textarea" value={safeText(form.description)} onChange={(e) => setField("description", e.target.value)} placeholder="Describe this tour experience..." />
                </div>
              ) : null}
              {hasCol("location") ? (
                <div className="field">
                  <label>Location</label>
                  <input className="input" value={safeText(form.location)} onChange={(e) => setField("location", e.target.value)} placeholder="Manali, Himachal Pradesh" />
                </div>
              ) : null}
              {hasCol("duration") ? (
                <div className="field">
                  <label>Duration</label>
                  <input className="input" value={safeText(form.duration)} onChange={(e) => setField("duration", e.target.value)} placeholder="3 Days / 2 Nights" />
                </div>
              ) : null}
              {hasCol("max_guests") ? (
                <div className="field">
                  <label>Max Guests</label>
                  <input className="input" type="number" min="1" value={safeText(form.max_guests)} onChange={(e) => setField("max_guests", e.target.value)} placeholder="2" />
                </div>
              ) : null}
              {hasCol("month") ? (
                <div className="field">
                  <label>Month</label>
                  <input className="input" value={safeText(form.month)} onChange={(e) => setField("month", e.target.value)} placeholder="October" />
                </div>
              ) : null}
              {hasCol("date") ? (
                <div className="field">
                  <label>Date</label>
                  <input className="input" type="date" value={safeText(form.date).slice(0, 10)} onChange={(e) => setField("date", e.target.value)} />
                </div>
              ) : null}
              {hasCol("vendor_mobile") ? (
                <div className="field">
                  <label>Vendor Mobile</label>
                  <input className="input" value={safeText(form.vendor_mobile)} onChange={(e) => setField("vendor_mobile", e.target.value)} placeholder="+919999000001" />
                </div>
              ) : null}
              {hasCol("vibe") ? (
                <div className="field full">
                  <label>Vibe</label>
                  <input className="input" value={safeText(form.vibe)} onChange={(e) => setField("vibe", e.target.value)} placeholder="Adventure, scenic, family-friendly..." />
                </div>
              ) : null}
              {hasCol("ticket") ? (
                <div className="field full">
                  <label>Booking Notes</label>
                  <textarea className="textarea" value={safeText(form.ticket)} onChange={(e) => setField("ticket", e.target.value)} placeholder="Ticket or booking details" />
                </div>
              ) : null}
              {hasCol("additional_comments") ? (
                <div className="field full">
                  <label>Additional Comments</label>
                  <textarea className="textarea" value={safeText(form.additional_comments)} onChange={(e) => setField("additional_comments", e.target.value)} placeholder="Operational notes..." />
                </div>
              ) : null}
              {hasCol("map_embed_url") ? (
                <div className="field full">
                  <label>Map URL</label>
                  <input className="input" value={safeText(form.map_embed_url)} onChange={(e) => setField("map_embed_url", e.target.value)} placeholder="https://www.google.com/maps?q=..." />
                </div>
              ) : null}
            </div>
          </div>

          {(hasCol("hero_image") || hasCol("images") || hasCol("image_titles") || hasCol("image_descriptions") || hasCol("image_meta")) ? (
            <div className="form-section">
              <div className="section-title">Media</div>
              <div className="form-grid">
                {hasCol("hero_image") ? (
                  <div className="field full">
                    <label>Hero Image</label>
                    <div className="flex-gap10-center">
                      {form.hero_image ? <img className="thumb" src={safeText(form.hero_image)} alt="" /> : null}
                      <div className="small">{form.hero_image ? `Current: ${safeText(form.hero_image).slice(0, 80)}` : "No image yet."}</div>
                      <label className="btn small pointer">
                        <FaDownload /> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden-input"
                          onChange={async (e) => {
                            const file = e.target.files && e.target.files[0];
                            e.target.value = "";
                            try {
                              await uploadForField("hero_image", file);
                            } catch (err) {
                              alert(String(err?.message || err));
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
                <FestivalGalleryEditor
                  images={form.images}
                  titles={form.image_titles}
                  descriptions={form.image_descriptions}
                  onChange={(next) => {
                    if (hasCol("images")) setField("images", next.images);
                    if (hasCol("image_titles")) setField("image_titles", next.image_titles);
                    if (hasCol("image_descriptions")) setField("image_descriptions", next.image_descriptions);
                    if (hasCol("image_meta")) setField("image_meta", next.image_meta);
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="form-section">
            <div className="section-title">Plan Details</div>
            <div className="form-grid">
              {hasCol("highlights") ? (
                <ListEditor
                  title="Highlights"
                  values={normalizeStringList(form.highlights)}
                  onChange={(list) => setField("highlights", list)}
                  placeholder="Sunrise viewpoint and local market walk"
                />
              ) : null}
              {hasCol("inclusions") ? (
                <ListEditor
                  title="Inclusions"
                  values={normalizeStringList(form.inclusions)}
                  onChange={(list) => setField("inclusions", list)}
                  placeholder="Guide support and transport"
                />
              ) : null}
              {hasCol("exclusions") ? (
                <ListEditor
                  title="Exclusions"
                  values={normalizeStringList(form.exclusions)}
                  onChange={(list) => setField("exclusions", list)}
                  placeholder="Meals unless included by property"
                />
              ) : null}
              {hasCol("itinerary") ? (
                <div className="field full">
                  <label>Itinerary Summary</label>
                  <textarea className="textarea" value={safeText(form.itinerary)} onChange={(e) => setField("itinerary", e.target.value)} placeholder="Day 1: ...\nDay 2: ..." />
                </div>
              ) : null}
            </div>
          </div>

          {(hasCol("faqs") || hasCol("itinerary_items") || hasCol("facts") || hasCol("content_blocks") || hasCol("i18n") || hasCol("availability")) ? (
            <div className="form-section">
              <div className="section-title">Advanced Content</div>
              <div className="form-grid">
                {hasCol("faqs") ? (
                  <ObjectListEditor
                    title="FAQs"
                    items={normalizeObjectList(form.faqs)}
                    onChange={(next) => setField("faqs", next)}
                    addLabel="Add FAQ"
                    fields={[
                      { key: "question", label: "Question", placeholder: "Is this package suitable for couples?" },
                      { key: "answer", label: "Answer", type: "textarea", placeholder: "Yes, this package is designed..." }
                    ]}
                  />
                ) : null}
                {hasCol("itinerary_items") ? (
                  <ObjectListEditor
                    title="Day-wise Itinerary"
                    items={normalizeObjectList(form.itinerary_items)}
                    onChange={(next) => setField("itinerary_items", next)}
                    addLabel="Add Day"
                    fields={[
                      { key: "day", label: "Day", type: "number", placeholder: "1" },
                      { key: "title", label: "Title", placeholder: "Arrival + Tandi Cottage Stay" },
                      { key: "content", label: "Content", type: "textarea", placeholder: "Route, activities, overnight, notes..." }
                    ]}
                  />
                ) : null}
                {hasCol("facts") ? (
                  <ObjectListEditor
                    title="Quick Facts"
                    items={normalizeObjectList(form.facts)}
                    onChange={(next) => setField("facts", next)}
                    addLabel="Add Fact"
                    fields={[
                      { key: "label", label: "Label", placeholder: "Great for couples seeking scenic views" },
                      { key: "value", label: "Value", placeholder: "Optional short value" }
                    ]}
                  />
                ) : null}
                {hasCol("content_blocks") ? (
                  <div className="field full">
                    <label>Content Blocks</label>
                    <div className="obj-card">
                      <div className="field">
                        <label>Overview</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourContentBlocks.overview)} onChange={(e) => setTourContentBlocks({ ...tourContentBlocks, overview: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Notes</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourContentBlocks.notes)} onChange={(e) => setTourContentBlocks({ ...tourContentBlocks, notes: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Best Time</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourContentBlocks.best_time)} onChange={(e) => setTourContentBlocks({ ...tourContentBlocks, best_time: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Who Is This For</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourContentBlocks.who_is_this_for)} onChange={(e) => setTourContentBlocks({ ...tourContentBlocks, who_is_this_for: e.target.value })} />
                      </div>
                      <ListEditor
                        title="What To Carry"
                        values={tourContentBlocks.what_to_carry}
                        onChange={(list) => setTourContentBlocks({ ...tourContentBlocks, what_to_carry: list })}
                        placeholder="Warm layers"
                      />
                    </div>
                  </div>
                ) : null}
                {hasCol("i18n") ? (
                  <div className="field full">
                    <label>English Translation</label>
                    <div className="obj-card">
                      <div className="field">
                        <label>Title (EN)</label>
                        <input className="input" value={safeText(tourI18nEn.title)} onChange={(e) => setTourI18nEn({ ...tourI18nEn, title: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Description (EN)</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourI18nEn.description)} onChange={(e) => setTourI18nEn({ ...tourI18nEn, description: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ) : null}
                {hasCol("availability") ? (
                  <div className="field full">
                    <label>Availability</label>
                    <div className="obj-card">
                      <ListEditor
                        title="Closed Dates"
                        values={tourAvailability.closedDates}
                        onChange={(list) => setTourAvailability({ ...tourAvailability, closedDates: list })}
                        placeholder="2026-10-20"
                      />
                      <div className="field">
                        <label>Capacity (Persons)</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={safeText(form.max_guests)}
                          onChange={(e) => setField("max_guests", e.target.value)}
                          placeholder="4"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {(hasCol("price_drop_percent") || hasCol("available") || hasCol("price_dropped") || hasCol("pricing") || hasCol("price")) ? (
            <div className="form-section">
              <div className="section-title">Availability & Pricing</div>
              <div className="form-grid">
                {hasCol("price_drop_percent") ? (
                  <div className="field full">
                    <label>Price Drop %</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      value={safeText(form.price_drop_percent)}
                      onChange={(e) => setFestivalPriceDropPercent(e.target.value)}
                    />
                  </div>
                ) : null}
                {hasCol("available") ? (
                  <label className={`pill-toggle ${form.available !== false ? "on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={form.available !== false}
                      onChange={(e) => setField("available", e.target.checked)}
                    />
                    Available
                  </label>
                ) : null}
                {hasCol("price_dropped") ? (
                  <label className={`pill-toggle ${form.price_dropped ? "on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={!!form.price_dropped}
                      onChange={(e) => setField("price_dropped", e.target.checked)}
                    />
                    Price Dropped
                  </label>
                ) : null}
                {hasCol("pricing") ? (
                  <>
                    <div className="field">
                      <label>Market Price</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={safeText(festivalPricing.market)}
                        onChange={(e) => setFestivalMarketPrice(e.target.value)}
                        placeholder="1999"
                      />
                    </div>
                    <div className="field">
                      <label>Cost Price</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={safeText(festivalPricing.cost)}
                        onChange={(e) => setFestivalCostPrice(e.target.value)}
                        placeholder="1200"
                      />
                    </div>
                    <div className="field">
                      <label>Selling Price</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={safeText(hasCol("price") ? form.price : festivalPricing.selling)}
                        readOnly
                        placeholder="1499"
                      />
                    </div>
                  </>
                ) : null}
                {!hasCol("pricing") && hasCol("price") ? (
                  <div className="field full">
                    <label>Selling Price</label>
                    <input className="input" type="number" min="0" value={safeText(form.price)} readOnly />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {isHotelForm ? (
        <div className="festival-form">
          <div className="form-section">
            <div className="section-title">Stay Basics</div>
            <div className="form-grid">
              {hasCol("name") ? (
                <div className="field full">
                  <label>Property Name</label>
                  <input className="input" value={safeText(form.name)} onChange={(e) => setField("name", e.target.value)} placeholder="Shree Ganga Cottages and Resort" />
                </div>
              ) : null}
              {hasCol("description") ? (
                <div className="field full">
                  <label>Description</label>
                  <textarea className="textarea" value={safeText(form.description)} onChange={(e) => setField("description", e.target.value)} placeholder="Describe the stay experience..." />
                </div>
              ) : null}
              {hasCol("location") ? (
                <div className="field">
                  <label>Location</label>
                  <input className="input" value={safeText(form.location)} onChange={(e) => setField("location", e.target.value)} placeholder="Manali, Himachal Pradesh" />
                </div>
              ) : null}
              {hasCol("category") ? (
                <div className="field">
                  <label>Category</label>
                  <input className="input" value={safeText(form.category)} onChange={(e) => setField("category", e.target.value)} placeholder="hotel / cottage" />
                </div>
              ) : null}
              {hasCol("vendor_mobile") ? (
                <div className="field">
                  <label>Vendor Mobile</label>
                  <input className="input" value={safeText(form.vendor_mobile)} onChange={(e) => setField("vendor_mobile", e.target.value)} placeholder="+91-00000-00000" />
                </div>
              ) : null}
              {hasCol("additional_comments") ? (
                <div className="field full">
                  <label>Additional Comments</label>
                  <textarea className="textarea" value={safeText(form.additional_comments)} onChange={(e) => setField("additional_comments", e.target.value)} placeholder="Any extra notes..." />
                </div>
              ) : null}
            </div>
          </div>

          {(hasCol("hero_image") || hasCol("images") || hasCol("image_titles") || hasCol("image_descriptions") || hasCol("image_meta")) ? (
            <div className="form-section">
              <div className="section-title">Media</div>
              <div className="form-grid">
                {hasCol("hero_image") ? (
                  <div className="field full">
                    <label>Hero Image</label>
                    <div className="flex-gap10-center">
                      {form.hero_image ? <img className="thumb" src={safeText(form.hero_image)} alt="" /> : null}
                      <div className="small">{form.hero_image ? `Current: ${safeText(form.hero_image).slice(0, 80)}` : "No image yet."}</div>
                      <label className="btn small pointer">
                        <FaDownload /> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden-input"
                          onChange={async (e) => {
                            const file = e.target.files && e.target.files[0];
                            e.target.value = "";
                            try {
                              await uploadForField("hero_image", file);
                            } catch (err) {
                              alert(String(err?.message || err));
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
                <FestivalGalleryEditor
                  images={form.images}
                  titles={form.image_titles}
                  descriptions={form.image_descriptions}
                  onChange={(next) => {
                    if (hasCol("images")) setField("images", next.images);
                    if (hasCol("image_titles")) setField("image_titles", next.image_titles);
                    if (hasCol("image_descriptions")) setField("image_descriptions", next.image_descriptions);
                    if (hasCol("image_meta")) setField("image_meta", next.image_meta);
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="form-section">
            <div className="section-title">Rooms & Pricing</div>
            <div className="form-grid">
              {hasCol("price_per_night") || hasCol("pricePerNight") ? (
                <div className="field">
                  <label>Base Price / Night</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={safeText(form.price_per_night ?? form.pricePerNight)}
                    onChange={(e) => setField(hasCol("price_per_night") ? "price_per_night" : "pricePerNight", e.target.value)}
                    placeholder="2800"
                  />
                </div>
              ) : null}
              {hasCol("rating") ? (
                <div className="field">
                  <label>Rating</label>
                  <input className="input" type="number" min="0" max="5" value={safeText(form.rating)} onChange={(e) => setField("rating", e.target.value)} placeholder="4.5" />
                </div>
              ) : null}
              {hasCol("reviews") ? (
                <div className="field">
                  <label>Review Count</label>
                  <input className="input" type="number" min="0" value={safeText(form.reviews)} onChange={(e) => setField("reviews", e.target.value)} placeholder="120" />
                </div>
              ) : null}
              {hasCol("room_types") ? (
                <ObjectListEditor
                  title="Room Types"
                  items={normalizeObjectList(form.room_types)}
                  onChange={(next) => setField("room_types", next)}
                  addLabel="Add Room Type"
                  fields={[
                    { key: "type", label: "Type", placeholder: "Standard Room" },
                    { key: "price", label: "Price / Night", type: "number", placeholder: "2800" },
                    { key: "capacity", label: "Capacity", type: "number", placeholder: "2" }
                  ]}
                />
              ) : null}
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Policies & Timing</div>
            <div className="form-grid">
              {hasCol("check_in_time") ? (
                <div className="field">
                  <label>Check-in Time</label>
                  <input className="input" value={safeText(form.check_in_time)} onChange={(e) => setField("check_in_time", e.target.value)} placeholder="14:00" />
                </div>
              ) : null}
              {hasCol("check_out_time") ? (
                <div className="field">
                  <label>Check-out Time</label>
                  <input className="input" value={safeText(form.check_out_time)} onChange={(e) => setField("check_out_time", e.target.value)} placeholder="11:00" />
                </div>
              ) : null}
              {hasCol("min_nights") ? (
                <div className="field">
                  <label>Min Nights</label>
                  <input className="input" type="number" min="1" value={safeText(form.min_nights)} onChange={(e) => setField("min_nights", e.target.value)} placeholder="1" />
                </div>
              ) : null}
              {hasCol("max_nights") ? (
                <div className="field">
                  <label>Max Nights</label>
                  <input className="input" type="number" min="1" value={safeText(form.max_nights)} onChange={(e) => setField("max_nights", e.target.value)} placeholder="30" />
                </div>
              ) : null}
              {hasCol("child_policy") ? (
                <div className="field full">
                  <label>Child Policy</label>
                  <textarea className="textarea" value={safeText(form.child_policy)} onChange={(e) => setField("child_policy", e.target.value)} />
                </div>
              ) : null}
            </div>
          </div>

          {(hasCol("availability") || hasCol("seasonal_pricing") || hasCol("date_overrides")) ? (
            <div className="form-section">
              <div className="section-title">Availability</div>
              <div className="form-grid">
                {hasCol("availability") ? (
                  <div className="field full">
                    <label>Closed Dates</label>
                    <ListEditor
                      title="Closed Dates"
                      values={normalizeStringList(form.availability?.closedDates || form.availability?.closed_dates || [])}
                      onChange={(list) => setField("availability", { ...(form.availability || {}), closedDates: list })}
                      placeholder="2026-12-25"
                    />
                    <div className="field full">
                      <label>Rooms By Type (JSON)</label>
                      <textarea
                        className="textarea gallery-textarea"
                        value={JSON.stringify((form.availability && form.availability.roomsByType) || {}, null, 2)}
                        onChange={(e) => {
                          const parsed = safeJsonParse(e.target.value);
                          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                            setField("availability", { ...(form.availability || {}), roomsByType: parsed });
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null}
                {hasCol("seasonal_pricing") ? (
                  <ObjectListEditor
                    title="Seasonal Pricing"
                    items={normalizeObjectList(form.seasonal_pricing)}
                    onChange={(next) => setField("seasonal_pricing", next)}
                    addLabel="Add Season"
                    fields={[
                      { key: "label", label: "Label", placeholder: "Peak Season" },
                      { key: "start", label: "Start Date", placeholder: "2026-12-10" },
                      { key: "end", label: "End Date", placeholder: "2027-01-05" },
                      { key: "price", label: "Price / Night", type: "number", placeholder: "3500" }
                    ]}
                  />
                ) : null}
                {hasCol("date_overrides") ? (
                  <div className="field full">
                    <label>Date Overrides (JSON)</label>
                    <textarea
                      className="textarea gallery-textarea"
                      value={JSON.stringify(form.date_overrides || {}, null, 2)}
                      onChange={(e) => {
                        const parsed = safeJsonParse(e.target.value);
                        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                          setField("date_overrides", parsed);
                        }
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="form-section">
            <div className="section-title">Spaces & Facilities</div>
            <div className="form-grid">
              {hasCol("private_spaces") ? (
                <ListEditor title="Private Spaces" values={normalizeStringList(form.private_spaces)} onChange={(list) => setField("private_spaces", list)} placeholder="Private Balcony" />
              ) : null}
              {hasCol("shared_spaces") ? (
                <ListEditor title="Shared Spaces" values={normalizeStringList(form.shared_spaces)} onChange={(list) => setField("shared_spaces", list)} placeholder="Shared Lounge" />
              ) : null}
              {hasCol("room_amenities") ? (
                <ListEditor title="Room Amenities" values={normalizeStringList(form.room_amenities)} onChange={(list) => setField("room_amenities", list)} placeholder="Room Heater" />
              ) : null}
              {hasCol("popular_with_guests") ? (
                <ListEditor title="Popular With Guests" values={normalizeStringList(form.popular_with_guests)} onChange={(list) => setField("popular_with_guests", list)} placeholder="Mountain View" />
              ) : null}
              {hasCol("room_features") ? (
                <ListEditor title="Room Features" values={normalizeStringList(form.room_features)} onChange={(list) => setField("room_features", list)} placeholder="Valley View" />
              ) : null}
              {hasCol("basic_facilities") ? (
                <ListEditor title="Basic Facilities" values={normalizeStringList(form.basic_facilities)} onChange={(list) => setField("basic_facilities", list)} placeholder="WiFi" />
              ) : null}
              {hasCol("beds_and_blanket") ? (
                <ListEditor title="Beds & Blanket" values={normalizeStringList(form.beds_and_blanket)} onChange={(list) => setField("beds_and_blanket", list)} placeholder="Extra Pillows" />
              ) : null}
              {hasCol("food_and_drinks") ? (
                <ListEditor title="Food & Drinks" values={normalizeStringList(form.food_and_drinks)} onChange={(list) => setField("food_and_drinks", list)} placeholder="In-room Dining" />
              ) : null}
              {hasCol("safety_and_security") ? (
                <ListEditor title="Safety & Security" values={normalizeStringList(form.safety_and_security)} onChange={(list) => setField("safety_and_security", list)} placeholder="CCTV" />
              ) : null}
              {hasCol("media_and_entertainment") ? (
                <ListEditor title="Media & Entertainment" values={normalizeStringList(form.media_and_entertainment)} onChange={(list) => setField("media_and_entertainment", list)} placeholder="Smart TV" />
              ) : null}
              {hasCol("bathroom") ? (
                <ListEditor title="Bathroom" values={normalizeStringList(form.bathroom)} onChange={(list) => setField("bathroom", list)} placeholder="Geyser" />
              ) : null}
              {hasCol("other_facilities") ? (
                <ListEditor title="Other Facilities" values={normalizeStringList(form.other_facilities)} onChange={(list) => setField("other_facilities", list)} placeholder="Bonfire Area" />
              ) : null}
              {hasCol("inclusion") ? (
                <ListEditor title="Inclusions" values={normalizeStringList(form.inclusion)} onChange={(list) => setField("inclusion", list)} placeholder="WiFi" />
              ) : null}
              {hasCol("exclusion") ? (
                <ListEditor title="Exclusions" values={normalizeStringList(form.exclusion)} onChange={(list) => setField("exclusion", list)} placeholder="Meals unless included" />
              ) : null}
            </div>
          </div>

          {(hasCol("available") || hasCol("price_dropped") || hasCol("price_drop_percent")) ? (
            <div className="form-section">
              <div className="section-title">Status</div>
              <div className="form-grid">
                {hasCol("available") ? (
                  <label className={`pill-toggle ${form.available !== false ? "on" : ""}`}>
                    <input type="checkbox" checked={form.available !== false} onChange={(e) => setField("available", e.target.checked)} />
                    Available
                  </label>
                ) : null}
                {hasCol("price_dropped") ? (
                  <label className={`pill-toggle ${form.price_dropped ? "on" : ""}`}>
                    <input type="checkbox" checked={!!form.price_dropped} onChange={(e) => setField("price_dropped", e.target.checked)} />
                    Price Dropped
                  </label>
                ) : null}
                {hasCol("price_drop_percent") ? (
                  <div className="field">
                    <label>Price Drop %</label>
                    <input className="input" type="number" min="0" max="100" value={safeText(form.price_drop_percent)} onChange={(e) => setField("price_drop_percent", e.target.value)} />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="form-grid">
        {(table.columns || []).map((col) => {
          if (isFestivalForm && festivalHandledCols.has(col.name)) return null;
          if (isTourForm && tourHandledCols.has(col.name)) return null;
          if (isHotelForm && hotelHandledCols.has(col.name)) return null;
          const raw = form[col.name] ?? "";
          const asText = typeof raw === "object" ? JSON.stringify(raw, null, 2) : String(raw);
          const longText = asText.length > 120 || col.type === "object" || col.type === "array";
          const canUpload = !longText && isUploadableField(col.name);
          return (
            <div key={col.name} className={`field ${longText ? "full" : ""}`}>
              <label>{columnLabel(table.name, col.name)}</label>
              {longText ? (
                <textarea className="textarea" value={asText} onChange={(e) => setField(col.name, e.target.value)} />
              ) : (
                <div className="flex-gap10-center">
                  <input className="input flex-1" value={asText} onChange={(e) => setField(col.name, e.target.value)} />
                  {canUpload ? (
                    <label className="btn small pointer">
                      <FaDownload /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden-input"
                        onChange={async (e) => {
                          const file = e.target.files && e.target.files[0];
                          e.target.value = "";
                          try {
                            await uploadForField(col.name, file);
                          } catch (err) {
                            // Surface upload errors in the main banner (same as other errors).
                            alert(String(err?.message || err));
                          }
                        }}
                      />
                    </label>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-12">
        <button className="btn primary" onClick={() => {
          const row = {};
          (table.columns || []).forEach((c) => {
            if (!tableColSet.has(c.name)) return;
            row[c.name] = parseValueForColumn(c, form[c.name]);
          });
          // Ensure primary key isn't null; Supabase upsert will fail otherwise.
          const keyCol = keyColumnForTable(table);
          if ((row[keyCol] === null || row[keyCol] === undefined || String(row[keyCol]).trim() === "") && keyCol) {
            const prefix = (contextPage === "cottages" && table.name === TABLES.HOTELS && keyCol === "id") ? "cottage_" : "";
            row[keyCol] = `${prefix}${makeUuid()}`;
          }
          onSave(row);
        }}><FaSave /> Save Row</button>
      </div>
    </div>
  );
}

function BookingsTable({ rows, onOpenRow, onOpenImages, onUpsert, onReload, catalogLookup }) {
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

  const resolveItem = (row) => {
    const type = safeText(row?.type || "").toLowerCase();
    const itemId = safeText(row?.item_id || row?.itemId || "");
    if (!type || !itemId) return null;
    if (type === "tour") return catalogLookup?.toursById?.get(itemId) || null;
    if (type === "hotel") return catalogLookup?.hotelsById?.get(itemId) || null;
    return null;
  };

  const setStatus = async (id, nextStatus) => {
    setBusyId(id);
    setErr("");
    try {
      await onUpsert(TABLES.BOOKINGS, [{ id, status: nextStatus }]);
      await onReload();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusyId("");
    }
  };

  const refund = async (row) => {
    const id = safeText(row?.id);
    if (!id) return;
    setBusyId(id);
    setErr("");
    try {
      await onUpsert(TABLES.BOOKINGS, [{ id, status: "cancelled" }]);
      await onUpsert(TABLES.AUDIT_LOG, [{
        id: makeUuid(),
        at: new Date().toISOString(),
        action: "refund",
        entity: "booking",
        entity_id: id,
        meta: { note: "Refund requested from admin dashboard" }
      }]);
      await onReload();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusyId("");
    }
  };

  const amountFromPricing = (pricing) => {
    if (!pricing) return "";
    const p = typeof pricing === "string" ? (safeJsonParse(pricing) || {}) : pricing;
    const total = p?.totalAmount ?? p?.total_amount ?? p?.total ?? null;
    return total === null || total === undefined ? "" : String(total);
  };

  return (
    <>
      {err ? <div className="warn mb-10">{err}</div> : null}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th className="thumb-cell">image</th>
            <th>Status</th>
            <th>Name</th>
            <th>Item</th>
            <th>Guests</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, idx) => {
            const id = safeText(row?.id || idx);
            const item = resolveItem(row);
            const itemUrls = item ? extractImageUrlsFromRow(item) : [];
            const bookingUrls = extractImageUrlsFromRow(row);
            const urls = uniqStrings([...(itemUrls || []), ...(bookingUrls || [])]);
            const busy = busyId === id;
            return (
              <tr key={id} onClick={() => onOpenRow(id)}>
                <td>{id}</td>
                <td className="thumb-cell" onClick={(e) => e.stopPropagation()}>
                  {urls[0] ? <img className="thumb" src={urls[0]} alt="" onClick={() => onOpenImages("Booking images", urls, 0)} /> : null}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    className="select"
                    value={safeText(row?.status || "pending")}
                    disabled={busy}
                    onChange={(e) => setStatus(id, e.target.value)}
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="cancelled">cancelled</option>
                    <option value="completed">completed</option>
                  </select>
                </td>
                <td>{displayText(row?.user_name || row?.userName).slice(0, 60)}</td>
                <td>{displayText(row?.item_id || row?.itemId).slice(0, 60)}</td>
                <td>{displayText(row?.guests)}</td>
                <td>{displayText(amountFromPricing(row?.pricing))}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex-gap8-wrap">
                    <button className="btn small" disabled={busy} onClick={() => setStatus(id, "cancelled")}>Cancel</button>
                    <button className="btn small danger" disabled={busy} onClick={() => refund(row)}>Refund</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function TrackingTable({ rows }) {
  const sorted = useMemo(() => {
    const list = Array.isArray(rows) ? rows.slice() : [];
    list.sort((a, b) => new Date(b?.at || 0).getTime() - new Date(a?.at || 0).getTime());
    return list;
  }, [rows]);

  const getMeta = (row) => {
    if (!row) return {};
    if (row.meta && typeof row.meta === "object") return row.meta;
    return safeJsonParse(row.meta) || {};
  };

  const pageText = (row) => {
    const meta = getMeta(row);
    return safeText(meta.screen || meta.path || meta.url || "");
  };

  const ipText = (row) => {
    const meta = getMeta(row);
    return safeText(meta.ipAddress || meta.ip || "");
  };

  const browserText = (row) => {
    const meta = getMeta(row);
    const b = safeText(meta.browser || "");
    return b.length > 64 ? `${b.slice(0, 61)}...` : b;
  };

  return (
    <table className="table">
      <thead>
        <tr>
          <th>At</th>
          <th>Type</th>
          <th>User</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Page</th>
          <th>IP</th>
          <th>Browser</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, idx) => (
          <tr key={safeText(row?.id || idx)}>
            <td>{displayText(row?.at).slice(0, 19).replace("T", " ")}</td>
            <td>{displayText(row?.type)}</td>
            <td>{displayText(row?.user_id || row?.userId)}</td>
            <td>{displayText(row?.phone)}</td>
            <td>{displayText(row?.email)}</td>
            <td>{displayText(pageText(row))}</td>
            <td>{displayText(ipText(row))}</td>
            <td>{displayText(browserText(row))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
