import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { API_URL } from "../../constants/api";

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
  const params = useLocalSearchParams<{
    id: string;
    status?: string;
    rejectionReason?: string;
  }>();

  const activityId = params.id?.trim() || "";
  const [activity, setActivity] = useState<ActivityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!activityId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/activities/${activityId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.activity) {
          Alert.alert("Error", data.msg || "Could not load this activity.");
          router.back();
          return;
        }
        setActivity(data.activity);
      } catch {
        if (!cancelled) {
          Alert.alert("Error", "Failed to load activity.");
          router.back();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

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

  const statusLabel =
    activity?.status ?? params.status ?? "";
  const rejectionReason =
    activity?.rejectionReason ?? params.rejectionReason ?? null;

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
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Activity not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom + 152 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {activity.name}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        {statusLabel ? (
          <View style={styles.statusBanner}>
            <Text style={styles.statusLabel}>Status: {statusLabel}</Text>
            {rejectionReason ? (
              <Text style={styles.rejectionText}>{rejectionReason}</Text>
            ) : null}
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
          onPress={() =>
            router.push({
              pathname: "/guide/create_activity",
              params: { activityId: activity.id },
            })
          }
          activeOpacity={0.85}
          disabled={deleting}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.editBtnText}>Edit activity</Text>
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
  errorText: { fontFamily: "Nunito_700Bold", color: "#333", marginBottom: 16 },
  backBtn: { backgroundColor: "#007BFF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: "#fff", fontFamily: "Nunito_700Bold" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#111",
    textAlign: "center",
  },
  statusBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#E8F4FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5DDF5",
  },
  statusLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#0B2A4A" },
  rejectionText: { marginTop: 6, fontFamily: "Nunito_400Regular", fontSize: 13, color: "#5c6570" },
  galleryWrap: { marginBottom: 12 },
  photoSlide: { width: SCREEN_W, alignItems: "center" },
  photo: {
    width: SCREEN_W - 32,
    height: 220,
    borderRadius: 12,
    alignSelf: "center",
    backgroundColor: "#e8e8e8",
  },
  photoPlaceholder: { justifyContent: "center", alignItems: "center", marginHorizontal: 16 },
  photoCount: {
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#666",
  },
  metaRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 8, gap: 8 },
  metaText: { flex: 1, fontFamily: "Nunito_400Regular", fontSize: 15, color: "#333" },
  cardRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginVertical: 16 },
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
