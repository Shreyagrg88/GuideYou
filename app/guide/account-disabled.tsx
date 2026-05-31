/**
 * Account-Disabled
 * Route: /guide/account-disabled
 *
 * Shown when admin disabled account. View reason and submit appeal.
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getGuideDisableInfo,
  submitGuideAppeal,
  type GuideAppeal,
  type GuideDisableInfo,
  GuideAccountApiError,
} from "../../api/guideAccount";
import ScreenHeader from "../../components/screen-header";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import { confirmLogout } from "../../utils/authSession";
import { clearGuideAccountDisabled } from "../../utils/guideAccountGuard";

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

function appealStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function appealStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "pending") return "#c2410c";
  if (s === "under_review") return "#b45309";
  if (s === "approved") return "#15803d";
  if (s === "rejected") return "#b91c1c";
  return "#5a6570";
}

function AppealStatusCard({ appeal }: { appeal: GuideAppeal }) {
  // --- Render ---
  return (
    <View style={styles.appealCard}>
      <View style={styles.appealHeader}>
        <Text style={styles.appealTitle}>Your appeal</Text>
        <Text style={[styles.appealStatus, { color: appealStatusColor(appeal.status) }]}>
          {appealStatusLabel(appeal.status)}
        </Text>
      </View>
      <Text style={styles.appealMessage}>{appeal.message}</Text>
      <Text style={styles.appealMeta}>Submitted {formatDate(appeal.createdAt)}</Text>
      {appeal.resolutionReason ? (
        <View style={styles.resolutionBox}>
          <Text style={styles.resolutionLabel}>Admin response</Text>
          <Text style={styles.resolutionText}>{appeal.resolutionReason}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function AccountDisabledScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- Local state ---
  const [info, setInfo] = useState<GuideDisableInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGuideDisableInfo();
      if (data.accountStatus !== "disabled") {
        await clearGuideAccountDisabled();
        router.replace("/guide/home_guide");
        return;
      }
      setInfo(data);
    } catch (e) {
      if (e instanceof GuideAccountApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to load account status");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // --- Effects (load data, listeners) ---
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // --- Handlers ---
  const handleSubmitAppeal = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      Alert.alert("Message too short", "Please explain your appeal in at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await submitGuideAppeal(trimmed);
      setMessage("");
      Alert.alert("Appeal submitted", "An admin will review your appeal.");
      await load();
    } catch (e) {
      Alert.alert(
        "Could not submit",
        e instanceof GuideAccountApiError ? e.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const latestAppeal = info?.latestAppeal ?? null;
  const openStatuses = new Set(["pending", "under_review"]);
  const hasOpenAppeal =
    latestAppeal != null && openStatuses.has(latestAppeal.status.toLowerCase());

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: 32 + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Account disabled" marginBottom={20} />

        <View style={styles.banner}>
          <Ionicons name="ban-outline" size={32} color="#b91c1c" />
          <Text style={styles.bannerTitle}>Your guide account is disabled</Text>
          <Text style={styles.bannerSub}>
            You cannot access bookings, activities, or messaging until your account is
            reactivated.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#007BFF" />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : info ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Why your account was disabled</Text>
              <Text style={styles.reasonText}>
                {info.disableReason || "No reason provided."}
              </Text>
              <Text style={styles.meta}>Disabled on {formatDate(info.disabledAt)}</Text>
            </View>

            {latestAppeal ? <AppealStatusCard appeal={latestAppeal} /> : null}

            {info.canSubmitAppeal && !hasOpenAppeal ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Submit an appeal</Text>
                <Text style={styles.hint}>
                  Explain why you believe your account should be reinstated. Admins will review
                  your message.
                </Text>
                <TextInput
                  style={styles.textarea}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  placeholder="Describe your situation (min. 10 characters)..."
                  placeholderTextColor="#999"
                  value={message}
                  onChangeText={setMessage}
                  editable={!submitting}
                />
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={() => void handleSubmitAppeal()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit appeal</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : hasOpenAppeal ? (
              <View style={styles.infoBox}>
                <Ionicons name="time-outline" size={18} color="#b45309" />
                <Text style={styles.infoText}>
                  Your appeal is being reviewed. You will be notified when there is an update.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        <TouchableOpacity style={styles.logoutBtn} onPress={() => confirmLogout(router)}>
          <Ionicons name="log-out-outline" size={18} color="#b91c1c" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: PAGE_PADDING_HORIZONTAL },
  centered: { paddingVertical: 40, alignItems: "center" },
  banner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  bannerTitle: {
    marginTop: 10,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#991b1b",
    textAlign: "center",
  },
  bannerSub: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#7f1d1d",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#334155",
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: "#1e293b",
    lineHeight: 22,
  },
  meta: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#64748b",
  },
  appealCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  appealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  appealTitle: { fontSize: 14, fontFamily: "Nunito_700Bold", color: "#92400e" },
  appealStatus: { fontSize: 12, fontFamily: "Nunito_700Bold", textTransform: "capitalize" },
  appealMessage: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#444",
    lineHeight: 20,
  },
  appealMeta: { marginTop: 8, fontSize: 12, color: "#78716c", fontFamily: "Nunito_400Regular" },
  resolutionBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
  },
  resolutionLabel: { fontSize: 12, fontFamily: "Nunito_700Bold", color: "#78350f" },
  resolutionText: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#444",
    lineHeight: 20,
  },
  hint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 18,
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: "#007BFF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 16 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#92400e",
    lineHeight: 18,
  },
  errorBox: { alignItems: "center", paddingVertical: 24 },
  errorText: {
    color: "#b91c1c",
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#007BFF",
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontFamily: "Nunito_700Bold" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
  },
  logoutText: { color: "#b91c1c", fontFamily: "Nunito_700Bold", fontSize: 15 },
});
