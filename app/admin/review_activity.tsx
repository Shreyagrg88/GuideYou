import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";
import AdminNavBar from "../components/admin_navbar";

type ActivityData = {
  id: string;
  name: string;
  description?: string;
  location?: string;
  duration?: number;
  difficulty?: string;
  category?: string;
  guide?: { username?: string; fullName?: string };
  createdAt?: string;
  submittedAt?: string;
};

export default function ReviewActivity() {
  const router = useRouter();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  useEffect(() => {
    if (activityId) fetchActivity();
  }, [activityId]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Unauthorized", "Please login again");
        return;
      }
      const res = await fetch(`${API_URL}/api/admin/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed to load activity");
      setActivity(data.activity || data);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load activity");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getGuideName = () => {
    if (!activity?.guide) return "—";
    const g = activity.guide;
    return g.fullName || g.username || "Guide";
  };

  const submittedAt = activity?.createdAt || activity?.submittedAt || "";

  const handleApprove = () => {
    Alert.alert(
      "Approve Activity",
      `Approve "${activity?.name}"? This will make it visible to tourists.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve", onPress: doApprove },
      ]
    );
  };

  const doApprove = async () => {
    if (!activityId) return;
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Unauthorized", "Please login again");
        return;
      }
      const res = await fetch(`${API_URL}/api/admin/activities/${activityId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Approval failed");
      Alert.alert("Success", "Activity approved. It is now visible to tourists.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Approval failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = () => {
    if (!showRejectionInput) {
      setShowRejectionInput(true);
      return;
    }
    if (rejectReason.length > 500) {
      Alert.alert("Invalid", "Rejection reason must be 500 characters or less.");
      return;
    }
    Alert.alert(
      "Reject Activity",
      `Reject "${activity?.name}"? The guide can edit and resubmit.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: doReject },
      ]
    );
  };

  const doReject = async () => {
    if (!activityId) return;
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Unauthorized", "Please login again");
        return;
      }
      const res = await fetch(`${API_URL}/api/admin/activities/${activityId}/reject`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim().slice(0, 500) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Rejection failed");
      Alert.alert("Rejected", "Activity rejected. The guide has been notified.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Rejection failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Activity</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
        <AdminNavBar />
      </View>
    );
  }

  if (!activity) return null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Activity</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Activity</Text>
          <Text style={styles.name}>{activity.name}</Text>
        </View>

        {activity.description ? (
          <View style={styles.card}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.body}>{activity.description}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.cardHalf}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.body}>{activity.duration != null ? `${activity.duration} days` : "—"}</Text>
          </View>
          <View style={styles.cardHalf}>
            <Text style={styles.label}>Difficulty</Text>
            <Text style={styles.body}>{activity.difficulty || "—"}</Text>
          </View>
        </View>

        {activity.location ? (
          <View style={styles.card}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.body}>{activity.location}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Posted by</Text>
          <Text style={styles.body}>{getGuideName()}</Text>
          {submittedAt ? (
            <Text style={styles.date}>Submitted: {new Date(submittedAt).toDateString()}</Text>
          ) : null}
        </View>

        {showRejectionInput && (
          <View style={styles.card}>
            <Text style={styles.label}>Rejection reason (optional, max 500 chars)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Please add more safety details"
              placeholderTextColor="#999"
              value={rejectReason}
              onChangeText={setRejectReason}
              maxLength={500}
              multiline
            />
            {rejectReason.length > 0 && (
              <Text style={styles.charCount}>{rejectReason.length} / 500</Text>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.rejectBtn, processing && styles.btnDisabled]}
            onPress={handleReject}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#E63946" />
            ) : (
              <Text style={styles.rejectText}>Reject</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.approveBtn, processing && styles.btnDisabled]}
            onPress={handleApprove}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.approveText}>Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  cardHalf: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#333",
  },
  body: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#444",
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#999",
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFF",
    minHeight: 80,
    textAlignVertical: "top",
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
  },
  charCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginTop: 4,
    fontFamily: "Nunito_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E63946",
  },
  approveText: {
    color: "#FFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },
  rejectText: {
    color: "#E63946",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
