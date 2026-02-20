import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
import { API_URL } from "../../constants/api";
import TouristNavbar from "../components/tourist_navbar";

type Booking = {
  id: string;
  guide: {
    id: string;
    name: string;
    username: string;
    fullName?: string;
    avatar?: string;
    location?: string;
    mainExpertise?: string;
    expertise?: string[];
  };
  activity?: {
    id: string;
    name: string;
    photo?: string;
    photos?: string[];
    location?: string;
    category?: string;
    duration?: number;
  } | null;
  tourName?: string;
  location?: string;
  startDate: string;
  endDate: string;
  duration: number;
  participantCount: number;
  price: number;
  status: "pending" | "accepted" | "paid" | "cancelled" | "completed";
  notes?: string;
  requestedAt: string;
  acceptedAt?: string;
  paidAt?: string;
  paymentExpiresAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  paymentId?: string;
};

export default function BookingsTouristScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<"upcoming" | "past" | "pending" | "accepted">(
    (params.tab as "upcoming" | "past" | "pending" | "accepted") || "upcoming"
  );
  const [timeRemaining, setTimeRemaining] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [pending, setPending] = useState<Booking[]>([]);
  const [accepted, setAccepted] = useState<Booking[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Countdown timer for payment expiration
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining = new Map<string, string>();
      
      accepted.forEach((booking) => {
        if (booking.status === "accepted" && booking.paymentExpiresAt) {
          const expiryTime = new Date(booking.paymentExpiresAt).getTime();
          const now = Date.now();
          const remaining = expiryTime - now;
          
          if (remaining > 0) {
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            newTimeRemaining.set(booking.id, `${minutes}m ${seconds}s`);
          } else {
            newTimeRemaining.set(booking.id, "Expired");
          }
        }
      });
      
      setTimeRemaining(newTimeRemaining);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [accepted]);

  // Format date for display
  const formatDate = (dateStr: string): { date: string; month: string } => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" }).toUpperCase();
    return { date: day.toString(), month };
  };

  // Format date range
  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startMonth = start.toLocaleString("default", { month: "short" });
    const endMonth = end.toLocaleString("default", { month: "short" });
    
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} – ${end.getDate()}`;
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
  };

  // Get status color
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

  // Get status text
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

  // Format image URL
  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) {
      return "https://i.pravatar.cc/300?img=1";
    }
    if (path.startsWith("http")) {
      return path;
    }
    return `${API_URL}${path}`;
  };

  // Navigate to booking detail page
  const navigateToBookingDetail = (booking: Booking) => {
    router.push({
      pathname: "/tourist/booking_detail",
      params: {
        bookingId: booking.id.toString(),
      },
    });
  };

  // Fetch bookings from API
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "Please login again.");
        router.push("/login");
        return;
      }

      // Fetch all bookings - we'll filter on the frontend
      // Try fetching with tab parameter, but also fetch requests tab for accepted bookings
      const url = `${API_URL}/api/tourist/bookings`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Get response as text first to check if it's HTML
      const responseText = await response.text();
      const isHTML = responseText.trim().startsWith('<');

      // Check if response is HTML (error page) instead of JSON
      if (!response.ok || isHTML) {
        if (response.status === 401) {
          Alert.alert("Error", "Authentication failed. Please login again.");
          router.push("/login");
          return;
        } else if (response.status === 404) {
          console.error("Bookings API endpoint not found");
        } else if (response.status === 500) {
          console.error("Server error (500)");
        }
        
        // Set empty arrays on error
        setUpcoming([]);
        setPast([]);
        setPending([]);
        setAccepted([]);
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error("JSON parse error:", parseError);
        setUpcoming([]);
        setPast([]);
        setPending([]);
        setAccepted([]);
        return;
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Separate bookings by status and date
      const upcomingBookings: Booking[] = [];
      const pastBookings: Booking[] = [];
      const pendingBookings: Booking[] = [];
      const acceptedBookings: Booking[] = [];

      if (data.bookings && Array.isArray(data.bookings)) {
        data.bookings.forEach((booking: Booking) => {
          const startDate = new Date(booking.startDate);
          startDate.setHours(0, 0, 0, 0);

          if (booking.status === "pending") {
            pendingBookings.push(booking);
          } else if (booking.status === "accepted") {
            acceptedBookings.push(booking);
          } else if (booking.status === "paid" && startDate >= now) {
            upcomingBookings.push(booking);
          } else if (
            booking.status === "completed" ||
            booking.status === "cancelled" ||
            (booking.status === "paid" && startDate < now)
          ) {
            pastBookings.push(booking);
          }
        });
      }

      // Also fetch requests tab to get accepted bookings if they're not in the main response
      // This ensures we get all accepted bookings
      try {
        const requestsUrl = `${API_URL}/api/tourist/bookings?tab=requests`;
        const requestsResponse = await fetch(requestsUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const requestsText = await requestsResponse.text();
        const requestsIsHTML = requestsText.trim().startsWith('<');

        if (requestsResponse.ok && !requestsIsHTML) {
          const requestsData = JSON.parse(requestsText);
          if (requestsData.bookings && Array.isArray(requestsData.bookings)) {
            requestsData.bookings.forEach((booking: Booking) => {
              if (booking.status === "accepted") {
                // Only add if not already in acceptedBookings
                if (!acceptedBookings.find((b) => b.id === booking.id)) {
                  acceptedBookings.push(booking);
                }
              } else if (booking.status === "pending") {
                // Only add if not already in pendingBookings
                if (!pendingBookings.find((b) => b.id === booking.id)) {
                  pendingBookings.push(booking);
                }
              }
            });
          }
        }
      } catch (requestsError: any) {
        // Silently fail - we already have bookings from main request
        console.log("Could not fetch requests tab:", requestsError);
      }

      setUpcoming(upcomingBookings);
      setPast(pastBookings);
      setPending(pendingBookings);
      setAccepted(acceptedBookings);
    } catch (error: any) {
      console.error("Fetch bookings error:", error);
      setUpcoming([]);
      setPast([]);
      setPending([]);
      setAccepted([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Cancel booking
  const handleCancel = async (bookingId: string) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessingId(bookingId);
              const token = await AsyncStorage.getItem("token");

              if (!token) {
                Alert.alert("Error", "Please login again.");
                router.push("/login");
                return;
              }

              const url = `${API_URL}/api/tourist/bookings/${bookingId}/cancel`;
              const response = await fetch(url, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });

              const responseText = await response.text();
              const isHTML = responseText.trim().startsWith('<');

              // Check if response is HTML (error page) instead of JSON
              if (!response.ok || isHTML) {
                let errorMessage = `Failed to cancel booking (${response.status})`;
                if (response.status === 400) {
                  errorMessage = "Booking already cancelled or cannot cancel completed booking.";
                } else if (response.status === 401) {
                  errorMessage = "Authentication failed. Please login again.";
                  router.push("/login");
                  return;
                } else if (response.status === 403) {
                  errorMessage = "You don't have permission to cancel this booking.";
                } else if (response.status === 404) {
                  errorMessage = "Booking not found.";
                } else if (response.status === 500) {
                  errorMessage = "Server error. Please try again.";
                }
                Alert.alert("Error", errorMessage);
                return;
              }

              let data;
              try {
                data = JSON.parse(responseText);
              } catch (parseError: any) {
                Alert.alert("Error", "Invalid server response. Please try again.");
                return;
              }

              Alert.alert("Success", "Booking cancelled successfully");
              
              // Refresh all tabs to ensure cancelled booking appears in past tab
              await fetchBookings();
              
              // Switch to past tab to show the cancelled booking
              setTab("past");
            } catch (error: any) {
              console.error("Cancel booking error:", error);
              Alert.alert("Error", "Failed to cancel booking. Please try again.");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  // Confirm payment for accepted booking
  const handleConfirmPayment = async (bookingId: string) => {
    Alert.alert(
      "Confirm Payment",
      "Have you completed the payment for this booking?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Payment Done",
          onPress: async () => {
            try {
              setProcessingId(bookingId);
              const token = await AsyncStorage.getItem("token");

              if (!token) {
                Alert.alert("Error", "Please login again.");
                router.push("/login");
                return;
              }

              // Call payment gateway here first, then confirm payment
              // For now, we'll call the confirm-payment endpoint directly
              // In production, integrate with your payment gateway (Stripe, PayPal, etc.)
              const url = `${API_URL}/api/tourist/bookings/${bookingId}/confirm-payment`;
              const response = await fetch(url, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  paymentId: `payment_${Date.now()}`, // Replace with actual payment ID from gateway
                  paymentStatus: "completed",
                }),
              });

              const responseText = await response.text();
              const isHTML = responseText.trim().startsWith('<');

              if (!response.ok || isHTML) {
                let errorMessage = `Failed to confirm payment (${response.status})`;
                if (response.status === 400) {
                  errorMessage = "Payment window has expired or booking cannot be paid.";
                } else if (response.status === 401) {
                  errorMessage = "Authentication failed. Please login again.";
                  router.push("/login");
                  return;
                } else if (response.status === 403) {
                  errorMessage = "You don't have permission to confirm payment for this booking.";
                } else if (response.status === 404) {
                  errorMessage = "Booking not found.";
                } else if (response.status === 500) {
                  errorMessage = "Server error. Please try again.";
                }
                Alert.alert("Error", errorMessage);
                return;
              }

              let data;
              try {
                data = JSON.parse(responseText);
              } catch (parseError: any) {
                Alert.alert("Error", "Invalid server response. Please try again.");
                return;
              }

              Alert.alert("Success", "Payment confirmed! Booking is now confirmed.");
              
              // Refresh all tabs
              await fetchBookings();
              
              // Switch to upcoming tab to show the confirmed booking
              setTab("upcoming");
            } catch (error: any) {
              console.error("Confirm payment error:", error);
              Alert.alert("Error", "Failed to confirm payment. Please try again.");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  // Fetch bookings on mount and tab change
  useEffect(() => {
    fetchBookings();
    // Update tab if param changes
    if (params.tab && ["upcoming", "past", "pending", "accepted"].includes(params.tab)) {
      setTab(params.tab as "upcoming" | "past" | "pending" | "accepted");
    }
  }, [params.tab, fetchBookings]);

  // Refresh bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      // Update tab if param changes
      if (params.tab && ["upcoming", "past", "pending", "accepted"].includes(params.tab)) {
        setTab(params.tab as "upcoming" | "past" | "pending" | "accepted");
      }
    }, [params.tab, fetchBookings])
  );

  const renderUpcoming = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B8BFF" />
        </View>
      );
    }

    if (upcoming.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No upcoming bookings</Text>
        </View>
      );
    }

    return upcoming.map((item) => {
      const dateInfo = formatDate(item.startDate);
      const guideAvatarUri = getImageUrl(item.guide.avatar);
      
      return (
        <TouchableOpacity 
          key={item.id} 
          style={styles.card}
          onPress={() => navigateToBookingDetail(item)}
        >
          <View style={styles.dateBox}>
            <Text style={styles.date}>{dateInfo.date}</Text>
            <Text style={styles.month}>{dateInfo.month}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            {/* Header row with title and status */}
            <View style={styles.cardHeader}>
              <Text style={styles.trekTitle} numberOfLines={2}>
                {item.activity?.name || "Custom Tour"}
              </Text>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>

            {/* Guide info and cancel button row */}
            <View style={styles.guideInfoRow}>
              <View style={styles.guideInfo}>
                <Image source={{ uri: guideAvatarUri }} style={styles.guideAvatar} />
                <Text style={styles.subUser}>{item.guide.name || item.guide.username}</Text>
              </View>
              {item.status === "paid" && (
                <TouchableOpacity
                  style={[styles.cancelBtn, processingId === item.id && styles.disabledBtn]}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    handleCancel(item.id);
                  }}
                  disabled={processingId === item.id}
                >
                  {processingId === item.id ? (
                    <ActivityIndicator size="small" color="#E63946" />
                  ) : (
                    <Text style={styles.cancelText}>Cancel</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#1B8BFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      );
    });
  };

  const renderPast = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B8BFF" />
        </View>
      );
    }

    // Filter cancelled bookings to only show those cancelled within 2 hours
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    
    const filteredPast = past.filter((item) => {
      if (item.status === "cancelled" && item.cancelledAt) {
        const cancelledTime = new Date(item.cancelledAt).getTime();
        return now - cancelledTime <= twoHoursInMs;
      }
      return true;
    });

    if (filteredPast.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No past bookings</Text>
        </View>
      );
    }

    // Check if there are any cancelled bookings within 2 hours
    const cancelledBookings = filteredPast.filter((item) => item.status === "cancelled");
    const hasRecentCancellations = cancelledBookings.length > 0;

    return (
      <>
        {hasRecentCancellations && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#1B8BFF" />
            <Text style={styles.infoText}>
              Cancelled bookings are shown for 2 hours only, then automatically removed.
            </Text>
          </View>
        )}
        {filteredPast.map((item) => {
          const dateInfo = formatDate(item.startDate);
          const guideAvatarUri = getImageUrl(item.guide.avatar);
          const isCancelled = item.status === "cancelled";
          
          return (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.card, isCancelled && styles.cancelledCard]}
              onPress={() => navigateToBookingDetail(item)}
            >
              <View style={styles.dateBox}>
                <Text style={styles.date}>{dateInfo.date}</Text>
                <Text style={styles.month}>{dateInfo.month}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                {/* Header row with title and status */}
                <View style={styles.cardHeader}>
                  <Text style={styles.trekTitle} numberOfLines={2}>
                    {item.activity?.name || "Custom Tour"}
                  </Text>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>

                {/* Guide info */}
                <View style={styles.guideInfoRow}>
                  <View style={styles.guideInfo}>
                    <Image source={{ uri: guideAvatarUri }} style={styles.guideAvatar} />
                    <Text style={styles.subUser}>{item.guide.name || item.guide.username}</Text>
                  </View>
                </View>
                {isCancelled && item.cancelledAt && (
                  <Text style={styles.cancelledDate}>
                    Cancelled on {new Date(item.cancelledAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </>
    );
  };

  const renderPending = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B8BFF" />
        </View>
      );
    }

    // Only show pending status bookings (not accepted)
    const pendingBookings = pending.filter((b) => b.status === "pending");

    if (pendingBookings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No pending booking requests</Text>
        </View>
      );
    }

    return pendingBookings.map((req) => {
      const guideAvatarUri = getImageUrl(req.guide.avatar);
      const activityPhotoUri = req.activity?.photo 
        ? getImageUrl(req.activity.photo)
        : "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";

      return (
        <TouchableOpacity 
          key={req.id} 
          style={styles.requestCard}
          onPress={() => navigateToBookingDetail(req)}
        >
          <Image source={{ uri: activityPhotoUri }} style={styles.activityPhoto} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.guideInfo}>
              <Image source={{ uri: guideAvatarUri }} style={styles.guideAvatarSmall} />
              <Text style={styles.reqName}>{req.guide.name || req.guide.username}</Text>
            </View>
            <Text style={styles.reqTrek}>
              {req.activity?.name || "Custom Tour"}
            </Text>
            <Text style={styles.reqDate}>
              {formatDateRange(req.startDate, req.endDate)}
            </Text>

            <View style={styles.partyBox}>
              <Text style={styles.partyText}>
                Party of {req.participantCount}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.cancelBtn, processingId === req.id && styles.disabledBtn]}
            onPress={(e) => {
              e?.stopPropagation?.();
              handleCancel(req.id);
            }}
            disabled={processingId === req.id}
          >
            {processingId === req.id ? (
              <ActivityIndicator size="small" color="#E63946" />
            ) : (
              <Text style={styles.cancelText}>Cancel</Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      );
    });
  };

  const renderAccepted = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B8BFF" />
        </View>
      );
    }

    if (accepted.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No accepted booking requests</Text>
        </View>
      );
    }

    return accepted.map((req) => {
      const guideAvatarUri = getImageUrl(req.guide.avatar);
      const activityPhotoUri = req.activity?.photo 
        ? getImageUrl(req.activity.photo)
        : "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";
      const remaining = timeRemaining.get(req.id) || "";
      const isExpired = remaining === "Expired";
      const expiryMinutes = req.paymentExpiresAt 
        ? Math.ceil((new Date(req.paymentExpiresAt).getTime() - Date.now()) / 60000)
        : null;

      return (
        <TouchableOpacity 
          key={req.id} 
          style={[styles.requestCard, isExpired && styles.expiredCard]}
          onPress={() => navigateToBookingDetail(req)}
        >
          <Image source={{ uri: activityPhotoUri }} style={styles.activityPhoto} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.guideInfo}>
              <Image source={{ uri: guideAvatarUri }} style={styles.guideAvatarSmall} />
              <Text style={styles.reqName}>{req.guide.name || req.guide.username}</Text>
            </View>
            <Text style={styles.reqTrek}>
              {req.activity?.name || "Custom Tour"}
            </Text>
            <Text style={styles.reqDate}>
              {formatDateRange(req.startDate, req.endDate)}
            </Text>

            <View style={styles.partyBox}>
              <Text style={styles.partyText}>
                Party of {req.participantCount}
              </Text>
            </View>

            {/* Payment countdown timer */}
            {req.paymentExpiresAt && (
              <View style={[styles.countdownBox, isExpired && styles.expiredCountdownBox]}>
                <Ionicons 
                  name={isExpired ? "time-outline" : "time"} 
                  size={14} 
                  color={isExpired ? "#E63946" : "#FFA500"} 
                />
                <Text style={[styles.countdownText, isExpired && styles.expiredCountdownText]}>
                  {isExpired 
                    ? "Payment expired" 
                    : remaining 
                      ? `Payment due in: ${remaining}`
                      : expiryMinutes !== null && expiryMinutes > 0
                        ? `Payment due in: ${expiryMinutes} minutes`
                        : "Payment due soon"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonColumn}>
            <TouchableOpacity
              style={[
                styles.payBtn, 
                (isExpired || processingId === req.id) && styles.disabledBtn
              ]}
              onPress={(e) => {
                e?.stopPropagation?.();
                handleConfirmPayment(req.id);
              }}
              disabled={isExpired || processingId === req.id}
            >
              {processingId === req.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={16} color="#fff" />
                  <Text style={styles.payText}>Pay Now</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, processingId === req.id && styles.disabledBtn]}
              onPress={(e) => {
                e?.stopPropagation?.();
                handleCancel(req.id);
              }}
              disabled={processingId === req.id}
            >
              {processingId === req.id ? (
                <ActivityIndicator size="small" color="#E63946" />
              ) : (
                <Text style={styles.cancelText}>Cancel</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>My Bookings</Text>
        </View>

        <View style={styles.tabRow}>
          {["upcoming", "past", "pending", "accepted"].map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t as any)}>
              <Text style={[styles.tab, tab === t && styles.activeTabText]}>
                {t === "accepted" ? "Accepted" : t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
              {tab === t && <View style={styles.activeLine} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 20, paddingBottom: 100 }}>
          {tab === "upcoming" && renderUpcoming()}
          {tab === "past" && renderPast()}
          {tab === "pending" && renderPending()}
          {tab === "accepted" && renderAccepted()}
        </View>
      </ScrollView>

      <TouristNavbar />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    padding: 20,
  },

  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    color: "#999",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
    width: "100%",
    justifyContent: "center",
    position: "relative",
  },

  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },

  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },

  tab: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    color: "#888",
  },

  activeTabText: {
    color: "#1B8BFF",
    fontFamily: "Nunito_700Bold",
  },

  activeLine: {
    height: 3,
    backgroundColor: "#1B8BFF",
    borderRadius: 5,
    marginTop: 4,
  },

  card: {
    backgroundColor: "#F5F8FF",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  dateBox: {
    width: 55,
    height: 55,
    backgroundColor: "#1B8BFF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  date: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    fontSize: 18,
  },

  month: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    fontSize: 12,
    marginTop: -3,
  },

  trekTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#000",
    flex: 1,
    marginRight: 8,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  guideInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  guideInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  guideAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },

  guideAvatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },

  subUser: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#777",
  },

  statusText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },

  statusBox: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
    marginRight: 8,
  },

  requestCard: {
    backgroundColor: "#F5F8FF",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  activityPhoto: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },

  reqName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },

  reqTrek: {
    fontFamily: "Nunito_700Bold",
    color: "#777",
    marginTop: 4,
    fontSize: 14,
  },

  reqDate: {
    fontFamily: "Nunito_400Regular",
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },

  partyBox: {
    backgroundColor: "#E3EDFF",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 5,
    alignSelf: "flex-start",
  },

  partyText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#1B8BFF",
  },

  cancelBtn: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  cancelText: {
    fontFamily: "Nunito_700Bold",
    color: "#E63946",
    fontSize: 12,
  },

  buttonColumn: {
    flexDirection: "column",
    gap: 8,
    marginLeft: 8,
  },

  payBtn: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },

  payText: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    fontSize: 12,
  },

  countdownBox: {
    backgroundColor: "#FFF3E0",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FFA500",
  },

  expiredCountdownBox: {
    backgroundColor: "#FFEBEE",
    borderColor: "#E63946",
  },

  countdownText: {
    fontSize: 11,
    color: "#FFA500",
    fontFamily: "Nunito_700Bold",
    marginLeft: 4,
  },

  expiredCountdownText: {
    color: "#E63946",
  },

  expiredCard: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: "#E63946",
  },

  disabledBtn: {
    opacity: 0.6,
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelledCard: {
    opacity: 0.7,
    backgroundColor: "#F5F5F5",
  },

  cancelledDate: {
    fontSize: 11,
    color: "#999",
    fontFamily: "Nunito_400Regular",
    marginTop: 4,
  },

  infoBox: {
    backgroundColor: "#E3EDFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  infoText: {
    fontSize: 12,
    color: "#1B8BFF",
    fontFamily: "Nunito_400Regular",
    flex: 1,
  },
});
