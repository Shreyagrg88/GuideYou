import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { API_URL } from "../../constants/api";

type BookingDetail = {
  id: string;
  tourist: {
    id: string;
    name: string;
    username: string;
    email?: string | null;
    avatar?: string | null;
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
  status: "pending" | "accepted" | "paid" | "cancelled" | "completed";
  notes?: string;
  requestedAt: string;
  acceptedAt?: string | null;
  paidAt?: string | null;
  paymentExpiresAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  paymentId?: string | null;
  paymentStatus?: string | null;
  confirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

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

        const response = await fetch(`${API_URL}/api/guide/bookings/${params.bookingId}`, {
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

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
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

  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) {
      return "https://i.pravatar.cc/300?img=1";
    }
    if (path.startsWith("http")) {
      return path;
    }
    return `${API_URL}${path}`;
  };

  const handleAccept = async () => {
    if (!booking) return;

    Alert.alert(
      "Accept Booking Request",
      "Are you sure you want to accept this booking request? The tourist will have 30 minutes to complete payment.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              setProcessing(true);
              const token = await AsyncStorage.getItem("token");
              if (!token) {
                Alert.alert("Error", "Please login again.");
                router.push("/login");
                return;
              }

              const response = await fetch(`${API_URL}/api/guide/bookings/${booking.id}/accept`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.msg || "Failed to accept booking");
              }

              Alert.alert("Success", "Booking request accepted. Tourist has 30 minutes to complete payment.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              console.error("Error accepting booking:", err);
              Alert.alert("Error", err.message || "Failed to accept booking");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!booking) return;

    Alert.alert(
      "Reject Booking Request",
      "Are you sure you want to reject this booking request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);
              const token = await AsyncStorage.getItem("token");
              if (!token) {
                Alert.alert("Error", "Please login again.");
                router.push("/login");
                return;
              }

              const response = await fetch(`${API_URL}/api/guide/bookings/${booking.id}/reject`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.msg || "Failed to reject booking");
              }

              Alert.alert("Success", "Booking request rejected.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              console.error("Error rejecting booking:", err);
              Alert.alert("Error", err.message || "Failed to reject booking");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B8BFF" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
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
  const tourPhoto = booking.activity?.photo
    ? getImageUrl(booking.activity.photo)
    : "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";
  const touristAvatarUri = getImageUrl(booking.tourist.avatar);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Request</Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + "20" }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {getStatusText(booking.status)}
            </Text>
          </View>
        </View>

        {/* Activity/Tour Image */}
        <Image source={{ uri: tourPhoto }} style={styles.heroImage} />

        {/* Activity/Tour Title */}
        <View style={styles.titleSection}>
          <Text style={styles.activityTitle}>{tourTitle}</Text>
          {tourLocation && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color="#777" />
              <Text style={styles.locationText}>{tourLocation}</Text>
            </View>
          )}
          {isCustomTour && (
            <View style={styles.customTourBadge}>
              <Ionicons name="create-outline" size={14} color="#007BFF" />
              <Text style={styles.customTourText}>Custom Tour Request</Text>
            </View>
          )}
          {booking.activity?.description && (
            <Text style={styles.descriptionText}>{booking.activity.description}</Text>
          )}
        </View>

        {/* Tourist Info Card */}
        <View style={styles.touristCard}>
          <Image source={{ uri: touristAvatarUri }} style={styles.touristAvatar} />
          <View style={styles.touristInfo}>
            <Text style={styles.touristName}>{booking.tourist.name || booking.tourist.username}</Text>
            <Text style={styles.touristUsername}>@{booking.tourist.username}</Text>
            {booking.tourist.email && (
              <View style={styles.emailRow}>
                <Ionicons name="mail-outline" size={14} color="#777" />
                <Text style={styles.emailText}>{booking.tourist.email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Booking Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Information</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={20} color="#1B8BFF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date Range</Text>
                <Text style={styles.detailValue}>
                  {formatDateRange(booking.startDate, booking.endDate)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color="#1B8BFF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {booking.duration} {booking.duration === 1 ? "day" : "days"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={20} color="#1B8BFF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Participants</Text>
                <Text style={styles.detailValue}>Party of {booking.participantCount}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={20} color="#1B8BFF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Total Price</Text>
                <Text style={styles.detailValue}>${booking.price.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Custom Tour Notes */}
        {booking.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tourist's Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{booking.notes}</Text>
            </View>
          </View>
        )}

        {/* Payment Status (for accepted bookings) */}
        {booking.status === "accepted" && booking.paymentExpiresAt && (
          <View style={styles.section}>
            <View style={styles.paymentStatusBox}>
              <Ionicons name="time-outline" size={20} color="#FFA500" />
              <View style={styles.paymentStatusContent}>
                <Text style={styles.paymentStatusLabel}>Awaiting Payment</Text>
                <Text style={styles.paymentStatusText}>
                  Tourist has until {formatDate(booking.paymentExpiresAt)} to complete payment
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: "#1B8BFF" }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Requested</Text>
                <Text style={styles.timelineDate}>{formatDate(booking.requestedAt)}</Text>
              </View>
            </View>

            {booking.acceptedAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#FFA500" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Accepted</Text>
                  <Text style={styles.timelineDate}>{formatDate(booking.acceptedAt)}</Text>
                </View>
              </View>
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
      {booking.status === "pending" && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#E63946" />
            ) : (
              <>
                <Ionicons name="close-circle" size={18} color="#E63946" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {booking.status === "accepted" && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#1B8BFF" />
            <Text style={styles.infoText}>
              Waiting for tourist to complete payment. You'll be notified once payment is confirmed.
            </Text>
          </View>
        </View>
      )}

      {booking.status === "paid" && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.confirmedBox}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.confirmedText}>Booking Confirmed</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    flex: 1,
  },
  statusContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
  heroImage: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  activityTitle: {
    fontSize: 24,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 8,
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
  touristCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F8FF",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
  },
  touristAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  touristInfo: {
    flex: 1,
  },
  touristName: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 2,
  },
  touristUsername: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#777",
    marginBottom: 4,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  emailText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#777",
    marginLeft: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 15,
  },
  detailRow: {
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
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
  paymentStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFA500",
  },
  paymentStatusContent: {
    marginLeft: 12,
    flex: 1,
  },
  paymentStatusLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFA500",
    marginBottom: 2,
  },
  paymentStatusText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
  },
  timeline: {
    marginTop: 10,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
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
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    gap: 12,
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
  acceptButton: {
    backgroundColor: "#22C55E",
  },
  acceptButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  rejectButton: {
    backgroundColor: "#FFEBEE",
  },
  rejectButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#E63946",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3EDFF",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#1B8BFF",
    flex: 1,
  },
  confirmedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  confirmedText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#4CAF50",
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
});
