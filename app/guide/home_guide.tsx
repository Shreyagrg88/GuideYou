import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function GuideHome() {
  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.logo}>
        Guide<Text style={{ color: "#4C8CFF" }}>You</Text>
      </Text>

      {/* Greeting */}
      <Text style={styles.greet}>Hi Nima</Text>

      {/* Performance Card */}
      <View style={styles.performanceCard}>
        <View style={styles.performanceHeader}>
          <Text style={styles.performanceTitle}>Performance</Text>
          <Text style={styles.thisMonth}>This Month ▼</Text>
        </View>

        <View style={styles.performanceRow}>
          <View style={styles.performanceBox}>
            <Text style={styles.boxTitle}>Earning</Text>
            <Text style={styles.boxValue}>$3,000</Text>
          </View>

          <View style={styles.performanceBox}>
            <Text style={styles.boxTitle}>Upcoming</Text>
            <Text style={styles.boxValue}>1 Treks</Text>
          </View>
        </View>
      </View>

      {/* Booking Requests */}
      <TouchableOpacity style={styles.requestBtn}>
        <Text style={styles.requestText}>1 New Booking Requests</Text>
        <Ionicons name="chevron-forward" size={20} color="#4C8CFF" />
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
        <Text style={styles.seeAll}>See all</Text>
      </View>

      {/* Booking Card */}
      <View style={styles.bookingCard}>
        <Image
          source={{
            uri: "https://www.missionsummittreks.com/_next/image/?url=https%3A%2F%2Fdestination.missionsummittreks.com%2Fstorage%2Ftour%2Fgallery%2F12623460301699488000.jpeg&w=3840&q=75",
          }}
          style={styles.bookingImage}
        />

        <View style={styles.labelTag}>
          <Text style={styles.labelText}>Next</Text>
        </View>

        <View style={styles.bookingInfo}>
          <Text style={styles.bookingTitle}>ABC Trek</Text>
          <Text style={styles.bookingDate}>Nov 29 - Dec 4</Text>
          <Text style={styles.bookingUser}>Human Being</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 50,
    backgroundColor: "#fff",
  },

  logo: {
    fontSize: 28,
    fontFamily: "Nunito_400Regular",
  },

  greet: {
    marginTop: 10,
    fontSize: 22,
    fontFamily: "Nunito_400Regular",
  },

  performanceCard: {
    backgroundColor: "#F7FAFF",
    padding: 16,
    borderRadius: 14,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#E7EEF5",
  },

  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  performanceTitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
  },

  thisMonth: {
    fontFamily: "Nunito_400Regular",
    color: "#007BFF",
  },

  performanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  performanceBox: {
    backgroundColor: "#E8F0FF",
    width: "48%",
    padding: 14,
    borderRadius: 12,
  },

  boxTitle: {
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginBottom: 6,
  },

  boxValue: {
    fontFamily: "Nunito_400Regular",
    fontSize: 18,
  },

  requestBtn: {
    marginTop: 20,
    backgroundColor: "#E9F2FF",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderColor: "#CDE0FF",
    borderWidth: 1,
  },

  requestText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#007BFF",
  },

  sectionHeader: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: "Nunito_400Regular",
  },

  seeAll: {
    fontFamily: "Nunito_400Regular",
    color: "#007BFF",
  },

  bookingCard: {
    marginTop: 12,
    backgroundColor: "#F7FAFF",
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E7EEF5",
  },

  bookingImage: {
    width: "100%",
    height: 170,
  },

  labelTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#007BFF",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },

  labelText: {
    color: "#fff",
    fontFamily: "Nunito_400Regular",
  },

  bookingInfo: {
    padding: 12,
  },

  bookingTitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
  },

  bookingDate: {
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginTop: 3,
  },

  bookingUser: {
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginTop: 2,
  },
});
