import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchGuidePayoutDetails,
  patchGuidePayoutDetails,
  type GuidePayoutDetailsDto,
  type PayoutMethod,
} from "../../api/guidePayout";

function isPayoutConfigured(d: GuidePayoutDetailsDto | null): boolean {
  return d != null && (d.payoutMethod === "esewa" || d.payoutMethod === "bank");
}

/** Show last 4 digits of account number for privacy in summary view. */
function maskAccountNumber(raw: string): string {
  const digits = raw.replace(/\s/g, "");
  if (!digits) return "—";
  if (digits.length <= 4) return digits;
  const maskLen = Math.min(6, digits.length - 4);
  return `${"•".repeat(maskLen)}${digits.slice(-4)}`;
}

export default function GuidePaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);
  const [baseline, setBaseline] = useState<GuidePayoutDetailsDto | null>(null);
  const [method, setMethod] = useState<PayoutMethod>("esewa");
  const [esewaId, setEsewaId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);

  const applyDto = useCallback((d: GuidePayoutDetailsDto) => {
    if (d.payoutMethod === "esewa" || d.payoutMethod === "bank") {
      setMethod(d.payoutMethod);
    } else {
      setMethod("esewa");
    }
    setEsewaId(d.esewaId);
    setBankName(d.bankName);
    setAccountName(d.accountName);
    setAccountNumber(d.accountNumber);
    setBankBranch(d.bankBranch);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const dto = await fetchGuidePayoutDetails();
      applyDto(dto);
      setBaseline(dto);
      setEditing(!isPayoutConfigured(dto));
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 401 || err.message === "Not logged in") {
        Alert.alert("Session expired", "Please sign in again.", [
          { text: "OK", onPress: () => router.push("/login") },
        ]);
        return;
      }
      Alert.alert("Could not load", err.message || "Failed to load payout details.");
    } finally {
      setLoading(false);
    }
  }, [applyDto, router]);

  useEffect(() => {
    load();
  }, [load]);

  const validate = (): boolean => {
    if (method === "esewa") {
      if (!esewaId.trim()) {
        Alert.alert("Missing detail", "Enter your eSewa ID or wallet number.");
        return false;
      }
      return true;
    }
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      Alert.alert("Missing detail", "Fill in bank name, account holder name, and account number.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const dto =
        method === "esewa"
          ? await patchGuidePayoutDetails({
              payoutMethod: "esewa",
              esewaId: esewaId.trim(),
            })
          : await patchGuidePayoutDetails({
              payoutMethod: "bank",
              bankName: bankName.trim(),
              accountName: accountName.trim(),
              accountNumber: accountNumber.trim(),
              bankBranch: bankBranch.trim(),
            });
      applyDto(dto);
      setBaseline(dto);
      setEditing(false);
      setLastSavedLabel(
        new Date().toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 401 || err.message === "Not logged in") {
        Alert.alert("Session expired", "Please sign in again.", [
          { text: "OK", onPress: () => router.push("/login") },
        ]);
        return;
      }
      Alert.alert("Could not save", err.message || "Failed to save payout details.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (baseline) {
      applyDto(baseline);
    }
    setEditing(false);
  };

  const showSummary = isPayoutConfigured(baseline) && !editing;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingWrap]}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading payout details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: 32 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={s(26)} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: s(20) }]}>Payout details</Text>
          <View style={{ width: s(26) }} />
        </View>

        {showSummary && baseline ? (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <Text style={styles.summaryTitle}>Your payout details</Text>
                <View
                  style={[
                    styles.methodPill,
                    baseline.payoutMethod === "esewa" ? styles.methodPillEsewa : styles.methodPillBank,
                  ]}
                >
                  <Ionicons
                    name={baseline.payoutMethod === "esewa" ? "phone-portrait" : "business"}
                    size={14}
                    color={baseline.payoutMethod === "esewa" ? "#0d6efd" : "#5c4a00"}
                  />
                  <Text
                    style={[
                      styles.methodPillText,
                      baseline.payoutMethod === "esewa" ? styles.methodPillTextEsewa : styles.methodPillTextBank,
                    ]}
                  >
                    {baseline.payoutMethod === "esewa" ? "eSewa" : "Bank transfer"}
                  </Text>
                </View>
              </View>

              {baseline.payoutMethod === "esewa" ? (
                <View style={styles.summaryBlock}>
                  <View style={styles.summaryFieldWrap}>
                    <Text style={styles.summaryFieldLabel}>eSewa ID / wallet</Text>
                    <Text style={styles.summaryFieldValue} selectable>
                      {baseline.esewaId || "—"}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.summaryBlock}>
                  <View style={styles.summaryFieldWrap}>
                    <Text style={styles.summaryFieldLabel}>Bank</Text>
                    <Text style={styles.summaryFieldValue}>{baseline.bankName || "—"}</Text>
                  </View>
                  <View style={styles.summaryFieldWrap}>
                    <Text style={styles.summaryFieldLabel}>Account name</Text>
                    <Text style={styles.summaryFieldValue}>{baseline.accountName || "—"}</Text>
                  </View>
                  <View style={styles.summaryFieldWrap}>
                    <Text style={styles.summaryFieldLabel}>Account no.</Text>
                    <Text style={styles.summaryFieldValue}>{maskAccountNumber(baseline.accountNumber)}</Text>
                  </View>
                  {baseline.bankBranch ? (
                    <View style={styles.summaryFieldWrap}>
                      <Text style={styles.summaryFieldLabel}>Branch</Text>
                      <Text style={styles.summaryFieldValue}>{baseline.bankBranch}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {lastSavedLabel ? (
                <View style={styles.summaryMeta}>
                  <Ionicons name="time-outline" size={16} color="#6b7c8f" />
                  <Text style={styles.summaryMetaText}>Updated {lastSavedLabel}</Text>
                </View>
              ) : (
                <Text style={styles.summaryOnFile}>On file for platform payouts — not shown on your public profile.</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil" size={18} color="#007BFF" />
              <Text style={styles.editButtonText}>Edit details</Text>
            </TouchableOpacity>

            <View style={styles.summaryFootnote}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#8899aa" />
              <Text style={styles.summaryFootnoteText}>
                GuideYou uses this only to send your earnings after tours.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="wallet-outline" size={28} color="#007BFF" />
              </View>
              <Text style={styles.heroTitle}>How you get paid</Text>
              <Text style={styles.heroBody}>
                Tourist payments go to the platform first. We use these details only to send your earnings
                after tours — they are not shown on your public profile.
              </Text>
            </View>

            <View style={styles.notice}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#5a6b7d" />
              <Text style={styles.noticeText}>
                Used only by GuideYou for settlements. Not visible to tourists on your guide profile.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Preferred method</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodCard, method === "esewa" && styles.methodCardActive]}
                onPress={() => setMethod("esewa")}
                activeOpacity={0.85}
              >
                <View style={[styles.methodIconCircle, method === "esewa" && styles.methodIconCircleActive]}>
                  <Ionicons name="phone-portrait" size={22} color={method === "esewa" ? "#007BFF" : "#6b7c8f"} />
                </View>
                <Text style={[styles.methodTitle, method === "esewa" && styles.methodTitleActive]}>eSewa</Text>
                <Text style={styles.methodSub}>Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodCard, method === "bank" && styles.methodCardActive]}
                onPress={() => setMethod("bank")}
                activeOpacity={0.85}
              >
                <View style={[styles.methodIconCircle, method === "bank" && styles.methodIconCircleActive]}>
                  <Ionicons name="business" size={22} color={method === "bank" ? "#007BFF" : "#6b7c8f"} />
                </View>
                <Text style={[styles.methodTitle, method === "bank" && styles.methodTitleActive]}>Bank</Text>
                <Text style={styles.methodSub}>Transfer</Text>
              </TouchableOpacity>
            </View>

            {method === "esewa" ? (
              <View style={styles.form}>
                <Text style={styles.label}>eSewa ID / wallet *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9800000000001"
                  placeholderTextColor="#999"
                  value={esewaId}
                  onChangeText={setEsewaId}
                  keyboardType="default"
                  autoCapitalize="none"
                  maxLength={32}
                />
                <Text style={styles.hint}>
                  Use the ID or mobile number linked to the eSewa wallet where you receive money.
                </Text>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.label}>Bank name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Nabil Bank"
                  placeholderTextColor="#999"
                  value={bankName}
                  onChangeText={setBankName}
                  maxLength={120}
                />
                <Text style={styles.label}>Account holder name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full name on the account"
                  placeholderTextColor="#999"
                  value={accountName}
                  onChangeText={setAccountName}
                  maxLength={120}
                />
                <Text style={styles.label}>Account number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Account number"
                  placeholderTextColor="#999"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numbers-and-punctuation"
                  maxLength={34}
                />
                <Text style={styles.label}>Branch (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Thamel, Kathmandu"
                  placeholderTextColor="#999"
                  value={bankBranch}
                  onChangeText={setBankBranch}
                  maxLength={120}
                />
                <Text style={styles.hint}>
                  Double-check the account number — wrong digits delay payouts.
                </Text>
              </View>
            )}

            {isPayoutConfigured(baseline) && editing ? (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}

            {lastSavedLabel && editing && isPayoutConfigured(baseline) ? (
              <View style={styles.savedRow}>
                <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                <Text style={styles.savedText}>Last saved: {lastSavedLabel}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.saveText}>Save details</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#F3F7FF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F7FF",
    paddingHorizontal: 20,
  },
  loadingWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: "Nunito_700Bold",
    color: "#000",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e3ecf8",
    shadowColor: "#1a3a5c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E7F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
    color: "#142032",
    marginBottom: 6,
  },
  heroBody: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#4a5a6e",
    lineHeight: 21,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#eef4fc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#dce6f5",
  },
  noticeText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#5a6b7d",
    lineHeight: 19,
  },
  sectionLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#142032",
    marginBottom: 10,
  },
  methodRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },
  methodCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e8eef6",
  },
  methodCardActive: {
    borderColor: "#007BFF",
    backgroundColor: "#f0f7ff",
  },
  methodIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f4fa",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  methodIconCircleActive: {
    backgroundColor: "#d6e8ff",
  },
  methodTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#5a6570",
  },
  methodTitleActive: {
    color: "#007BFF",
  },
  methodSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#8899aa",
    marginTop: 2,
  },
  form: {
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    marginTop: 10,
    color: "#142032",
  },
  input: {
    backgroundColor: "#E7F0FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#000",
    marginTop: 4,
  },
  hint: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#6b7c8f",
    marginTop: 8,
    lineHeight: 17,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  savedText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#2e7d32",
  },
  saveButton: {
    marginTop: 22,
    backgroundColor: "#007BFF",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e3ecf8",
    shadowColor: "#1a3a5c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  summaryTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#142032",
    flex: 1,
    minWidth: 160,
  },
  methodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  methodPillEsewa: {
    backgroundColor: "#e7f1ff",
  },
  methodPillBank: {
    backgroundColor: "#fff8e6",
  },
  methodPillText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
  methodPillTextEsewa: {
    color: "#0d4ea6",
  },
  methodPillTextBank: {
    color: "#7a5f00",
  },
  summaryBlock: {
    gap: 14,
  },
  summaryFieldWrap: {
    gap: 4,
  },
  summaryFieldLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#8899aa",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryFieldValue: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#142032",
    lineHeight: 22,
  },
  summaryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#eef2f8",
  },
  summaryMetaText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6b7c8f",
  },
  summaryOnFile: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6b7c8f",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#eef2f8",
    lineHeight: 19,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 16,
  },
  editButtonText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#007BFF",
  },
  summaryFootnote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  summaryFootnoteText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#8899aa",
    lineHeight: 17,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#666",
  },
});
