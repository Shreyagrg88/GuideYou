import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";
import AdminNavBar from "../components/admin_navbar";

type LicenseItem = {
  userId: string;
  username: string;
  email: string;
  licenseFile: string;
  submittedAt: string;
  status: string;
};

type ActivityItem = {
  id: string;
  name: string;
  guideName: string;
  submittedAt: string;
};

function mapActivity(item: any): ActivityItem {
  const guide = item.guide || {};
  const guideName = guide.username || guide.fullName || guide.name || "Guide";
  const submittedAt = item.createdAt || item.submittedAt || new Date().toISOString();
  return { id: item.id, name: item.name || "Activity", guideName, submittedAt };
}

export default function VerificationRequest() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<"licenses" | "activities">("licenses");
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [pendingActivities, setPendingActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    fetchPendingLicenses();
    fetchPendingActivities();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPendingLicenses();
      fetchPendingActivities();
    }, [])
  );

  const fetchPendingActivities = async () => {
    setActivitiesLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setPendingActivities([]);
        return;
      }
      const response = await fetch(`${API_URL}/api/admin/activities/pending?limit=50`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) {
        setPendingActivities([]);
        return;
      }
      const data = await response.json();
      const list = data.activities || data || [];
      setPendingActivities(Array.isArray(list) ? list.map(mapActivity) : []);
    } catch (error: any) {
      console.error("Pending activities error:", error);
      setPendingActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchPendingLicenses = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Unauthorized", "Please login again");
        return;
      }

      const response = await fetch(`${API_URL}/api/license/pending`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setLicenses(data.licenses || []);
    } catch (error: any) {
      console.error("Pending licenses error:", error);
      Alert.alert("Error", error.message || "Failed to load requests");
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

  const isLicenses = activeSection === "licenses";

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentItem, isLicenses && styles.activeSegment]}
          onPress={() => setActiveSection("licenses")}
        >
          <Text style={isLicenses ? styles.segmentTextActive : styles.segmentText}>Licenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentItem, !isLicenses && styles.activeSegment]}
          onPress={() => setActiveSection("activities")}
        >
          <Text style={!isLicenses ? styles.segmentTextActive : styles.segmentText}>Activities</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {isLicenses ? (
          <>
            {loading ? (
              <ActivityIndicator size="small" style={{ marginTop: 20 }} />
            ) : licenses.length === 0 ? (
              <Text style={styles.emptyText}>No pending license requests</Text>
            ) : (
              licenses.map((item) => (
                <View key={item.userId} style={styles.card}>
                  <View>
                    <Text style={styles.name}>{item.username}</Text>
                    <Text style={styles.date}>Submitted: {new Date(item.submittedAt).toDateString()}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/admin/review_license",
                        params: { userId: item.userId, licenseFile: item.licenseFile },
                      })
                    }
                  >
                    <Text style={styles.reviewText}>Review</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {activitiesLoading ? (
              <ActivityIndicator size="small" style={{ marginTop: 20 }} />
            ) : pendingActivities.length === 0 ? (
              <Text style={styles.emptyText}>No pending activities to review</Text>
            ) : (
              pendingActivities.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.date}>
                      By {item.guideName} · {new Date(item.submittedAt).toDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => router.push({ pathname: "/admin/review_activity" as const, params: { activityId: item.id } })}
                  >
                    <Text style={styles.reviewText}>Review</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  segment: {
    flexDirection: "row",
    backgroundColor: "#E8EEF4",
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeSegment: {
    backgroundColor: "#007BFF",
    borderRadius: 12,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
  },
  segmentTextActive: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFF",
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  card: {
    backgroundColor: "#F2F7FF",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  name: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },

  date: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#666",
  },

  reviewBtn: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },

  reviewText: {
    color: "#FFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontFamily: "Nunito_400Regular",
    color: "#999",
  },
});
