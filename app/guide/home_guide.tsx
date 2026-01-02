import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GuideNavbar from "../components/guide_navbar";

export default function GuideHome() {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [homepageData, setHomepageData] = useState<any>(null);

  const fetchGuideHomepage = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        "http://192.168.1.67:5000/api/guide/homepage",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Homepage error:", data);
        return;
      }

      setHomepageData(data);
    } catch (error) {
      console.error("Homepage fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuideHomepage();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const nextBooking =
    homepageData?.upcomingBookings &&
    homepageData.upcomingBookings.length > 0
      ? homepageData.upcomingBookings[0]
      : null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.logo}>
            Guide<Text style={{ color: "#007BFF" }}>You</Text>
          </Text>

          <TouchableOpacity>
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#B0B0B0"
            />
          </TouchableOpacity>
        </View>

        {/* GREETING */}
        <Text style={styles.greet}>
          Hi {homepageData?.guide?.username}
        </Text>

        {/* PERFORMANCE */}
        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>Performance</Text>

            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Text style={styles.thisMonth}>This Month</Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color="#007BFF"
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.performanceRow}>
            <View style={styles.performanceBox}>
              <Text style={styles.boxTitle}>Earning</Text>
              <Text style={styles.boxValue}>
                ${homepageData?.performance?.earnings}
              </Text>
            </View>

            <View style={styles.performanceBox}>
              <Text style={styles.boxTitle}>Upcoming</Text>
              <Text style={styles.boxValue}>
                {homepageData?.performance?.upcomingCount} Treks
              </Text>
            </View>
          </View>
        </View>

        {/* NEW REQUESTS */}
        <TouchableOpacity style={styles.requestBtn}>
          <View style={styles.requestLeft}>
            <Ionicons name="list-outline" size={20} color="#007BFF" />
            <Text style={styles.requestText}>
              {homepageData?.newRequestsCount} New Booking Requests
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#007BFF"
          />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        {nextBooking && (
          <View style={styles.bookingCard}>
            <Image
              source={{
                uri: `http://localhost:5000${nextBooking.activity.photo}`,
              }}
              style={styles.bookingImage}
            />

            <View style={styles.labelTag}>
              <Text style={styles.labelText}>Next</Text>
            </View>

            <View style={styles.bookingInfo}>
              <Text style={styles.bookingTitle}>
                {nextBooking.activity.name}
              </Text>

              <View style={styles.row}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color="#888"
                />
                <Text style={styles.bookingDate}>
                  {nextBooking.dateRange}
                </Text>
              </View>

              <View style={styles.row}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color="#888"
                />
                <Text style={styles.bookingUser}>
                  {nextBooking.tourist.name}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.navbarWrapper}>
        <GuideNavbar />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#fff",
  },

  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 55,
    backgroundColor: "#fff",
  },

  navbarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "#fff",
    elevation: 12,
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
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
  },

  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "center",
  },

  performanceTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#000",
  },

  thisMonth: {
    fontFamily: "Nunito_400Regular",
    color: "#007BFF",
    fontSize: 14,
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
    marginTop: 20,
  },

  boxTitle: {
    color: "#6B7280",
    fontSize: 13,
  },

  boxValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },

  requestBtn: {
    marginTop: 20,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  requestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  requestText: {
    fontSize: 15,
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
    fontWeight: "700",
    color: "#000",
  },

  seeAll: {
    color: "#007BFF",
    fontSize: 16,
  },

  bookingCard: {
    marginTop: 20,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  bookingImage: {
    width: "100%",
    height: 180,
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
    fontSize: 13,
  },

  bookingInfo: {
    padding: 16,
    gap: 8,
  },

  bookingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  bookingDate: {
    color: "#888",
  },

  bookingUser: {
    color: "#888",
  },
});
