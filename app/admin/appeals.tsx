/**
 * Appeals
 * Route: /admin/appeals
 *
 * List disabled guides who submitted account appeals.
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchAdminAppeals,
  type AdminAppeal,
  type AdminAppealFilter,
} from "../../api/adminAppeals";
import { ScreenHeaderBar } from "../../components/screen-header";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonListScreen } from "@/components/Skeleton";

const FILTERS: { id: AdminAppealFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "pending") return "#c2410c";
  if (s === "under_review") return "#b45309";
  if (s === "approved") return "#15803d";
  if (s === "rejected") return "#b91c1c";
  return "#5a6570";
}

export default function AdminAppealsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- Local state ---
  const [filter, setFilter] = useState<AdminAppealFilter>("open");
  const [appeals, setAppeals] = useState<AdminAppeal[]>([]);
  const [total, setTotal] = useState(0);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent?: boolean) => {
      if (!silent) setLoading(true);
      const result = await fetchAdminAppeals(filter, 1, 30);
      setAppeals(result.appeals);
      setTotal(result.pagination.total);
      setApiAvailable(result.apiAvailable);
      setLoading(false);
      setRefreshing(false);
    },
    [filter]
  );

  // --- Effects (load data, listeners) ---
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  // --- Render ---
  return (
    <View style={styles.root}>
      <ScreenHeaderBar title="Guide appeals" backIcon="arrow-back" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!apiAvailable ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Appeals API is not available yet.</Text>
        </View>
      ) : loading && !refreshing ? (
        <SkeletonListScreen rows={6} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: 100 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007BFF" />
          }
        >
          {filter === "open" && total > 0 ? (
            <Text style={styles.countLine}>{total} open appeal{total === 1 ? "" : "s"}</Text>
          ) : null}

          {appeals.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>No appeals in this tab.</Text>
            </View>
          ) : (
            appeals.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/admin/appeal_detail",
                    params: { appealId: a.id },
                  } as never)
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.guideName}>{a.guideName || "Guide"}</Text>
                  <Text style={[styles.status, { color: statusColor(a.status) }]}>
                    {a.status.replace(/_/g, " ")}
                  </Text>
                </View>
                <Text style={styles.message} numberOfLines={3}>
                  {a.message}
                </Text>
                {a.disableReason ? (
                  <Text style={styles.disableReason} numberOfLines={1}>
                    Disabled: {a.disableReason}
                  </Text>
                ) : null}
                <Text style={styles.date}>{formatDate(a.createdAt)}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  filterScroll: { maxHeight: 52, flexGrow: 0 },
  filterRow: {
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: "#007BFF" },
  filterText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: "#64748b" },
  filterTextActive: { color: "#fff" },
  list: { paddingHorizontal: PAGE_PADDING_HORIZONTAL, paddingTop: 4 },
  countLine: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#64748b",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  guideName: { fontFamily: "Nunito_700Bold", fontSize: 16, color: "#142032", flex: 1 },
  status: { fontFamily: "Nunito_700Bold", fontSize: 12, textTransform: "capitalize" },
  message: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  disableReason: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#94a3b8",
  },
  date: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#94a3b8",
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
  },
});
