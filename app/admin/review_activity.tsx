/**
 * Review Activity
 * Route: /admin/review_activity
 *
 * Review one activity submission — approve or reject.
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";
import { normalizeItineraryDaysFromApi } from "../../utils/itineraryDays";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonTourDetailScreen } from "@/components/Skeleton";

type ActivityData = {
  id?: string;
  name: string;
  description?: string;
  location?: string;
  duration?: number;
  difficulty?: string;
  category?: string;
  equipment?: string;
  photos?: string[];
  itineraryDays?: unknown;
  status?: string;
  guide?: {
    id?: string;
    username?: string;
    fullName?: string;
    email?: string;
  };
  createdAt?: string;
  submittedAt?: string;
  updatedAt?: string;
};

function photoUri(path: string): string {
  const s = String(path).trim();
  if (!s) return "";
  return s.startsWith("http") ? s : `${API_URL}${s.startsWith("/") ? s : `/${s}`}`;
}

export default function ReviewActivity() {
  const router = useRouter();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();

  // --- Local state ---
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  // --- Effects (load data, listeners) ---
  useEffect(() => {
    if (activityId) fetchActivity();
  }, [activityId]);

  const itineraryByDay = useMemo(() => {
    if (!activity) return [];
    const dur =
      typeof activity.duration === "number"
        ? activity.duration
        : parseInt(String(activity.duration), 10) || 1;
    const safeDur = Math.max(1, Number.isFinite(dur) ? dur : 1);
    return normalizeItineraryDaysFromApi(activity.itineraryDays, safeDur);
  }, [activity]);

  const hasItineraryText = useMemo(
    () => itineraryByDay.some((s) => s.trim().length > 0),
    [itineraryByDay]
  );

  const photoUrls = useMemo(() => {
    if (!activity?.photos || !Array.isArray(activity.photos)) return [];
    return activity.photos.map(photoUri).filter(Boolean);
  }, [activity?.photos]);

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

  const submittedAt =
    activity?.createdAt || activity?.submittedAt || activity?.updatedAt || "";

  const formatDisplay = (value: unknown, empty = "—") => {
    if (value == null) return empty;
    const s = String(value).trim();
    return s || empty;
  };

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
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerSide}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2}>
            Review Activity
          </Text>
          <View style={styles.headerSide} />
        </View>
        <View style={{ flex: 1 }}>
          <SkeletonTourDetailScreen />
        </View>
        <AdminNavBar />
      </SafeAreaView>
    );
  }

  if (!activity) return null;

  // --- Render ---
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>
          Review Activity
        </Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Activity</Text>
          <Text style={styles.name}>{activity.name}</Text>
          {activity.status ? (
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{activity.status}</Text>
            </View>
          ) : null}
          {activity.id ? (
            <Text style={styles.metaId}>ID: {activity.id}</Text>
          ) : null}
        </View>

        <View style={styles.row}>
          <View style={styles.cardHalf}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.body}>{formatDisplay(activity.category)}</Text>
          </View>
          <View style={styles.cardHalf}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.body}>
              {activity.duration != null && String(activity.duration).trim() !== ""
                ? `${activity.duration} ${Number(activity.duration) === 1 ? "day" : "days"}`
                : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.cardHalf}>
            <Text style={styles.label}>Difficulty</Text>
            <Text style={styles.body}>{formatDisplay(activity.difficulty)}</Text>
          </View>
          <View style={styles.cardHalf}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.body}>{formatDisplay(activity.location)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Detailed description</Text>
          <Text style={styles.body}>{formatDisplay(activity.description)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Guide</Text>
          <Text style={styles.body}>{getGuideName()}</Text>
          {activity.guide?.email ? (
            <Text style={[styles.body, styles.guideEmail]}>{activity.guide.email}</Text>
          ) : null}
          {activity.guide?.id ? (
            <Text style={styles.metaId}>Guide ID: {activity.guide.id}</Text>
          ) : null}
          {submittedAt ? (
            <Text style={styles.date}>Submitted: {new Date(submittedAt).toLocaleString()}</Text>
          ) : (
            <Text style={styles.date}>Submitted: —</Text>
          )}
        </View>

        {photoUrls.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.label}>Photos ({photoUrls.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRow}
            >
              {photoUrls.map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={styles.photoThumb}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Photos</Text>
            <Text style={styles.muted}>No photos uploaded</Text>
          </View>
        )}

        {activity.equipment && String(activity.equipment).trim() ? (
          <View style={styles.card}>
            <Text style={styles.label}>Equipment needed</Text>
            <View style={styles.equipmentList}>
              {String(activity.equipment)
                .split("\n")
                .filter((item) => item.trim())
                .map((item, index) => (
                  <View key={index} style={styles.equipmentItem}>
                    <Text style={styles.equipmentBullet}>•</Text>
                    <Text style={styles.equipmentText}>
                      {item.trim().replace(/^[•\-\*]\s*/, "")}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Equipment needed</Text>
            <Text style={styles.muted}>—</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Day-by-day itinerary</Text>
          {hasItineraryText ? (
            <View style={styles.itineraryWrap}>
              {itineraryByDay.map((dayText, index) =>
                dayText.trim() ? (
                  <View key={`it-${index}`} style={styles.itineraryDay}>
                    <Text style={styles.itineraryDayTitle}>Day {index + 1}</Text>
                    <Text style={styles.itineraryDayBody}>{dayText.trim()}</Text>
                  </View>
                ) : (
                  <View key={`it-${index}`} style={styles.itineraryDayEmpty}>
                    <Text style={styles.itineraryDayTitle}>Day {index + 1}</Text>
                    <Text style={styles.muted}>No summary provided</Text>
                  </View>
                )
              )}
            </View>
          ) : (
            <Text style={styles.muted}>No itinerary data</Text>
          )}
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
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8ECF1",
    backgroundColor: "#F8FAFC",
  },
  headerSide: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    paddingHorizontal: 8,
    lineHeight: 24,
    color: "#11181C",
  },
  content: {
    paddingHorizontal: 20,
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
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "#E7F0FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C5DCF7",
  },
  statusPillText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#007BFF",
    textTransform: "capitalize",
  },
  metaId: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#999",
  },
  guideEmail: {
    marginTop: 6,
    color: "#444",
  },
  body: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#444",
    lineHeight: 20,
  },
  muted: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#999",
  },
  date: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#999",
    marginTop: 6,
  },
  photoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    paddingVertical: 4,
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#EEF2F6",
  },
  equipmentList: {
    marginTop: 6,
  },
  equipmentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  equipmentBullet: {
    fontSize: 14,
    color: "#007BFF",
    marginRight: 8,
    fontFamily: "Nunito_700Bold",
  },
  equipmentText: {
    flex: 1,
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    fontFamily: "Nunito_400Regular",
  },
  itineraryWrap: {
    gap: 12,
    marginTop: 8,
  },
  itineraryDay: {
    backgroundColor: "#F3F7FF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D8E8FC",
  },
  itineraryDayEmpty: {
    backgroundColor: "#FAFBFC",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8ECF1",
  },
  itineraryDayTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#007BFF",
    marginBottom: 6,
  },
  itineraryDayBody: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
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
