import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { apiGet } from "../lib/api";
import { getAuthMode } from "../lib/auth";
import { getTrackedOrders } from "../lib/orders";

type OrderItem = {
  id: string;
  type: string;
  status: string;
  title: string;
  date: string;
  amount?: string;
  raw: any;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  preparing: "#8b5cf6",
  ready: "#06b6d4",
  picked_up: "#6366f1",
  in_transit: "#6366f1",
  delivered: "#16a34a",
  completed: "#16a34a",
  cancelled: "#ef4444",
};

const STATUS_EMOJI: Record<string, string> = {
  pending: "⏳",
  confirmed: "✅",
  preparing: "👨‍🍳",
  ready: "📦",
  picked_up: "🚚",
  in_transit: "🚚",
  delivered: "✅",
  completed: "✅",
  cancelled: "❌",
};

export default function MyOrdersScreen({
  onRequireAuth,
  onRequestRefund,
  onRateExperience,
}: {
  onRequireAuth?: () => void;
  onRequestRefund?: (order: any) => void;
  onRateExperience?: (order: any) => void;
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchOrders = useCallback(async () => {
    const authMode = getAuthMode();
    if (authMode !== "authenticated") {
      onRequireAuth?.();
      setLoading(false);
      return;
    }

    try {
      const res = await apiGet<{
        bookings: any[];
        foodOrders: any[];
        cabBookings: any[];
      }>("/api/ai/my-orders");

      const out: OrderItem[] = [];

      (res.bookings || []).forEach((b: any) => {
        out.push({
          id: b.id,
          type: "booking",
          status: b.status || "pending",
          title: b.tour_title || b.hotel_name || "Tour/Hotel Booking",
          date: b.created_at || b.check_in || "",
          amount: b.pricing?.totalAmount || b.pricing?.total_amount || "",
          raw: b,
        });
      });

      (res.foodOrders || []).forEach((o: any) => {
        out.push({
          id: o.id,
          type: "food",
          status: o.status || "pending",
          title: `Food Order — ${o.restaurant_id || "Restaurant"}`,
          date: o.order_time || o.created_at || "",
          amount: o.pricing?.totalAmount || o.pricing?.total_amount || "",
          raw: o,
        });
      });

      (res.cabBookings || []).forEach((c: any) => {
        out.push({
          id: c.id,
          type: "cab",
          status: c.status || "pending",
          title: `Cab: ${c.pickup_location || ""} → ${c.drop_location || ""}`,
          date: c.datetime || c.created_at || "",
          amount: c.estimated_fare || "",
          raw: c,
        });
      });

      // Also add locally tracked orders not in server response
      const local = getTrackedOrders();
      (local || []).forEach((lo: any) => {
        if (!out.find((o) => o.id === lo.id)) {
          out.push({
            id: lo.id,
            type: lo.type || "food",
            status: lo.status || "pending",
            title: lo.restaurant || lo.title || "Order",
            date: lo.placedAt || "",
            raw: lo,
          });
        }
      });

      out.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setOrders(out);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onRequireAuth]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.type === filter);
  }, [orders, filter]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" }}>
        <ActivityIndicator color="#16a34a" size="large" />
        <Text style={{ color: "#888", marginTop: 8 }}>Loading your orders…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#222" }}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>📋 My Orders</Text>
        <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>Track all your bookings, food orders & cab rides</Text>
      </View>

      {/* Filter pills */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexWrap: "wrap" }}>
        {[
          { key: "all", label: "All" },
          { key: "booking", label: "🏨 Bookings" },
          { key: "food", label: "🍽️ Food" },
          { key: "cab", label: "🚕 Cabs" },
        ].map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              backgroundColor: filter === f.key ? "#16a34a" : "#1a1a1a",
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: filter === f.key ? "#16a34a" : "#333",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#ef4444", fontSize: 13 }}>⚠️ {error}</Text>
          <Pressable onPress={fetchOrders} style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#1a1a1a", borderRadius: 8, alignSelf: "flex-start" }}>
            <Text style={{ color: "#16a34a", fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor="#16a34a" />
        }
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 14 }}>📭</Text>
            <Text style={{ color: "#888", fontSize: 15, textAlign: "center" }}>No orders yet. Explore ValleyFest and place your first order!</Text>
          </View>
        ) : null}

        {filtered.map((order) => {
          const expanded = expandedId === order.id;
          const statusColor = STATUS_COLORS[order.status] || "#888";
          const statusEmoji = STATUS_EMOJI[order.status] || "•";
          const canRefund = ["pending", "confirmed"].includes(order.status);
          const canRate = ["delivered", "completed"].includes(order.status);

          return (
            <Pressable
              key={order.id}
              onPress={() => setExpandedId(expanded ? null : order.id)}
              style={{
                backgroundColor: "#111",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: expanded ? "#333" : "#1a1a1a",
                overflow: "hidden",
              }}
            >
              {/* Order header */}
              <View style={{ padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
                    {order.title}
                  </Text>
                  <Text style={{ color: "#666", fontSize: 11, marginTop: 2 }}>
                    {order.id.slice(0, 16)} · {order.date ? new Date(order.date).toLocaleDateString() : ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {order.amount ? (
                    <Text style={{ color: "#16a34a", fontWeight: "700", fontSize: 13 }}>₹{order.amount}</Text>
                  ) : null}
                  <View style={{ backgroundColor: statusColor + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ color: statusColor, fontSize: 11, fontWeight: "700" }}>
                      {statusEmoji} {order.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expanded detail */}
              {expanded ? (
                <View style={{ padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: "#1a1a1a" }}>
                  <View style={{ backgroundColor: "#0a0a0a", borderRadius: 8, padding: 10, marginTop: 8 }}>
                    <Text style={{ color: "#888", fontSize: 11, fontFamily: "monospace" }}>
                      {JSON.stringify(order.raw, null, 2).slice(0, 600)}
                    </Text>
                  </View>

                  {/* Action buttons */}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {canRefund && onRequestRefund ? (
                      <Pressable
                        onPress={() => onRequestRefund(order)}
                        style={{ backgroundColor: "#ef444422", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#ef4444" }}
                      >
                        <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 12 }}>Request Refund</Text>
                      </Pressable>
                    ) : null}
                    {canRate && onRateExperience ? (
                      <Pressable
                        onPress={() => onRateExperience(order)}
                        style={{ backgroundColor: "#f59e0b22", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#f59e0b" }}
                      >
                        <Text style={{ color: "#f59e0b", fontWeight: "700", fontSize: 12 }}>⭐ Rate Experience</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
