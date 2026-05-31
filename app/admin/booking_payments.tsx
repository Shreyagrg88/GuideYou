import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchAdminPaymentBookings,
  type AdminPaymentBooking,
  type GuidePayoutStatusFilter,
} from "../../api/adminBookingsPayments";
import { formatNprAmount } from "../../utils/bookingPrice";
import { formatGuidePayoutStatusLabel } from "../../utils/bookingMilestoneDisplay";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonBookingTab } from "@/components/Skeleton";

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminBookingPaymentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<GuidePayoutStatusFilter>("pending");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [bookings, setBookings] = useState<AdminPaymentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (p: number, f: GuidePayoutStatusFilter, silent?: boolean) => {
      try {
        if (!silent) setLoading(true);
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          Alert.alert("Unauthorized", "Please sign in as admin.");
          router.replace("/login");
          return;
        }
        const res = await fetchAdminPaymentBookings({
          guidePayoutStatus: f,
          page: p,
          limit,
        });
        setBookings(res.bookings);
        setTotal(res.total);
        setPage(res.page);
      } catch (e: unknown) {
        const err = e as Error & { status?: number };
        if (err.status === 401) {
          router.replace("/login");
          return;
        }
        Alert.alert("Error", err.message || "Could not load bookings.");
        setBookings([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [limit, router]
  );

  useEffect(() => {
    load(page, filter);
  }, [page, filter, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(page, filter, true);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const tabs: { key: GuidePayoutStatusFilter; label: string }[] = [
    { key: "pending", label: "Awaiting release" },
    { key: "paid", label: "Released" },
    { key: "all", label: "All" },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#142032" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Guide payouts</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, filter === t.key && styles.tabActive]}
            onPress={() => {
              setFilter(t.key);
              setPage(1);
            }}
          >
            <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={[styles.center, { flex: 1, alignSelf: "stretch" }]}>
          <SkeletonBookingTab rows={10} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007BFF" />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.countLine}>
            {total} booking{total !== 1 ? "s" : ""}
            {filter === "pending"
              ? " awaiting release (includes start-only releases)"
              : filter === "paid"
                ? " released"
                : ""}
          </Text>

          {bookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="wallet-outline" size={40} color="#aab" />
              <Text style={styles.emptyTitle}>No bookings</Text>
              <Text style={styles.emptySub}>Try another tab or pull to refresh.</Text>
            </View>
          ) : (
            bookings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: "/admin/booking_payment_detail",
                    params: { bookingId: b.id },
                  })
                }
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {b.isCustomTour
                        ? b.tourName || "Custom tour"
                        : b.activity?.name || "Booking"}
                    </Text>
                    <Text style={styles.cardSub}>
                      {b.guide.fullName || b.guide.username || "Guide"} ·{" "}
                      {b.tourist.fullName || b.tourist.username || "Tourist"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.pill,
                      b.guidePayoutStatus === "paid"
                        ? styles.pillPaid
                        : b.guidePayoutStatus === "partial"
                          ? styles.pillPartial
                          : styles.pillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        b.guidePayoutStatus === "paid"
                          ? styles.pillTextPaid
                          : b.guidePayoutStatus === "partial"
                            ? styles.pillTextPartial
                            : styles.pillTextPending,
                      ]}
                    >
                      {formatGuidePayoutStatusLabel(b.guidePayoutStatus)}
                    </Text>
                  </View>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Guide receives</Text>
                  <Text style={styles.amountValue}>{formatNprAmount(b.guideEarning)}</Text>
                </View>
                {b.guidePayoutStatus === "partial" ? (
                  <View style={styles.trancheRow}>
                    <Text style={styles.trancheMeta}>
                      Start {formatNprAmount(b.guideStartPayoutAmount ?? 0)} released
                    </Text>
                    <Text style={styles.trancheMetaDot}>·</Text>
                    <Text style={styles.trancheMeta}>
                      Final {formatNprAmount(b.guideFinalPayoutAmount ?? 0)} pending
                    </Text>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>Gross {formatNprAmount(b.price)}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.meta}>Fee 15% {formatNprAmount(b.platformCommission)}</Text>
                </View>
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Paid {formatShortDate(b.paidAt)}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#007BFF" />
                </View>
              </TouchableOpacity>
            ))
          )}

          {totalPages > 1 && (
            <View style={styles.pager}>
              <TouchableOpacity
                style={[styles.pageBtn, !canPrev && styles.pageBtnDisabled]}
                disabled={!canPrev}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                Page {page} / {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, !canNext && styles.pageBtnDisabled]}
                disabled={!canNext}
                onPress={() => setPage((p) => p + 1)}
              >
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EAF3FA",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 4,
  },
  screenTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#142032",
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#DDE5EE",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#5a6570",
  },
  tabTextActive: {
    color: "#007BFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  countLine: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#5a6570",
    marginBottom: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  hint: {
    marginTop: 10,
    fontFamily: "Nunito_400Regular",
    color: "#666",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    marginTop: 12,
    color: "#142032",
  },
  emptySub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#8899aa",
    marginTop: 6,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8eef4",
    shadowColor: "#1a3a5c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#142032",
  },
  cardSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6b7c8f",
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillPending: {
    backgroundColor: "#FFF4E5",
  },
  pillPaid: {
    backgroundColor: "#E8F5E9",
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
  pillTextPending: {
    color: "#b45309",
  },
  pillTextPaid: {
    color: "#2e7d32",
  },
  pillPartial: {
    backgroundColor: "#E3F2FD",
  },
  pillTextPartial: {
    color: "#1565C0",
  },
  trancheRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 8,
  },
  trancheMeta: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#1565C0",
  },
  trancheMetaDot: {
    marginHorizontal: 6,
    color: "#1565C0",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  amountLabel: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#5a6570",
  },
  amountValue: {
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
    color: "#15803d",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 10,
  },
  meta: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#8899aa",
  },
  metaDot: {
    marginHorizontal: 6,
    color: "#ccd",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f4f8",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#6b7c8f",
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 16,
  },
  pageBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007BFF",
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontFamily: "Nunito_700Bold",
    color: "#007BFF",
    fontSize: 14,
  },
  pageInfo: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#5a6570",
  },
});
