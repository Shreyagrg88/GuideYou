import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { initiateEsewaPayment } from "../../api/payment";
import { confirmTourStartedTourist, type BookingMilestoneFields } from "../../api/bookingMilestone";
import { markTouristBookingComplete } from "../../api/touristBookings";
import { promptRefundDetailsBeforePay } from "../../api/touristPayment";
import { showCancelBookingConfirm } from "../../utils/cancelTouristBooking";
import { mergeMilestoneFields } from "../../utils/bookingMilestoneDisplay";
import { API_URL } from "../../constants/api";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import ScreenHeader from "../../components/screen-header";
import ActivityThumbnail from "../../components/activity-thumbnail";
import UserAvatar from "../../components/user-avatar";
import { SkeletonBookingDetailScreen } from "@/components/Skeleton";
import { formatNprAmount, resolveEsewaBookingDisplay } from "../../utils/bookingPrice";
import { resolveMediaUri } from "../../utils/avatar";

type BookingDetail = {
  id: string;
  guide: {
    id: string;
    name: string;
    username: string;
    fullName?: string;
    avatar?: string | null;
    location?: string;
    mainExpertise?: string;
    expertise?: string[];
    languages?: string[];
    bio?: string;
    yearsOfExperience?: number;
  };
  activity?: {
    id: string;
    name: string;
    photo?: string | null;
    photos?: string[];
    location?: string | null;
    category?: string | null;
    duration?: number;
    description?: string | null;
    difficulty?: string | null;
    equipment?: string | null;
  } | null;
  tourName?: string | null;
  location?: string | null;
  startDate: string;
  endDate: string;
  duration: number;
  participantCount: number;
  price: number;
  priceNpr?: number;
  priceUsd?: number;
  priceUsdApproximated?: boolean;
  usdToNprRate?: number;
  status: "pending" | "accepted" | "paid" | "cancelled" | "completed";
  /** From API: true when paid and today ≥ endDate (UTC); show “Mark complete”. */
  canMarkComplete?: boolean;
  canConfirmTourStarted?: boolean;
  tourStartedConfirmedByTourist?: boolean;
  tourStartedConfirmedByGuide?: boolean;
  tourStartedAt?: string | null;
  guideStartPayoutReleasedAt?: string | null;
  notes?: string;
  requestedAt: string;
  acceptedAt?: string | null;
  paidAt?: string | null;
  paymentExpiresAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  paymentId?: string | null;
  paymentStatus?: string | null;
  refundStatus?: string | null;
  refundAmount?: number;
  refundPercent?: number | null;
  refundPolicyKey?: string | null;
  refundPolicyLabel?: string | null;
  refundTouristMessage?: string | null;
  refundNote?: string | null;
  refundedAt?: string | null;
  hasRefundDue?: boolean;
  isRefunded?: boolean;
  confirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
} & Partial<BookingMilestoneFields>;

export default function BookingDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    bookingId?: string;
  }>();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Fetch booking details from API
  useEffect(() => {
    const fetchBookingDetail = async () => {
      if (!params.bookingId) {
        setError("Booking ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = await AsyncStorage.getItem("token");
        if (!token) {
          Alert.alert("Authentication Required", "Please login to view booking details");
          router.push("/login");
          return;
        }

        const response = await fetch(`${API_URL}/api/tourist/bookings/${params.bookingId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            Alert.alert("Unauthorized", "Please login again");
            router.push("/login");
            return;
          }
          throw new Error(data.msg || "Failed to fetch booking detail");
        }

        setBooking(data.booking);
      } catch (err: any) {
        console.error("Error fetching booking detail:", err);
        setError(err.message || "Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetail();
  }, [params.bookingId, router]);

  // Refetch when returning from eSewa WebView so status updates
  useFocusEffect(
    useCallback(() => {
      if (!params.bookingId) return;
      const refetch = async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) return;
          const res = await fetch(`${API_URL}/api/tourist/bookings/${params.bookingId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setBooking(data.booking);
          }
        } catch (_) {}
      };
      refetch();
    }, [params.bookingId])
  );

  // Payment countdown timer
  useEffect(() => {
    if (!booking || booking.status !== "accepted" || !booking.paymentExpiresAt) {
      setTimeRemaining("");
      return;
    }

    const interval = setInterval(() => {
      const expiryTime = new Date(booking.paymentExpiresAt!).getTime();
      const now = Date.now();
      const remaining = expiryTime - now;

      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining("Expired");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking?.id, booking?.status, booking?.paymentExpiresAt]);

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
    if (sameDay) {
      return `${start.toLocaleString("default", { month: "short" })} ${start.getDate()}, ${start.getFullYear()}`;
    }
    const startMonth = start.toLocaleString("default", { month: "short" });
    const endMonth = end.toLocaleString("default", { month: "short" });
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "paid":
        return "#1B8BFF";
      case "accepted":
        return "#FFA500";
      case "pending":
        return "#FFB800";
      case "completed":
        return "#4CAF50";
      case "cancelled":
        return "#E63946";
      default:
        return "#777";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "paid":
        return "Confirmed";
      case "accepted":
        return "Awaiting Payment";
      case "pending":
        return "Pending";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getMediaUri = (path: string | null | undefined): string | null =>
    resolveMediaUri(path);

  const reloadBooking = async () => {
    if (!params.bookingId) return;
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_URL}/api/tourist/bookings/${params.bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
      }
    } catch (_) {}
  };

  const handleCancel = () => {
    if (!booking) return;

    showCancelBookingConfirm(
      {
        bookingId: booking.id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paidAt: booking.paidAt,
        price: booking.price,
        priceNpr: booking.priceNpr,
        startDate: booking.startDate,
      },
      async (message) => {
        try {
          setProcessing(true);
          await reloadBooking();
          Alert.alert("Booking cancelled", message);
        } finally {
          setProcessing(false);
        }
      },
      (message) => Alert.alert("Error", message)
    );
  };

  const handlePayNow = async () => {
    if (!booking) return;
    const proceed = await promptRefundDetailsBeforePay(() =>
      router.push("/tourist/payment")
    );
    if (!proceed) return;
    try {
      setProcessing(true);
      const { gatewayUrl, formUrl, params } = await initiateEsewaPayment(booking.id);
      setProcessing(false);
      router.push({
        pathname: "/tourist/esewa_webview",
        params: {
          bookingId: booking.id,
          ...(formUrl ? { formUrl } : { gatewayUrl, paramsJson: JSON.stringify(params) }),
        },
      });
    } catch (err: any) {
      setProcessing(false);
      Alert.alert("Payment", err.message || "Could not start eSewa payment. Try again.");
    }
  };

  const handleConfirmTourStarted = () => {
    if (!booking) return;
    Alert.alert(
      "Confirm tour started",
      "Confirm that your tour has started today? Your guide must also confirm before the start payout is released.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Yes, tour started",
          onPress: async () => {
            try {
              setProcessing(true);
              const { msg, booking: patch } = await confirmTourStartedTourist(booking.id);
              setBooking((prev) =>
                prev ? mergeMilestoneFields(prev, patch) : prev
              );
              Alert.alert("Done", msg);
            } catch (err: unknown) {
              const e = err as Error & { status?: number };
              if (e.status === 401 || e.message === "Not logged in") {
                Alert.alert("Session expired", "Please sign in again.", [
                  { text: "OK", onPress: () => router.push("/login") },
                ]);
                return;
              }
              Alert.alert("Could not confirm", e.message || "Try again.");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkComplete = () => {
    if (!booking) return;
    Alert.alert(
      "Mark as completed",
      "Mark this tour as completed? This confirms you finished the activity.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Yes, mark complete",
          onPress: async () => {
            try {
              setProcessing(true);
              const { msg, booking: patch } = await markTouristBookingComplete(booking.id);
              setBooking((prev) => {
                if (!prev) return prev;
                if (!patch) {
                  return { ...prev, status: "completed", canMarkComplete: false };
                }
                const nextStatus = patch.status as BookingDetail["status"];
                return {
                  ...prev,
                  status: nextStatus || prev.status,
                  completedAt: patch.completedAt ?? prev.completedAt,
                  canMarkComplete:
                    patch.status === "completed"
                      ? false
                      : typeof patch.canMarkComplete === "boolean"
                        ? patch.canMarkComplete
                        : prev.canMarkComplete,
                  guide: patch.guide
                    ? {
                        ...prev.guide,
                        id: patch.guide.id ?? prev.guide.id,
                        name: patch.guide.name ?? prev.guide.name,
                        username: patch.guide.username ?? prev.guide.username,
                      }
                    : prev.guide,
                };
              });
              Alert.alert("Done", msg);
            } catch (err: unknown) {
              const e = err as Error & { status?: number };
              if (e.status === 401 || e.message === "Not logged in") {
                Alert.alert("Session expired", "Please sign in again.", [
                  { text: "OK", onPress: () => router.push("/login") },
                ]);
                return;
              }
              Alert.alert("Could not complete", e.message || "Try again.");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleViewGuideProfile = () => {
    if (!booking?.guide.id) return;
    router.push({
      pathname: "/tourist/guide_profileview",
      params: {
        guideId: booking.guide.id,
        guideName: booking.guide.name,
        guideImage: booking.guide.avatar,
        guideLocation: booking.guide.location,
      },
    });
  };

  const handleReportGuide = () => {
    if (!booking?.guide.id) return;
    const tourTitle =
      booking.tourName ||
      booking.activity?.name ||
      "Custom tour request";
    router.push({
      pathname: "/tourist/report_guide",
      params: {
        guideId: booking.guide.id,
        guideName: booking.guide.name || booking.guide.username,
        guideImage: booking.guide.avatar ?? undefined,
        guideRole: booking.guide.mainExpertise ?? undefined,
        bookingId: booking.id,
        bookingLabel: tourTitle,
      },
    });
  };

  const canChat =
    booking?.status === "accepted" ||
    booking?.status === "paid" ||
    booking?.status === "completed";

  if (loading) {
    return <SkeletonBookingDetailScreen />;
  }

  if (error || !booking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error || "Booking not found"}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Determine if it's a custom tour or activity booking
  const isCustomTour = !!booking.tourName;
  const tourTitle = booking.activity?.name || booking.tourName || "Custom Tour";
  const tourLocation = booking.activity?.location || booking.location;
  const tourPhoto = booking.activity?.photo ?? null;
  const guideAvatarUri = getMediaUri(booking.guide.avatar);
  const isExpired = booking.status === "accepted" && timeRemaining === "Expired";
  const isAwaitingPayment =
    booking.status === "accepted" && !booking.paidAt && !booking.paymentId;
  const payDisplay = resolveEsewaBookingDisplay(booking);

  const showPaymentActionBar =
    booking.status === "accepted" &&
    booking.paymentStatus !== "completed" &&
    !booking.paymentId;
  const showPaidActionBar = booking.status === "paid";
  const showPendingActionBar = booking.status === "pending";
  const scrollBottomPadding =
    (showPaymentActionBar ? 200 : showPaidActionBar ? 240 : showPendingActionBar ? 100 : 32) +
    insets.bottom;

  const detailRows = [
    {
      icon: "calendar-outline" as const,
      label: "Date range",
      value: formatDateRange(booking.startDate, booking.endDate),
    },
    {
      icon: "time-outline" as const,
      label: "Duration",
      value: `${booking.duration} ${booking.duration === 1 ? "day" : "days"}`,
    },
    {
      icon: "people-outline" as const,
      label: "Participants",
      value: `Party of ${booking.participantCount}`,
    },
    {
      icon: "cash-outline" as const,
      label: "Total (eSewa · NPR)",
      value: formatNprAmount(payDisplay.nprDisplay),
      subValue: payDisplay.usdSecondaryLine,
      priceNote: payDisplay.legacyUsdInPriceField
        ? `If the eSewa page shows ${formatNprAmount(payDisplay.storedRawPrice)} instead, the server is still charging that old stored value. The amount above matches your guide’s dollar rate converted to NPR.`
        : undefined,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Booking Details" includeTopInset marginBottom={16} />

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + "20" }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {getStatusText(booking.status)}
          </Text>
        </View>

        {booking.status === "completed" && booking.completedAt ? (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.completedBannerText}>
              Completed on {formatDate(booking.completedAt)}
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <ActivityThumbnail uri={tourPhoto} style={styles.heroImage} iconSize={40} />
          <View style={styles.summaryBody}>
            <Text style={styles.activityTitle} numberOfLines={3}>
              {tourTitle}
            </Text>
            {tourLocation ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color="#777" />
                <Text style={styles.locationText} numberOfLines={2}>
                  {tourLocation}
                </Text>
              </View>
            ) : null}
            {isCustomTour ? (
              <View style={styles.customTourBadge}>
                <Ionicons name="create-outline" size={14} color="#007BFF" />
                <Text style={styles.customTourText}>Custom tour request</Text>
              </View>
            ) : null}
            {booking.activity?.description ? (
              <Text style={styles.descriptionText} numberOfLines={4}>
                {booking.activity.description}
              </Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity style={styles.guideCard} onPress={handleViewGuideProfile} activeOpacity={0.85}>
          <UserAvatar
            uri={guideAvatarUri}
            name={booking.guide.name || booking.guide.username}
            size={48}
            style={styles.guideAvatar}
          />
          <View style={styles.guideInfo}>
            <Text style={styles.guideName} numberOfLines={1}>
              {booking.guide.name || booking.guide.username}
            </Text>
            <Text style={styles.guideLocation} numberOfLines={2}>
              {booking.guide.location || "Location"}
              {booking.guide.mainExpertise ? ` • ${booking.guide.mainExpertise}` : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#1B8BFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.reportGuideBtn} onPress={handleReportGuide}>
          <Ionicons name="flag-outline" size={16} color="#E53935" />
          <Text style={styles.reportGuideText}>Report guide</Text>
        </TouchableOpacity>

        {canChat ? (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() =>
              router.push({
                pathname: "/tourist/chat_tourist",
                params: {
                  counterpartId: booking.guide.id,
                  guideName: booking.guide.name || booking.guide.username,
                  guideAvatar: booking.guide.avatar ?? undefined,
                },
              })
            }
          >
            <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
            <Text style={styles.chatButtonText}>Chat with guide</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking information</Text>

          {booking.status === "accepted" && booking.paymentExpiresAt ? (
            <View style={[styles.countdownBox, isExpired && styles.expiredCountdownBox]}>
              <Ionicons
                name={isExpired ? "time-outline" : "time"}
                size={22}
                color={isExpired ? "#E63946" : "#FFA500"}
              />
              <View style={styles.countdownContent}>
                <Text style={[styles.countdownLabel, isExpired && styles.expiredText]}>
                  {isExpired ? "Payment expired" : "Payment due in"}
                </Text>
                {!isExpired && timeRemaining ? (
                  <Text style={styles.countdownTime}>{timeRemaining}</Text>
                ) : null}
                {booking.paymentExpiresAt ? (
                  <Text style={styles.countdownSubtext}>
                    {isExpired
                      ? "These dates may be available again soon."
                      : `Pay by ${formatDateTime(booking.paymentExpiresAt)}`}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {detailRows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.detailRow, index < detailRows.length - 1 && styles.detailRowBorder]}
            >
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name={row.icon} size={20} color="#1B8BFF" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                  {row.subValue ? <Text style={styles.detailSubValue}>{row.subValue}</Text> : null}
                  {row.priceNote ? <Text style={styles.detailPriceNote}>{row.priceNote}</Text> : null}
                </View>
              </View>
            </View>
          ))}
        </View>

        {booking.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{booking.notes}</Text>
            </View>
          </View>
        ) : null}

        {booking.status === "cancelled" &&
        booking.refundStatus &&
        booking.refundStatus !== "not_applicable" ? (
          <View
            style={[
              styles.refundCard,
              (booking.isRefunded ||
                booking.refundStatus === "completed" ||
                booking.paymentStatus === "refunded") &&
                styles.refundCardCompleted,
              booking.refundStatus === "denied" && styles.refundCardDenied,
              (booking.hasRefundDue || booking.refundStatus === "eligible") &&
                styles.refundCardPending,
            ]}
          >
            <Ionicons
              name={
                booking.isRefunded ||
                booking.refundStatus === "completed" ||
                booking.paymentStatus === "refunded"
                  ? "checkmark-circle"
                  : booking.refundStatus === "denied"
                    ? "close-circle-outline"
                    : "time-outline"
              }
              size={22}
              color={
                booking.isRefunded ||
                booking.refundStatus === "completed" ||
                booking.paymentStatus === "refunded"
                  ? "#4CAF50"
                  : booking.refundStatus === "denied"
                    ? "#666"
                    : "#FFA500"
              }
            />
            <View style={styles.refundCardContent}>
              {booking.isRefunded ||
              booking.refundStatus === "completed" ||
              booking.paymentStatus === "refunded" ? (
                <>
                  <Text style={styles.refundCardTitle}>Refunded</Text>
                  {booking.refundedAt ? (
                    <Text style={styles.refundCardSub}>
                      Refunded on {formatDate(booking.refundedAt)}
                    </Text>
                  ) : null}
                  {booking.refundNote ? (
                    <Text style={styles.refundCardSub}>{booking.refundNote}</Text>
                  ) : null}
                </>
              ) : booking.hasRefundDue || booking.refundStatus === "eligible" ? (
                <>
                  <Text style={styles.refundCardTitle}>
                    Refund pending — {formatNprAmount(booking.refundAmount ?? 0)}
                  </Text>
                  {booking.refundTouristMessage ? (
                    <Text style={styles.refundCardSub}>{booking.refundTouristMessage}</Text>
                  ) : (
                    <Text style={styles.refundCardSub}>
                      Processed manually within 5–7 business days to your saved refund details.
                    </Text>
                  )}
                </>
              ) : booking.refundStatus === "denied" ? (
                <>
                  <Text style={styles.refundCardTitle}>
                    No refund
                    {booking.refundPolicyLabel ? ` (${booking.refundPolicyLabel})` : ""}
                  </Text>
                  {booking.refundTouristMessage ? (
                    <Text style={styles.refundCardSub}>{booking.refundTouristMessage}</Text>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timeline}>
            {isCustomTour ? (
              <>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: "#1B8BFF" }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Request sent</Text>
                    <Text style={styles.timelineDate}>{formatDate(booking.requestedAt)}</Text>
                  </View>
                </View>

                {booking.status === "pending" && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: "#FFB800" }]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Awaiting guide approval</Text>
                      <Text style={styles.timelineSubtext}>The guide will accept or decline your request</Text>
                    </View>
                  </View>
                )}

                {booking.acceptedAt && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: "#FFA500" }]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Guide accepted</Text>
                      <Text style={styles.timelineDate}>{formatDate(booking.acceptedAt)}</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: "#1B8BFF" }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Dates reserved</Text>
                    <Text style={styles.timelineDate}>
                      {formatDate(booking.acceptedAt || booking.requestedAt)}
                    </Text>
                  </View>
                </View>

                {isAwaitingPayment && (
                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: isExpired ? "#E63946" : "#FFA500" },
                      ]}
                    />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>
                        {isExpired ? "Payment expired" : "Payment due"}
                      </Text>
                      {booking.paymentExpiresAt ? (
                        <Text style={styles.timelineDate}>
                          {isExpired
                            ? "Dates released — book again if still available"
                            : `Complete by ${formatDateTime(booking.paymentExpiresAt)}`}
                        </Text>
                      ) : (
                        <Text style={styles.timelineSubtext}>Complete payment within 2 hours</Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}

            {booking.paidAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#4CAF50" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Payment Confirmed</Text>
                  <Text style={styles.timelineDate}>{formatDate(booking.paidAt)}</Text>
                </View>
              </View>
            )}

            {booking.tourStartedAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#1B8BFF" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Tour started</Text>
                  <Text style={styles.timelineDate}>{formatDate(booking.tourStartedAt)}</Text>
                  <Text style={styles.timelineSubtext}>
                    Confirmed by both you and your guide
                  </Text>
                </View>
              </View>
            )}

            {booking.tourStartedConfirmedByTourist && !booking.tourStartedAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#1B8BFF" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>You confirmed tour start</Text>
                  <Text style={styles.timelineSubtext}>Waiting for guide confirmation</Text>
                </View>
              </View>
            )}

            {booking.completedAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#4CAF50" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Completed</Text>
                  <Text style={styles.timelineDate}>{formatDate(booking.completedAt)}</Text>
                </View>
              </View>
            )}

            {booking.cancelledAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#E63946" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Cancelled</Text>
                  <Text style={styles.timelineDate}>{formatDate(booking.cancelledAt)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {booking.status === "paid" && (
        <View
          style={[
            styles.actionBar,
            styles.actionBarColumn,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {booking.canConfirmTourStarted ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.tourStartButton]}
              onPress={handleConfirmTourStarted}
              disabled={processing}
            >
              <Ionicons name="flag-outline" size={20} color="#fff" />
              <Text style={styles.tourStartButtonText}>Confirm tour started</Text>
            </TouchableOpacity>
          ) : null}
          {booking.canMarkComplete ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.completePrimaryButton]}
              onPress={handleMarkComplete}
              disabled={processing}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.completePrimaryButtonText}>Mark activity as completed</Text>
            </TouchableOpacity>
          ) : !booking.canConfirmTourStarted ? (
            <Text style={styles.completeWaitHint}>
              {booking.tourStartedAt
                ? `You can mark this complete on or after your last tour day (${formatDate(booking.endDate)}).`
                : booking.tourStartedConfirmedByTourist
                  ? "Waiting for your guide to confirm tour start."
                  : `Confirm tour start on or after ${formatDate(booking.startDate)}.`}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton, styles.actionButtonFullWidth]}
            onPress={handleCancel}
            disabled={processing}
          >
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      )}

      {booking.status === "accepted" &&
        booking.paymentStatus !== "completed" &&
        !booking.paymentId && (
        <View
          style={[
            styles.actionBar,
            styles.actionBarColumn,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <Text style={styles.payHint}>
            {payDisplay.legacyUsdInPriceField
              ? `Pay in NPR on eSewa. If the gateway shows ${formatNprAmount(payDisplay.storedRawPrice)}, that is what the server signed until the booking row is updated.`
              : "You pay in Nepalese rupees (NPR) via eSewa — same amount as above."}
          </Text>
          <View style={styles.actionBarRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.payButton, isExpired && styles.disabledButton]}
              onPress={handlePayNow}
              disabled={isExpired || processing}
            >
              <Ionicons name="card" size={18} color="#fff" />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={processing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {booking.status === "pending" && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
            disabled={processing}
          >
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F2FF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8F2FF",
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    color: "#E63946",
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#1B8BFF",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  heroImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    backgroundColor: "#E7F0FF",
  },
  summaryBody: {
    padding: 16,
  },
  activityTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 6,
  },
  card: {
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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#777",
    marginLeft: 4,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginTop: 12,
    lineHeight: 20,
  },
  guideCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  reportGuideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
    paddingVertical: 8,
  },
  reportGuideText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#E53935",
  },
  guideAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  guideInfo: {
    flex: 1,
  },
  guideName: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 4,
  },
  guideLocation: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#777",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 14,
  },
  detailRow: {
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8ECF4",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#777",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#000",
  },
  detailSubValue: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginTop: 4,
  },
  detailPriceNote: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#8a6d3b",
    marginTop: 8,
    lineHeight: 17,
  },
  notesBox: {
    backgroundColor: "#F5F8FF",
    padding: 15,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#333",
    lineHeight: 20,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#007BFF",
  },
  chatButtonText: {
    marginLeft: 6,
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#FFF",
  },
  countdownBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF8EE",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD699",
    marginBottom: 14,
  },
  expiredCountdownBox: {
    backgroundColor: "#FFEBEE",
    borderColor: "#E63946",
  },
  countdownContent: {
    marginLeft: 12,
    flex: 1,
  },
  countdownLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFA500",
    marginBottom: 2,
  },
  expiredText: {
    color: "#E63946",
  },
  countdownTime: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: "#E65100",
    marginTop: 2,
  },
  countdownSubtext: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#777",
    marginTop: 4,
    lineHeight: 18,
  },
  timeline: {
    paddingTop: 4,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 18,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 15,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#777",
  },
  timelineSubtext: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#777",
    lineHeight: 20,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
    paddingTop: 14,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  actionBarColumn: {
    flexDirection: "column",
    gap: 10,
    alignItems: "stretch",
  },
  actionButtonFullWidth: {
    flex: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  completePrimaryButton: {
    backgroundColor: "#16a34a",
    flex: 0,
    width: "100%",
  },
  tourStartButton: {
    backgroundColor: "#1B8BFF",
    flex: 0,
    width: "100%",
  },
  tourStartButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  completePrimaryButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  completeWaitHint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#555",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#16a34a",
    borderRadius: 12,
  },
  completedBannerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  actionBarRow: {
    flexDirection: "row",
    gap: 12,
  },
  payHint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  payButton: {
    backgroundColor: "#22C55E",
  },
  payButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  cancelButton: {
    backgroundColor: "#FFEBEE",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#E63946",
  },
  disabledButton: {
    opacity: 0.5,
  },
  customTourBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    gap: 4,
  },
  customTourText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#007BFF",
  },
  refundCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  refundCardPending: {
    backgroundColor: "#FFF8E1",
    borderColor: "#FFE082",
  },
  refundCardCompleted: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },
  refundCardDenied: {
    backgroundColor: "#FAFAFA",
    borderColor: "#E0E0E0",
  },
  refundCardContent: {
    flex: 1,
  },
  refundCardTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#222",
    marginBottom: 4,
  },
  refundCardSub: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#555",
    lineHeight: 18,
  },
});
