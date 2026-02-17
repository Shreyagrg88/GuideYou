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
  const [participantCount, setParticipantCount] = useState(1);
  const [tourName, setTourName] = useState("");
  const [location, setLocation] = useState("");
  const [noteToGuide, setNoteToGuide] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mock pricing for frontend-only (will be replaced with API later)
  const mockPricePerPerson = params.guideCharge
    ? parseFloat(params.guideCharge.replace("$", "").replace("/day", "").replace(",", "")) || 50
    : 50;

  // Mock date statuses for frontend demo (will be replaced with API later)
  useEffect(() => {
    const mockStatuses = new Map<string, DateStatus>();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Mark some dates as booked/reserved for demo
    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(todayStart);
      checkDate.setDate(checkDate.getDate() + i);
      const key = formatDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

      // Mock: mark some dates as unavailable
      if (i % 7 === 0) {
        mockStatuses.set(key, "booked");
      } else if (i % 9 === 0) {
        mockStatuses.set(key, "reserved");
      } else if (i % 11 === 0) {
        mockStatuses.set(key, "unavailable");
      } else {
        mockStatuses.set(key, "available");
      }
    }
    setDateStatuses(mockStatuses);
  }, []);

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

  const isStartDate = (day: number): boolean => {
    if (!startDate) return false;
    return (
      startDate.getDate() === day &&
      startDate.getMonth() === currentMonth &&
      startDate.getFullYear() === currentYear
    );
  };

  const isEndDate = (day: number): boolean => {
    if (!endDate) return false;
    return (
      endDate.getDate() === day &&
      endDate.getMonth() === currentMonth &&
      endDate.getFullYear() === currentYear
    );
  };

  const isInRange = (day: number): boolean => {
    if (selectedDateRange.length <= 1) return false;
    const checkDate = new Date(currentYear, currentMonth, day);
    return selectedDateRange.some(
      (date) =>
        date.getDate() === checkDate.getDate() &&
        date.getMonth() === checkDate.getMonth() &&
        date.getFullYear() === checkDate.getFullYear()
    );
  };

  const calculateTotal = (): string => {
    const days = selectedDateRange.length || 1;
    const total = mockPricePerPerson * days * participantCount;
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

  const handleSubmitRequest = () => {
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

    // Frontend only - just show success message
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        "Request Sent!",
        "Your custom tour request has been sent to the guide. They will review and respond soon.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }, 1000);
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

            <View style={styles.calendarBox}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeMonth("prev")}>
                  <Ionicons name="chevron-back" size={20} color="#007BFF" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {new Date(currentYear, currentMonth).toLocaleString("default", {
                    month: "long",
                  })}{" "}
                  {currentYear}
                </Text>
                <TouchableOpacity onPress={() => changeMonth("next")}>
                  <Ionicons name="chevron-forward" size={20} color="#007BFF" />
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
                  const isStart = isStartDate(day);
                  const isEnd = isEndDate(day);
                  const inRange = isInRange(day);
                  const isBooked = dateStatus === "booked";
                  const isReserved = dateStatus === "reserved";
                  const isUnavailable = dateStatus === "unavailable" || isPast;
                  const isAvailable = dateStatus === "available" && !isPast;

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
                          (isStart || isEnd) && styles.selectedCircle,
                          inRange && !isStart && !isEnd && styles.inRangeCircle,
                          isAvailable && !isStart && !isEnd && !inRange && styles.availableCircle,
                          isBooked && styles.bookedCircle,
                          isReserved && styles.reservedCircle,
                          isUnavailable && !isPast && styles.unavailableCircle,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isPast && styles.pastText,
                            isBooked && styles.bookedText,
                            isReserved && styles.reservedText,
                            isUnavailable && !isPast && styles.unavailableText,
                            isAvailable && !isStart && !isEnd && !inRange && styles.availableText,
                            (isStart || isEnd) && styles.selectedText,
                            inRange && !isStart && !isEnd && styles.inRangeText,
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

            {/* Selected Range Display */}
            {startDate && (
              <View style={styles.dateSelectionInfo}>
                <Text style={styles.dateSelectionText}>
                  {endDate
                    ? `${formatDateForSummary(startDate)} - ${formatDateForSummary(endDate)} (${
                        selectedDateRange.length
                      } ${selectedDateRange.length === 1 ? "day" : "days"})`
                    : `Start: ${formatDateForSummary(startDate)} - Select end date`}
                </Text>
                {!endDate && (
                  <Text style={styles.hintText}>Click another date to set end date</Text>
                )}
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
  inRangeCircle: { backgroundColor: "#E3F2FD" },
  availableCircle: { backgroundColor: "#E8F5E9", borderWidth: 1, borderColor: "#2ecc71" },
  bookedCircle: { backgroundColor: "#FFEBEE", borderWidth: 1, borderColor: "#E63946" },
  reservedCircle: { backgroundColor: "#FFF3E0", borderWidth: 1, borderColor: "#FFA500" },
  unavailableCircle: { backgroundColor: "#F5F5F5" },
  dayText: { fontFamily: "Nunito_400Regular", fontSize: 14 },
  selectedText: { color: "#fff", fontFamily: "Nunito_700Bold" },
  inRangeText: { color: "#007BFF", fontFamily: "Nunito_400Regular" },
  availableText: { color: "#2ecc71" },
  bookedText: { color: "#E63946" },
  reservedText: { color: "#FFA500" },
  unavailableText: { color: "#95a5a6" },
  pastText: { color: "#ccc" },
  dateSelectionInfo: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  dateSelectionText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#2ecc71",
    marginBottom: 4,
  },
  hintText: {
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
