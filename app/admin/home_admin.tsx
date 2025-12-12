import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AdminNavBar from "../components/admin_navbar";

type VerificationRequest = {
  id: string;
  name: string;
  type: string;
  timeAgo: string;
};

type GuideRegistration = {
  id: string;
  name: string;
  joined: string;
};

export default function AdminHome() {
  const [activeTab, setActiveTab] = useState<"guides" | "tourists">("guides");

  const verificationRequests: VerificationRequest[] = [
    { id: "1", name: "Laura Smith", type: "License Upload", timeAgo: "2 hours ago" },
    { id: "2", name: "John Doe", type: "ID Verification", timeAgo: "5 hours ago" },
    { id: "3", name: "Emily Carter", type: "License Upload", timeAgo: "1 day ago" },
  ];

  const recentGuides: GuideRegistration[] = [
    { id: "1", name: "Michael Brown", joined: "Joined 3 days ago" },
    { id: "2", name: "Sarah Wilson", joined: "Joined 4 days ago" },
  ];

  const recentTourists: GuideRegistration[] = [
    { id: "1", name: "Anita Roy", joined: "Joined today" },
    { id: "2", name: "Carlos Diaz", joined: "Joined 2 days ago" },
  ];

  const guideStats = { total: 128, active: 102 };
  const touristStats = { total: 512, active: 420 };

  const isGuideTab = activeTab === "guides";
  const currentStats = isGuideTab ? guideStats : touristStats;
  const pendingItems = isGuideTab ? verificationRequests : [];
  const recentItems = isGuideTab ? recentGuides : recentTourists;
  const pendingTitle = isGuideTab ? "Pending Guide Verification Requests" : "Tourists";
  const recentTitle = isGuideTab ? "Recent Guide Registrations" : "Recent Tourist Registrations";

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            Guide<Text style={styles.logoAccent}>You</Text>
          </Text>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Hello, Admin</Text>
            <Ionicons name="notifications-outline" size={22} color="#1F2D3D" />
          </View>
        </View>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentItem, isGuideTab && styles.segmentItemActive]}
            activeOpacity={0.85}
            onPress={() => setActiveTab("guides")}
          >
            <Text style={[styles.segmentText, isGuideTab && styles.segmentTextActive]}>Guides</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentItem, !isGuideTab && styles.segmentItemActive]}
            activeOpacity={0.85}
            onPress={() => setActiveTab("tourists")}
          >
            <Text style={[styles.segmentText, !isGuideTab && styles.segmentTextActive]}>Tourists</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total {isGuideTab ? "Guides" : "Tourists"}</Text>
            <Text style={styles.statValue}>{currentStats.total}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active {isGuideTab ? "Guides" : "Tourists"}</Text>
            <Text style={styles.statValue}>{currentStats.active}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{pendingTitle}</Text>
            {isGuideTab && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingItems.length}</Text>
              </View>
            )}
          </View>

          {isGuideTab ? (
            pendingItems.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.row}>
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarSmallText}>{item.name[0]}</Text>
                  </View>
                  <View style={styles.listText}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.subText}>{item.type} - {item.timeAgo}</Text>
                  </View>
                </View>
                <TouchableOpacity>
                  <Text style={styles.link}>Review</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.subText}>Tourists do not require verification.</Text>
          )}

          {isGuideTab && (
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>View All Requests</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{recentTitle}</Text>
          {recentItems.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.row}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarSmallText}>{item.name[0]}</Text>
                </View>
                <View style={styles.listText}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.subText}>{item.joined}</Text>
                </View>
              </View>
              <TouchableOpacity>
                <Text style={styles.link}>Profile</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EAF3FA",
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: "flex-start",
    marginTop: 30,
    marginBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  logo: {
    fontSize: 24,
    fontFamily: "Nunito_700Bold",
    color: "#000",
  },
  logoAccent: {
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
  },
  headerTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#1F2D3D",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#DDE5EE",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentText: {
    fontFamily: "Nunito_700Bold",
    color: "#74839B",
    fontSize: 14,
  },
  segmentTextActive: {
    color: "#1F2D3D",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statLabel: {
    fontFamily: "Nunito_400Regular",
    color: "#6C7A92",
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: "Nunito_700Bold",
    color: "#1F2D3D",
    fontSize: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: "Nunito_700Bold",
    color: "#1F2D3D",
    fontSize: 15,
  },
  badge: {
    backgroundColor: "#1C74FF",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
    fontSize: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E6EDF5",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallText: {
    fontFamily: "Nunito_700Bold",
    color: "#1C74FF",
    fontSize: 14,
  },
  listText: {
    justifyContent: "center",
  },
  name: {
    fontFamily: "Nunito_700Bold",
    color: "#1F2D3D",
    fontSize: 14,
  },
  subText: {
    fontFamily: "Nunito_400Regular",
    color: "#7A8AA5",
    fontSize: 12,
    marginTop: 2,
  },
  link: {
    fontFamily: "Nunito_700Bold",
    color: "#1C74FF",
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: "#D7E8FF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    fontFamily: "Nunito_700Bold",
    color: "#1C74FF",
    fontSize: 14,
  },
});
