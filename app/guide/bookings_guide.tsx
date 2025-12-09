import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function BookingRequestScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past" | "requests">("requests");

  // DATA ------------------------------
  const upcoming = [
    {
      date: "28",
      month: "OCT",
      title: "Annapurna Base Camp",
      user: "Maria Maria",
      status: "Confirmed",
      statusColor: "#1B8BFF",
    },
    {
      date: "28",
      month: "OCT",
      title: "Everest Base Camp",
      user: "Dharma",
      status: "Paid",
      statusColor: "#FFB800",
    },
  ];

  const past = [
    {
      date: "12",
      month: "SEP",
      title: "Manaslu Trek",
      user: "John",
      status: "Completed",
      statusColor: "#4CAF50",
    },
  ];

  const requests = [
    {
      name: "Shawn Vance",
      trek: "ABC Trek",
      dateRange: "Nov 22 – Dec 1",
      party: "Party of 4",
      image: "https://i.pravatar.cc/300?img=35",
    },
  ];

  const renderUpcoming = () =>
    upcoming.map((item, index) => (
      <View key={index} style={styles.card}>
        <View style={styles.dateBox}>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={styles.month}>{item.month}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.trekTitle}>{item.title}</Text>
          <Text style={styles.subUser}>{item.user}</Text>
        </View>

        <View style={styles.statusBox}>
          <Text style={[styles.statusText, { color: item.statusColor }]}>
            {item.status}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={22} color="#1B8BFF" />
      </View>
    ));

  const renderPast = () =>
    past.map((item, index) => (
      <View key={index} style={styles.card}>
        <View style={styles.dateBox}>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={styles.month}>{item.month}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.trekTitle}>{item.title}</Text>
          <Text style={styles.subUser}>{item.user}</Text>
        </View>

        <Text style={[styles.statusText, { color: item.statusColor }]}>
          {item.status}
        </Text>
      </View>
    ));

  const renderRequests = () =>
    requests.map((req, index) => (
      <View key={index} style={styles.requestCard}>
        <Image source={{ uri: req.image }} style={styles.profilePic} />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.reqName}>{req.name}</Text>
          <Text style={styles.reqTrek}>{req.trek}</Text>
          <Text style={styles.reqDate}>{req.dateRange}</Text>

          <View style={styles.partyBox}>
            <Text style={styles.partyText}>{req.party}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.acceptBtn}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    ));

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.titleRow}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={26} color="#000" />
              </TouchableOpacity>
      
              <Text style={styles.title}>
                Booking Detail        </Text>
    </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {["upcoming", "past", "requests"].map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t as any)}>
            <Text
              style={[
                styles.tab,
                tab === t && styles.activeTabText,
              ]}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
            {tab === t && <View style={styles.activeLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={{ marginTop: 20 }}>
        {tab === "upcoming" && renderUpcoming()}
        {tab === "past" && renderPast()}
        {tab === "requests" && renderRequests()}
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// STYLES --------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    width: "95%",
    marginBottom: 30,

  },

  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginLeft: 100,
    flexShrink: 1,
    lineHeight: 26,
    alignItems: "center",

  },


  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },

  tab: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    color: "#888",
  },

  activeTabText: {
    color: "#1B8BFF",
    fontFamily: "Nunito_700Bold",
  },

  activeLine: {
    height: 2.5,
    backgroundColor: "#1B8BFF",
    marginTop: 5,
    borderRadius: 5,
  },

  // Booking Cards
  card: {
    backgroundColor: "#F5F8FF",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  dateBox: {
    width: 55,
    height: 55,
    backgroundColor: "#1B8BFF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  date: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  month: {
    color: "#fff",
    fontSize: 12,
    marginTop: -3,
    fontFamily: "Nunito_700Bold",
  },

  trekTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },

  subUser: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#777",
  },

  statusBox: {
    marginRight: 10,
  },

  statusText: {
    fontFamily: "Nunito_700Bold",
  },

  // Request Cards
  requestCard: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#F5F8FF",
    borderRadius: 12,
    marginBottom: 15,
    alignItems: "center",
  },

  profilePic: {
    width: 55,
    height: 55,
    borderRadius: 30,
  },

  reqName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },

  reqTrek: {
    color: "#777",
    fontFamily: "Nunito_700Bold",
    marginTop: -2,
  },

  reqDate: {
    fontSize: 12,
    marginTop: -2,
    color: "#999",
    fontFamily: "Nunito_400Regular",
  },

  partyBox: {
    backgroundColor: "#E3EDFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 5,
    alignSelf: "flex-start",
  },

  partyText: {
    color: "#1B8BFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },

  acceptBtn: {
    backgroundColor: "#1B8BFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },

  acceptText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
  },
});
