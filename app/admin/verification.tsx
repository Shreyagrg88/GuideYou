import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
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
import { Ionicons } from "@expo/vector-icons";
import AdminNavBar from "../components/admin_navbar";

const BASE_URL = "http://192.168.1.68:5000";

type LicenseItem = {
  userId: string;
  username: string;
  email: string;
  licenseFile: string;
  submittedAt: string;
  status: string;
};

export default function VerificationRequest() {
  const router = useRouter();

  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingLicenses();
  }, []);

  const fetchPendingLicenses = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Unauthorized", "Please login again");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/license/pending`, {
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

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Verification Request</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.list}>
        {licenses.length === 0 && (
          <Text style={styles.emptyText}>No pending license requests</Text>
        )}

        {licenses.map((item) => (
          <View key={item.userId} style={styles.card}>
            <View>
              <Text style={styles.name}>{item.username}</Text>
              <Text style={styles.date}>
                Submitted: {new Date(item.submittedAt).toDateString()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() =>
                router.push({
                  pathname: "/admin/review_license",
                  params: {
                    userId: item.userId,
                    licenseFile: item.licenseFile,
                  },
                })
              }
            >
              <Text style={styles.reviewText}>Review</Text>
            </TouchableOpacity>
          </View>
        ))}
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
