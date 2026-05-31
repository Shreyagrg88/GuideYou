import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchAdminReportDetail,
  patchAdminReport,
  updateGuideAccountStatus,
  type AdminReportDetail,
} from "../../api/reports";
import { ScreenHeaderBar } from "../../components/screen-header";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import AdminNavBar from "../components/admin_navbar";

function formatDate(iso?: string): string {
  if (!iso) return "—";
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
  if (s === "open") return "#c2410c";
  if (s === "under_review") return "#b45309";
  if (s === "resolved") return "#15803d";
  return "#5a6570";
}

export default function AdminReportDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ reportId?: string }>();
  const reportId = params.reportId?.trim() ?? "";

  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [disableModalVisible, setDisableModalVisible] = useState(false);
  const [disableReason, setDisableReason] = useState("");

  const load = useCallback(async () => {
    if (!reportId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const detail = await fetchAdminReportDetail(reportId);
    setReport(detail);
    setLoading(false);
  }, [reportId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const guideId = report?.guideId ?? report?.guide?.id;
  const guideName =
    report?.guideName ??
    report?.guide?.fullName ??
    report?.guide?.username ??
    "Guide";
  const isOpen =
    report?.status.toLowerCase() === "open" ||
    report?.status.toLowerCase() === "pending";
  const isUnderReview = report?.status.toLowerCase() === "under_review";
  const isClosed =
    report?.status.toLowerCase() === "resolved" ||
    report?.status.toLowerCase() === "dismissed";
  const guideDisabled = report?.guide?.accountStatus === "disabled";

  const runPatch = async (
    body: Parameters<typeof patchAdminReport>[1],
    successMsg: string
  ) => {
    if (!reportId) return;
    setProcessing(true);
    const result = await patchAdminReport(reportId, body);
    setProcessing(false);
    if (!result.ok) {
      Alert.alert("Error", result.msg);
      return;
    }
    Alert.alert("Updated", successMsg);
    void load();
  };

  const handleUnderReview = () => {
    void runPatch({ status: "under_review" }, "Report marked as under review.");
  };

  const handleDismiss = () => {
    Alert.alert("Dismiss report", "Dismiss this report without further action?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Dismiss",
        style: "destructive",
        onPress: () => void runPatch({ status: "dismissed" }, "Report dismissed."),
      },
    ]);
  };

  const handleResolve = () => {
    Alert.alert("Mark resolved", "Mark this report as resolved?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Resolve",
        onPress: () => void runPatch({ status: "resolved" }, "Report marked resolved."),
      },
    ]);
  };

  const confirmDisableGuide = async () => {
    const reason = disableReason.trim();
    if (!guideId || reason.length < 5) {
      Alert.alert("Reason required", "Please enter a reason (at least 5 characters).");
      return;
    }

    setProcessing(true);
    const result = await updateGuideAccountStatus(guideId, {
      status: "disabled",
      reason,
      reportId,
    });
    setProcessing(false);

    if (!result.ok) {
      Alert.alert("Error", result.msg);
      return;
    }

    setDisableModalVisible(false);
    setDisableReason("");
    Alert.alert(
      "Guide disabled",
      `${guideName} can no longer log in or receive new bookings.`
    );
    void load();
  };

  const handleReenableGuide = () => {
    if (!guideId) return;
    Alert.alert(
      "Re-enable guide",
      `Restore access for ${guideName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Re-enable",
          onPress: async () => {
            setProcessing(true);
            const result = await updateGuideAccountStatus(guideId, {
              status: "active",
              reason: "Reinstated after admin review.",
            });
            setProcessing(false);
            if (!result.ok) {
              Alert.alert("Error", result.msg);
              return;
            }
            Alert.alert("Guide re-enabled", `${guideName} can log in again.`);
            void load();
          },
        },
      ]
    );
  };

  if (!reportId) {
    return (
      <View style={styles.root}>
        <ScreenHeaderBar title="Report detail" backIcon="arrow-back" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Report ID is missing.</Text>
        </View>
        <AdminNavBar />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeaderBar title="Report detail" backIcon="arrow-back" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
        <AdminNavBar />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.root}>
        <ScreenHeaderBar title="Report detail" backIcon="arrow-back" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Report not found.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
        <AdminNavBar />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeaderBar title="Report detail" backIcon="arrow-back" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusRow}>
          <Text style={styles.category}>{report.reason}</Text>
          <Text style={[styles.statusBadge, { color: statusColor(report.status) }]}>
            {report.status.replace(/_/g, " ")}
          </Text>
        </View>

        {report.hasVerifiedBooking ? (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#15803d" />
            <Text style={styles.verifiedText}>Verified booking history</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.bodyText}>{report.description || "—"}</Text>
          <Text style={styles.meta}>Submitted {formatDate(report.createdAt)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Guide</Text>
          <Text style={styles.primaryText}>{guideName}</Text>
          {guideDisabled ? (
            <View style={styles.disabledTag}>
              <Text style={styles.disabledTagText}>Account disabled</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reported by</Text>
          <Text style={styles.primaryText}>
            {report.tourist?.fullName || report.tourist?.username || report.reporterName}
          </Text>
          {report.tourist?.email ? (
            <Text style={styles.meta}>{report.tourist.email}</Text>
          ) : null}
        </View>

        {report.booking ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Related booking</Text>
            <Text style={styles.primaryText}>
              {report.booking.tourName || "Booking"}
            </Text>
            <Text style={styles.meta}>
              {formatDate(report.booking.startDate)}
              {report.booking.endDate ? ` – ${formatDate(report.booking.endDate)}` : ""}
            </Text>
            {report.booking.status ? (
              <Text style={styles.meta}>Status: {report.booking.status}</Text>
            ) : null}
          </View>
        ) : null}

        {!isClosed ? (
          <View style={styles.actions}>
            {isOpen ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.reviewBtn]}
                disabled={processing}
                onPress={handleUnderReview}
              >
                <Text style={styles.reviewBtnText}>Mark under review</Text>
              </TouchableOpacity>
            ) : null}

            {(isOpen || isUnderReview) && guideId && !guideDisabled ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.disableBtn]}
                disabled={processing}
                onPress={() => setDisableModalVisible(true)}
              >
                <Ionicons name="ban-outline" size={18} color="#FFF" />
                <Text style={styles.disableBtnText}>Disable guide</Text>
              </TouchableOpacity>
            ) : null}

            {guideId && guideDisabled ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.reviewBtn]}
                disabled={processing}
                onPress={handleReenableGuide}
              >
                <Text style={styles.reviewBtnText}>Re-enable guide</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.outlineBtn]}
                disabled={processing}
                onPress={handleDismiss}
              >
                <Text style={styles.outlineBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.outlineBtn]}
                disabled={processing}
                onPress={handleResolve}
              >
                <Text style={styles.outlineBtnText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={disableModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDisableModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Disable {guideName}?</Text>
            <Text style={styles.modalSub}>
              They will not be able to log in or receive new bookings.
            </Text>
            <Text style={styles.inputLabel}>Reason (required)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Confirmed harassment after review"
              placeholderTextColor="#999"
              value={disableReason}
              onChangeText={setDisableReason}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setDisableModalVisible(false);
                  setDisableReason("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                disabled={processing}
                onPress={() => void confirmDisableGuide()}
              >
                <Text style={styles.modalConfirmText}>
                  {processing ? "..." : "Disable"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EAF3FA" },
  content: { paddingHorizontal: PAGE_PADDING_HORIZONTAL, paddingTop: 12 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
  },
  errorText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#007BFF",
    borderRadius: 10,
  },
  retryBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#FFF" },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  category: {
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
    color: "#142032",
  },
  statusBadge: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    textTransform: "capitalize",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  verifiedText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#15803d",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  cardTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#5a6570",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  bodyText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  primaryText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#142032",
  },
  meta: {
    marginTop: 4,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#8899aa",
  },
  disabledTag: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  disabledTagText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#E53935",
  },
  actions: { gap: 10, marginTop: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  reviewBtn: { backgroundColor: "#007BFF" },
  reviewBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#FFF" },
  disableBtn: { backgroundColor: "#E53935" },
  disableBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#FFF" },
  secondaryRow: { flexDirection: "row", gap: 10 },
  outlineBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dde5ee",
  },
  outlineBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#5a6570" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#142032",
    marginBottom: 8,
  },
  modalSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#5a6570",
    lineHeight: 20,
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#333",
    marginBottom: 8,
  },
  modalInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#333",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCancelBtn: { backgroundColor: "#f1f5f9" },
  modalCancelText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#5a6570" },
  modalConfirmBtn: { backgroundColor: "#E53935" },
  modalConfirmText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#FFF" },
});
