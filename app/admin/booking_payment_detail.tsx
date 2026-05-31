/**
 * Booking Payment Detail
 * Route: /admin/booking_payment_detail
 *
 * Release milestone payout to guide. PATCH /api/admin/bookings/:id/release-payout
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchAdminGuidePayoutDetails,
  fetchAdminPaymentBookingById,
  releaseAdminBookingPayout,
  type AdminPaymentBooking,
  type AdminPayoutDetails,
} from "../../api/adminBookingsPayments";
import { API_URL } from "../../constants/api";
import { formatNprAmount, formatUsdAmount } from "../../utils/bookingPrice";
import {
  payoutTierLabel,
  releaseAmountForBooking,
  releaseAmountLabel,
} from "../../utils/bookingMilestoneDisplay";
import ActivityThumbnail from "../../components/activity-thumbnail";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonBlock, SkeletonBookingDetailScreen } from "@/components/Skeleton";

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
  // --- Render ---
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

export default function AdminBookingPaymentDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId = Array.isArray(params.bookingId)
    ? params.bookingId[0]
    : params.bookingId;


  // --- Local state ---
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<AdminPaymentBooking | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutDetails, setPayoutDetails] = useState<AdminPayoutDetails | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

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
      const b = await fetchAdminPaymentBookingById(bookingId);
      setBooking(b);
      if (!b) {
        Alert.alert("Not found", "This booking is not in the payment list.");
      }
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      Alert.alert("Error", err.message || "Failed to load booking.");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  const loadPayoutDetails = useCallback(async (guideId: string) => {
    try {
      setPayoutLoading(true);
      setPayoutError(null);
      const { payoutDetails: pd } = await fetchAdminGuidePayoutDetails(guideId);
      setPayoutDetails(pd);
    } catch (e: unknown) {
      setPayoutDetails(null);
      setPayoutError((e as Error).message || "Could not load payout destination.");
    } finally {
      setPayoutLoading(false);
    }
  }, []);

  // --- Effects (load data, listeners) ---
  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    if (booking?.guide?.id) {
      loadPayoutDetails(booking.guide.id);
    } else {
      setPayoutDetails(null);
    }
  }, [booking?.guide?.id, loadPayoutDetails]);

  const handleRelease = () => {
    if (!booking) return;
    const releaseAmount = releaseAmountForBooking(booking);
    const npr = formatNprAmount(releaseAmount);
    const label = releaseAmountLabel(booking.guidePayoutStatus);
    Alert.alert(
      "Release payout",
      `Confirm you have sent ${npr} (${label}) to the guide outside the app? This marks the payout as released so their earnings update.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, mark released",
          onPress: async () => {
            try {
              setReleasing(true);
              const { msg, booking: updated } = await releaseAdminBookingPayout(booking.id);
              if (updated) {
                setBooking(updated);
              } else {
                setBooking((prev) =>
                  prev
                    ? {
                        ...prev,
                        guidePayoutStatus: "paid",
                        payoutDate: new Date().toISOString(),
                      }
                    : prev
                );
              }
              Alert.alert("Done", msg);
            } catch (e: unknown) {
              Alert.alert("Could not release", (e as Error).message || "Try again.");
            } finally {
              setReleasing(false);
            }
          },
        },
      ]
    );
  };

  if (!bookingId) {
    return (
      <View style={styles.root}>
        <Text style={styles.missing}>Missing booking.</Text>
        <AdminNavBar />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={{ flex: 1 }}>
          <SkeletonBookingDetailScreen />
        </View>
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
  const canRelease = Boolean(booking.canReleaseFinalPayout);
  const startReleased = Boolean(booking.guideStartPayoutReleasedAt);
  const tierLabel = payoutTierLabel(booking.guidePayoutTier);
  const payoutStatusLabel =
    booking.guidePayoutStatus === "paid"
      ? "Fully released"
      : booking.guidePayoutStatus === "partial"
        ? "Start released — final pending"
        : "Pending";

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#142032" />
        </TouchableOpacity>
        <Text style={styles.screenTitle} numberOfLines={1}>
          Payout detail
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {!booking.isCustomTour && booking.activity && (
          <ActivityThumbnail uri={booking.activity.photo} style={styles.hero} iconSize={40} />
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, styles.badgeBlue]}>
              <Text style={styles.badgeText}>{booking.status}</Text>
            </View>
            <View
              style={[
                styles.badge,
                booking.guidePayoutStatus === "paid"
                  ? styles.badgeGreen
                  : booking.guidePayoutStatus === "partial"
                    ? styles.badgeBlue
                    : styles.badgeAmber,
              ]}
            >
              <Text style={styles.badgeTextDark}>{payoutStatusLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.moneyCard}>
          <Text style={styles.moneyLabel}>Tourist paid (gross)</Text>
          <Text style={styles.moneyGross}>{formatNprAmount(booking.price)}</Text>
          {booking.priceUsd != null && Number.isFinite(booking.priceUsd) ? (
            <Text style={styles.moneyUsd}>
              {formatUsdAmount(Number(booking.priceUsd), { approx: true, decimals: 2 })} ref.
            </Text>
          ) : null}
          <View style={styles.splitRow}>
            <View style={styles.splitBox}>
              <Text style={styles.splitLabel}>Platform 15%</Text>
              <Text style={styles.splitValue}>{formatNprAmount(booking.platformCommission)}</Text>
            </View>
            <View style={styles.splitBoxHighlight}>
              <Text style={styles.splitLabelLight}>Guide 85%</Text>
              <Text style={styles.splitValueLight}>{formatNprAmount(booking.guideEarning)}</Text>
            </View>
          </View>
          <Text style={styles.tierNote}>Payout tier: {tierLabel}</Text>
          {typeof booking.guidePayoutReleasedAmount === "number" ? (
            <Text style={styles.releasedNote}>
              Released so far: {formatNprAmount(booking.guidePayoutReleasedAmount)}
            </Text>
          ) : null}
          <View style={styles.milestoneRow}>
            <View style={styles.milestoneBox}>
              <Text style={styles.milestoneLabel}>Start tranche</Text>
              <Text style={styles.milestoneValue}>
                {formatNprAmount(booking.guideStartPayoutAmount ?? 0)}
              </Text>
              <Text style={styles.milestoneMeta}>
                {startReleased
                  ? `Released ${formatDt(booking.guideStartPayoutReleasedAt)}`
                  : "Released when both confirm tour start"}
              </Text>
            </View>
            <View style={styles.milestoneBox}>
              <Text style={styles.milestoneLabel}>Final tranche</Text>
              <Text style={styles.milestoneValue}>
                {formatNprAmount(booking.guideFinalPayoutAmount ?? 0)}
              </Text>
              <Text style={styles.milestoneMeta}>
                {booking.guidePayoutStatus === "paid"
                  ? `Released ${formatDt(booking.payoutDate)}`
                  : booking.status === "completed"
                    ? "Ready for admin release"
                    : "After tourist marks completed"}
              </Text>
            </View>
          </View>
        </View>

        <Section title="Tour start confirmations">
          <Row label="Tourist confirmed" value={formatDt(booking.touristTourStartedConfirmedAt)} />
          <Row label="Guide confirmed" value={formatDt(booking.guideTourStartedConfirmedAt)} />
          <Row label="Tour started at" value={formatDt(booking.tourStartedAt)} />
        </Section>

        <Section title="Payment">
          <Row label="Payment ID (eSewa ref)" value={booking.paymentId || "—"} />
          <Row label="Payment status" value={booking.paymentStatus || "—"} />
          <Row label="Paid at" value={formatDt(booking.paidAt)} />
          <Row label="Completed at" value={formatDt(booking.completedAt)} />
          <Row label="Payout released at" value={formatDt(booking.payoutDate)} />
        </Section>

        <Section title="Schedule">
          <Row label="Start" value={formatDt(booking.startDate)} />
          <Row label="End" value={formatDt(booking.endDate)} />
          <Row label="Participants" value={String(booking.participantCount)} />
        </Section>

        <Section title="Tourist">
          <Row label="Name" value={booking.tourist.fullName || booking.tourist.username || "—"} />
          <Row label="Email" value={booking.tourist.email || "—"} />
          <Row label="Username" value={booking.tourist.username || "—"} />
        </Section>

        <Section title="Guide">
          <Row label="Name" value={booking.guide.fullName || booking.guide.username || "—"} />
          <Row label="Email" value={booking.guide.email || "—"} />
          <Row label="Username" value={booking.guide.username || "—"} />
        </Section>

        {booking.isCustomTour ? (
          <Section title="Custom tour">
            <Row label="Tour name" value={booking.tourName || "—"} />
            <Row label="Location" value={booking.customLocation || "—"} />
          </Section>
        ) : (
          <Section title="Activity">
            <Row label="Name" value={booking.activity?.name || "—"} />
            <Row label="Location" value={booking.activity?.location || "—"} />
            <Row label="Category" value={booking.activity?.category || "—"} />
            <Row label="Duration (days)" value={booking.activity?.duration != null ? String(booking.activity.duration) : "—"} />
          </Section>
        )}

        {booking.notes ? (
          <Section title="Notes">
            <Text style={styles.notes}>{booking.notes}</Text>
          </Section>
        ) : null}

        <Section title="Pay guide (destination)">
          {payoutLoading ? (
            <View style={{ marginVertical: 12 }}>
              <SkeletonBlock width="100%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
              <SkeletonBlock width="85%" height={16} borderRadius={4} />
            </View>
          ) : payoutError ? (
            <Text style={styles.errText}>{payoutError}</Text>
          ) : payoutDetails ? (
            payoutDetails.payoutMethod === "esewa" ? (
              <>
                <Row label="Method" value="eSewa" />
                <Row label="eSewa ID / wallet" value={payoutDetails.esewaId || "—"} />
              </>
            ) : payoutDetails.payoutMethod === "bank" ? (
              <>
                <Row label="Method" value="Bank transfer" />
                <Row label="Bank" value={payoutDetails.bankName || "—"} />
                <Row label="Account name" value={payoutDetails.accountName || "—"} />
                <Row label="Account number" value={payoutDetails.accountNumber || "—"} />
                <Row label="Branch" value={payoutDetails.bankBranch || "—"} />
              </>
            ) : (
              <Text style={styles.warnText}>
                Guide has not saved payout details yet. Ask them to add eSewa or bank in the app.
              </Text>
            )
          ) : (
            <Text style={styles.subtle}>—</Text>
          )}
        </Section>
      </ScrollView>

      {canRelease && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.releaseBtn, releasing && styles.releaseBtnDisabled]}
            onPress={handleRelease}
            disabled={releasing}
            activeOpacity={0.9}
          >
            {releasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cash-outline" size={22} color="#fff" />
                <Text style={styles.releaseBtnText}>
                  Mark final payout released ({formatNprAmount(releaseAmountForBooking(booking))})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    fontFamily: "Nunito_400Regular",
    color: "#666",
  },
  link: {
    marginTop: 12,
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
  },
  hero: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: "#dde5ee",
  },
  titleBlock: {
    marginBottom: 14,
  },
  title: {
    fontFamily: "Nunito_700Bold",
    fontSize: 22,
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
  badgeBlue: {
    backgroundColor: "#E3F2FD",
  },
  badgeGreen: {
    backgroundColor: "#E8F5E9",
  },
  badgeAmber: {
    backgroundColor: "#FFF8E1",
  },
  badgeText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#1565C0",
    textTransform: "capitalize",
  },
  badgeTextDark: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#33691E",
  },
  moneyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e3ecf8",
  },
  moneyLabel: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#5a6570",
  },
  moneyGross: {
    fontFamily: "Nunito_700Bold",
    fontSize: 24,
    color: "#142032",
    marginTop: 4,
  },
  moneyUsd: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#8899aa",
    marginTop: 4,
  },
  splitRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  splitBox: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    padding: 12,
  },
  splitBoxHighlight: {
    flex: 1,
    backgroundColor: "#15803d",
    borderRadius: 12,
    padding: 12,
  },
  splitLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    color: "#6b7c8f",
    marginBottom: 4,
  },
  splitValue: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#142032",
  },
  splitLabelLight: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  splitValueLight: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  tierNote: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#5a6570",
    marginTop: 12,
  },
  releasedNote: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: "#15803d",
    marginTop: 6,
  },
  milestoneRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  milestoneBox: {
    flex: 1,
    backgroundColor: "#f5f8fc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e3ecf8",
  },
  milestoneLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    color: "#6b7c8f",
    marginBottom: 4,
  },
  milestoneValue: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#142032",
  },
  milestoneMeta: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: "#8899aa",
    marginTop: 6,
    lineHeight: 15,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eef2f6",
  },
  sectionTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#142032",
    marginBottom: 12,
  },
  row: {
    marginBottom: 12,
  },
  rowLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    color: "#8899aa",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  rowValue: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#142032",
    lineHeight: 21,
  },
  notes: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#333",
    lineHeight: 21,
  },
  errText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#c62828",
  },
  warnText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },
  subtle: {
    color: "#999",
    fontFamily: "Nunito_400Regular",
  },
  footer: {
    position: "absolute",
    bottom: 78,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#EAF3FA",
    borderTopWidth: 1,
    borderTopColor: "#dde5ee",
  },
  releaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#15803d",
    paddingVertical: 16,
    borderRadius: 14,
  },
  releaseBtnDisabled: {
    opacity: 0.65,
  },
  releaseBtnText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#fff",
    flexShrink: 1,
  },
});
