import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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
  ReportApiError,
  submitGuideReport,
  UI_REASON_TO_API_CATEGORY,
  type ApiReportCategory,
  type ReportReasonId,
} from "../../api/reports";
import ScreenHeader from "../../components/screen-header";
import UserAvatar from "../../components/user-avatar";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";

const REPORT_REASONS = [
  {
    id: "inappropriate_behavior",
    label: "Inappropriate behavior",
    description: "Unprofessional conduct during or before a tour",
    icon: "warning-outline" as const,
  },
  {
    id: "harassment",
    label: "Harassment or abuse",
    description: "Offensive messages, threats, or discrimination",
    icon: "hand-left-outline" as const,
  },
  {
    id: "fraud",
    label: "Fraud or scam",
    description: "Misleading pricing, fake credentials, or payment issues",
    icon: "shield-outline" as const,
  },
  {
    id: "no_show",
    label: "No-show or cancellation",
    description: "Guide did not show up or cancelled without notice",
    icon: "calendar-outline" as const,
  },
  {
    id: "misleading_profile",
    label: "Misleading profile",
    description: "False experience, location, or service information",
    icon: "person-outline" as const,
  },
  {
    id: "safety",
    label: "Safety concern",
    description: "Unsafe practices or conditions during a tour",
    icon: "medkit-outline" as const,
  },
  {
    id: "other",
    label: "Other",
    description: "Something else not listed above",
    icon: "ellipsis-horizontal-circle-outline" as const,
  },
] as const;

export default function ReportGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    guideId?: string;
    guideName?: string;
    guideImage?: string;
    guideRole?: string;
    bookingId?: string;
    bookingLabel?: string;
  }>();

  const guideName = params.guideName?.trim() || "Guide";
  const guideRole = params.guideRole?.trim();
  const bookingLabel = params.bookingLabel?.trim();

  const [selectedReason, setSelectedReason] = useState<ReportReasonId | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const detailsTrimmed = details.trim();
  const canSubmit = useMemo(() => {
    if (!selectedReason || !params.guideId) return false;
    return detailsTrimmed.length >= 10;
  }, [detailsTrimmed.length, params.guideId, selectedReason]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting || !selectedReason || !params.guideId) return;

    const description = detailsTrimmed;
    const category = UI_REASON_TO_API_CATEGORY[selectedReason] as ApiReportCategory;

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Sign in required", "Please log in to submit a report.");
        return;
      }

      await submitGuideReport(token, params.guideId, {
        category,
        description,
        ...(params.bookingId ? { bookingId: String(params.bookingId) } : {}),
      });

      Alert.alert(
        "Report submitted",
        "Thank you. Our team will review your report and take appropriate action. You may not receive a direct reply.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: unknown) {
      const err = e as ReportApiError;
      if (err.status === 409) {
        Alert.alert(
          "Report already open",
          err.message ||
            "You already have an open report for this guide. We will review it shortly."
        );
        return;
      }
      if (err.status === 401) {
        Alert.alert("Sign in required", "Please log in to submit a report.");
        return;
      }
      Alert.alert(
        "Could not submit",
        err.message || "Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!params.guideId) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color="#999" />
        <Text style={styles.missingText}>Guide information is missing.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: PAGE_PADDING_HORIZONTAL,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Report guide" includeTopInset marginBottom={16} />

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color="#007BFF" />
          <Text style={styles.noticeText}>
            Reports are reviewed by our team. False reports may lead to account restrictions.
          </Text>
        </View>

        <View style={styles.guideCard}>
          <UserAvatar
            uri={params.guideImage}
            name={guideName}
            size={52}
            style={styles.guideAvatar}
          />
          <View style={styles.guideInfo}>
            <Text style={styles.guideName} numberOfLines={1}>
              {guideName}
            </Text>
            {guideRole ? (
              <Text style={styles.guideRole} numberOfLines={1}>
                {guideRole}
              </Text>
            ) : null}
          </View>
          <View style={styles.reportBadge}>
            <Ionicons name="flag" size={14} color="#E53935" />
          </View>
        </View>

        {params.bookingId ? (
          <View style={styles.contextCard}>
            <Ionicons name="receipt-outline" size={18} color="#007BFF" />
            <View style={styles.contextBody}>
              <Text style={styles.contextLabel}>Related booking</Text>
              <Text style={styles.contextValue} numberOfLines={2}>
                {bookingLabel || `Booking #${params.bookingId.slice(-6)}`}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Why are you reporting this guide?</Text>
        <Text style={styles.sectionHint}>Select the reason that best describes the issue.</Text>

        <View style={styles.reasonList}>
          {REPORT_REASONS.map((reason) => {
            const selected = selectedReason === reason.id;
            return (
              <TouchableOpacity
                key={reason.id}
                style={[styles.reasonCard, selected && styles.reasonCardSelected]}
                onPress={() => setSelectedReason(reason.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.reasonIconWrap, selected && styles.reasonIconWrapSelected]}>
                  <Ionicons
                    name={reason.icon}
                    size={20}
                    color={selected ? "#007BFF" : "#666"}
                  />
                </View>
                <View style={styles.reasonTextWrap}>
                  <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
                    {reason.label}
                  </Text>
                  <Text style={styles.reasonDescription}>{reason.description}</Text>
                </View>
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Additional details *</Text>
        <Text style={styles.sectionHint}>
          Please describe what happened (at least 10 characters).
        </Text>
        <TextInput
          style={styles.detailsInput}
          placeholder="Describe the issue..."
          placeholderTextColor="#999"
          value={details}
          onChangeText={setDetails}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.charCount}>{details.length}/1000</Text>

        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.85}
        >
          <Ionicons name="flag-outline" size={18} color="#FFF" />
          <Text style={styles.submitBtnText}>
            {submitting ? "Submitting..." : "Submit report"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F7FF",
  },
  scroll: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
  },
  missingText: {
    marginTop: 12,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  backBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#007BFF",
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#FFF",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E8F4FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: "#1a4a7a",
  },
  guideCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  guideAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E5E7EB",
  },
  guideInfo: {
    flex: 1,
    marginLeft: 12,
  },
  guideName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#1a1a1a",
  },
  guideRole: {
    marginTop: 2,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#666",
  },
  reportBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
  },
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6E8FF",
    padding: 12,
    marginBottom: 20,
  },
  contextBody: {
    flex: 1,
  },
  contextLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#007BFF",
    marginBottom: 2,
  },
  contextValue: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#333",
  },
  sectionTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#1a1a1a",
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  reasonList: {
    gap: 10,
    marginBottom: 22,
  },
  reasonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  reasonCardSelected: {
    borderColor: "#007BFF",
    backgroundColor: "#F8FBFF",
  },
  reasonIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F2F6FA",
    alignItems: "center",
    justifyContent: "center",
  },
  reasonIconWrapSelected: {
    backgroundColor: "#E8F4FF",
  },
  reasonTextWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  reasonLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  reasonLabelSelected: {
    color: "#007BFF",
  },
  reasonDescription: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#777",
    lineHeight: 17,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#007BFF",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007BFF",
  },
  detailsInput: {
    minHeight: 120,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#333",
  },
  charCount: {
    alignSelf: "flex-end",
    marginTop: 6,
    marginBottom: 20,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#999",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E53935",
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 10,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#666",
  },
});
