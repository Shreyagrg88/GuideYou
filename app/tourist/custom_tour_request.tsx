import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../constants/api";

type DateStatus = "available" | "unavailable" | "booked" | "reserved";

// Helper functions
const formatDateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const getConsecutiveDates = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CustomTourRequest() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    guideId?: string;
    guideName?: string;
    guideImage?: string;
    guideRole?: string;
    guideLocation?: string;
    guideRating?: string;
    guideCharge?: string;
  }>();

  const today = new Date();
  const [step, setStep] = useState<1 | 2>(1);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<Date[]>([]);
  const [dateStatuses, setDateStatuses] = useState<Map<string, DateStatus>>(new Map());
  const [pricePerPerson, setPricePerPerson] = useState<number>(50);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [tourName, setTourName] = useState("");
  const [location, setLocation] = useState("");
  const [noteToGuide, setNoteToGuide] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch guide availability and pricing (same API shape as booking.tsx)
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!params.guideId) return;

      setAvailabilityLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/api/tourist/guides/${params.guideId}/availability`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          Alert.alert("Error", data.msg || "Failed to load availability.");
          setDateStatuses(new Map());
          setAvailabilityLoading(false);
          return;
        }

        // Pricing: support perPersonPerDay or fallback from params
        if (data.pricing?.perPersonPerDay != null) {
          setPricePerPerson(Number(data.pricing.perPersonPerDay));
        } else if (Array.isArray(data.pricing) && data.pricing[0]?.price != null) {
          setPricePerPerson(Number(data.pricing[0].price));
        } else if (params.guideCharge) {
          const parsed = parseFloat(
            params.guideCharge.replace("$", "").replace("/day", "").replace(",", "")
          );
          if (!isNaN(parsed)) setPricePerPerson(parsed);
        }

        // Build date status map from API arrays (same format as booking.tsx)
        // Priority: reserved > booked > unavailable > available
        const statusMap = new Map<string, DateStatus>();
        const statusSources: Array<{ key: string; status: DateStatus }> = [
          { key: "availableDates", status: "available" },
          { key: "unavailableDates", status: "unavailable" },
          { key: "bookedDates", status: "booked" },
          { key: "reservedDates", status: "reserved" },
        ];

        statusSources.forEach(({ key, status }) => {
          const dates = data[key];
          if (!Array.isArray(dates)) return;
          dates.forEach((dateStr: string) => {
            if (typeof dateStr !== "string") return;
            const current = statusMap.get(dateStr);
            const canSet =
              status === "booked" ||
              (status === "reserved" && current !== "booked") ||
              !current ||
              current === "available";
            if (canSet) statusMap.set(dateStr, status);
          });
        });

        setDateStatuses(statusMap);
      } catch (error) {
        console.error("Error fetching availability:", error);
        Alert.alert("Error", "Failed to load availability. Please try again.");
        setDateStatuses(new Map());
        if (params.guideCharge) {
          const parsed = parseFloat(
            params.guideCharge.replace("$", "").replace("/day", "").replace(",", "")
          );
          if (!isNaN(parsed)) setPricePerPerson(parsed);
        }
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [params.guideId]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const changeMonth = (dir: "prev" | "next") => {
    if (dir === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
    // Don't clear selection when changing month
  };

  const handleDateSelect = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const status = dateStatuses.get(dateKey);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Validation: can't select past, booked, reserved dates
    if (clickedDate < todayStart) {
      Alert.alert("Date Unavailable", "Please select a future date.");
      return;
    }
    if (status === "booked" || status === "reserved") {
      Alert.alert("Date Unavailable", "This date is already booked or reserved.");
      return;
    }
    if (status === "unavailable") {
      Alert.alert("Date Unavailable", "This date is not available.");
      return;
    }

    // If no start date selected, set it as start
    if (!startDate) {
      setStartDate(clickedDate);
      setEndDate(null);
      setSelectedDateRange([clickedDate]);
      return;
    }

    // If clicking same date as start (single day selection)
    if (
      clickedDate.getDate() === startDate.getDate() &&
      clickedDate.getMonth() === startDate.getMonth() &&
      clickedDate.getFullYear() === startDate.getFullYear()
    ) {
      setEndDate(null);
      setSelectedDateRange([clickedDate]);
      return;
    }

    // If clicking before start date, reset to new start
    if (clickedDate < startDate) {
      setStartDate(clickedDate);
      setEndDate(null);
      setSelectedDateRange([clickedDate]);
      return;
    }

    // If clicking after start date, set as end date and validate range
    const range = getConsecutiveDates(startDate, clickedDate);
    const unavailableDates: string[] = [];

    for (const date of range) {
      const key = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
      const dateStatus = dateStatuses.get(key);
      if (
        date < todayStart ||
        dateStatus === "booked" ||
        dateStatus === "reserved" ||
        dateStatus === "unavailable"
      ) {
        unavailableDates.push(key);
      }
    }

    if (unavailableDates.length > 0) {
      Alert.alert(
        "Dates Unavailable",
        "Some dates in this range are not available. Please select a different range."
      );
      return;
    }

    setEndDate(clickedDate);
    setSelectedDateRange(range);
  };

  const getDateStatus = (day: number): DateStatus | null => {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    return dateStatuses.get(dateKey) || null;
  };

  const isDateInPast = (day: number): boolean => {
    const dateObj = new Date(currentYear, currentMonth, day);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return dateObj < todayStart;
  };

  const isDateSelected = (day: number): boolean => {
    if (selectedDateRange.length === 0) return false;
    const checkDate = new Date(currentYear, currentMonth, day);
    return selectedDateRange.some(
      (date) =>
        date.getDate() === checkDate.getDate() &&
        date.getMonth() === checkDate.getMonth() &&
        date.getFullYear() === checkDate.getFullYear()
    );
  };

  const isStartDate = (day: number): boolean =>
    selectedDateRange.length > 0 &&
    selectedDateRange[0].getDate() === day &&
    selectedDateRange[0].getMonth() === currentMonth &&
    selectedDateRange[0].getFullYear() === currentYear;

  const isEndDate = (day: number): boolean =>
    selectedDateRange.length > 0 &&
    selectedDateRange[selectedDateRange.length - 1].getDate() === day &&
    selectedDateRange[selectedDateRange.length - 1].getMonth() === currentMonth &&
    selectedDateRange[selectedDateRange.length - 1].getFullYear() === currentYear;

  const calculateTotal = (): string => {
    const days = selectedDateRange.length || 1;
    const total = pricePerPerson * days * participantCount;
    return `$${total.toFixed(0)}`;
  };

  const handleNext = () => {
    if (!startDate) {
      Alert.alert("Select Date", "Please select a start date.");
      return;
    }
    if (!endDate) {
      Alert.alert("Select Date", "Please select an end date.");
      return;
    }
    if (participantCount < 1) {
      Alert.alert("Invalid", "Please select at least 1 participant.");
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      router.back();
    }
  };

  const handleSubmitRequest = async () => {
    if (!tourName.trim()) {
      Alert.alert("Required Field", "Please enter the name of the tour.");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Required Field", "Please enter the location.");
      return;
    }
    if (noteToGuide.length > 500) {
      Alert.alert("Invalid", "Note to guide cannot exceed 500 characters.");
      return;
    }
    if (!params.guideId) {
      Alert.alert("Error", "Guide ID is missing. Please try again.");
      return;
    }
    if (selectedDateRange.length === 0) {
      Alert.alert("Error", "Please select dates for your tour.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Authentication Required", "Please log in to send a tour request.");
        setSubmitting(false);
        return;
      }

      const requestBody = {
        guideId: params.guideId,
        startDate: formatDateForAPI(selectedDateRange[0]),
        endDate: formatDateForAPI(selectedDateRange[selectedDateRange.length - 1]),
        participantCount: participantCount,
        tourName: tourName.trim(),
        location: location.trim(),
        noteToGuide: noteToGuide.trim() || undefined,
      };

      const response = await fetch(`${API_URL}/api/tourist/custom-tour-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.msg || errorData.message || "Failed to send tour request");
      }

      await response.json();

      Alert.alert(
        "Request Sent!",
        "Your custom tour request has been sent to the guide. They will review and respond soon.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error("Error submitting tour request:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to send tour request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateForSummary = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color="#007BFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Custom Tour Request</Text>
        </View>

        {/* Guide Info Card */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri:
                params.guideImage?.startsWith("http")
                  ? params.guideImage
                  : params.guideImage
                    ? `${API_URL}${params.guideImage}`
                    : "https://i.pravatar.cc/150?img=12",
            }}
            style={styles.profileImg}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.guideName}>{params.guideName || "Guide Name"}</Text>
            <Text style={styles.guideInfo}>
              {params.guideRole || "Guide"} • {params.guideLocation || "Location"}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#f4b400" />
              <Text style={styles.ratingText}>{params.guideRating || "0.0"}</Text>
            </View>
          </View>
          <Ionicons name="checkmark-circle" size={26} color="#2ecc71" />
        </View>

        {step === 1 ? (
          <>
            {/* Step 1: Date Selection */}
            <View style={styles.calendarHeaderSection}>
              <Text style={styles.sectionTitle}>Select Date</Text>
            </View>

            {availabilityLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>Loading availability...</Text>
              </View>
            ) : (
              <View style={styles.calendarBox}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeMonth("prev")}>
                  <Ionicons name="chevron-back" size={20} color="#555" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {new Date(currentYear, currentMonth).toLocaleString("default", {
                    month: "long",
                  })}{" "}
                  {currentYear}
                </Text>
                <TouchableOpacity onPress={() => changeMonth("next")}>
                  <Ionicons name="chevron-forward" size={20} color="#555" />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, index) => (
                  <Text key={`week-${index}`} style={styles.weekText}>
                    {d}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}
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
                          isStart && selectedDateRange.length > 1 && styles.startDateCircle,
                          isEnd && selectedDateRange.length > 1 && styles.endDateCircle,
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
            )}

            {/* Selected Range Display */}
            {selectedDateRange.length > 0 && (
              <View style={styles.dateRangeInfo}>
                <Text style={styles.dateRangeLabel}>
                  Selected:{" "}
                  {selectedDateRange[0].toLocaleDateString()} -{" "}
                  {selectedDateRange[selectedDateRange.length - 1].toLocaleDateString()}
                </Text>
                <Text style={styles.dateRangeSubtext}>
                  {selectedDateRange.length}{" "}
                  {selectedDateRange.length === 1 ? "day" : "days"} total
                </Text>
              </View>
            )}

            {/* Availability Legend */}
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

            {/* Participants */}
            <View style={styles.participantRow}>
              <Text style={styles.sectionTitle}>Participants</Text>
              <View style={styles.participantBox}>
                <TouchableOpacity
                  onPress={() => participantCount > 1 && setParticipantCount(participantCount - 1)}
                  disabled={participantCount <= 1}
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={participantCount <= 1 ? "#ccc" : "#007BFF"}
                  />
                </TouchableOpacity>
                <Text style={styles.participantCount}>{participantCount}</Text>
                <TouchableOpacity onPress={() => setParticipantCount(participantCount + 1)}>
                  <Ionicons name="add" size={20} color="#007BFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.line} />
          </>
        ) : (
          <>
            {/* Step 2: Form */}
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                Date:{" "}
                {startDate && endDate
                  ? `${formatDateForSummary(startDate)} - ${formatDateForSummary(endDate)}`
                  : startDate
                    ? formatDateForSummary(startDate)
                    : "—"}
              </Text>
              <Text style={styles.summaryText}>
                Duration: {selectedDateRange.length}{" "}
                {selectedDateRange.length === 1 ? "day" : "days"}
              </Text>
              <Text style={styles.summaryText}>Total: {calculateTotal()}</Text>
              <Text style={styles.summaryText}>Participants: {participantCount}</Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              {/* Tour Name */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="document-text-outline" size={18} color="#007BFF" />
                  <Text style={styles.inputLabel}>Name of the tour</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter tour name"
                  value={tourName}
                  onChangeText={setTourName}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Location */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="location-outline" size={18} color="#007BFF" />
                  <Text style={styles.inputLabel}>Location</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter location"
                  value={location}
                  onChangeText={setLocation}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Note to Guide */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="list-outline" size={18} color="#007BFF" />
                  <Text style={styles.inputLabel}>Note to guide</Text>
                </View>
                <TextInput
                  style={styles.multilineInput}
                  placeholder="Share special requirements, dietary needs, or pick-up preferences..."
                  value={noteToGuide}
                  onChangeText={setNoteToGuide}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  placeholderTextColor="#999"
                  textAlignVertical="top"
                />
                <Text style={styles.charCounter}>
                  {noteToGuide.length}/500
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomRow, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {step === 1 ? (
          <>
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{calculateTotal()}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.nextBtn,
                (!startDate || !endDate || participantCount < 1) && styles.nextBtnDisabled,
              ]}
              onPress={handleNext}
              disabled={!startDate || !endDate || participantCount < 1}
            >
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, submitting && styles.sendBtnDisabled]}
            onPress={handleSubmitRequest}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Send Request</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#E8F2FF" },
  scrollContent: { padding: 20, paddingBottom: 140 },
  titleRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 30,
    position: "relative",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 0,
    zIndex: 1,
  },
  title: { 
    fontSize: 20, 
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    flex: 1,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
    elevation: 3,
  },
  profileImg: { width: 55, height: 55, borderRadius: 50, marginRight: 12 },
  guideName: { fontFamily: "Nunito_700Bold", fontSize: 16 },
  guideInfo: { fontFamily: "Nunito_400Regular", color: "#777", fontSize: 13 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  ratingText: { marginLeft: 4, fontFamily: "Nunito_400Regular", fontSize: 13 },
  calendarHeaderSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontFamily: "Nunito_700Bold", marginBottom: 5 },
  calendarBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 3,
  },
  loadingContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 40,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#666",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthTitle: { fontFamily: "Nunito_700Bold", fontSize: 15 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  weekText: {
    width: 40,
    textAlign: "center",
    fontFamily: "Nunito_400Regular",
    color: "#777",
    fontSize: 12,
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", alignItems: "center", marginVertical: 4 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
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
  startDateCircle: {
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  endDateCircle: {
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  dateRangeInfo: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  dateRangeLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#2ecc71",
    marginBottom: 4,
  },
  dateRangeSubtext: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
  },
  legendRow: { flexDirection: "row", marginVertical: 20, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendLabel: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#666" },
  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  participantBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F4FA",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 50,
  },
  participantCount: { marginHorizontal: 15, fontFamily: "Nunito_700Bold", fontSize: 16 },
  line: { height: 1, backgroundColor: "#D9D9D9", marginVertical: 20 },
  bottomRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#eee",
    elevation: 5,
  },
  totalLabel: { fontFamily: "Nunito_400Regular", color: "#9aa0a6", fontSize: 12 },
  totalAmount: { fontFamily: "Nunito_700Bold", fontSize: 18, color: "#000" },
  nextBtn: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  nextBtnDisabled: { backgroundColor: "#95a5a6", opacity: 0.7 },
  nextBtnText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 15 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#333",
    marginBottom: 8,
  },
  formSection: { marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#333",
  },
  textInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  multilineInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 100,
  },
  charCounter: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  sendBtn: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#95a5a6", opacity: 0.7 },
  sendBtnText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 15 },
});
