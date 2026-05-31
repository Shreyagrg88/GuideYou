/**
 * Verification
 * Route: /admin/verification
 *
 * Hub for pending license and activity approvals.
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";
import {
  fetchAdminPendingLicenses,
  getStoredUserRole,
  type AdminPendingLicense,
} from "../../api/adminAccount";
import { SkeletonBlock, SkeletonListScreen } from "@/components/Skeleton";
import { ScreenHeaderBar } from "../../components/screen-header";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import AdminNavBar from "../components/admin_navbar";

type LicenseItem = AdminPendingLicense;

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

  // --- Local state ---
  const [activeSection, setActiveSection] = useState<"licenses" | "activities">("licenses");
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [pendingActivities, setPendingActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // --- Effects (load data, listeners) ---
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
        router.replace("/login");
        return;
      }

      const role = await getStoredUserRole();
      if (role !== "admin") {
        Alert.alert(
          "Access denied",
          "This area is for administrators only. Please log in with an admin account."
        );
        router.replace("/login");
        return;
      }

      const licenses = await fetchAdminPendingLicenses(token);
      setLicenses(licenses);
    } catch (error: any) {
      console.error("Pending licenses error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to load requests";
      Alert.alert("Error", message);
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonListScreen rows={10} />;
  }

  const isLicenses = activeSection === "licenses";

  // --- Render ---
  return (
    <View style={styles.root}>
      <ScreenHeaderBar title="Verification" backIcon="arrow-back" />

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
              <View style={{ marginTop: 20 }}>
                <View style={{ marginBottom: 10 }}>
                  <SkeletonBlock width="100%" height={56} borderRadius={10} />
                </View>
                <View style={{ marginBottom: 10 }}>
                  <SkeletonBlock width="100%" height={56} borderRadius={10} />
                </View>
                <SkeletonBlock width="100%" height={56} borderRadius={10} />
              </View>
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
              <View style={{ marginTop: 20 }}>
                <View style={{ marginBottom: 10 }}>
                  <SkeletonBlock width="100%" height={56} borderRadius={10} />
                </View>
                <View style={{ marginBottom: 10 }}>
                  <SkeletonBlock width="100%" height={56} borderRadius={10} />
                </View>
                <SkeletonBlock width="100%" height={56} borderRadius={10} />
              </View>
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

  segment: {
    flexDirection: "row",
    backgroundColor: "#E8EEF4",
    marginHorizontal: PAGE_PADDING_HORIZONTAL,
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
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
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
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
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
