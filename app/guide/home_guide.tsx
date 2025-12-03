import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GuideNavbar from "../components/guide_navbar";

export default function GuideHome() {
  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>
            Guide<Text style={{ color: "#007BFF" }}>You</Text>
          </Text>

          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color="#B0B0B0" />
          </TouchableOpacity>
        </View>

        <Text style={styles.greet}>Hi Nima</Text>

        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>Performance</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.thisMonth}>This Month</Text>
                <Ionicons name="chevron-down" size={14} color="#007BFF" style={{ marginLeft: 2 }}/>
            </TouchableOpacity>
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

        <TouchableOpacity style={styles.requestBtn}>
          <View style={styles.requestLeft}>
            <Ionicons name="list-outline" size={20} color="#007BFF" />
            <Text style={styles.requestText}>1 New Booking Requests</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#007BFF" />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.bookingCard}>
          <Image
            source={{
              uri: "https://www.havenholidaysnepal.com/storage/trip-galleries/55/ABC%20with%20fishtail.JPG0.21441100%201728277965.webp",
            }}
            style={styles.bookingImage}
          />

          <View style={styles.labelTag}>
            <Text style={styles.labelText}>Next</Text>
          </View>

          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle}>ABC Trek</Text>
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={14} color="#888" />
              <Text style={styles.bookingDate}>Nov 29- Dec 4</Text>
            </View>

            <View style={styles.row}>
              <Ionicons name="person-outline" size={14} color="#888" />
              <Text style={styles.bookingUser}>Human Being</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <GuideNavbar />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 55, 
    backgroundColor: "#fff",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: {
    fontSize: 26,
    fontFamily: "Nunito_400Regular", 
    fontWeight: "700",
    color: "#000",
  },

  greet: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Nunito_400Regular",
    color: "#000",
  },

  performanceCard: {
    backgroundColor: "#fff", 
    padding: 16, 
    borderRadius: 16,
    marginTop: 21,
    borderWidth: 1,
    borderColor: "#E5E7EB", 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12, 
    alignItems: 'center',
  },

  performanceTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },

  thisMonth: {
    fontFamily: "Nunito_400Regular",
    color: "#007BFF",
    fontSize: 14,
    fontWeight: "500",
  },

  performanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  performanceBox: {
    backgroundColor: "#F3F7FF", 
    width: "48%",
    padding: 14,
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: "#E3EEFF", 
  },

  boxTitle: {
    fontFamily: "Nunito_400Regular",
    color: "#6B7280", 
    marginBottom: 4,
    fontSize: 13,
  },

  boxValue: {
    fontFamily: "Nunito_400Regular",
    fontSize: 18, 
    fontWeight: "700",
    color: "#000",
  },

  requestBtn: {
    marginTop: 20,
    backgroundColor: "#fff", 
    padding: 20,
    borderRadius: 16,
    borderColor: "#E5E7EB", 
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  requestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  requestText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    fontWeight: "300",
    color: "#007BFF",
  },

  sectionHeader: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 18, 
    fontFamily: "Nunito_400Regular",
    fontWeight: "700", 
    color: "#000",
  },

  seeAll: {
    fontFamily: "Nunito_700Bold",
    color: "#007BFF",
    fontSize: 16,
    fontWeight: "500",
  },

  bookingCard: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    // Shadow for elevation effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  bookingImage: {
    width: "100%",
    height: 180, 
    resizeMode: 'cover',
  },

  labelTag: {
    position: "absolute",
    top: 14, 
    left: 14, 
    backgroundColor: "#007BFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },

  labelText: {
    color: "#fff",
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    fontWeight: "600",
  },

  bookingInfo: {
    padding: 16, 
    gap: 8,
  },

  bookingTitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 18, 
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, 
  },

  bookingDate: {
    fontFamily: "Nunito_400Regular",
    color: "#888",
    fontSize: 14, 
  },

  bookingUser: {
    fontFamily: "Nunito_400Regular",
    color: "#888",
    fontSize: 14, 
  },
});