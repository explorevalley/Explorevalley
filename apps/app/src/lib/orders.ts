import { Platform } from "react-native";

export type TrackedOrderType = "booking" | "cab" | "food";

export type TrackedOrder = {
  id: string;
  type: TrackedOrderType;
  status: string;
  createdAt: number;
};

const STORE_KEY = "explorevalley_tracked_orders";
let inMemory: TrackedOrder[] = [];

function isWeb() {
  return Platform.OS === "web";
}

function load(): TrackedOrder[] {
  if (!isWeb()) return inMemory;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(next: TrackedOrder[]) {
  inMemory = next;
  if (!isWeb()) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

export function getTrackedOrders() {
  return load();
}

export function trackOrder(type: TrackedOrderType, id: string) {
  const list = load();
  if (list.some((x) => x.id === id && x.type === type)) return;
  list.unshift({ id, type, status: "pending", createdAt: Date.now() });
  save(list.slice(0, 100));
}

export function buildStatusPayload(list: TrackedOrder[]) {
  const bookings = list.filter((x) => x.type === "booking").map((x) => x.id);
  const cabBookings = list.filter((x) => x.type === "cab").map((x) => x.id);
  const foodOrders = list.filter((x) => x.type === "food").map((x) => x.id);
  return { bookings, cabBookings, foodOrders };
}

export function applyOrderStatuses(
  updates: Array<{ id: string; type: TrackedOrderType; status: string }>
) {
  const list = load();
  const confirmedNow: Array<{ id: string; type: TrackedOrderType }> = [];
  const updated = list.map((item) => {
    const hit = updates.find((u) => u.id === item.id && u.type === item.type);
    if (!hit) return item;
    if (item.status !== "confirmed" && hit.status === "confirmed") {
      confirmedNow.push({ id: item.id, type: item.type });
    }
    return { ...item, status: hit.status || item.status };
  });
  save(updated);
  return confirmedNow;
}

