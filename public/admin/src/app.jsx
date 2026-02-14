import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  FaBed,
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
  FaStar
} from "react-icons/fa";

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

const TABLE_LABELS = {
  ev_settings: "Settings",
  ev_payments: "Payments",
  ev_policies: "Policies",
  ev_site_pages: "Site Pages",
  ev_festivals: "Festivals",
  ev_tours: "Tours",
  ev_hotels: "Hotels & Cottages",
  ev_restaurants: "Food Vendors",
  ev_menu_items: "Menu Items",
  ev_food_orders: "Food Orders",
  ev_bookings: "Bookings",
  ev_cab_bookings: "Cab Bookings",
  ev_cab_providers: "Cab Providers",
  ev_user_profiles: "Customer Profiles",
  ev_user_behavior_profiles: "Customer Signals",
  ev_analytics_events: "Security Events",
  ev_queries: "Enquiries",
  ev_audit_log: "Audit Log",
  ev_coupons: "Coupons",
  ev_service_areas: "Service Areas",
  ev_telegram_messages: "Telegram Messages",
  ev_ai_conversations: "AI Conversations",
  ev_delivery_tracking: "Delivery Tracking",
  ev_vendor_messages: "Vendor Messages",
  ev_email_notifications: "Email Notifications",
  ev_reviews: "Reviews",
  ev_refunds: "Refunds"
};

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

function tableLabel(tableName) {
  const key = safeText(tableName);
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
  { key: "cab_providers", label: "Cab Providers", icon: FaCar },
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
  explorevalley: ["ev_festivals"],
  tours: ["ev_tours"],
  hotels: ["ev_hotels"],
  cottages: ["ev_hotels"],
  food_vendors: ["ev_restaurants", "ev_menu_items"],
  cab_providers: ["ev_cab_providers"],
  orders: ["ev_food_orders"],
  delivery: ["ev_delivery_tracking", "ev_vendor_messages"],
  customers: ["ev_user_profiles", "ev_user_behavior_profiles"],
  ai_support: ["ev_ai_conversations", "ev_telegram_messages"],
  refunds: ["ev_refunds"],
  notifications: ["ev_email_notifications"],
  tracking: ["ev_analytics_events"],
  analytics: ["ev_analytics_events"],
  settings: ["ev_site_pages", "ev_settings", "ev_payments", "ev_policies"]
};

const PAGE_TITLE = {
  dashboard: "Dashboard",
  explorevalley: "ExploreValley",
  tours: "Tours",
  hotels: "Hotels",
  cottages: "Cottages",
  food_vendors: "Food Vendors",
  cab_providers: "Cab Providers",
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
      await onUpsert("ev_queries", [{
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
            <div className="small" style={{ padding: 12 }}>No enquiries.</div>
          )}
        </div>
      </div>

      <div className="split-right">
        {!selected ? (
          <div className="card"><div className="small">No enquiry selected.</div></div>
        ) : (
          <div className="card">
            <div className="row">
              <h3 style={{ margin: 0 }}>{safeText(selected.subject || "Enquiry")}</h3>
              <div className="mini-row">
                <button className="btn small ghost" onClick={() => {
                  const urls = extractImageUrlsFromRow(selected);
                  if (urls.length) onOpenImages("Enquiry Attachments", urls, 0);
                }}>Images</button>
                <button className="btn small primary" disabled={saving} onClick={() => saveResponse("resolved")}>Save + Resolve</button>
                <button className="btn small ghost" disabled={saving} onClick={() => saveResponse("spam")}>Mark Spam</button>
              </div>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              From: <b>{displayText(selected.user_name || selected.userName)}</b> ({displayText(selected.email)}) • {displayText(selected.phone)}
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              Submitted: {displayText(selected.submitted_at || selected.submittedAt || "")}
            </div>
            <div className="field" style={{ marginTop: 12 }}>
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
        <h1 className="page-title"><FaShieldAlt /> ValleyFest Admin</h1>
        <div className="small">Secure session - IP and browser bound</div>
        <div className="small">Google sign-in only for: <b>{googleConfig?.allowedEmail || "bharatkaistha007@gmail.com"}</b></div>
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

function DashboardView({ tablesByName, onReload, onOpenImages, onUpsert }) {
  const [dashTab, setDashTab] = useState("bookings");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");

  const enquiriesTable = tablesByName.get("ev_queries");
  const bookingsRows = (tablesByName.get("ev_bookings")?.rows || []);
  const cabBookingRows = (tablesByName.get("ev_cab_bookings")?.rows || []);
  const foodOrderRows = (tablesByName.get("ev_food_orders")?.rows || []);
  const toursRows = (tablesByName.get("ev_tours")?.rows || []);

  const filteredBookings = useMemo(() => {
    const q = safeText(bookingSearch).trim().toLowerCase();
    const status = safeText(bookingStatus).trim().toLowerCase();
    const rows = Array.isArray(bookingsRows) ? bookingsRows : [];
    return rows
      .filter((b) => status === "all" ? true : safeText(b?.status).toLowerCase() === status)
      .filter((b) => q ? JSON.stringify(b).toLowerCase().includes(q) : true);
  }, [bookingsRows, bookingSearch, bookingStatus]);

  const statCards = [
    { label: "Bookings", count: (tablesByName.get("ev_bookings")?.rowCount) || 0, tag: "live" },
    { label: "Cab Bookings", count: (tablesByName.get("ev_cab_bookings")?.rowCount) || 0, tag: "live" },
    { label: "Food Orders", count: (tablesByName.get("ev_food_orders")?.rowCount) || 0, tag: "live" },
    { label: "Enquiries", count: (tablesByName.get("ev_queries")?.rowCount) || 0, tag: "live" },
    { label: "Tours", count: (tablesByName.get("ev_tours")?.rowCount) || 0, tag: "catalog" },
    { label: "Hotels", count: (tablesByName.get("ev_hotels")?.rowCount) || 0, tag: "catalog" },
    { label: "Food Vendors", count: (tablesByName.get("ev_restaurants")?.rowCount) || 0, tag: "catalog" }
  ];

  const renderSimpleTable = (rows, cols, emptyText) => {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return <div className="small" style={{ padding: 10 }}>{emptyText || "No data yet."}</div>;
    const head = cols.map((c) => c.key);
    return (
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="table">
          <thead>
            <tr>
              {head.map((k) => <th key={k}>{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 50).map((r, idx) => (
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
        {Array.isArray(rows) && rows.length > 50 ? <div className="small" style={{ marginTop: 8 }}>Showing 50 / {rows.length}</div> : null}
      </div>
    );
  };

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Welcome back</h2>
        <div className="small">Everything below is loaded directly from Supabase tables and fields.</div>
        <div className="stat-grid" style={{ marginTop: 12 }}>
          {statCards.map((x) => statCard(x.label, x.count, x.tag))}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Live Queue</h3>
          <button className="btn small" onClick={onReload}><FaRedo /> Reload</button>
        </div>
        <div className="tabs" style={{ marginTop: 8 }}>
          <button className={`tab ${dashTab === "bookings" ? "active" : ""}`} onClick={() => setDashTab("bookings")}><FaClipboardList /> Bookings</button>
          <button className={`tab ${dashTab === "food" ? "active" : ""}`} onClick={() => setDashTab("food")}><FaStore /> Food Orders</button>
          <button className={`tab ${dashTab === "cab" ? "active" : ""}`} onClick={() => setDashTab("cab")}><FaCar /> Cab Bookings</button>
          <button className={`tab ${dashTab === "tours" ? "active" : ""}`} onClick={() => setDashTab("tours")}><FaMapMarkerAlt /> Tours</button>
          <button className={`tab ${dashTab === "enquiries" ? "active" : ""}`} onClick={() => setDashTab("enquiries")}><FaEnvelopeOpenText /> Enquiries</button>
        </div>

        {dashTab === "bookings" ? (
          <>
            <div className="filters" style={{ marginTop: 10 }}>
              <div style={{ position: "relative" }}>
                <FaSearch style={{ position: "absolute", left: 10, top: 12, opacity: 0.8 }} />
                <input className="input" style={{ paddingLeft: 30 }} value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Search bookings..." />
              </div>
              <select className="input" value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                {["all", "pending", "confirmed", "cancelled", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="badge">{filteredBookings.length} rows</div>
            </div>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <BookingsTable
                rows={filteredBookings}
                onOpenRow={() => {}}
                onOpenImages={onOpenImages}
                onUpsert={onUpsert}
                onReload={onReload}
              />
            </div>
          </>
        ) : null}

        {dashTab === "food" ? (
          <>
            <div className="small" style={{ marginTop: 10 }}>Latest food orders</div>
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
            <div className="small" style={{ marginTop: 10 }}>Latest cab bookings</div>
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
            <div className="small" style={{ marginTop: 10 }}>Tours catalog</div>
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
          <div style={{ marginTop: 10 }}>
            <EnquiriesWorkspace
              table={enquiriesTable}
              onReload={onReload}
              onOpenImages={onOpenImages}
              onUpsert={onUpsert}
            />
          </div>
        ) : null}
      </div>
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

  const profiles = useMemo(() => (byName.get("ev_user_profiles")?.rows || []), [byName]);
  const behavior = useMemo(() => (byName.get("ev_user_behavior_profiles")?.rows || []), [byName]);
  const bookings = useMemo(() => (byName.get("ev_bookings")?.rows || []), [byName]);
  const cabBookings = useMemo(() => (byName.get("ev_cab_bookings")?.rows || []), [byName]);
  const foodOrders = useMemo(() => (byName.get("ev_food_orders")?.rows || []), [byName]);
  const events = useMemo(() => (byName.get("ev_analytics_events")?.rows || []), [byName]);

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
        <div style={{ flex: 1 }} />
        <button className={`btn small ${showAnonymous ? "primary" : "ghost"}`} onClick={() => setShowAnonymous((p) => !p)}>
          {showAnonymous ? "Showing anonymous" : "Hide anonymous"}
        </button>
      </div>

      <div className="table-wrap" style={{ marginTop: 10 }}>
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
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Customer Detail</div>
              <div className="small">{safeText(detail.userId)}</div>
            </div>
            <button className="btn small" onClick={() => setDetail(null)}>Close</button>
          </div>
          <div className="small" style={{ marginTop: 10 }}>Addresses</div>
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
            {(detail.addresses || []).slice(0, 30).map((a) => (
              <div key={a} className="img-chip"><span>{a}</span></div>
            ))}
            {!((detail.addresses || []).length) ? <div className="small">No addresses collected yet (food delivery + cab pickup/drop populate this).</div> : null}
          </div>
          <div className="small" style={{ marginTop: 10 }}>Raw</div>
          <textarea className="textarea json-mini" value={JSON.stringify(detail, null, 2)} readOnly style={{ marginTop: 6 }} />
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

  const deliveryRows = useMemo(() => (byName.get("ev_delivery_tracking")?.rows || []), [byName]);
  const vendorMsgRows = useMemo(() => (byName.get("ev_vendor_messages")?.rows || []), [byName]);
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
        <h3 style={{ marginTop: 0 }}><FaTruck /> Update Order Status</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <input className="input" placeholder="Order ID" value={updateForm.orderId} onChange={(e) => setUpdateForm((p) => ({ ...p, orderId: e.target.value }))} style={{ width: 220 }} />
          <select className="input" value={updateForm.status} onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}>
            {["pending", "confirmed", "preparing", "ready", "picked_up", "in_transit", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="Notes (optional)" value={updateForm.notes} onChange={(e) => setUpdateForm((p) => ({ ...p, notes: e.target.value }))} style={{ flex: 1, minWidth: 200 }} />
          <button className="btn primary" disabled={updating} onClick={handleStatusUpdate}>{updating ? "Updating..." : "Update"}</button>
        </div>
        {updateMsg ? <div className="small" style={{ marginTop: 8, color: updateMsg.startsWith("Error") ? "#ef4444" : "#16a34a" }}>{updateMsg}</div> : null}
      </div>

      <div className="card">
        <div className="tabs">
          <button className={`tab ${activeTab === "tracking" ? "active" : ""}`} onClick={() => setActiveTab("tracking")}><FaTruck /> Tracking</button>
          <button className={`tab ${activeTab === "vendor_msgs" ? "active" : ""}`} onClick={() => setActiveTab("vendor_msgs")}><FaComments /> Vendor Messages</button>
        </div>

        {activeTab === "tracking" ? (
          <>
            <div className="filters" style={{ marginTop: 10 }}>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {["all", "pending", "confirmed", "preparing", "ready", "picked_up", "in_transit", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="badge">{filteredDelivery.length} records</div>
            </div>
            <div className="table-wrap" style={{ marginTop: 10 }}>
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
          <div className="table-wrap" style={{ marginTop: 10 }}>
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

  const aiConversations = useMemo(() => (byName.get("ev_ai_conversations")?.rows || []), [byName]);
  const telegramMessages = useMemo(() => (byName.get("ev_telegram_messages")?.rows || []), [byName]);
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
          <div className="table-wrap" style={{ marginTop: 10 }}>
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
                  <tr key={safeText(r?.id || idx)} onClick={() => setDetail(r)} style={{ cursor: "pointer" }}>
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
          <div className="table-wrap" style={{ marginTop: 10 }}>
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
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>Conversation Detail</div>
            <button className="btn small" onClick={() => setDetail(null)}>Close</button>
          </div>
          <textarea className="textarea json-mini" value={JSON.stringify(detail, null, 2)} readOnly style={{ marginTop: 8 }} />
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
      <div className="row" style={{ marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}><FaRobot /> Bots & Agents</h3>
        <div style={{ flex: 1 }} />
        <button className="btn small" onClick={refresh}><FaRedo /> Refresh</button>
      </div>
      {error ? <div className="warn" style={{ marginBottom: 8 }}>{error}</div> : null}
      <div className="grid-2">
        <div>
          <div className="small">Telegram Mode</div>
          <div className="badge">{mode || "off"}</div>
          <div className="small" style={{ marginTop: 8 }}>Webhook Base</div>
          <div className="small">{webhookBase || "Not set"}</div>
          <div className="small" style={{ marginTop: 8 }}>Webhook Paths</div>
          <div className="small">Admin: {safeText(webhookPaths.admin || "/telegram/admin")}</div>
          <div className="small">Support: {safeText(webhookPaths.support || "/telegram/support")}</div>
          <div className="small">Sales: {safeText(webhookPaths.sales || "/telegram/sales")}</div>
          <div className="small">Ops: {safeText(webhookPaths.ops || "/telegram/ops")}</div>
          <div className="small">Finance: {safeText(webhookPaths.finance || "/telegram/finance")}</div>
        </div>
        <div>
          <div className="small">Agent Model</div>
          <div className="badge">{agentModel}</div>
          <div className="small" style={{ marginTop: 8 }}>Transcribe Model</div>
          <div className="badge">{transcribeModel}</div>
          <div className="small" style={{ marginTop: 8 }}>Bots Enabled</div>
          <div className="mini-row" style={{ flexWrap: "wrap" }}>
            {["admin", "support", "sales", "ops", "finance"].map((key) => (
              <span key={key} className={`badge ${bots[key] ? "green" : "warn"}`} style={{ textTransform: "capitalize" }}>
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
    const rows = byName.get("ev_refunds")?.rows || [];
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
        body: JSON.stringify({ table: "ev_refunds", rows: [{ id: refundId, status: newStatus, resolved_at: new Date().toISOString() }] })
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
          <h3 style={{ margin: 0 }}><FaUndoAlt /> Refund Requests</h3>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {["all", "pending", "approved", "rejected", "processed"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="badge">{filteredRefunds.length} refunds</div>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
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
                  <td><span className="badge">{safeText(r?.status)}</span></td>
                  <td>{displayText(r?.created_at || r?.createdAt).slice(0, 19).replace("T", " ")}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {safeText(r?.status).toLowerCase() === "pending" ? (
                      <div style={{ display: "flex", gap: 6 }}>
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
function NotificationsWorkspace({ snapshot }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const emails = useMemo(() => {
    const rows = byName.get("ev_email_notifications")?.rows || [];
    return [...rows].sort((a, b) =>
      new Date(b?.sent_at || b?.sentAt || b?.created_at || 0).getTime() - new Date(a?.sent_at || a?.sentAt || a?.created_at || 0).getTime()
    );
  }, [byName]);

  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return emails;
    return emails.filter((r) => safeText(r?.status).toLowerCase() === statusFilter);
  }, [emails, statusFilter]);

  return (
    <div className="card">
      <div className="filters">
        <h3 style={{ margin: 0 }}><FaEnvelope /> Email Notifications</h3>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {["all", "sent", "failed", "pending"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="badge">{filtered.length} emails</div>
      </div>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="table">
          <thead>
            <tr>
              <th>To</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Status</th>
              <th>Sent At</th>
              <th>Order ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={safeText(r?.id || idx)}>
                <td>{displayText(r?.to_email || r?.toEmail || r?.recipient).slice(0, 40)}</td>
                <td>{displayText(r?.subject).slice(0, 60)}</td>
                <td><span className="badge">{safeText(r?.email_type || r?.emailType || r?.type)}</span></td>
                <td><span className="badge">{safeText(r?.status)}</span></td>
                <td>{displayText(r?.sent_at || r?.sentAt || r?.created_at).slice(0, 19).replace("T", " ")}</td>
                <td>{displayText(r?.order_id || r?.orderId).slice(0, 20)}</td>
              </tr>
            ))}
            {!filtered.length ? <tr><td colSpan={6} className="small">No email notifications yet.</td></tr> : null}
          </tbody>
        </table>
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
    const rows = byName.get("ev_reviews")?.rows || [];
    return [...rows].sort((a, b) =>
      new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
    );
  }, [byName]);

  if (!reviews.length) return null;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}><FaStar color="#f59e0b" /> Recent Reviews</h3>
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
  const [page, setPage] = useState("dashboard");
  const [snapshot, setSnapshot] = useState({ tables: [] });
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedRowKey, setSelectedRowKey] = useState("");
  const [jsonDraft, setJsonDraft] = useState("[]");
  const [lightbox, setLightbox] = useState({ open: false, title: "", urls: [], index: 0 });

  const tablesByName = useMemo(() => {
    const map = new Map();
    (snapshot.tables || []).forEach((t) => map.set(t.name, t));
    return map;
  }, [snapshot]);

  const catalogLookup = useMemo(() => {
    const tours = (tablesByName.get("ev_tours")?.rows || []).slice();
    const hotels = (tablesByName.get("ev_hotels")?.rows || []).slice();
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
    if (activeTable.name === "ev_hotels" && (page === "hotels" || page === "cottages")) {
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
    setLoadingData(true);
    setError("");
    try {
      const data = await http("/api/admin/supabase/snapshot");
      setSnapshot(data || { tables: [] });
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoadingData(false);
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

  const saveJson = async () => {
    if (!activeTable) return; // always save to the real underlying table
    try {
      const parsed = JSON.parse(jsonDraft);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array of rows");
      await http("/api/admin/supabase/upsert", {
        method: "POST",
        body: JSON.stringify({ table: activeTable.name, rows: parsed })
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
        body: JSON.stringify({ table: activeTable.name, rows: [row] })
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
      body: JSON.stringify({ table: tableName, rows })
    });
    await reload();
  };

  const filteredRows = useMemo(() => {
    if (!effectiveTable) return [];
    const q = search.trim().toLowerCase();
    if (!q) return effectiveTable.rows || [];
    return (effectiveTable.rows || []).filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [effectiveTable, search]);

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
  const orderedCols = effectiveTable
    ? [keyCol, ...baseCols.filter((n) => n !== keyCol && !heavyCols.has(n)).slice(0, 7)]
    : [];

  if (loadingSession) {
    return <div className="login-wrap"><div className="small">Checking admin session...</div></div>;
  }

  if (!authed) {
    return <LoginView onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">ValleyFest</div>
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
            <h1 className="page-title"><FaShieldAlt color="#16a34a" /> {PAGE_TITLE[page]}</h1>
            <div className="page-sub">Secure session - IP and browser bound</div>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={reload} disabled={loadingData}><FaRedo /> {loadingData ? "Reloading" : "Reload"}</button>
            <button className="btn ghost" onClick={() => setTab("json")}><FaSave /> Save All</button>
          </div>
        </div>

        <div className="content">
          {error ? <div className="warn">{error}</div> : null}

          {page === "dashboard" ? (
            <>
            <DashboardView
              tablesByName={tablesByName}
              onReload={reload}
              onOpenImages={openImages}
              onUpsert={async (tableName, rows) => {
                await http("/api/admin/supabase/upsert", {
                  method: "POST",
                  body: JSON.stringify({ table: tableName, rows })
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
            <NotificationsWorkspace snapshot={snapshot} />
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
                      body: JSON.stringify({ table: tableName, rows })
                    });
                  }}
                  onDelete={async (tableName, id, keyColumn) => {
                    await http("/api/admin/supabase/delete", {
                      method: "POST",
                      body: JSON.stringify({ table: tableName, id, keyColumn })
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
                    <div style={{ position: "relative" }}>
                      <FaSearch style={{ position: "absolute", left: 10, top: 12, opacity: 0.8 }} />
                      <input className="input" style={{ paddingLeft: 30 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
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

                  <div className="table-wrap" style={{ marginTop: 10 }}>
                    {effectiveTable.name === "ev_bookings" ? (
                      <BookingsTable
                        rows={filteredRows}
                        onOpenRow={(rowKey) => { setSelectedRowKey(rowKey); setTab("form"); }}
                        onOpenImages={openImages}
                        onUpsert={async (tableName, rows) => {
                          await http("/api/admin/supabase/upsert", {
                            method: "POST",
                            body: JSON.stringify({ table: tableName, rows })
                          });
                        }}
                        onReload={reload}
                        catalogLookup={catalogLookup}
                      />
                    ) : effectiveTable.name === "ev_analytics_events" && page === "tracking" ? (
                      <TrackingTable rows={filteredRows} />
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>{columnLabel(effectiveTable.name, keyCol)}</th>
                            {hasImages ? <th className="thumb-cell">image</th> : null}
                            {orderedCols.filter((n) => n !== keyCol).map((name) => <th key={name}>{columnLabel(effectiveTable.name, name)}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((row, idx) => {
                            const rowKey = String(row[keyCol] || row.id || row.slug || row.code || row.restaurant_id || idx);
                            const urls = hasImages ? extractImageUrlsFromRow(row) : [];
                            return (
                              <tr key={rowKey} onClick={() => { setSelectedRowKey(rowKey); setTab("form"); }}>
                                <td>{displayText(row[keyCol] ?? "").slice(0, 120)}</td>
                                {hasImages ? (
                                  <td className="thumb-cell" onClick={(e) => e.stopPropagation()}>
                                    {urls[0] ? (
                                      <img className="thumb" src={urls[0]} alt="" onClick={() => openImages(effectiveTable.name, urls, 0)} />
                                    ) : null}
                                  </td>
                                ) : null}
                                {orderedCols.filter((n) => n !== keyCol).map((name) => {
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
                  <textarea className="textarea json-box" value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} style={{ marginTop: 10 }} />
                  <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
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
    const t = (snapshot?.tables || []).find((x) => x.name === "ev_restaurants");
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);
  const menuItems = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === "ev_menu_items");
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);

  const [vendorQuery, setVendorQuery] = useState("");
  const [vendorId, setVendorId] = useState(restaurants[0]?.id || "");
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

  const vendorImages = useMemo(() => extractImageUrlsFromRow(vendor || {}), [vendorId, vendor]);

  useEffect(() => {
    if (!vendor) return;
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
      await onUpsert("ev_menu_items", [row]);
      await onReload();
      setDraft((p) => ({ ...p, id }));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (id) => {
    const ok = window.confirm("Delete this menu item?");
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await onDelete("ev_menu_items", id, "id");
      await onReload();
      startNew();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveVendor = async () => {
    if (!vendorDraft.id) return;
    if (!vendorDraft.name.trim()) { setError("Vendor name is required"); return; }
    setBusy(true);
    setError("");
    try {
      const row = {
        id: vendorDraft.id,
        name: vendorDraft.name,
        location: vendorDraft.location || "",
        description: vendorDraft.description || "",
        cuisine: vendorDraft.cuisineCsv.split(",").map((x) => x.trim()).filter(Boolean),
        hero_image: vendorDraft.heroImage || "",
        available: !!vendorDraft.available
      };
      await onUpsert("ev_restaurants", [row]);
      await onReload();
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
    setBusy(true);
    setError("");
    try {
      await http("/api/admin/food-vendors/delete-vendor", {
        method: "POST",
        body: JSON.stringify({ restaurantId: vendorDraft.id })
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
      setVendorDraft((p) => ({ ...p, heroImage: j.path || j.url || "" }));
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
    <div className="workspace">
      <div className="pane">
        <div className="pane-title">
          <div>Vendors</div>
          <button className="btn small" onClick={startNew} disabled={busy}>+ Add</button>
        </div>
        <input className="input" value={vendorQuery} onChange={(e) => setVendorQuery(e.target.value)} placeholder="Search vendors..." />
        <div className="list" style={{ marginTop: 10 }}>
          {filteredVendors.map((r) => (
            <div
              key={r.id}
              className={`vendor-card ${String(r.id) === String(vendorId) ? "active" : ""}`}
              onClick={() => { setVendorId(r.id); startNew(); }}
              role="button"
              tabIndex={0}
            >
              <div className="vendor-name">{safeText(r.name || "").slice(0, 60) || r.id}</div>
              <div className="vendor-sub">{safeText(r.location || "").slice(0, 40)}</div>
              <div className="vendor-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn small" onClick={() => setVendorId(r.id)} disabled={busy}>Edit</button>
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
              <div className="vendor-name" style={{ fontSize: 18 }}>{safeText(vendor.name || vendor.id)}</div>
              <div className="vendor-sub">{safeText(vendor.location || "").slice(0, 60)}</div>
              <div className="small" style={{ marginTop: 6 }}>{safeText(vendor.description || "").slice(0, 180)}</div>
            </div>
          </div>
        ) : (
          <div className="small">Select a vendor.</div>
        )}

        <div className="menu-grid">
          <div className="pane-title" style={{ marginTop: 2 }}>
            <div>Vendor Menu</div>
            <button className="btn small" onClick={() => { /* fallback to table view handled by main tabs */ }} disabled>Table</button>
          </div>

          {error ? <div className="warn">{error}</div> : null}

          {vendor ? (
            <div className="card" style={{ margin: 0 }}>
              <div className="small" style={{ marginBottom: 8 }}>Edit Vendor</div>
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
              <div className="split-row" style={{ marginTop: 10 }}>
                <div className="field">
                  <label>Cuisine (comma separated)</label>
                  <input className="input" value={vendorDraft.cuisineCsv} onChange={(e) => setVendorDraft((p) => ({ ...p, cuisineCsv: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Hero Image (URL)</label>
                  <input className="input" value={vendorDraft.heroImage} onChange={(e) => setVendorDraft((p) => ({ ...p, heroImage: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div className="field full" style={{ marginTop: 10 }}>
                <label>Description</label>
                <textarea className="textarea" value={vendorDraft.description} onChange={(e) => setVendorDraft((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="toggle-row">
                <div className={`pill-toggle ${vendorDraft.available ? "on" : ""}`} onClick={() => setVendorDraft((p) => ({ ...p, available: !p.available }))}>Available</div>
                <label className="pill-toggle" style={{ cursor: "pointer" }}>
                  Upload Hero
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => uploadVendorHero(e.target.files?.[0])} />
                </label>
                {vendorDraft.heroImage ? (
                  <button className="btn small" onClick={() => onOpenImages("Hero image", [vendorDraft.heroImage], 0)} disabled={busy}>Preview</button>
                ) : null}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
            <>
          <div className="card" style={{ margin: 0 }}>
            <div className="small" style={{ marginBottom: 8 }}>Add / Edit Menu Item</div>
            <div className="split-row">
              <div className="field">
                <label>Item Name *</label>
                <input className="input" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Veg Thali" />
              </div>
              <div className="field">
                <label>Price *</label>
                <input className="input" value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))} placeholder="250" />
              </div>
            </div>
            <div className="split-row" style={{ marginTop: 10 }}>
              <div className="field">
                <label>Category</label>
                <input className="input" value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} placeholder="General" />
              </div>
              <div className="field">
                <label>Item Image (URL)</label>
                <input className="input" value={draft.image} onChange={(e) => setDraft((p) => ({ ...p, image: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
            <div className="field full" style={{ marginTop: 10 }}>
              <label>Description</label>
              <textarea className="textarea" value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} placeholder="Describe this item..." />
            </div>
            <div className="toggle-row">
              <div className={`pill-toggle ${draft.available ? "on" : ""}`} onClick={() => setDraft((p) => ({ ...p, available: !p.available }))}>Available</div>
              <div className={`pill-toggle ${draft.isVeg ? "on" : ""}`} onClick={() => setDraft((p) => ({ ...p, isVeg: !p.isVeg }))}>Vegetarian</div>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={saveItem} disabled={busy || !vendorId}>+ Add Menu Item</button>
              <button className="btn" onClick={startNew} disabled={busy}>Reset</button>
              {draft.id ? (
                <button className="btn danger" onClick={() => deleteItem(draft.id)} disabled={busy}>Delete</button>
              ) : null}
            </div>
          </div>

          <div className="card" style={{ margin: 0 }}>
            <input className="input" value={menuQuery} onChange={(e) => setMenuQuery(e.target.value)} placeholder="Search..." />
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="table menu-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorItems.map((m) => {
                    const urls = extractImageUrlsFromRow(m);
                    return (
                      <tr key={m.id} onClick={() => editItem(m)}>
                        <td className="thumb-cell" onClick={(e) => e.stopPropagation()}>
                          {urls[0] ? <img className="thumb" src={urls[0]} alt="" onClick={() => onOpenImages("Menu item images", urls, 0)} /> : null}
                        </td>
                        <td>{safeText(m.id)}</td>
                        <td>{safeText(m.name)}</td>
                        <td>{safeText(m.category)}</td>
                        <td>{safeText(m.price)}</td>
                        <td>{m.available !== false ? "Yes" : "No"}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button className="btn small danger" onClick={() => deleteItem(safeText(m.id))} disabled={busy}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                  {!vendorItems.length ? (
                    <tr><td colSpan={7} className="small">No menu items yet.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
            </>
          ) : (
            <div className="card" style={{ margin: 0 }}>
              <div className="small">Replace vendor menu as JSON (array of items)</div>
              <textarea className="textarea json-mini" value={menuJson} onChange={(e) => setMenuJson(e.target.value)} style={{ marginTop: 10 }} />
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn primary" onClick={saveMenuJsonReplace} disabled={busy || !vendorId}>Save JSON</button>
                <button className="btn" onClick={() => setMenuJson(JSON.stringify(vendorItems, null, 2))} disabled={busy}>Reset</button>
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                Required fields per item: <code>id</code>, <code>name</code>. Optional: <code>category</code>, <code>description</code>, <code>price</code>, <code>image</code>, <code>available</code>, <code>is_veg</code>.
              </div>
            </div>
          )}
        </div>
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
      const prefix = (contextPage === "cottages" && table.name === "ev_hotels") ? "cottage_" : "";
      out.id = `${prefix}${makeUuid()}`;
    }
    return out;
  }, [table, selectedRow, contextPage]);

  const [form, setForm] = useState(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const parseValue = (raw) => {
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
    const url = safeText(j?.path || j?.url || "");
    if (!url) throw new Error("UPLOAD_FAILED");
    setField(fieldName, url);
    // Auto-persist to Supabase when editing an existing row with a primary key.
    if (keyVal && onUpsertPartial) {
      await onUpsertPartial(table.name, [{ [keyCol]: keyVal, [fieldName]: url }]);
    }
  };

  const imageUrls = useMemo(() => extractImageUrlsFromRow(form), [form]);
  const relatedItem = useMemo(() => {
    if (table?.name !== "ev_bookings") return null;
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
      <h3 style={{ marginTop: 0 }}>Create / Edit {tableLabel(table.name)}</h3>
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
      <div className="form-grid">
        {(table.columns || []).map((col) => {
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
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input className="input" style={{ flex: 1 }} value={asText} onChange={(e) => setField(col.name, e.target.value)} />
                  {canUpload ? (
                    <label className="btn small" style={{ cursor: "pointer" }}>
                      <FaDownload /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
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
      <div style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={() => {
          const row = {};
          Object.entries(form).forEach(([k, v]) => {
            row[k] = parseValue(v);
          });
          // Ensure primary key isn't null; Supabase upsert will fail otherwise.
          const keyCol = keyColumnForTable(table);
          if ((row[keyCol] === null || row[keyCol] === undefined || String(row[keyCol]).trim() === "") && keyCol) {
            const prefix = (contextPage === "cottages" && table.name === "ev_hotels" && keyCol === "id") ? "cottage_" : "";
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
      await onUpsert("ev_bookings", [{ id, status: nextStatus }]);
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
      await onUpsert("ev_bookings", [{ id, status: "cancelled" }]);
      await onUpsert("ev_audit_log", [{
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
      {err ? <div className="warn" style={{ marginBottom: 10 }}>{err}</div> : null}
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
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
