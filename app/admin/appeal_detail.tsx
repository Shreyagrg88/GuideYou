/**
 * Appeal Detail
 * Route: /admin/appeal_detail
 *
 * Approve or reject a guide account appeal.
 */

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
  fetchAdminAppealDetail,
  patchAdminAppeal,
  type AdminAppealDetail,
} from "../../api/adminAppeals";
import UserAvatar from "../../components/user-avatar";
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
        hour: "2-digit",
        minute: "2-digit",
      });
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "pending") return "#c2410c";
  if (s === "under_review") return "#b45309";
  if (s === "approved") return "#15803d";
  if (s === "rejected") return "#b91c1c";
  return "#5a6570";
}

export default function AdminAppealDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ appealId?: string }>();
  const appealId = params.appealId?.trim() ?? "";


  // --- Local state ---
  const [appeal, setAppeal] = useState<AdminAppealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolveAction, setResolveAction] = useState<"approved" | "rejected">("approved");
  const [resolutionReason, setResolutionReason] = useState("");

  const load = useCallback(async () => {
    if (!appealId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const detail = await fetchAdminAppealDetail(appealId);
    setAppeal(detail);
    setLoading(false);
  }, [appealId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const guideName =
    appeal?.guideName ??
    appeal?.guide?.fullName ??
    appeal?.guide?.username ??
    "Guide";

  const isOpen =
    appeal?.status.toLowerCase() === "pending" ||
    appeal?.status.toLowerCase() === "under_review";
  const isPending = appeal?.status.toLowerCase() === "pending";
  const isClosed =
    appeal?.status.toLowerCase() === "approved" ||
    appeal?.status.toLowerCase() === "rejected";

  const runPatch = async (
    body: Parameters<typeof patchAdminAppeal>[1],
    successMsg: string
  ) => {
    if (!appealId) return;
    setProcessing(true);
    const result = await patchAdminAppeal(appealId, body);
    setProcessing(false);
    if (!result.ok) {
      Alert.alert("Error", result.msg);
      return;
    }
    Alert.alert("Updated", successMsg);
    void load();
  };

  const handleUnderReview = () => {
    void runPatch({ status: "under_review" }, "Appeal marked as under review.");
  };

  const openResolveModal = (action: "approved" | "rejected") => {
    setResolveAction(action);
    setResolutionReason("");
    setResolveModalVisible(true);
  };

  const confirmResolve = async () => {
    const reason = resolutionReason.trim();
    if (reason.length < 5) {
      Alert.alert("Reason required", "Please enter a resolution reason (at least 5 characters).");
      return;
    }
    setResolveModalVisible(false);
    const msg =
      resolveAction === "approved"
        ? "Guide reactivated and appeal approved."
        : "Appeal rejected. The guide may submit a new appeal.";
    await runPatch({ status: resolveAction, resolutionReason: reason }, msg);
    setResolutionReason("");
  };

  if (!appealId) {
    return (
      <View style={styles.root}>
        <ScreenHeaderBar title="Appeal detail" backIcon="arrow-back" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Appeal ID is missing.</Text>
        </View>
        <AdminNavBar />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeaderBar title="Appeal detail" backIcon="arrow-back" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
        <AdminNavBar />
      </View>
    );
  }

  if (!appeal) {
    return (
      <View style={styles.root}>
        <ScreenHeaderBar title="Appeal detail" backIcon="arrow-back" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Appeal not found.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
        <AdminNavBar />
      </View>
    );
  }

  // --- Render ---
  return (
    <View style={styles.root}>
      <ScreenHeaderBar title="Appeal detail" backIcon="arrow-back" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusRow}>
          <Text style={styles.sectionLabel}>Guide account appeal</Text>
          <Text style={[styles.statusBadge, { color: statusColor(appeal.status) }]}>
            {appeal.status.replace(/_/g, " ")}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.guideRow}>
            <UserAvatar
              uri={appeal.guide?.avatar}
              name={guideName}
              size={48}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.primaryText}>{guideName}</Text>
              {appeal.guide?.email ? (
                <Text style={styles.meta}>{appeal.guide.email}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Disable reason</Text>
          <Text style={styles.bodyText}>{appeal.disableReason || "—"}</Text>
          {appeal.disabledAt ? (
            <Text style={styles.meta}>Disabled {formatDate(appeal.disabledAt)}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appeal message</Text>
          <Text style={styles.bodyText}>{appeal.message}</Text>
          <Text style={styles.meta}>Submitted {formatDate(appeal.createdAt)}</Text>
        </View>

        {appeal.resolutionReason ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resolution</Text>
            <Text style={styles.bodyText}>{appeal.resolutionReason}</Text>
          </View>
        ) : null}

        {isOpen ? (
          <View style={styles.actions}>
            {isPending ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.reviewBtn]}
                onPress={handleUnderReview}
                disabled={processing}
              >
                <Ionicons name="eye-outline" size={18} color="#b45309" />
                <Text style={[styles.actionBtnText, { color: "#b45309" }]}>
                  Mark under review
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => openResolveModal("approved")}
              disabled={processing}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#15803d" />
              <Text style={[styles.actionBtnText, { color: "#15803d" }]}>
                Approve & reactivate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => openResolveModal("rejected")}
              disabled={processing}
            >
              <Ionicons name="close-circle-outline" size={18} color="#b91c1c" />
              <Text style={[styles.actionBtnText, { color: "#b91c1c" }]}>Reject appeal</Text>
            </TouchableOpacity>
          </View>
        ) : isClosed ? (
          <View style={styles.closedBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#64748b" />
            <Text style={styles.closedText}>This appeal is closed.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={resolveModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {resolveAction === "approved" ? "Approve appeal" : "Reject appeal"}
            </Text>
            <Text style={styles.modalHint}>
              {resolveAction === "approved"
                ? "The guide will be reactivated and can use the app again."
                : "The guide will remain disabled but may submit a new appeal later."}
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              placeholder="Resolution reason (min. 5 characters)"
              placeholderTextColor="#999"
              value={resolutionReason}
              onChangeText={setResolutionReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setResolveModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => void confirmResolve()}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
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
  root: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: PAGE_PADDING_HORIZONTAL, paddingTop: 8 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { fontFamily: "Nunito_400Regular", color: "#64748b", fontSize: 15 },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#007BFF",
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontFamily: "Nunito_700Bold" },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionLabel: { fontFamily: "Nunito_700Bold", fontSize: 16, color: "#142032" },
  statusBadge: { fontFamily: "Nunito_700Bold", fontSize: 13, textTransform: "capitalize" },
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  guideRow: { flexDirection: "row", alignItems: "center" },
  primaryText: { fontFamily: "Nunito_700Bold", fontSize: 17, color: "#142032" },
  bodyText: { fontFamily: "Nunito_400Regular", fontSize: 15, color: "#334155", lineHeight: 22 },
  meta: {
    marginTop: 8,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#94a3b8",
  },
  actions: { gap: 10, marginTop: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  reviewBtn: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  approveBtn: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  rejectBtn: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  actionBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15 },
  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
  },
  closedText: { fontFamily: "Nunito_400Regular", color: "#64748b", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: { fontFamily: "Nunito_700Bold", fontSize: 18, color: "#142032" },
  modalHint: {
    marginTop: 8,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  modalInput: {
    marginTop: 14,
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 14 },
  modalCancelText: { fontFamily: "Nunito_700Bold", color: "#64748b" },
  modalConfirm: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalConfirmText: { fontFamily: "Nunito_700Bold", color: "#fff" },
});
