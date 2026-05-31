import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { API_URL } from "../../constants/api";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import ScreenHeader from "../../components/screen-header";
import { formatUsdAmount } from "../../utils/bookingPrice";
import { SkeletonCalendarPlaceholder } from "@/components/Skeleton";

const PRIMARY = "#007BFF";
type DateStatus = "available" | "unavailable" | "booked" | "reserved";

const DEFAULT_DAILY_RATE = "45";

const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const convertISOToDateKey = (isoDate: string): string =>
  formatDateKey(new Date(`${isoDate}T00:00:00`));

const isPastDate = (date: Date): boolean => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d < t;
};

const handleAPIError = (response: Response, responseText: string): string | null => {
  if (!response.ok || responseText.trim().startsWith("<")) {
    if (response.status === 404) return "Availability API endpoint not found. Please check the server.";
    if (response.status === 401) return "Authentication failed. Please login again.";
    if (response.status === 500) return "Server error. Please try again later.";
    return `Server error (${response.status})`;
  }
  return null;
};

export default function ScheduleRatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateStatuses, setDateStatuses] = useState<Map<string, DateStatus>>(new Map());
  const [dailyRate, setDailyRate] = useState(DEFAULT_DAILY_RATE);
  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, []);

  useEffect(() => {
    initializeMonthDates();
  }, [currentMonth, currentYear]);

  const fetchAvailability = async () => {
    try {
      setFetching(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/guide/availability`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const responseText = await response.text();
      const error = handleAPIError(response, responseText);
      if (error) {
        console.error("Fetch availability error:", error);
        return;
      }

      const data = JSON.parse(responseText);
      const newStatuses = new Map<string, DateStatus>();

      const statusMaps = [
        { key: "availableDates", status: "available" as DateStatus },
        { key: "unavailableDates", status: "unavailable" as DateStatus },
        { key: "bookedDates", status: "booked" as DateStatus },
        { key: "reservedDates", status: "reserved" as DateStatus },
      ];

      statusMaps.forEach(({ key, status }) => {
        if (data[key]?.forEach) {
          data[key].forEach((isoDate: string) => {
            const dateKey = convertISOToDateKey(isoDate);
            if (status === "booked" || newStatuses.get(dateKey) !== "booked") {
              newStatuses.set(dateKey, status);
            }
          });
        }
      });

      setDateStatuses(newStatuses);

      const firstRate = Array.isArray(data.pricing) ? data.pricing[0] : null;
      if (firstRate?.price != null) {
        setDailyRate(String(firstRate.price));
      }
    } catch (error) {
      console.error("Fetch availability error:", error);
    } finally {
      setFetching(false);
    }
  };

  const initializeMonthDates = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const newStatuses = new Map<string, DateStatus>();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateKey = formatDateKey(date);
      if (!dateStatuses.has(dateKey)) {
        newStatuses.set(dateKey, "unavailable");
      }
    }
    setDateStatuses((prev) => {
      const merged = new Map(prev);
      newStatuses.forEach((value, key) => merged.set(key, value));
      return merged;
    });
  };

  const changeMonth = (dir: "prev" | "next") => {
    if (dir === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else setCurrentMonth(currentMonth - 1);
    } else if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else setCurrentMonth(currentMonth + 1);
  };

  const getDateStatus = (day: number): DateStatus => {
    const date = new Date(currentYear, currentMonth, day);
    return dateStatuses.get(formatDateKey(date)) || "unavailable";
  };

  const handleDateSelect = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const status = getDateStatus(day);
    if (status === "booked" || status === "reserved") {
      Alert.alert("Date Unavailable", "This date is already booked or reserved.");
      return;
    }
    setSelectedDate(date);
  };

  const updateDateStatus = (status: DateStatus, allMonth = false) => {
    if (!selectedDate && !allMonth) {
      Alert.alert("No Date Selected", "Tap a date on the calendar first.");
      return;
    }

    if (selectedDate && !allMonth) {
      const dateKey = formatDateKey(selectedDate);
      const currentStatus = dateStatuses.get(dateKey);
      if (currentStatus === "booked" || currentStatus === "reserved") {
        Alert.alert("Cannot Change", "This date is booked or reserved and cannot be modified.");
        return;
      }
    }

    const newMap = new Map(dateStatuses);
    if (allMonth) {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        if (isPastDate(date)) continue;
        const key = formatDateKey(date);
        const existing = newMap.get(key);
        if (existing !== "booked" && existing !== "reserved") {
          newMap.set(key, status);
        }
      }
    } else if (selectedDate) {
      newMap.set(formatDateKey(selectedDate), status);
    }

    setDateStatuses(newMap);
    Alert.alert(
      "Updated",
      allMonth
        ? `All open dates this month marked ${status === "available" ? "available" : "unavailable"}.`
        : `Date marked ${status === "available" ? "available" : "unavailable"}.`
    );
  };

  const saveDailyRate = () => {
    if (!tempRate || Number.isNaN(Number(tempRate)) || Number(tempRate) < 0) {
      Alert.alert("Invalid Rate", "Enter a valid positive number.");
      return;
    }
    setDailyRate(tempRate);
    setEditingRate(false);
    setTempRate("");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Please login again.");
        router.replace("/login");
        return;
      }

      const availableDates: string[] = [];
      const unavailableDates: string[] = [];
      dateStatuses.forEach((status, dateKey) => {
        if (status === "available") availableDates.push(dateKey);
        else if (status === "unavailable") unavailableDates.push(dateKey);
      });

      const response = await fetch(`${API_URL}/api/guide/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          availableDates,
          unavailableDates,
          pricing: [
            {
              title: "Standard Daily Rate",
              subtitle: "Base fee for guiding",
              price: parseFloat(dailyRate) || 0,
              unit: "Per Day",
            },
          ],
        }),
      });

      const responseText = await response.text();
      const error = handleAPIError(response, responseText);
      if (error) {
        Alert.alert("Error", error);
        return;
      }

      Alert.alert("Success", "Availability and daily rate saved.");
      await fetchAvailability();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getDayColor = (day: number): string => {
    const status = getDateStatus(day);
    const colors: Record<DateStatus, string> = {
      booked: "#FF4D4F",
      reserved: "#FFA500",
      available: "#22C55E",
      unavailable: "#9CA3AF",
    };
    return colors[status] || "#9CA3AF";
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const selectedLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  if (fetching) {
    return (
      <View style={styles.page}>
        <ScreenHeader
          title="Schedule & Rates"
          backIcon="arrow-back"
          onBack={() => router.push("/guide/home_guide")}
          includeTopInset
          marginBottom={16}
        />
        <View style={styles.loadingWrap}>
          <SkeletonCalendarPlaceholder />
          <Text style={styles.loadingText}>Loading availability…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Schedule & Rates"
          backIcon="arrow-back"
          onBack={() => router.push("/guide/home_guide")}
          includeTopInset
          marginBottom={16}
        />

        <Text style={styles.lead}>
          Tap a date to select it, then mark it available or unavailable. Booked dates cannot be
          changed.
        </Text>

        <View style={styles.card}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth("prev")} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {new Date(currentYear, currentMonth).toLocaleString("default", {
                month: "long",
              })}{" "}
              {currentYear}
            </Text>
            <TouchableOpacity onPress={() => changeMonth("next")} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Text key={d} style={styles.weekText}>
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
              const date = new Date(currentYear, currentMonth, day);
              const status = getDateStatus(day);
              const selected =
                selectedDate?.getDate() === day &&
                selectedDate?.getMonth() === currentMonth &&
                selectedDate?.getFullYear() === currentYear;
              const past = isPastDate(date);
              const color = getDayColor(day);
              const locked = status === "booked" || status === "reserved";

              return (
                <TouchableOpacity
                  key={day}
                  style={styles.dayCell}
                  onPress={() => !past && !locked && handleDateSelect(day)}
                  disabled={past || locked}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      selected && styles.selectedCircle,
                      past && styles.pastDayCircle,
                      status === "booked" && styles.bookedCircle,
                      status === "reserved" && styles.reservedCircle,
                      status === "available" && !selected && styles.availableCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: selected ? "#fff" : past ? "#D1D5DB" : locked ? "#fff" : color,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            {[
              { color: "#22C55E", label: "Available" },
              { color: "#9CA3AF", label: "Unavailable" },
              { color: "#FFA500", label: "Reserved" },
              { color: "#FF4D4F", label: "Booked" },
            ].map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Set availability</Text>
          {selectedLabel ? (
            <Text style={styles.selectedHint}>Selected: {selectedLabel}</Text>
          ) : (
            <Text style={styles.selectedHintMuted}>No date selected</Text>
          )}

          <View style={styles.availabilityRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnFilled]}
              onPress={() => updateDateStatus("available")}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={[styles.actionText, styles.actionTextLight]}>Available</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => updateDateStatus("unavailable")}
            >
              <Ionicons name="close-circle-outline" size={18} color={PRIMARY} />
              <Text style={styles.actionText}>Unavailable</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnFilled, styles.actionBtnFull]}
            onPress={() => updateDateStatus("available", true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={[styles.actionText, styles.actionTextLight]}>
              Mark whole month available
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily rate</Text>
          <Text style={styles.rateHint}>
            Shown to tourists when booking. Total = rate × people × days.
          </Text>

          <View style={styles.rateRow}>
            <View style={styles.rateIconWrap}>
              <Ionicons name="walk-outline" size={22} color={PRIMARY} />
            </View>
            <View style={styles.rateBody}>
              <Text style={styles.rateTitle}>Standard daily rate</Text>
              <Text style={styles.rateSubtitle}>USD per person per day</Text>
            </View>
            <View style={styles.rateEditArea}>
              {editingRate ? (
                <View style={styles.rateEditRow}>
                  <Text style={styles.rateCurrency}>$</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={tempRate}
                    onChangeText={setTempRate}
                    keyboardType="decimal-pad"
                    autoFocus
                    placeholder="0"
                  />
                  <TouchableOpacity onPress={saveDailyRate} hitSlop={8}>
                    <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingRate(false);
                      setTempRate("");
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF4D4F" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.rateDisplayBtn}
                  onPress={() => {
                    setEditingRate(true);
                    setTempRate(dailyRate);
                  }}
                >
                  <Text style={styles.rateAmount}>
                    {formatUsdAmount(parseFloat(dailyRate) || 0, { decimals: "auto" })}
                  </Text>
                  <Ionicons name="pencil" size={16} color={PRIMARY} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveText}>Save changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F2F8FF",
  },
  content: {
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    fontSize: 14,
  },
  lead: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
    color: "#111",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekText: {
    width: "14.28%",
    textAlign: "center",
    fontFamily: "Nunito_600SemiBold",
    color: "#888",
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    alignItems: "center",
    paddingVertical: 4,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCircle: {
    backgroundColor: PRIMARY,
  },
  availableCircle: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  pastDayCircle: {
    opacity: 0.45,
  },
  bookedCircle: {
    backgroundColor: "#FF4D4F",
  },
  reservedCircle: {
    backgroundColor: "#FFA500",
  },
  dayText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#666",
  },
  sectionTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#111",
    marginBottom: 8,
  },
  selectedHint: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: PRIMARY,
    marginBottom: 12,
  },
  selectedHintMuted: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#999",
    marginBottom: 12,
  },
  availabilityRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
  },
  actionBtnFilled: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  actionBtnFull: {
    flex: 0,
    width: "100%",
  },
  actionText: {
    fontFamily: "Nunito_700Bold",
    color: PRIMARY,
    fontSize: 13,
  },
  actionTextLight: {
    color: "#fff",
  },
  rateHint: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
    marginBottom: 14,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rateBody: {
    flex: 1,
    minWidth: 0,
  },
  rateTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#111",
  },
  rateSubtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  rateEditArea: {
    alignItems: "flex-end",
  },
  rateDisplayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  rateAmount: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#111",
  },
  rateEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rateCurrency: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#555",
  },
  rateInput: {
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    minWidth: 72,
    textAlign: "right",
    color: "#111",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    fontSize: 16,
  },
});
