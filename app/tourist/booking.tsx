import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function BookingPage() {
  const router = useRouter();

  // --- Calendar state ---
  const today = new Date();
  const [month, setMonth] = useState(11); // December = 11
  const [year, setYear] = useState(2025);
  const [selectedDate, setSelectedDate] = useState<number | null>(22);

  // --- Example unavailable & available days ---
  const unavailableDates = [3, 4, 10, 11, 12];
  const availableDates = [1, 6, 13, 20, 23, 24, 25, 26];

  // Generate days for month
  const getDaysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  // Participants
  const [count, setCount] = useState(1);

  return (
    <View style={styles.page}>
      <View style={styles.titleRow}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={26} color="#000" />
              </TouchableOpacity>
      
              <Text style={styles.title}>
                Booking Detail        </Text>
    </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <Image
          source={{
            uri: "https://i.pravatar.cc/150?img=12",
          }}
          style={styles.profileImg}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.guideName}>Nema Sherpa</Text>
          <Text style={styles.guideInfo}>Trek Guide • Pokhara</Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" color="#f4b400" size={14} />
            <Text style={styles.ratingText}>4.5</Text>
          </View>
        </View>

        <Ionicons name="checkmark-circle" size={26} color="#2ecc71" />
      </View>

      {/* Select Date */}
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

        {/* Week Row */}
        <View style={styles.weekRow}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <Text key={d} style={styles.weekText}>
              {d}
            </Text>
          ))}
        </View>

        {/* Days */}
        <View style={styles.daysGrid}>
          {/* Empty slots */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <View key={`e-${i}`} style={styles.dayCell} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const isSelected = selectedDate === day;
            const isUnavailable = unavailableDates.includes(day);
            const isAvailable = availableDates.includes(day);

            return (
              <TouchableOpacity
                key={day}
                onPress={() => {
                  if (!isUnavailable) setSelectedDate(day);
                }}
                style={styles.dayCell}
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
      <Text style={styles.sectionTitle}>Participants</Text>

      <View style={styles.participantRow}>
        <TouchableOpacity
          onPress={() => count > 1 && setCount(count - 1)}
          style={styles.minusBtn}
        >
          <Ionicons name="remove" size={20} color="#777" />
        </TouchableOpacity>

        <Text style={styles.participantCount}>{count}</Text>

        <TouchableOpacity
          onPress={() => setCount(count + 1)}
          style={styles.plusBtn}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomRow}>
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
    padding: 20,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    width: "95%",
  },

  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginLeft: 100,
    flexShrink: 1,
    lineHeight: 26,
    alignItems: "center",

  },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 40,
    marginBottom: 40,
  },

  profileImg: {
    width: 55,
    height: 55,
    borderRadius: 50,
    marginRight: 12,
  },

  guideName: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },

  guideInfo: {
    color: "#777",
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Nunito_400Regular",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  ratingText: {
    marginLeft: 4,
    fontFamily: "Nunito_400Regular",
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    marginBottom:  10,
  },

  calendarBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 10,
  },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  monthTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },

  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
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
    marginBottom: 4,
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
    marginTop: 10,
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
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
  },

  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  minusBtn: {
    backgroundColor: "#eee",
    padding: 5,
    borderRadius: 15,
  },

  participantCount: {
    marginHorizontal: 15,
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },

  plusBtn: {
    backgroundColor: "#007BFF",
    padding: 5,
    borderRadius: 15,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    color: "#9aa0a6",
    fontFamily: "Nunito_400Regular",
  },

  totalAmount: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  bookBtn: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },

  bookBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },
});
