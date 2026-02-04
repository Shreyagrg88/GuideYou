import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { API_URL } from "../../constants/api";
import GuideNavbar from "../components/guide_navbar";

type Booking = {
  id: string;
  tourist: { id: string; name: string; username: string; avatar?: string };
  activity?: { id: string; name: string; photo?: string } | null;
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
};

// Helper functions
const formatDate = (dateStr: string): { date: string; month: string } => {
  const date = new Date(dateStr);
  return { date: date.getDate().toString(), month: date.toLocaleString("default", { month: "short" }).toUpperCase() };
};

const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startMonth = start.toLocaleString("default", { month: "short" });
  const endMonth = end.toLocaleString("default", { month: "short" });
  return startMonth === endMonth
    ? `${startMonth} ${start.getDate()} – ${end.getDate()}`
    : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = { paid: "#1B8BFF", accepted: "#FFA500", pending: "#FFB800", completed: "#4CAF50", cancelled: "#E63946" };
  return colors[status] || "#777";
};

const getStatusText = (status: string): string => {
  const texts: Record<string, string> = { paid: "Confirmed", accepted: "Awaiting Payment", pending: "Pending", completed: "Completed", cancelled: "Cancelled" };
  return texts[status] || status;
};

const handleAPIError = (response: Response, responseText: string, router: any): string | null => {
  if (!response.ok || responseText.trim().startsWith('<')) {
    if (response.status === 404) return "API endpoint not found. Please check the server.";
    if (response.status === 401) { router.push("/login"); return "Authentication failed. Please login again."; }
    return `Server error (${response.status})`;
  }
  return null;
};

const transformBooking = (booking: any): Booking => ({
  id: booking.id || `temp-${Date.now()}-${Math.random()}`,
  tourist: { id: booking.tourist?.id || "", name: booking.tourist?.name || "", username: booking.tourist?.username || "", avatar: booking.tourist?.avatar },
  activity: booking.activity ? { id: booking.activity.id || "", name: booking.activity.name || "", photo: booking.activity.photo } : null,
  startDate: booking.startDate || booking.dateRange?.split(' – ')[0] || "",
  endDate: booking.endDate || booking.dateRange?.split(' – ')[1] || "",
  duration: booking.duration || 1,
  participantCount: booking.participantCount || 1,
  price: booking.price || 0,
  status: booking.status || "pending",
  notes: booking.notes,
  requestedAt: booking.requestedAt || new Date().toISOString(),
  acceptedAt: booking.acceptedAt,
  paidAt: booking.paidAt,
  paymentExpiresAt: booking.paymentExpiresAt,
});

export default function BookingRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<"upcoming" | "past" | "requests">((params.tab as any) || "requests");
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<Booking[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) { Alert.alert("Error", "Please login again."); router.push("/login"); return; }

      const response = await fetch(`${API_URL}/api/guide/bookings`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const responseText = await response.text();
      const isHTML = responseText.trim().startsWith('<');

      if (!response.ok || isHTML) {
        if (response.status === 404) {
          try {
            const homepageResponse = await fetch(`${API_URL}/api/guide/homepage`, {
              method: "GET",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });

            const homepageText = await homepageResponse.text();
            if (homepageResponse.ok && !homepageText.trim().startsWith('<')) {
              const homepageData = JSON.parse(homepageText);
              const now = new Date(); now.setHours(0, 0, 0, 0);
              const upcomingBookings: Booking[] = [];
              const requestBookings: Booking[] = [];

              if (homepageData.newRequests?.forEach) {
                homepageData.newRequests.forEach((booking: any) => requestBookings.push(transformBooking({ ...booking, status: "pending" })));
              }

              if (homepageData.upcomingBookings?.forEach) {
                homepageData.upcomingBookings.forEach((booking: any) => {
                  const startDate = new Date(booking.startDate || booking.dateRange?.split(' – ')[0]);
                  startDate.setHours(0, 0, 0, 0);
                  if (booking.status === "confirmed" && startDate >= now) {
                    upcomingBookings.push(transformBooking({ ...booking, status: booking.status || "confirmed" }));
                  }
                });
              }

              setUpcoming(upcomingBookings);
              setPast([]);
              setRequests(requestBookings);
              return;
            }
          } catch (fallbackError: any) {
            console.error("Homepage fallback error:", fallbackError);
          }
        } else if (response.status === 401) {
          Alert.alert("Error", "Authentication failed. Please login again.");
          router.push("/login");
          return;
        }
        setUpcoming([]);
        setPast([]);
        setRequests([]);
        return;
      }

      const data = JSON.parse(responseText);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const upcomingBookings: Booking[] = [];
      const pastBookings: Booking[] = [];
      const requestBookings: Booking[] = [];

      if (data.bookings?.forEach) {
        data.bookings.forEach((booking: Booking) => {
          const startDate = new Date(booking.startDate);
          startDate.setHours(0, 0, 0, 0);

          if (booking.status === "pending" || booking.status === "accepted") {
            requestBookings.push(booking);
          } else if (booking.status === "paid" && startDate >= now) {
            upcomingBookings.push(booking);
          } else if (booking.status === "completed" || (booking.status === "paid" && startDate < now)) {
            pastBookings.push(booking);
          }
        });
      }

      setUpcoming(upcomingBookings);
      setPast(pastBookings);
      setRequests(requestBookings);
    } catch (error: any) {
      if (!error.message?.includes("404") && !error.message?.includes("endpoint not found")) {
        console.error("Fetch bookings error:", error);
      }
      setUpcoming([]);
      setPast([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleBookingAction = async (bookingId: string, action: "accept" | "reject") => {
    if (action === "reject") {
      Alert.alert("Reject Booking", "Are you sure you want to reject this booking request?", [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: () => performBookingAction(bookingId, action) },
      ]);
      return;
    }
    performBookingAction(bookingId, action);
  };

  const performBookingAction = async (bookingId: string, action: "accept" | "reject") => {
    try {
      setProcessingId(bookingId);
      const token = await AsyncStorage.getItem("token");
      if (!token) { Alert.alert("Error", "Please login again."); router.push("/login"); return; }

      const response = await fetch(`${API_URL}/api/guide/bookings/${bookingId}/${action}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const responseText = await response.text();
      const error = handleAPIError(response, responseText, router);
      if (error) { Alert.alert("Error", error); return; }

      const data = JSON.parse(responseText);
      Alert.alert("Success", action === "accept" ? "Booking request accepted. Tourist has 30 minutes to complete payment." : "Booking request rejected");
      await fetchBookings();
    } catch (error: any) {
      console.error(`${action} booking error:`, error);
      Alert.alert("Error", `Failed to ${action} booking. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchBookings();
    if (params.tab && ["upcoming", "past", "requests"].includes(params.tab)) {
      setTab(params.tab as any);
    }
  }, [params.tab, fetchBookings]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      if (params.tab && ["upcoming", "past", "requests"].includes(params.tab)) {
        setTab(params.tab as any);
      }
    }, [params.tab, fetchBookings])
  );

  const renderBookingCard = (item: Booking, showChevron = false) => {
    const dateInfo = formatDate(item.startDate);
    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.dateBox}>
          <Text style={styles.date}>{dateInfo.date}</Text>
          <Text style={styles.month}>{dateInfo.month}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.trekTitle}>{item.activity?.name || "Custom Tour"}</Text>
          <Text style={styles.subUser}>{item.tourist.name || item.tourist.username}</Text>
        </View>
        {showChevron ? (
          <View style={styles.statusBox}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusText(item.status)}</Text>
          </View>
        ) : (
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusText(item.status)}</Text>
        )}
        {showChevron && <Ionicons name="chevron-forward" size={22} color="#1B8BFF" />}
      </View>
    );
  };

  const renderUpcoming = () => {
    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1B8BFF" /></View>;
    if (upcoming.length === 0) return <View style={styles.emptyContainer}><Text style={styles.emptyText}>No upcoming bookings</Text></View>;
    return upcoming.map((item) => renderBookingCard(item, true));
  };

  const renderPast = () => {
    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1B8BFF" /></View>;
    if (past.length === 0) return <View style={styles.emptyContainer}><Text style={styles.emptyText}>No past bookings</Text></View>;
    return past.map((item) => renderBookingCard(item, false));
  };

  const renderRequests = () => {
    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1B8BFF" /></View>;
    if (requests.length === 0) return <View style={styles.emptyContainer}><Text style={styles.emptyText}>No pending booking requests</Text></View>;

    // Separate pending and accepted bookings
    const pendingBookings = requests.filter((req) => req.status === "pending");
    const acceptedBookings = requests.filter((req) => req.status === "accepted");

    return (
      <>
        {/* Show accepted bookings with "Awaiting Payment" status */}
        {acceptedBookings.length > 0 && (
          <>
            {acceptedBookings.length > 0 && pendingBookings.length > 0 && (
              <Text style={styles.sectionSubtitle}>Awaiting Payment</Text>
            )}
            {acceptedBookings.map((req) => {
              const avatarUri = req.tourist.avatar
                ? req.tourist.avatar.startsWith("http") ? req.tourist.avatar : `${API_URL}${req.tourist.avatar}`
                : `https://i.pravatar.cc/300?img=${req.tourist.id.slice(-2)}`;

              return (
                <View key={req.id} style={styles.requestCard}>
                  <Image source={{ uri: avatarUri }} style={styles.profilePic} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.reqName}>{req.tourist.name || req.tourist.username}</Text>
                    <Text style={styles.reqTrek}>{req.activity?.name || "Custom Tour"}</Text>
                    <Text style={styles.reqDate}>{formatDateRange(req.startDate, req.endDate)}</Text>
                    <View style={styles.partyBox}>
                      <Text style={styles.partyText}>Party of {req.participantCount}</Text>
                    </View>
                  </View>
                  <View style={styles.statusBox}>
                    <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                      {getStatusText(req.status)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Show pending bookings with Accept/Reject buttons */}
        {pendingBookings.length > 0 && (
          <>
            {acceptedBookings.length > 0 && pendingBookings.length > 0 && (
              <Text style={styles.sectionSubtitle}>Pending Requests</Text>
            )}
            {pendingBookings.map((req) => {
              const avatarUri = req.tourist.avatar
                ? req.tourist.avatar.startsWith("http") ? req.tourist.avatar : `${API_URL}${req.tourist.avatar}`
                : `https://i.pravatar.cc/300?img=${req.tourist.id.slice(-2)}`;

              return (
                <View key={req.id} style={styles.requestCard}>
                  <Image source={{ uri: avatarUri }} style={styles.profilePic} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.reqName}>{req.tourist.name || req.tourist.username}</Text>
                    <Text style={styles.reqTrek}>{req.activity?.name || "Custom Tour"}</Text>
                    <Text style={styles.reqDate}>{formatDateRange(req.startDate, req.endDate)}</Text>
                    <View style={styles.partyBox}>
                      <Text style={styles.partyText}>Party of {req.participantCount}</Text>
                    </View>
                  </View>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.rejectBtn, processingId === req.id && styles.disabledBtn]}
                      onPress={() => handleBookingAction(req.id, "reject")}
                      disabled={processingId === req.id}
                    >
                      {processingId === req.id ? <ActivityIndicator size="small" color="#E63946" /> : <Text style={styles.rejectText}>Reject</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.acceptBtn, processingId === req.id && styles.disabledBtn]}
                      onPress={() => handleBookingAction(req.id, "accept")}
                      disabled={processingId === req.id}
                    >
                      {processingId === req.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptText}>Accept</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Booking Detail</Text>
        </View>

        <View style={styles.tabRow}>
          {["upcoming", "past", "requests"].map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t as any)}>
              <Text style={[styles.tab, tab === t && styles.activeTabText]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              {tab === t && <View style={styles.activeLine} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 20, paddingBottom: 100 }}>
          {tab === "upcoming" && renderUpcoming()}
          {tab === "past" && renderPast()}
          {tab === "requests" && renderRequests()}
        </View>
      </ScrollView>
      <GuideNavbar />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20 },
  loadingContainer: { padding: 40, alignItems: "center", justifyContent: "center" },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 16, fontFamily: "Nunito_400Regular", color: "#999" },
  titleRow: { flexDirection: "row", alignItems: "center", marginTop: 30, marginBottom: 30, width: "100%", justifyContent: "center", position: "relative" },
  title: { fontSize: 20, fontFamily: "Nunito_700Bold", textAlign: "center" },
  tabRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 5 },
  tab: { fontSize: 16, fontFamily: "Nunito_400Regular", color: "#888" },
  activeTabText: { color: "#1B8BFF", fontFamily: "Nunito_700Bold" },
  activeLine: { height: 3, backgroundColor: "#1B8BFF", borderRadius: 5, marginTop: 4 },
  card: { backgroundColor: "#F5F8FF", borderRadius: 12, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 15 },
  dateBox: { width: 55, height: 55, backgroundColor: "#1B8BFF", borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  date: { fontFamily: "Nunito_700Bold", color: "#fff", fontSize: 18 },
  month: { fontFamily: "Nunito_700Bold", color: "#fff", fontSize: 12, marginTop: -3 },
  trekTitle: { fontFamily: "Nunito_700Bold", fontSize: 16 },
  subUser: { fontFamily: "Nunito_400Regular", fontSize: 14, color: "#777" },
  statusText: { fontFamily: "Nunito_700Bold" },
  statusBox: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: "flex-start", marginBottom: 8, marginRight: 8 },
  requestCard: { backgroundColor: "#F5F8FF", borderRadius: 12, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 15 },
  profilePic: { width: 55, height: 55, borderRadius: 30 },
  reqName: { fontFamily: "Nunito_700Bold", fontSize: 16 },
  reqTrek: { fontFamily: "Nunito_700Bold", color: "#777", marginTop: -2 },
  reqDate: { fontFamily: "Nunito_400Regular", color: "#999", fontSize: 12 },
  partyBox: { backgroundColor: "#E3EDFF", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, marginTop: 5, alignSelf: "flex-start" },
  partyText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: "#1B8BFF" },
  buttonRow: { flexDirection: "column", gap: 8, marginLeft: 8 },
  acceptBtn: { backgroundColor: "#1B8BFF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, minWidth: 70, alignItems: "center" },
  acceptText: { fontFamily: "Nunito_700Bold", color: "#fff", fontSize: 12 },
  rejectBtn: { backgroundColor: "#FFEBEE", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, minWidth: 70, alignItems: "center" },
  rejectText: { fontFamily: "Nunito_700Bold", color: "#E63946", fontSize: 12 },
  disabledBtn: { opacity: 0.6 },
  sectionSubtitle: { fontSize: 14, fontFamily: "Nunito_700Bold", color: "#666", marginTop: 10, marginBottom: 5 },
});
