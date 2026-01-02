import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AdminNavBar from "../components/admin_navbar";

const BASE_URL = "http://192.168.137.1:5000";

type Stats = {
  guides: { total: number; active: number };
  tourists: { total: number; active: number };
};

type UserItem = {
  id: string;
  name: string;
  joined: string;
};

type LicenseItem = {
  userId: string;
  username: string;
  email: string;
  licenseFile: string;
  submittedAt: string;
};

export default function HomeAdmin() {
  const [activeTab, setActiveTab] = useState<"guides" | "tourists">("guides");
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentGuides, setRecentGuides] = useState<UserItem[]>([]);
  const [recentTourists, setRecentTourists] = useState<UserItem[]>([]);
  const [pendingLicenses, setPendingLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const token = await AsyncStorage.getItem("token"); 

      if (!token) {
        Alert.alert("Unauthorized", "Please login again");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const [statsRes, guidesRes, touristsRes, licenseRes] =
        await Promise.all([
          fetch(`${BASE_URL}/api/admin/stats`, { headers }),
          fetch(`${BASE_URL}/api/admin/guides/recent?limit=5`, { headers }),
          fetch(`${BASE_URL}/api/admin/tourists/recent?limit=5`, { headers }),
          fetch(`${BASE_URL}/api/license/pending`, { headers }),
        ]);

      if (!statsRes.ok) throw new Error(await statsRes.text());
      if (!guidesRes.ok) throw new Error(await guidesRes.text());
      if (!touristsRes.ok) throw new Error(await touristsRes.text());
      if (!licenseRes.ok) throw new Error(await licenseRes.text());

      const statsData = await statsRes.json();
      const guidesData = await guidesRes.json();
      const touristsData = await touristsRes.json();
      const licenseData = await licenseRes.json();

      setStats(statsData);
      setRecentGuides(guidesData.guides || []);
      setRecentTourists(touristsData.tourists || []);
      setPendingLicenses(licenseData.licenses || []);
    } catch (error: any) {
      console.error("Admin fetch error:", error);
      Alert.alert("Error", error.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isGuideTab = activeTab === "guides";
  const currentStats = isGuideTab ? stats?.guides : stats?.tourists;
  const recentItems = isGuideTab ? recentGuides : recentTourists;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            Guide<Text style={styles.logoAccent}>You</Text>
          </Text>

          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Hello, Admin</Text>
          </View>
        </View>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentItem, isGuideTab && styles.activeTab]}
            onPress={() => setActiveTab("guides")}
          >
            <Text>Guides</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentItem, !isGuideTab && styles.activeTab]}
            onPress={() => setActiveTab("tourists")}
          >
            <Text>Tourists</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text>Total</Text>
            <Text style={styles.statValue}>{currentStats?.total ?? 0}</Text>
          </View>

          <View style={styles.statCard}>
            <Text>Active</Text>
            <Text style={styles.statValue}>{currentStats?.active ?? 0}</Text>
          </View>
        </View>

        {/* Pending Licenses */}
        {isGuideTab && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Pending License Requests ({pendingLicenses.length})
            </Text>

            {pendingLicenses.length === 0 && (
              <Text style={styles.subText}>No pending licenses</Text>
            )}

            {pendingLicenses.map((item) => (
              <View key={item.userId} style={styles.listItem}>
                <Text>{item.username}</Text>
                <Text style={styles.subText}>
                  Submitted: {new Date(item.submittedAt).toDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Recent {isGuideTab ? "Guides" : "Tourists"}
          </Text>

          {recentItems.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <Text>{item.name}</Text>
              <Text style={styles.subText}>{item.joined}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

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
    padding: 16,
    paddingBottom: 100,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    marginTop: 30,
    marginBottom: 30,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  logo: {
    fontSize: 24,
    fontFamily: "Nunito_700Bold",
    marginBottom:20,
  },

  logoAccent: {
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  segment: {
    flexDirection: "row",
    backgroundColor: "#DDE5EE",
    borderRadius: 12,
    marginBottom: 14,
  },

  segmentItem: {
    flex: 1,
    padding: 12,
    alignItems: "center",
  },

  activeTab: {
    backgroundColor: "#FFF",
    borderRadius: 12,
  },

  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
  },

  statValue: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
  },

  card: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },

  cardTitle: {
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
  },

  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    paddingVertical: 8,
    fontFamily: "Nunito_400Regular",
  },

  subText: {
    color: "#666",
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
});