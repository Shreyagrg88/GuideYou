import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
  fetchAdminReports,
  patchAdminReport,
  type AdminReport,
  type AdminReportFilter,
} from "../../api/reports";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import { ScreenHeaderBar } from "../../components/screen-header";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonListScreen } from "@/components/Skeleton";

const MODERATION_LINKS = [
  {
    title: "License verification",
    subtitle: "Review guide license uploads",
    route: "/admin/verification",
    icon: "document-text-outline" as const,
  },
  {
    title: "Activity review",
    subtitle: "Approve or reject new activities",
    route: "/admin/verification",
    icon: "map-outline" as const,
  },
  {
    title: "Guide appeals",
    subtitle: "Review disabled guide reinstatement requests",
    route: "/admin/appeals",
    icon: "mail-outline" as const,
  },
  {
    title: "Guide payouts",
    subtitle: "Paid bookings & commission split",
    route: "/admin/booking_payments",
    icon: "wallet-outline" as const,
  },
];

function formatReportDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "open" || s === "pending") return "#c2410c";
  if (s === "under_review") return "#b45309";
  if (s === "resolved") return "#15803d";
  return "#5a6570";
}

export default function AdminReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<AdminReportFilter>("open");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(
    async (silent?: boolean) => {
      if (!silent) setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }
      const result = await fetchAdminReports(filter);
      setReports(result.reports);
      setApiAvailable(result.apiAvailable);
      setLoading(false);
      setRefreshing(false);
    },
    [filter, router]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const handleQuickDismiss = (report: AdminReport) => {
    Alert.alert("Dismiss report", "Dismiss this report without further action?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Dismiss",
        style: "destructive",
        onPress: async () => {
          setProcessingId(report.id);
          const result = await patchAdminReport(report.id, { status: "dismissed" });
          setProcessingId(null);
          if (!result.ok) {
            Alert.alert("Error", result.msg);
            return;
          }
          load(true);
        },
      },
    ]);
  };

  const tabs: { key: AdminReportFilter; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "under_review", label: "Review" },
    { key: "resolved", label: "Resolved" },
    { key: "all", label: "All" },
  ];

  return (
    <View style={styles.root}>
      <ScreenHeaderBar title="Reports" backIcon="arrow-back" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentScroll}
        style={styles.segmentWrap}
      >
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.segmentItem, filter === t.key && styles.segmentActive]}
            onPress={() => setFilter(t.key)}
          >
            <Text
              style={[
                styles.segmentText,
                filter === t.key && styles.segmentTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <SkeletonListScreen rows={6} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: 100 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {!apiAvailable ? (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={22} color="#1565C0" />
              <Text style={styles.infoText}>
                Reports API is not available. Use the moderation tools below for
                licenses, activities, and payouts.
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Moderation</Text>
          {MODERATION_LINKS.map((link) => (
            <TouchableOpacity
              key={link.title}
              style={styles.modCard}
              onPress={() => router.push(link.route as never)}
            >
              <Ionicons name={link.icon} size={22} color="#007BFF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.modTitle}>{link.title}</Text>
                <Text style={styles.modSub}>{link.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9aa5b5" />
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
            Guide reports {reports.length > 0 ? `(${reports.length})` : ""}
          </Text>

          {reports.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="flag-outline" size={40} color="#B0BEC5" />
              <Text style={styles.emptyTitle}>No reports</Text>
              <Text style={styles.emptySub}>
                {filter === "open"
                  ? "No open guide reports right now."
                  : "No reports match this filter."}
              </Text>
            </View>
          ) : (
            reports.map((report) => {
              const isActionable =
                report.status.toLowerCase() === "open" ||
                report.status.toLowerCase() === "under_review" ||
                report.status.toLowerCase() === "pending";
              return (
                <TouchableOpacity
                  key={report.id}
                  style={styles.reportCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/admin/report_detail",
                      params: { reportId: report.id },
                    })
                  }
                >
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportReason}>{report.reason}</Text>
                    <Text
                      style={[
                        styles.reportStatus,
                        { color: statusColor(report.status) },
                      ]}
                    >
                      {report.status.replace(/_/g, " ")}
                    </Text>
                  </View>
                  {report.guideName ? (
                    <Text style={styles.reportMeta}>Guide: {report.guideName}</Text>
                  ) : null}
                  <Text style={styles.reportMeta}>By {report.reporterName}</Text>
                  <Text style={styles.reportDate}>
                    {formatReportDate(report.createdAt)}
                  </Text>
                  {report.hasVerifiedBooking ? (
                    <View style={styles.verifiedRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                      <Text style={styles.verifiedLabel}>Verified booking</Text>
                    </View>
                  ) : null}
                  {report.description ? (
                    <Text style={styles.reportBody} numberOfLines={3}>
                      {report.description}
                    </Text>
                  ) : null}
                  <View style={styles.cardFooter}>
                    <Text style={styles.viewDetail}>View details</Text>
                    {isActionable && apiAvailable ? (
                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        disabled={processingId === report.id}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleQuickDismiss(report);
                        }}
                      >
                        <Text style={styles.quickDismiss}>Dismiss</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EAF3FA" },
  segmentWrap: { maxHeight: 52, flexGrow: 0 },
  segmentScroll: {
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  segmentItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#dde5ee",
  },
  segmentActive: { backgroundColor: "#fff" },
  segmentText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: "#5a6570" },
  segmentTextActive: { fontFamily: "Nunito_700Bold", color: "#142032" },
  list: { paddingHorizontal: PAGE_PADDING_HORIZONTAL, paddingTop: 4 },
  infoBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  infoText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#1565C0",
    lineHeight: 19,
  },
  sectionLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#142032",
    marginBottom: 10,
  },
  modCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  modTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#142032" },
  modSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#5a6570",
    marginTop: 2,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  emptyTitle: {
    marginTop: 12,
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#142032",
  },
  emptySub: {
    marginTop: 6,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#5a6570",
    textAlign: "center",
    lineHeight: 19,
  },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  reportReason: {
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#142032",
  },
  reportStatus: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    textTransform: "capitalize",
  },
  reportMeta: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#5a6570",
    marginBottom: 2,
  },
  reportDate: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#8899aa",
    marginBottom: 6,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  verifiedLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    color: "#15803d",
  },
  reportBody: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewDetail: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#007BFF",
  },
  quickDismiss: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#5a6570",
  },
});
