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
import GuideNavbar from "../components/guide_navbar";

export default function BookingRequestScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past" | "requests">("requests");

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
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Booking Detail</Text>
        </View>

        <View style={styles.tabRow}>
          {["upcoming", "past", "requests"].map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t as any)}>
              <Text style={[styles.tab, tab === t && styles.activeTabText]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
              {tab === t && <View style={styles.activeLine} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 20, paddingBottom: 100 }}>
          {tab === "upcoming" && renderUpcoming()}
          {tab === "past" && renderPast()}
          {tab === "requests" && renderRequests()}
        </View>

      </ScrollView>

      <GuideNavbar />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    padding: 20,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
    width: "100%",
    justifyContent: "center",
    position: "relative",
  },

  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
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
    height: 3,
    backgroundColor: "#1B8BFF",
    borderRadius: 5,
    marginTop: 4,
  },

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
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    fontSize: 18,
  },

  month: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    fontSize: 12,
    marginTop: -3,
  },

  trekTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },

  subUser: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#777",
  },

  statusText: {
    fontFamily: "Nunito_700Bold",
  },

  requestCard: {
    backgroundColor: "#F5F8FF",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
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
    fontFamily: "Nunito_700Bold",
    color: "#777",
    marginTop: -2,
  },

  reqDate: {
    fontFamily: "Nunito_400Regular",
    color: "#999",
    fontSize: 12,
  },

  partyBox: {
    backgroundColor: "#E3EDFF",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 5,
  },

  partyText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#1B8BFF",
  },

  acceptBtn: {
    backgroundColor: "#1B8BFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },

  acceptText: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },

  statusBox: {
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 8,
  alignSelf: "flex-start",
  marginBottom: 8,
},

});
