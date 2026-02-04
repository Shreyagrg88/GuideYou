import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../../constants/api";

type DateStatus = "available" | "unavailable" | "booked" | "reserved";

// Helper functions
const formatDateKey = (year: number, month: number, day: number): string => 
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const getConsecutiveDates = (startDate: Date, days: number): Date[] => 
  Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

export default function BookingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    guideId: string; guideName: string; guideRole: string; guideLocation: string;
    guideRating: string; guideImage: string; guideCharge: string; activityId?: string; duration?: string;
  }>();

  const activityDuration = params.duration ? parseInt(params.duration, 10) : 1;
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<Date[]>([]);
  const [dateStatuses, setDateStatuses] = useState<Map<string, DateStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Array<{ title: string; subtitle: string; price: number; unit: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(1);

  const areDatesAvailable = (dates: Date[]): { available: boolean; unavailableDates: string[] } => {
    const unavailableDates: string[] = [];
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    
    for (const date of dates) {
      const dateKey = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
      const status = dateStatuses.get(dateKey);
      if (date < todayStart || status === "booked" || status === "reserved" || status === "unavailable") {
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
    } catch (error: any) {
      console.error("Fetch availability error:", error);
      Alert.alert("Error", "Failed to load availability. Please try again.");
      setDateStatuses(new Map());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.guideId) fetchAvailability(params.guideId);
    else setLoading(false);
  }, [params.guideId]);

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
    
    if (activityDuration === 1) {
      const dateKey = formatDateKey(currentYear, currentMonth, day);
      const status = dateStatuses.get(dateKey);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      
      if (status === "booked" || status === "reserved") {
        Alert.alert("Date Unavailable", "This date is already booked or reserved.");
        return;
      }
      if (status === "unavailable" || selectedDateObj < todayStart) {
        Alert.alert("Date Unavailable", status === "unavailable" ? "This date is not available." : "Please select a future date.");
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
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    return dateObj < todayStart;
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
      Alert.alert("Authentication Required", "Please login to create a booking request.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/login") },
      ]);
      return;
    }

    try {
      setSubmitting(true);
      const dateStr = selectedDateRange[0].toISOString().split('T')[0];

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
        } else {
          Alert.alert("Booking Failed", data.msg || "Failed to create booking request.");
        }
        return;
      }

      const dateRangeStr = activityDuration === 1
        ? selectedDateRange[0].toLocaleDateString()
        : `${selectedDateRange[0].toLocaleDateString()} - ${selectedDateRange[selectedDateRange.length - 1].toLocaleDateString()}`;

      Alert.alert(
        "Booking Request Sent!",
        `Your ${activityDuration === 1 ? "1 day" : `${activityDuration} days`} booking request for ${dateRangeStr} with ${count} participant(s) has been sent to ${params.guideName}. The guide will review your request.`,
        [{ text: "OK", onPress: () => router.push("/tourist/bookings_tourist?tab=pending") }]
      );
    } catch (error: any) {
      console.error("Booking request error:", error);
      Alert.alert("Error", "Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = (): string => {
    let pricePerPerson = 0;
    if (pricing.length > 0 && pricing[0].price) {
      pricePerPerson = pricing[0].price;
    } else if (params.guideCharge) {
      const priceStr = params.guideCharge.replace("$", "").replace(",", "");
      pricePerPerson = parseFloat(priceStr) || 0;
    }
    const total = pricePerPerson * count * activityDuration;
    return `$${total.toFixed(0)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Booking Detail</Text>
        </View>

        <View style={styles.profileCard}>
          <Image source={{ uri: params.guideImage || "https://i.pravatar.cc/150?img=12" }} style={styles.profileImg} />
          <View style={{ flex: 1 }}>
            <Text style={styles.guideName}>{params.guideName || "Guide Name"}</Text>
            <Text style={styles.guideInfo}>{params.guideRole || "Guide"} • {params.guideLocation || "Location"}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#f4b400" />
              <Text style={styles.ratingText}>{params.guideRating || "0.0"}</Text>
            </View>
          </View>
          <Ionicons name="checkmark-circle" size={26} color="#2ecc71" />
        </View>

        <View style={styles.calendarHeaderSection}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          {activityDuration > 1 && <Text style={styles.durationHint}>{activityDuration}-day activity - Select start date</Text>}
        </View>

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

        {activityDuration > 1 && selectedDateRange.length > 0 && (
          <View style={styles.dateRangeInfo}>
            <Text style={styles.dateRangeLabel}>
              Selected: {selectedDateRange[0].toLocaleDateString()} - {selectedDateRange[selectedDateRange.length - 1].toLocaleDateString()}
            </Text>
            <Text style={styles.dateRangeSubtext}>{activityDuration} days total</Text>
          </View>
        )}

        <View style={styles.legendRow}>
          {[
            { color: "#E63946", label: "Booked" },
            { color: "#FFA500", label: "Reserved" },
            { color: "#2ecc71", label: "Available" },
            { color: "#95a5a6", label: "Unavailable" },
          ].map(({ color, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.participantRow}>
          <Text style={styles.sectionTitle}>Participants</Text>
          <View style={styles.participantBox}>
            <TouchableOpacity onPress={() => count > 1 && setCount(count - 1)} disabled={count <= 1}>
              <Ionicons name="remove" size={20} color={count <= 1 ? "#ccc" : "#777"} />
            </TouchableOpacity>
            <Text style={styles.participantCount}>{count}</Text>
            <TouchableOpacity onPress={() => setCount(count + 1)}>
              <Ionicons name="add" size={20} color="#007BFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.line} />
      </ScrollView>

      <View style={[styles.bottomRow, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{calculateTotal()}</Text>
        </View>
        <TouchableOpacity style={[styles.bookBtn, submitting && styles.bookBtnDisabled]} onPress={handleBookRequest} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.bookBtnText}>Book Request</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#E8F2FF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#E8F2FF" },
  loadingText: { marginTop: 10, fontFamily: "Nunito_400Regular", color: "#666", fontSize: 14 },
  scrollContent: { padding: 20, paddingBottom: 140 },
  titleRow: { flexDirection: "row", alignItems: "center", marginTop: 30 },
  title: { fontSize: 20, fontFamily: "Nunito_700Bold", marginLeft: 80 },
  profileCard: { backgroundColor: "#fff", borderRadius: 12, padding: 15, flexDirection: "row", alignItems: "center", marginTop: 30, marginBottom: 30, elevation: 3 },
  profileImg: { width: 55, height: 55, borderRadius: 50, marginRight: 12 },
  guideName: { fontFamily: "Nunito_700Bold", fontSize: 16 },
  guideInfo: { fontFamily: "Nunito_400Regular", color: "#777", fontSize: 13 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  ratingText: { marginLeft: 4, fontFamily: "Nunito_400Regular", fontSize: 13 },
  calendarHeaderSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontFamily: "Nunito_700Bold", marginBottom: 5 },
  durationHint: { fontSize: 13, fontFamily: "Nunito_400Regular", color: "#007BFF", marginBottom: 5 },
  calendarBox: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 10, elevation: 3 },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  monthTitle: { fontFamily: "Nunito_700Bold", fontSize: 15 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  weekText: { width: 40, textAlign: "center", fontFamily: "Nunito_400Regular", color: "#777", fontSize: 12 },
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
  dateRangeInfo: { backgroundColor: "#E8F5E9", padding: 12, borderRadius: 8, marginTop: 10, marginBottom: 10 },
  dateRangeLabel: { fontSize: 14, fontFamily: "Nunito_700Bold", color: "#2ecc71", marginBottom: 4 },
  dateRangeSubtext: { fontSize: 12, fontFamily: "Nunito_400Regular", color: "#666" },
  legendRow: { flexDirection: "row", marginVertical: 20, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendLabel: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#666" },
  participantRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  participantBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F4FA", paddingHorizontal: 15, paddingVertical: 6, borderRadius: 50 },
  participantCount: { marginHorizontal: 15, fontFamily: "Nunito_700Bold", fontSize: 16 },
  line: { height: 1, backgroundColor: "#D9D9D9", marginVertical: 20 },
  bottomRow: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: "#eee", elevation: 5 },
  totalLabel: { fontFamily: "Nunito_400Regular", color: "#9aa0a6", fontSize: 12 },
  totalAmount: { fontFamily: "Nunito_700Bold", fontSize: 18, color: "#000" },
  bookBtn: { backgroundColor: "#007BFF", paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  bookBtnDisabled: { backgroundColor: "#95a5a6", opacity: 0.7 },
  bookBtnText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 15 },
});
