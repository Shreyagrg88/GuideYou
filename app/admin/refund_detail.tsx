import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AdminPayoutDetails } from "../../api/adminBookingsPayments";
import {
  fetchAdminRefundBookingById,
  fetchAdminTouristPaymentDetails,
  markAdminRefundCompleted,
  type AdminRefundBooking,
} from "../../api/adminBookingsRefunds";
import ActivityThumbnail from "../../components/activity-thumbnail";
import { formatNprAmount } from "../../utils/bookingPrice";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonBookingDetailScreen } from "@/components/Skeleton";

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

export default function AdminRefundDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<AdminRefundBooking | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<AdminPayoutDetails | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [refundNote, setRefundNote] = useState("");
  const [marking, setMarking] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setBooking(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }
      const b = await fetchAdminRefundBookingById(bookingId);
      setBooking(b);
      if (!b) {
        Alert.alert("Not found", "This booking is not in the refunds list.");
      }
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message || "Failed to load booking.");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  const loadPaymentDetails = useCallback(async (touristId: string) => {
    try {
      setPaymentLoading(true);
      setPaymentError(null);
      const { paymentDetails: pd } = await fetchAdminTouristPaymentDetails(touristId);
      setPaymentDetails(pd);
    } catch (e: unknown) {
      setPaymentDetails(null);
      setPaymentError((e as Error).message || "Could not load tourist refund destination.");
    } finally {
      setPaymentLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    if (booking?.touristId) {
      void loadPaymentDetails(booking.touristId);
    }
  }, [booking?.touristId, loadPaymentDetails]);

  const handleMarkRefund = () => {
    if (!booking) return;

    if (!booking.canMarkRefundCompleted) {
      Alert.alert(
        "Cannot mark refund",
        booking.refundStatus === "denied"
          ? "No refund applies under the cancellation policy."
          : booking.isRefunded
            ? "This refund was already marked as sent."
            : "This booking is not eligible to mark refund sent."
      );
      return;
    }

    Alert.alert(
      "Mark refund sent?",
      `Confirm you transferred ${formatNprAmount(booking.refundAmount)} to the tourist outside the app?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, mark sent",
          onPress: async () => {
            try {
              setMarking(true);
              const { msg, booking: updated } = await markAdminRefundCompleted(
                booking.id,
                refundNote
              );
              if (updated) setBooking(updated);
              else await loadBooking();
              Alert.alert("Done", msg);
            } catch (e: unknown) {
              Alert.alert("Could not mark refund", (e as Error).message || "Try again.");
            } finally {
              setMarking(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <SkeletonBookingDetailScreen />
        <AdminNavBar />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.root}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#142032" />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.missing}>Booking not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
        <AdminNavBar />
      </View>
    );
  }

  const title = booking.isCustomTour
    ? booking.tourName || "Custom tour"
    : booking.activity?.name || "Booking";

  const canMark = Boolean(booking.canMarkRefundCompleted);
  const isRefunded = booking.isRefunded || booking.refundStatus === "completed";
  const isDenied = booking.refundStatus === "denied";

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#142032" />
        </TouchableOpacity>
        <Text style={styles.screenTitle} numberOfLines={1}>
          Refund detail
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: canMark ? 140 + insets.bottom : 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {!booking.isCustomTour && booking.activity ? (
          <ActivityThumbnail uri={booking.activity.photo} style={styles.hero} iconSize={40} />
        ) : null}

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, styles.badgeRed]}>
              <Text style={styles.badgeText}>{booking.status}</Text>
            </View>
            <View
              style={[
                styles.badge,
                isRefunded ? styles.badgeGreen : isDenied ? styles.badgeGray : styles.badgeAmber,
              ]}
            >
              <Text style={styles.badgeTextDark}>
                {isRefunded ? "Refunded" : isDenied ? "No refund" : "Refund due"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.moneyCard}>
          <Text style={styles.moneyLabel}>Refund to tourist</Text>
          <Text style={styles.moneyRefund}>{formatNprAmount(booking.refundAmount)}</Text>
          {booking.refundPercent != null ? (
            <Text style={styles.moneySub}>{booking.refundPercent}% of amount paid</Text>
          ) : null}
          <View style={styles.splitRow}>
            <View style={styles.splitBox}>
              <Text style={styles.splitLabel}>Amount paid</Text>
              <Text style={styles.splitValue}>{formatNprAmount(booking.price)}</Text>
            </View>
            <View style={styles.splitBox}>
              <Text style={styles.splitLabel}>Policy</Text>
              <Text style={styles.splitValueSmall} numberOfLines={2}>
                {booking.refundPolicyLabel || booking.refundPolicyKey || "—"}
              </Text>
            </View>
          </View>
          {isRefunded && booking.refundedAt ? (
            <Text style={styles.refundedAt}>Refunded on {formatDt(booking.refundedAt)}</Text>
          ) : null}
          {booking.refundNote ? (
            <Text style={styles.refundNoteDisplay}>Note: {booking.refundNote}</Text>
          ) : null}
        </View>

        <Section title="Booking">
          <Row label="Tourist" value={booking.tourist.fullName || booking.tourist.username || "—"} />
          <Row label="Guide" value={booking.guide.fullName || booking.guide.username || "—"} />
          <Row label="Tour dates" value={`${formatDt(booking.startDate)} – ${formatDt(booking.endDate)}`} />
          <Row label="Paid at" value={formatDt(booking.paidAt)} />
          <Row label="Cancelled at" value={formatDt(booking.cancelledAt)} />
          <Row label="Cancelled by" value={booking.cancelledBy || "—"} />
          {booking.daysUntilStartAtCancel != null ? (
            <Row
              label="Days before tour at cancel"
              value={String(booking.daysUntilStartAtCancel)}
            />
          ) : null}
          <Row label="eSewa payment ref" value={booking.paymentId || "—"} />
          <Row label="Payment status" value={booking.paymentStatus || "—"} />
        </Section>

        <Section title="Tourist refund destination">
          {paymentLoading ? (
            <ActivityIndicator color="#007BFF" style={{ marginVertical: 8 }} />
          ) : paymentError ? (
            <Text style={styles.errText}>{paymentError}</Text>
          ) : paymentDetails ? (
            paymentDetails.payoutMethod === "esewa" ? (
              <>
                <Row label="Method" value="eSewa" />
                <Row label="eSewa ID / wallet" value={paymentDetails.esewaId || "—"} />
              </>
            ) : paymentDetails.payoutMethod === "bank" ? (
              <>
                <Row label="Method" value="Bank transfer" />
                <Row label="Bank" value={paymentDetails.bankName || "—"} />
                <Row label="Account name" value={paymentDetails.accountName || "—"} />
                <Row label="Account number" value={paymentDetails.accountNumber || "—"} />
                <Row label="Branch" value={paymentDetails.bankBranch || "—"} />
              </>
            ) : (
              <Text style={styles.warnText}>
                Tourist has not saved refund details. Ask them to add eSewa or bank in Profile →
                Payment & refunds.
              </Text>
            )
          ) : (
            <Text style={styles.subtle}>—</Text>
          )}
        </Section>

        {canMark ? (
          <Section title="Transfer note (optional)">
            <Text style={styles.noteHint}>
              e.g. Sent via eSewa 9801xxxxxxx on {new Date().toLocaleDateString()}
            </Text>
            <TextInput
              style={styles.noteInput}
              value={refundNote}
              onChangeText={setRefundNote}
              placeholder="Reference for your records"
              placeholderTextColor="#aab"
              multiline
            />
          </Section>
        ) : null}

        {isDenied ? (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>
              No tourist refund is due. Do not mark refund sent on denied rows.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {canMark ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.markBtn, marking && styles.markBtnDisabled]}
            onPress={handleMarkRefund}
            disabled={marking}
            activeOpacity={0.9}
          >
            {marking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="return-down-back-outline" size={22} color="#fff" />
                <Text style={styles.markBtnText}>
                  Mark refund sent ({formatNprAmount(booking.refundAmount)})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

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
  screenTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
    color: "#142032",
  },
  scroll: {
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  missing: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    color: "#142032",
  },
  link: {
    marginTop: 12,
    fontFamily: "Nunito_700Bold",
    color: "#007BFF",
  },
  hero: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    marginBottom: 14,
  },
  titleBlock: {
    marginBottom: 14,
  },
  title: {
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
    color: "#142032",
    marginBottom: 10,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeRed: {
    backgroundColor: "#FFEBEE",
  },
  badgeGreen: {
    backgroundColor: "#E8F5E9",
  },
  badgeAmber: {
    backgroundColor: "#FFF4E5",
  },
  badgeGray: {
    backgroundColor: "#F3F4F6",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#c62828",
    textTransform: "capitalize",
  },
  badgeTextDark: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#142032",
  },
  moneyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e8eef4",
  },
  moneyLabel: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6b7c8f",
  },
  moneyRefund: {
    fontFamily: "Nunito_700Bold",
    fontSize: 28,
    color: "#c2410c",
    marginTop: 4,
  },
  moneySub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6b7c8f",
    marginTop: 2,
  },
  splitRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  splitBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
  },
  splitLabel: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#8899aa",
    marginBottom: 4,
  },
  splitValue: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#142032",
  },
  splitValueSmall: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#142032",
  },
  refundedAt: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#2e7d32",
  },
  refundNoteDisplay: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#555",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e8eef4",
  },
  sectionTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#142032",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4f8",
  },
  rowLabel: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6b7c8f",
  },
  rowValue: {
    flex: 1.2,
    textAlign: "right",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: "#142032",
  },
  errText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#c62828",
  },
  warnText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#b45309",
    lineHeight: 18,
  },
  subtle: {
    fontFamily: "Nunito_400Regular",
    color: "#8899aa",
  },
  noteHint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#8899aa",
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#dde5ee",
    borderRadius: 10,
    padding: 12,
    minHeight: 72,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#142032",
    textAlignVertical: "top",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 64,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#EAF3FA",
    borderTopWidth: 1,
    borderTopColor: "#dde5ee",
  },
  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#c2410c",
    paddingVertical: 14,
    borderRadius: 12,
  },
  markBtnDisabled: {
    opacity: 0.7,
  },
  markBtnText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
