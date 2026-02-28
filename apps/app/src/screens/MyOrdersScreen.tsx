import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { apiGet } from "../lib/api";
import { getAuthMode } from "../lib/auth";
import { getTrackedOrders } from "../lib/orders";
import { myOrdersColors, myOrdersDynamicStyles as ds, myOrdersStyles as styles } from "../styles/MyOrdersScreen.styles";
import { myOrdersScreenData as t } from "../staticData/myOrdersScreen.staticData";

type OrderItem = {
  id: string;
  type: string;
  status: string;
  title: string;
  date: string;
  amount?: string;
  raw: any;
};

const STATUS_COLORS: Record<string, string> = t.statuses.colors;
const STATUS_EMOJI: Record<string, string> = t.statuses.emoji;

export default function MyOrdersScreen({
  onRequireAuth,
  onRequestRefund,
  onRateExperience,
}: {
  onRequireAuth?: () => void;
  onRequestRefund?: (order: any) => void;
  onRateExperience?: (order: any) => void;
}) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(t.tabs.all);

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
      }>(t.api.myOrders);

      const out: OrderItem[] = [];

      (res.bookings || []).forEach((b: any) => {
        out.push({
          id: b.id,
          type: t.tabs.booking,
          status: b.status || "pending",
          title: b.tour_title || b.hotel_name || t.order.bookingFallback,
          date: b.created_at || b.check_in || "",
          amount: b.pricing?.totalAmount || b.pricing?.total_amount || "",
          raw: b,
        });
      });

      (res.foodOrders || []).forEach((o: any) => {
        out.push({
          id: o.id,
          type: t.tabs.food,
          status: o.status || "pending",
          title: `${t.order.foodPrefix} ${o.restaurant_id || t.order.foodFallbackRestaurant}`,
          date: o.order_time || o.created_at || "",
          amount: o.pricing?.totalAmount || o.pricing?.total_amount || "",
          raw: o,
        });
      });

      (res.cabBookings || []).forEach((c: any) => {
        out.push({
          id: c.id,
          type: t.tabs.cab,
          status: c.status || "pending",
          title: `${t.order.cabPrefix} ${c.pickup_location || ""} → ${c.drop_location || ""}`,
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
            type: lo.type || t.tabs.food,
            status: lo.status || "pending",
            title: lo.restaurant || lo.title || t.order.orderFallback,
            date: lo.placedAt || "",
            raw: lo,
          });
        }
      });

      out.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setOrders(out);
      setError(null);
    } catch (err: any) {
      setError(err.message || t.errors.loadOrders);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onRequireAuth]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    if (filter === t.tabs.all) return orders;
    return orders.filter((o) => o.type === filter);
  }, [orders, filter]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={myOrdersColors.spinner} size="large" />
        <Text style={styles.loadingText}>{t.labels.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.labels.headerTitle}</Text>
        <Text style={styles.headerSub}>{t.labels.headerSub}</Text>
      </View>

      {/* Filter pills */}
      <View style={styles.filtersRow}>
        {t.labels.filters.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterPill, ds.filterPill(filter === f.key)]}
          >
            <Text style={[styles.filterText, ds.filterText(filter === f.key)]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={fetchOrders} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t.labels.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={myOrdersColors.refreshTint} />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t.labels.empty}</Text>
          </View>
        ) : null}

        {filtered.map((order) => {
          const expanded = expandedId === order.id;
          const statusColor = STATUS_COLORS[order.status] || STATUS_COLORS.fallback;
          const statusEmoji = STATUS_EMOJI[order.status] || STATUS_EMOJI.fallback;
          const canRefund = ["pending", "confirmed"].includes(order.status);
          const canRate = ["delivered", "completed"].includes(order.status);

          return (
            <Pressable
              key={order.id}
              onPress={() => setExpandedId(expanded ? null : order.id)}
              style={[styles.card, ds.cardState(expanded)]}
            >
              {/* Order header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderMain}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {order.title}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {order.id.slice(0, 16)} {t.misc.dot} {order.date ? new Date(order.date).toLocaleDateString() : ""}
                  </Text>
                </View>
                <View style={styles.cardHeaderRight}>
                  {order.amount ? (
                    <Text style={styles.amountText}>{t.misc.currency}{order.amount}</Text>
                  ) : null}
                  <View style={[styles.statusBadge, ds.statusBadge(statusColor)]}>
                    <Text style={[styles.statusText, ds.statusText(statusColor)]}>
                      {statusEmoji} {order.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expanded detail */}
              {expanded ? (
                <View style={styles.expandedWrap}>
                  <View style={styles.rawWrap}>
                    <Text style={styles.rawText}>
                      {JSON.stringify(order.raw, null, 2).slice(0, t.rawPreviewLimit)}
                    </Text>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.actionsRow}>
                    {canRefund && onRequestRefund ? (
                      <Pressable
                        onPress={() => onRequestRefund(order)}
                        style={styles.refundBtn}
                      >
                        <Text style={styles.refundText}>{t.labels.refund}</Text>
                      </Pressable>
                    ) : null}
                    {canRate && onRateExperience ? (
                      <Pressable
                        onPress={() => onRateExperience(order)}
                        style={styles.rateBtn}
                      >
                        <Text style={styles.rateText}>{t.labels.rate}</Text>
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
