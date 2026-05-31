/**
 * Activity Detail
 * Route: /guide/activity_detail
 *
 * View or delete guide's own activity. GET/DELETE /api/activities/:id
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../components/screen-header";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import { API_URL } from "../../constants/api";
import {
  isActivityRejectedStatus,
  parseActivityFromResponse,
  pickRejectionReason,
  pickRouteParam,
} from "../../utils/activityRejection";

type ActivityPayload = {
  id: string;
  name: string;
  location: string;
  description: string;
  category: string;
  photos: string[];
  duration: number;
  difficulty: string;
  equipment?: string;
  status?: string;
  rejectionReason?: string | null;
};

const { width: SCREEN_W } = Dimensions.get("window");

export default function GuideActivityDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const activityId = pickRouteParam(params.id);

  // --- Local state ---
  const [activity, setActivity] = useState<ActivityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const loadActivity = useCallback(async () => {
    if (!activityId) {
      setLoading(false);
      setLoadError(null);
      setActivity(null);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setLoadError("Please sign in again to view this activity.");
        return;
      }

      const res = await fetch(`${API_URL}/api/activities/${activityId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      const raw = parseActivityFromResponse(data);

      if (!res.ok || !raw) {
        setLoadError(
          (typeof data.msg === "string" && data.msg) ||
            "Could not load this activity. It may have been removed."
        );
        return;
      }

      setActivity({
        id: String(raw.id),
        name: String(raw.name ?? ""),
        location: String(raw.location ?? ""),
        description: String(raw.description ?? ""),
        category: String(raw.category ?? ""),
        photos: Array.isArray(raw.photos) ? (raw.photos as string[]) : [],
        duration:
          typeof raw.duration === "number"
            ? raw.duration
            : parseInt(String(raw.duration), 10) || 0,
        difficulty: String(raw.difficulty ?? ""),
        equipment: raw.equipment != null ? String(raw.equipment) : undefined,
        status: raw.status != null ? String(raw.status) : undefined,
        rejectionReason: pickRejectionReason(raw),
      });
    } catch {
      setLoadError("Failed to load activity. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  // --- Effects (load data, listeners) ---
  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const deleteActivityById = async (id: string) => {
    setDeleting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Login required", "Please sign in again.");
        return;
      }
      const res = await fetch(`${API_URL}/api/activities/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Couldn't delete", data.msg || "Something went wrong.");
        return;
      }
      Alert.alert("Deleted", data.msg || "Activity removed successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to delete. Check your connection.");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteActivity = () => {
    if (!activity) return;
    Alert.alert(
      "Delete activity",
      `Permanently remove "${activity.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteActivityById(activity.id),
        },
      ]
    );
  };

  const isRejected = isActivityRejectedStatus(activity?.status);
  const rejectionReason = activity?.rejectionReason ?? null;

  const openEditActivity = () => {
    const id = activity?.id || activityId;
    if (!id) return;
    router.push({
      pathname: "/guide/create_activity",
      params: { activityId: id },
    });
  };

  const photoUrls =
    activity?.photos?.map((p) =>
      p.startsWith("http") ? p : `${API_URL}${p}`
    ) ?? [];

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading activity…</Text>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Ionicons
          name={activityId ? "cloud-offline-outline" : "search-outline"}
          size={48}
          color="#999"
          style={{ marginBottom: 12 }}
        />
        <Text style={styles.errorText}>
          {activityId
            ? loadError || "Could not load this activity."
            : "Activity not found"}
        </Text>
        {activityId ? (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => void loadActivity()}>
              <Text style={styles.backBtnText}>Try again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={openEditActivity}
            >
              <Text style={styles.secondaryBtnText}>Open edit screen</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // --- Render ---
  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom + 152 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={activity.name} marginBottom={12} />

        {isRejected ? (
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionHeaderRow}>
              <Ionicons name="alert-circle" size={22} color="#DC2626" />
              <Text style={styles.rejectionTitle}>Activity not approved</Text>
            </View>
            <Text style={styles.rejectionMessage}>
              Your activity was reviewed and needs changes before it can go live.
              Read the admin feedback below, then edit and resubmit.
            </Text>
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Admin feedback</Text>
              <Text style={styles.reasonText}>
                {rejectionReason ||
                  "No specific reason was provided. Please review your listing and try again."}
              </Text>
            </View>
          </View>
        ) : activity.status ? (
          <View style={styles.statusBanner}>
            <Text style={styles.statusLabel}>
              Status: {activity.status.replace(/_/g, " ")}
            </Text>
          </View>
        ) : null}

        {photoUrls.length > 0 ? (
          <View style={styles.galleryWrap}>
            <FlatList
              data={photoUrls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item}-${i}`}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x /
                    e.nativeEvent.layoutMeasurement.width
                );
                setPhotoIndex(idx);
              }}
              renderItem={({ item }) => (
                <View style={styles.photoSlide}>
                  <Image source={{ uri: item }} style={styles.photo} />
                </View>
              )}
            />
            {photoUrls.length > 1 ? (
              <Text style={styles.photoCount}>
                {photoIndex + 1} / {photoUrls.length}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="image-outline" size={48} color="#ccc" />
          </View>
        )}

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={18} color="#007BFF" />
          <Text style={styles.metaText}>{activity.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="pricetag-outline" size={18} color="#007BFF" />
          <Text style={styles.metaText}>{activity.category}</Text>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.infoCard}>
            <Ionicons name="time-outline" size={28} color="#007BFF" />
            <Text style={styles.cardTitle}>{activity.duration} days</Text>
            <Text style={styles.cardSub}>Duration</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="bar-chart-outline" size={28} color="#007BFF" />
            <Text style={styles.cardTitle}>{activity.difficulty}</Text>
            <Text style={styles.cardSub}>Difficulty</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.body}>{activity.description}</Text>

        {activity.equipment ? (
          <>
            <Text style={styles.sectionTitle}>Equipment</Text>
            <View style={styles.equipmentBlock}>
              {activity.equipment
                .split("\n")
                .filter((line) => line.trim())
                .map((line, i) => (
                  <Text key={i} style={styles.equipmentLine}>
                    • {line.trim().replace(/^[•\-\*]\s*/, "")}
                  </Text>
                ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.editBtn, deleting && styles.footerBtnDisabled]}
          onPress={openEditActivity}
          activeOpacity={0.85}
          disabled={deleting}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.editBtnText}>
            {isRejected ? "Edit and resubmit" : "Edit activity"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && styles.footerBtnDisabled]}
          onPress={confirmDeleteActivity}
          activeOpacity={0.85}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#DC3545" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#DC3545" />
              <Text style={styles.deleteBtnText}>Delete activity</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F7FF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F7FF" },
  loadingText: { marginTop: 12, fontFamily: "Nunito_400Regular", color: "#666" },
  errorText: { fontFamily: "Nunito_700Bold", color: "#333", marginBottom: 16, textAlign: "center" },
  backBtn: { backgroundColor: "#007BFF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginBottom: 10 },
  backBtnText: { color: "#fff", fontFamily: "Nunito_700Bold" },
  secondaryBtn: { paddingHorizontal: 24, paddingVertical: 12 },
  secondaryBtnText: { color: "#007BFF", fontFamily: "Nunito_700Bold" },
  statusBanner: {
    marginHorizontal: PAGE_PADDING_HORIZONTAL,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#E8F4FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5DDF5",
  },
  statusLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#0B2A4A" },
  rejectionCard: {
    marginHorizontal: PAGE_PADDING_HORIZONTAL,
    marginBottom: 16,
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  rejectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  rejectionTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#DC2626",
  },
  rejectionMessage: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  reasonContainer: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 14,
  },
  reasonLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#333",
    marginBottom: 6,
  },
  reasonText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  galleryWrap: { marginBottom: 12 },
  photoSlide: { width: SCREEN_W, alignItems: "center" },
  photo: {
    width: SCREEN_W - 32,
    height: 220,
    borderRadius: 12,
    alignSelf: "center",
    backgroundColor: "#e8e8e8",
  },
  photoPlaceholder: { justifyContent: "center", alignItems: "center", marginHorizontal: PAGE_PADDING_HORIZONTAL },
  photoCount: {
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#666",
  },
  metaRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 8, gap: 8 },
  metaText: { flex: 1, fontFamily: "Nunito_400Regular", fontSize: 15, color: "#333" },
  cardRow: { flexDirection: "row", paddingHorizontal: PAGE_PADDING_HORIZONTAL, gap: 12, marginVertical: 16 },
  infoCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTitle: { fontFamily: "Nunito_700Bold", fontSize: 16, color: "#111", marginTop: 8 },
  cardSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#666", marginTop: 4 },
  sectionTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#111",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  body: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
    marginHorizontal: 20,
  },
  equipmentBlock: { marginHorizontal: 20, marginBottom: 16 },
  equipmentLine: { fontFamily: "Nunito_400Regular", fontSize: 14, color: "#444", marginBottom: 6, lineHeight: 20 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 14,
  },
  editBtnText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 16 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#DC3545",
    backgroundColor: "#FFF5F5",
    minHeight: 50,
  },
  deleteBtnText: { color: "#DC3545", fontFamily: "Nunito_700Bold", fontSize: 16 },
  footerBtnDisabled: { opacity: 0.55 },
});
