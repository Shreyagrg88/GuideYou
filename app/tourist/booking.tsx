/**
 * Booking
 * Route: /tourist/booking
 *
 * Create standard booking for an activity. POST /api/tourist/booking (auto-accepted, 2h pay window).
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getGuideReviews } from "../../api/guideReviews";
import { API_URL } from "../../constants/api";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import ScreenHeader from "../../components/screen-header";
import UserAvatar from "../../components/user-avatar";
import { SkeletonBookingDetailScreen } from "@/components/Skeleton";
import {
  estimateNprFromUsd,
  formatBookingEstimateBreakdown,
  formatDailyRateOnCard,
  formatNprAmount,
  parseUsdFromGuideChargeString,
} from "../../utils/bookingPrice";
import { formatGuideRatingDisplay } from "../../utils/guideRating";
import { getRefundPolicyCached, type RefundPolicy } from "../../api/refundPolicy";
import { daysUntilStartFromNepal } from "../../utils/refundPolicy";

type DateStatus = "available" | "unavailable" | "booked" | "reserved";

// Helper functions
const formatDateKey = (year: number, month: number, day: number): string => 
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** Local calendar YYYY-MM-DD — do not use toISOString() (UTC shifts the day in Nepal). */
const formatDateForAPI = (date: Date): string =>
  formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
const getConsecutiveDates = (startDate: Date, days: number): Date[] => 
  Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

const getTomorrowStart = (): Date => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(0, 0, 0, 0);
  return t;
};

export default function BookingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    guideId: string; guideName: string; guideRole: string; guideLocation: string;
    guideRating: string; guideImage: string; guideCharge: string; activityId?: string; duration?: string;
  }>();

  const activityDuration = params.duration ? parseInt(params.duration, 10) : 1;
  const today = new Date();

  // --- Local state ---
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<Date[]>([]);
  const [dateStatuses, setDateStatuses] = useState<Map<string, DateStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<
    Array<{ title: string; subtitle: string; price: number; unit: string }>
  >([]);
  const [usdToNprRate, setUsdToNprRate] = useState(135);
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(1);
  /** Matches guide profile: reviews `averageRating`, then param fallback. */
  const [profileAlignedRating, setProfileAlignedRating] = useState<string | null>(null);
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicy | null>(null);
  const [refundPolicyExpanded, setRefundPolicyExpanded] = useState(false);

  const areDatesAvailable = (dates: Date[]): { available: boolean; unavailableDates: string[] } => {
    const unavailableDates: string[] = [];
    const tomorrowStart = getTomorrowStart();

    for (const date of dates) {
      const dateKey = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
      const status = dateStatuses.get(dateKey);
      if (date < tomorrowStart || status === "booked" || status === "reserved" || status === "unavailable") {
        unavailableDates.push(dateKey);
      }
    }
    return { available: unavailableDates.length === 0, unavailableDates };
  };

  const fetchAvailability = async (guideId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/tourist/guides/${guideId}/availability`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Error", data.msg || "Failed to load availability");
        setDateStatuses(new Map());
        return;
      }

      const newStatuses = new Map<string, DateStatus>();
      // Set statuses in priority order: booked > reserved > unavailable > available
      const statusMaps = [
        { key: "availableDates", status: "available" as DateStatus },
        { key: "unavailableDates", status: "unavailable" as DateStatus },
        { key: "bookedDates", status: "booked" as DateStatus },
        { key: "reservedDates", status: "reserved" as DateStatus },
      ];

      statusMaps.forEach(({ key, status }) => {
        if (data[key]?.forEach) {
          data[key].forEach((dateStr: string) => {
            // Booked takes priority, then reserved, then others
            if (status === "booked" || (status === "reserved" && newStatuses.get(dateStr) !== "booked") || 
                (!newStatuses.has(dateStr) || newStatuses.get(dateStr) !== "booked")) {
              newStatuses.set(dateStr, status);
            }
          });
        }
      });

      setDateStatuses(newStatuses);
      if (data.pricing?.length > 0) setPricing(data.pricing);
      if (typeof data.usdToNprRate === "number" && data.usdToNprRate > 0) {
        setUsdToNprRate(data.usdToNprRate);
      }
    } catch (error: any) {
      console.error("Fetch availability error:", error);
      Alert.alert("Error", "Failed to load availability. Please try again.");
      setDateStatuses(new Map());
    } finally {
      setLoading(false);
    }
  };

  // --- Effects (load data, listeners) ---
  useEffect(() => {
    if (params.guideId) fetchAvailability(params.guideId);
    else setLoading(false);
  }, [params.guideId]);

  useEffect(() => {
    getRefundPolicyCached().then(setRefundPolicy);
  }, []);

  useEffect(() => {
    const gid = params.guideId?.trim();
    if (!gid) {
      setProfileAlignedRating(null);
      return;
    }
    let cancelled = false;
    setProfileAlignedRating(null);
    (async () => {
      try {
        const data = await getGuideReviews(gid);
        if (cancelled) return;
        setProfileAlignedRating(
          formatGuideRatingDisplay(data.averageRating ?? params.guideRating)
        );
      } catch {
        if (!cancelled) setProfileAlignedRating(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.guideId, params.guideRating]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const changeMonth = (dir: "prev" | "next") => {
    if (dir === "prev") {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
      else setCurrentMonth(currentMonth - 1);
    } else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
      else setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
    setSelectedDateRange([]);
  };

  const handleDateSelect = (day: number) => {
    const selectedDateObj = new Date(currentYear, currentMonth, day);
    const tomorrowStart = getTomorrowStart();

    if (activityDuration === 1) {
      const dateKey = formatDateKey(currentYear, currentMonth, day);
      const status = dateStatuses.get(dateKey);

      if (status === "booked" || status === "reserved") {
        Alert.alert("Date Unavailable", "This date is already booked or reserved.");
        return;
      }
      if (status === "unavailable" || selectedDateObj < tomorrowStart) {
        Alert.alert("Date Unavailable", status === "unavailable" ? "This date is not available." : "Bookings must start from tomorrow. Same-day booking is not allowed.");
        return;
      }

      setSelectedDate(selectedDateObj);
      setSelectedDateRange([selectedDateObj]);
      return;
    }
    
    const dateRange = getConsecutiveDates(selectedDateObj, activityDuration);
    const validation = areDatesAvailable(dateRange);
    
    if (!validation.available) {
      Alert.alert("Dates Unavailable", `${validation.unavailableDates.length} of ${activityDuration} required days are not available. Please select a different start date.`);
      return;
    }
    
    setSelectedDate(selectedDateObj);
    setSelectedDateRange(dateRange);
  };

  const getDateStatus = (day: number): DateStatus | null => {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    return dateStatuses.get(dateKey) || null;
  };

  const isDateInPast = (day: number): boolean => {
    const dateObj = new Date(currentYear, currentMonth, day);
    const tomorrowStart = getTomorrowStart();
    return dateObj < tomorrowStart;
  };

  const isDateSelected = (day: number): boolean => {
    if (selectedDateRange.length === 0) return false;
    const checkDate = new Date(currentYear, currentMonth, day);
    return selectedDateRange.some(date => 
      date.getDate() === checkDate.getDate() && date.getMonth() === checkDate.getMonth() && date.getFullYear() === checkDate.getFullYear()
    );
  };

  const isStartDate = (day: number): boolean => 
    selectedDateRange.length > 0 && selectedDateRange[0].getDate() === day && selectedDateRange[0].getMonth() === currentMonth && selectedDateRange[0].getFullYear() === currentYear;

  const isEndDate = (day: number): boolean => 
    selectedDateRange.length > 0 && selectedDateRange[selectedDateRange.length - 1].getDate() === day && selectedDateRange[selectedDateRange.length - 1].getMonth() === currentMonth && selectedDateRange[selectedDateRange.length - 1].getFullYear() === currentYear;

  const isDatesHeldForPayment = (msg?: string) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return (
      lower.includes("held while another") ||
      lower.includes("held while") ||
      lower.includes("completes payment") ||
      lower.includes("temporarily held")
    );
  };

  // --- Handlers ---
  const handleBookRequest = async () => {
    if (selectedDateRange.length === 0) {
      Alert.alert("Select Date", activityDuration === 1 ? "Please select a date for your booking." : `Please select a start date for your ${activityDuration}-day booking.`);
      return;
    }

    if (!params.guideId) {
      Alert.alert("Error", "Guide information is missing.");
      return;
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("Authentication Required", "Please login to book.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/login") },
      ]);
      return;
    }

    try {
      setSubmitting(true);
      const dateStr = formatDateForAPI(selectedDateRange[0]);

      const response = await fetch(`${API_URL}/api/tourist/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          guideId: params.guideId,
          date: dateStr,
          participantCount: count,
          activityId: params.activityId || undefined,
          notes: "",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert("Session Expired", "Please login again.", [{ text: "OK", onPress: () => router.push("/login") }]);
        } else if (isDatesHeldForPayment(data.msg)) {
          Alert.alert(
            "Dates not available",
            "These dates are temporarily held. Try another day or check back in a few hours."
          );
        } else {
          Alert.alert("Booking Failed", data.msg || "Failed to reserve these dates.");
        }
        return;
      }

      const booking = data.booking;
      const bookingId = booking?.id ?? booking?._id;
      const successMsg =
        data.msg ||
        "Dates reserved. Complete payment within 2 hours to confirm your booking.";

      const goToPayment = () => {
        if (bookingId) {
          // Replace booking form so Back on detail does not return to a stale calendar
          router.replace({
            pathname: "/tourist/booking_detail",
            params: { bookingId: String(bookingId) },
          });
        } else {
          router.replace("/tourist/bookings_tourist?tab=accepted");
        }
      };

      if (booking?.status === "accepted" && booking?.paymentExpiresAt) {
        Alert.alert("Dates reserved", successMsg, [
          { text: "Pay now", onPress: goToPayment },
        ]);
      } else {
        Alert.alert("Booking created", successMsg, [{ text: "OK", onPress: goToPayment }]);
      }
    } catch (error: any) {
      console.error("Booking request error:", error);
      Alert.alert("Error", "Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getUsdPerPersonPerDay = (): number => {
    if (pricing.length > 0 && pricing[0].price != null) {
      return Number(pricing[0].price) || 0;
    }
    if (params.guideCharge) {
      return parseUsdFromGuideChargeString(params.guideCharge);
    }
    return 0;
  };

  const usdRatePerPersonDay = getUsdPerPersonPerDay();
  const usdTotalEstimate = usdRatePerPersonDay * count * activityDuration;
  const nprTotalEstimate = estimateNprFromUsd(usdTotalEstimate, usdToNprRate);
  const selectedStartKey =
    selectedDateRange.length > 0 ? formatDateForAPI(selectedDateRange[0]) : null;
  const daysUntilTourStart = selectedStartKey
    ? daysUntilStartFromNepal(selectedStartKey)
    : null;
  const showRefundWarning =
    daysUntilTourStart !== null && daysUntilTourStart <= 2 && daysUntilTourStart >= 0;

  const refundBullets =
    refundPolicy?.tiers?.length
      ? [...refundPolicy.tiers]
          .sort((a, b) => b.minDaysUntilStart - a.minDaysUntilStart)
          .map((tier) => {
            if (tier.minDaysUntilStart >= 7) return `7+ days before tour → full refund`;
            if (tier.minDaysUntilStart >= 3) return `3–6 days → 50% refund`;
            if (tier.minDaysUntilStart >= 1) return `1–2 days → no refund`;
            return `Tour day or after start → no refund`;
          })
      : [
          "7+ days before tour → full refund",
          "3–6 days → 50% refund",
          "1–2 days → no refund",
          "Tour day or after start → no refund",
        ];

  if (loading) {
    return <SkeletonBookingDetailScreen />;
  }

  const scrollBottomPadding = 200 + insets.bottom;

  // --- Render ---
  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
      >
        <ScreenHeader title="Book activity" includeTopInset marginBottom={16} />

        <View style={styles.profileCard}>
          <UserAvatar
            uri={params.guideImage}
            name={params.guideName}
            size={56}
            style={styles.profileImg}
          />
          <View style={styles.profileTextCol}>
            <Text style={styles.guideName} numberOfLines={1}>
              {params.guideName || "Guide Name"}
            </Text>
            <Text style={styles.guideInfo} numberOfLines={2}>
              {params.guideRole || "Guide"} • {params.guideLocation || "Location"}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#f4b400" />
              <Text style={styles.ratingText}>
                {profileAlignedRating ?? formatGuideRatingDisplay(params.guideRating)}
              </Text>
            </View>
            {usdRatePerPersonDay > 0 ? (
              <Text style={styles.rateHint} numberOfLines={2}>
                {formatDailyRateOnCard(usdRatePerPersonDay, usdToNprRate)}
              </Text>
            ) : (
              <Text style={styles.rateHintMuted}>Daily rate will be confirmed by the guide</Text>
            )}
          </View>
          <Ionicons name="checkmark-circle" size={24} color="#2ecc71" />
        </View>

        <View style={styles.scheduleCard}>
          <Text style={styles.sectionTitle}>Select dates</Text>
          <Text style={styles.dateHint}>Earliest start: tomorrow (same-day booking not allowed)</Text>
          {activityDuration > 1 ? (
            <Text style={styles.durationHint}>
              {activityDuration}-day activity — pick the first day of your trip
            </Text>
          ) : null}

        <View style={styles.calendarBox}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth("prev")}>
              <Ionicons name="chevron-back" size={20} color="#555" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} {currentYear}
            </Text>
            <TouchableOpacity onPress={() => changeMonth("next")}>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, index) => (
              <Text key={`week-${index}`} style={styles.weekText}>{d}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: firstDay }).map((_, i) => <View key={`empty-${i}`} style={styles.dayCell} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStatus = getDateStatus(day);
              const isPast = isDateInPast(day);
              const isSelected = isDateSelected(day);
              const isBooked = dateStatus === "booked";
              const isReserved = dateStatus === "reserved";
              const isUnavailable = dateStatus === "unavailable" || isPast;
              const isAvailable = dateStatus === "available" && !isPast;
              const isStart = isStartDate(day);
              const isEnd = isEndDate(day);

              return (
                <TouchableOpacity
                  key={`day-${currentYear}-${currentMonth}-${day}`}
                  style={styles.dayCell}
                  onPress={() => !isBooked && !isReserved && !isPast && handleDateSelect(day)}
                  disabled={isBooked || isReserved || isPast}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && styles.selectedCircle,
                      isAvailable && !isSelected && styles.availableCircle,
                      isBooked && styles.bookedCircle,
                      isReserved && styles.reservedCircle,
                      isUnavailable && !isPast && styles.unavailableCircle,
                      isStart && activityDuration > 1 && styles.startDateCircle,
                      isEnd && activityDuration > 1 && styles.endDateCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isPast && styles.pastText,
                        isBooked && styles.bookedText,
                        isReserved && styles.reservedText,
                        isUnavailable && !isPast && styles.unavailableText,
                        isAvailable && !isSelected && styles.availableText,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {selectedDateRange.length > 0 ? (
          <View style={styles.dateRangeInfo}>
            <Text style={styles.dateRangeLabel}>
              Selected: {selectedDateRange[0].toLocaleDateString()}
              {activityDuration > 1
                ? ` – ${selectedDateRange[selectedDateRange.length - 1].toLocaleDateString()}`
                : ""}
            </Text>
            <Text style={styles.dateRangeSubtext}>
              {activityDuration} {activityDuration === 1 ? "day" : "days"} total
            </Text>
          </View>
        ) : null}

        {showRefundWarning ? (
          <View style={styles.refundWarningBanner}>
            <Ionicons name="warning-outline" size={20} color="#B45309" />
            <Text style={styles.refundWarningText}>
              Cancelling this booking may not qualify for a refund.
            </Text>
          </View>
        ) : null}

        <View style={styles.legendGrid}>
          {[
            { color: "#E63946", label: "Booked" },
            { color: "#FFA500", label: "Held (pay pending)" },
            { color: "#2ecc71", label: "Available" },
            { color: "#95a5a6", label: "Unavailable" },
          ].map(({ color, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel}>{label}</Text>
            </View>
          ))}
        </View>
        </View>

        <View style={styles.refundPolicyCard}>
          <TouchableOpacity
            style={styles.refundPolicyHeader}
            onPress={() => setRefundPolicyExpanded((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.refundPolicyTitle}>Cancellation & refunds</Text>
            <Ionicons
              name={refundPolicyExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color="#555"
            />
          </TouchableOpacity>
          {refundPolicyExpanded ? (
            <View style={styles.refundPolicyBody}>
              {refundBullets.map((line) => (
                <View key={line} style={styles.refundBulletRow}>
                  <Text style={styles.refundBulletDot}>•</Text>
                  <Text style={styles.refundBulletText}>{line}</Text>
                </View>
              ))}
              <Text style={styles.refundPolicyNote}>
                Refunds are processed manually to your saved eSewa or bank details.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/tourist/payment")}
                activeOpacity={0.8}
              >
                <Text style={styles.refundPolicyLink}>Profile → Refund details</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.participantsCard}>
          <View style={styles.participantHeader}>
            <View style={styles.participantTextCol}>
              <Text style={styles.sectionTitle}>Participants</Text>
              <Text style={styles.participantHint}>
                Total = daily rate × people × {activityDuration} {activityDuration === 1 ? "day" : "days"}
              </Text>
            </View>
            <View style={styles.participantBox}>
              <TouchableOpacity
                onPress={() => count > 1 && setCount(count - 1)}
                disabled={count <= 1}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="remove" size={22} color={count <= 1 ? "#ccc" : "#555"} />
              </TouchableOpacity>
              <Text style={styles.participantCount}>{count}</Text>
              <TouchableOpacity
                onPress={() => setCount(count + 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={22} color="#007BFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.bottomPriceBlock}>
          <Text style={styles.totalLabel}>Estimated total</Text>
          <Text style={styles.totalAmount}>{formatNprAmount(nprTotalEstimate)}</Text>
          <Text style={styles.totalSub}>
            {formatBookingEstimateBreakdown({
              participants: count,
              days: activityDuration,
              usdPerPersonDay: usdRatePerPersonDay,
              usdTotal: usdTotalEstimate,
              finalNote: "Pay within 2 hours after reserving to confirm",
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, submitting && styles.bookBtnDisabled]}
          onPress={handleBookRequest}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>Reserve & pay</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#E8F2FF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#E8F2FF" },
  loadingText: { marginTop: 10, fontFamily: "Nunito_400Regular", color: "#666", fontSize: 14 },
  scrollContent: {
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
    paddingTop: 4,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  profileImg: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  profileTextCol: { flex: 1, minWidth: 0, marginRight: 8 },
  guideName: { fontFamily: "Nunito_700Bold", fontSize: 16, color: "#000" },
  guideInfo: { fontFamily: "Nunito_400Regular", color: "#777", fontSize: 13, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  ratingText: { marginLeft: 4, fontFamily: "Nunito_400Regular", fontSize: 13, color: "#333" },
  scheduleCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Nunito_700Bold", color: "#000", marginBottom: 6 },
  dateHint: { fontSize: 12, fontFamily: "Nunito_400Regular", color: "#666", marginBottom: 4, lineHeight: 17 },
  durationHint: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#007BFF",
    marginBottom: 12,
    lineHeight: 18,
  },
  calendarBox: {
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8ECF4",
  },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  monthTitle: { fontFamily: "Nunito_700Bold", fontSize: 16, color: "#000" },
  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekText: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Nunito_600SemiBold",
    color: "#888",
    fontSize: 11,
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", alignItems: "center", marginVertical: 4 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  selectedCircle: { backgroundColor: "#007BFF" },
  availableCircle: { backgroundColor: "#E8F5E9", borderWidth: 1, borderColor: "#2ecc71" },
  bookedCircle: { backgroundColor: "#FFEBEE", borderWidth: 1, borderColor: "#E63946" },
  reservedCircle: { backgroundColor: "#FFF3E0", borderWidth: 1, borderColor: "#FFA500" },
  unavailableCircle: { backgroundColor: "#F5F5F5" },
  dayText: { fontFamily: "Nunito_400Regular", fontSize: 14 },
  selectedText: { color: "#fff", fontFamily: "Nunito_700Bold" },
  availableText: { color: "#2ecc71" },
  bookedText: { color: "#E63946" },
  reservedText: { color: "#FFA500" },
  unavailableText: { color: "#95a5a6" },
  pastText: { color: "#ccc" },
  startDateCircle: { borderTopLeftRadius: 18, borderBottomLeftRadius: 18, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  endDateCircle: { borderTopRightRadius: 18, borderBottomRightRadius: 18, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  dateRangeInfo: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  dateRangeLabel: { fontSize: 14, fontFamily: "Nunito_700Bold", color: "#1B7A3D", marginBottom: 2 },
  dateRangeSubtext: { fontSize: 12, fontFamily: "Nunito_400Regular", color: "#555" },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "47%",
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "#555", flexShrink: 1 },
  rateHint: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#007BFF",
  },
  rateHintMuted: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#888",
  },
  participantsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  participantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  participantTextCol: { flex: 1, minWidth: 0 },
  participantHint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginTop: 4,
    lineHeight: 17,
  },
  participantBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D0E4FF",
  },
  participantCount: { marginHorizontal: 14, fontFamily: "Nunito_700Bold", fontSize: 17, minWidth: 20, textAlign: "center" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    gap: 12,
  },
  bottomPriceBlock: { width: "100%" },
  totalLabel: { fontFamily: "Nunito_400Regular", color: "#888", fontSize: 12 },
  totalAmount: { fontFamily: "Nunito_700Bold", fontSize: 22, color: "#000", marginTop: 2 },
  totalSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    lineHeight: 17,
  },
  bookBtn: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  bookBtnDisabled: { backgroundColor: "#95a5a6", opacity: 0.7 },
  bookBtnText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 16 },
  refundWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  refundWarningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#92400E",
    lineHeight: 18,
  },
  refundPolicyCard: {
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  refundPolicyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  refundPolicyTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#222",
  },
  refundPolicyBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  refundBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
  },
  refundBulletDot: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  refundBulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#444",
    lineHeight: 20,
  },
  refundPolicyNote: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    lineHeight: 17,
  },
  refundPolicyLink: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#007BFF",
  },
});
