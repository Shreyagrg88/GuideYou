import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BookingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [month, setMonth] = useState(11); // December
  const [year, setYear] = useState(2025);
  const [selectedDate, setSelectedDate] = useState<number | null>(22);
  const [count, setCount] = useState(1);

  const unavailableDates = [3, 4, 10, 11, 12];
  const availableDates = [1, 6, 13, 20, 23, 24, 25, 26];

  const getDaysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <View style={styles.page}>
      {/* SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Booking Detail</Text>
        </View>

        {/* Guide Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: "https://i.pravatar.cc/150?img=12" }}
            style={styles.profileImg}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.guideName}>Nema Sherpa</Text>
            <Text style={styles.guideInfo}>Trek Guide • Pokhara</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#f4b400" />
              <Text style={styles.ratingText}>4.5</Text>
            </View>
          </View>
          <Ionicons name="checkmark-circle" size={26} color="#2ecc71" />
        </View>

        {/* Calendar */}
        <Text style={styles.sectionTitle}>Select Date</Text>

        <View style={styles.calendarBox}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handlePrevMonth}>
              <Ionicons name="chevron-back" size={20} color="#555" />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>
              {new Date(year, month).toLocaleString("default", {
                month: "long",
              })}{" "}
              {year}
            </Text>

            <TouchableOpacity onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={20} color="#555" />
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
              const isSelected = selectedDate === day;
              const isUnavailable = unavailableDates.includes(day);
              const isAvailable = availableDates.includes(day);

              return (
                <TouchableOpacity
                  key={day}
                  style={styles.dayCell}
                  onPress={() => !isUnavailable && setSelectedDate(day)}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && styles.selectedCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isUnavailable && { color: "red" },
                        isAvailable && { color: "green" },
                        isSelected && { color: "#fff" },
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

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "red" }]} />
            <Text style={styles.legendLabel}>Booked</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "green" }]} />
            <Text style={styles.legendLabel}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "black" }]} />
            <Text style={styles.legendLabel}>Unavailable</Text>
          </View>
        </View>

        {/* Participants */}
        <View style={styles.participantRow}>
          <Text style={styles.sectionTitle}>Participants</Text>
          <View style={styles.participantBox}>
            <TouchableOpacity
              onPress={() => count > 1 && setCount(count - 1)}
            >
              <Ionicons name="remove" size={20} color="#777" />
            </TouchableOpacity>

            <Text style={styles.participantCount}>{count}</Text>

            <TouchableOpacity onPress={() => setCount(count + 1)}>
              <Ionicons name="add" size={20} color="#007BFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.line} />
      </ScrollView>

      {/* FIXED BOTTOM BAR */}
      <View style={[styles.bottomRow, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>$200</Text>
        </View>

        <TouchableOpacity style={styles.bookBtn}>
          <Text style={styles.bookBtnText}>Book Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#E8F2FF",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
  },

  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginLeft: 80,
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

  profileImg: {
    width: 55,
    height: 55,
    borderRadius: 50,
    marginRight: 12,
  },

  guideName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },

  guideInfo: {
    fontFamily: "Nunito_400Regular",
    color: "#777",
    fontSize: 13,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  ratingText: {
    marginLeft: 4,
    fontFamily: "Nunito_400Regular",
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
  },

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
    marginBottom: 20,
  },

  monthTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },

  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  weekText: {
    width: 40,
    textAlign: "center",
    fontFamily: "Nunito_400Regular",
    color: "#777",
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  dayCell: {
    width: "14.28%",
    alignItems: "center",
  },

  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  selectedCircle: {
    backgroundColor: "#007BFF",
  },

  dayText: {
    fontFamily: "Nunito_400Regular",
  },

  legendRow: {
    flexDirection: "row",
    marginVertical: 20,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },

  legendLabel: {
    fontFamily: "Nunito_400Regular",
  },

  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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

  participantCount: {
    marginHorizontal: 15,
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },

  line: {
    height: 1,
    backgroundColor: "#D9D9D9",
    marginVertical: 20,
  },

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
  },

  totalLabel: {
    fontFamily: "Nunito_400Regular",
    color: "#9aa0a6",
  },

  totalAmount: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
  },

  bookBtn: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },

  bookBtnText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
});
