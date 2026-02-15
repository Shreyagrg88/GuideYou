import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../../constants/api";
import GuideNavbar from "../components/guide_navbar";

const NAVBAR_HEIGHT = 70;

type GuideProfile = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatar: string;
  bio: string;
  mainExpertise: string;
  location: string;
  expertise: string[];
  yearsOfExperience?: number | string;
  rating?: number;
  rate?: number | string;
  languages?: string[];
};

type GuideActivity = {
  id: string;
  name: string;
  location: string;
  description: string;
  category: string;
  photos: string[];
  duration: number;
  difficulty: string;
  status: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

type DummyReview = { id: string; name: string; rating: number; comment: string };

const DUMMY_REVIEWS: DummyReview[] = [
  { id: "1", name: "Sarah Miller", rating: 5, comment: "Lukas was incredible! His knowledge of the Dolomites made our trek safe and unforgettable." },
  { id: "2", name: "James Dupont", rating: 5, comment: "Very professional and patient. He taught us so much about the flora of the region." },
];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [rateDisplay, setRateDisplay] = useState<string>("$10/day");
  const [activities, setActivities] = useState<GuideActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesScrollX, setActivitiesScrollX] = useState(0);
  const [activitiesContentWidth, setActivitiesContentWidth] = useState(0);
  const [activitiesContainerWidth, setActivitiesContainerWidth] = useState(0);
  const activitiesScrollRef = useRef<ScrollView>(null);

  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const token = AsyncStorage.getItem("token").then((t) => {
      if (!t) return;
      fetch(`${API_URL}/api/guide/availability`, { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.pricing?.length > 0 && data.pricing[0].price != null) {
            const p = data.pricing[0];
            const unit = (p.unit || "").toLowerCase().includes("day") ? "/day" : `/${p.unit || "day"}`;
            setRateDisplay(`$${p.price}${unit}`);
          }
        })
        .catch(() => {});
    });
  }, [profile?.id]);

  useEffect(() => {
    const fetchMyActivities = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      setActivitiesLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/activities/guide/my-activities`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) setActivities(data.activities || []);
      } catch {
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    };
    if (profile?.id) fetchMyActivities();
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/guide/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        router.replace("/login");
        return;
      }

      setProfile(data.guide);
    } catch (error) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove(["token", "user", "role"]);
            router.replace("/login");
          },
        },
      ]
    );
  };

  const getAvatarUri = () => {
    if (!profile?.avatar) {
      return "https://images.unsplash.com/photo-1544005313-94ddf0286df2";
    }
    return profile.avatar.startsWith("http")
      ? profile.avatar
      : `${API_URL}${profile.avatar}`;
  };

  const getActivityImageUri = (photos: string[]) => {
    if (photos?.length > 0 && photos[0]) {
      return photos[0].startsWith("http") ? photos[0] : `${API_URL}${photos[0]}`;
    }
    return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";
  };

  const showActivitiesLeftArrow = activities.length > 1 && activitiesScrollX > 10;
  const showActivitiesRightArrow =
    activities.length > 1 && activitiesContentWidth > activitiesContainerWidth && activitiesScrollX < activitiesContentWidth - activitiesContainerWidth - 10;

  const scrollActivitiesLeft = () => {
    const newX = Math.max(0, activitiesScrollX - 172);
    activitiesScrollRef.current?.scrollTo({ x: newX, animated: true });
  };
  const scrollActivitiesRight = () => {
    const maxScroll = Math.max(0, activitiesContentWidth - activitiesContainerWidth);
    const newX = Math.min(maxScroll, activitiesScrollX + 172);
    activitiesScrollRef.current?.scrollTo({ x: newX, animated: true });
  };
  const handleActivitiesScroll = (e: { nativeEvent: { contentOffset: { x: number }; contentSize: { width: number }; layoutMeasurement: { width: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setActivitiesScrollX(contentOffset.x);
    setActivitiesContentWidth(contentSize.width);
    setActivitiesContainerWidth(layoutMeasurement.width);
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) return null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: NAVBAR_HEIGHT + insets.bottom + 30,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/guide/home_guide")}>
            <Ionicons name="chevron-back" size={s(26)} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: s(20) }]}>Profile</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.ellipsisBtn}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Profile block – reference layout */}
        <View style={styles.profileBlock}>
          <Image source={{ uri: getAvatarUri() }} style={[styles.avatar, { width: s(100), height: s(100) }]} />
          <Text style={[styles.displayName, { fontSize: s(20) }]}>{profile.fullName || profile.username}</Text>
          {(profile.mainExpertise || (profile.expertise && profile.expertise.length > 0)) ? (
            <View style={styles.locationRow}>
              <Ionicons name="ribbon-outline" size={s(14)} color="#666" />
              <Text style={[styles.locationText, { fontSize: s(13) }]}>
                {profile.mainExpertise || profile.expertise?.[0] || "—"}
              </Text>
            </View>
          ) : null}
          {profile.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={s(14)} color="#666" />
              <Text style={[styles.locationText, { fontSize: s(13) }]}>{profile.location}</Text>
            </View>
          ) : null}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Exp</Text>
              <Text style={styles.statValue}>
                {profile.yearsOfExperience != null && profile.yearsOfExperience !== ""
                  ? `${profile.yearsOfExperience} Yrs`
                  : " "}
              </Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statLabel}>Rate</Text>
              <Text style={styles.statValue}>{rateDisplay}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statValue}>{profile.rating != null ? profile.rating.toFixed(1) : "4.9"}</Text>
            </View>
          </View>
          <View style={styles.bioBlock}>
            <Text style={styles.bioLabel}>Bio</Text>
            <Text style={[styles.bio, { fontSize: s(14) }]}>{profile.bio || "No bio yet."}</Text>
          </View>
          <View style={styles.bioBlock}>
            <Text style={styles.bioLabel}>Language:</Text>
            <Text style={[styles.bio, { fontSize: s(14) }]}>
              {profile.languages && profile.languages.length > 0
                ? (Array.isArray(profile.languages) ? profile.languages : [profile.languages]).join(", ")
                : "—"}
            </Text>
          </View>
        </View>

        {/* Edit buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/guide/edit_profile")}>
            <Ionicons name="pencil-outline" size={18} color="#007BFF" />
            <Text style={styles.primaryBtnText}>Edit profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/guide/availability")}>
            <Ionicons name="calendar-outline" size={18} color="#007BFF" />
            <Text style={styles.primaryBtnText}>Edit availability</Text>
          </TouchableOpacity>
        </View>

        {/* Activities */}
        <Text style={styles.sectionTitle}>My Activities</Text>
        {activitiesLoading ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#007BFF" />
          </View>
        ) : activities.length === 0 ? (
          <Text style={styles.activityEmptyText}>No activities yet. Create your first activity!</Text>
        ) : (
          <View style={styles.activitiesArrowWrapper}>
            <ScrollView
              ref={activitiesScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activitiesScroll}
              onScroll={handleActivitiesScroll}
              scrollEventThrottle={16}
              onContentSizeChange={(w) => setActivitiesContentWidth(w)}
              onLayout={(e) => setActivitiesContainerWidth(e.nativeEvent.layout.width)}
            >
              {activities.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.activityCard}
                  onPress={() => router.push({ pathname: "/guide/create_activity", params: { activityId: a.id } })}
                >
                  <Image source={{ uri: getActivityImageUri(a.photos) }} style={styles.activityImage} />
                  <Text style={styles.activityCardTitle} numberOfLines={2}>{a.name}</Text>
                  <Text style={styles.activityCardPrice}>{a.duration} days • {a.difficulty || "—"}</Text>
                  {a.status !== "published" && (
                    <Text style={styles.activityStatusBadge}>{a.status.replace("_", " ")}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {showActivitiesLeftArrow && (
              <TouchableOpacity style={[styles.arrowIndicator, styles.arrowLeft]} onPress={scrollActivitiesLeft} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {showActivitiesRightArrow && (
              <TouchableOpacity style={[styles.arrowIndicator, styles.arrowRight]} onPress={scrollActivitiesRight} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reviews */}
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>
        {DUMMY_REVIEWS.map((r) => (
          <View key={r.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewAvatar}>
                <Ionicons name="person" size={16} color="#666" />
              </View>
              <Text style={styles.reviewName}>{r.name}</Text>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons key={i} name={i <= r.rating ? "star" : "star-outline"} size={14} color="#FFD700" />
              ))}
            </View>
            <Text style={styles.reviewComment}>{r.comment}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Ellipsis menu modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.modalMenuRow}
              onPress={() => { setMenuVisible(false); router.push("/guide/payment"); }}
            >
              <Ionicons name="card-outline" size={20} color="#333" />
              <Text style={styles.modalMenuText}>Payment method</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalMenuRow, styles.modalMenuRowLast]}
              onPress={() => { setMenuVisible(false); handleLogout(); }}
            >
              <Ionicons name="log-out-outline" size={20} color="#E53935" />
              <Text style={styles.logoutText}>Logout</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View
        style={[
          styles.navbarWrapper,
          { paddingBottom: insets.bottom },
        ]}
      >
        <GuideNavbar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F7FF" },
  container: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 20 },
  ellipsisBtn: { padding: 8, width: 40, alignItems: "flex-end" },

  profileBlock: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: { borderRadius: 100, marginBottom: 10 },
  displayName: { fontFamily: "Nunito_700Bold", color: "#1a1a1a", marginBottom: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  locationText: { fontFamily: "Nunito_400Regular", color: "#666" },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 14,
    backgroundColor: "#F5F8FC",
    borderRadius: 10,
    overflow: "hidden",
  },
  statCell: { flex: 1, paddingVertical: 10, alignItems: "center" },
  statCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#E5E7EB" },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "#666", marginBottom: 2 },
  statValue: { fontFamily: "Nunito_700Bold", fontSize: 13, color: "#333" },
  bioBlock: { width: "100%", marginBottom: 10, paddingHorizontal: 4 },
  bioLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#333", marginBottom: 4 },
  bio: { fontFamily: "Nunito_400Regular", color: "#444", lineHeight: 20 },

  actionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#007BFF",
  },
  primaryBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#007BFF" },

  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 18, marginBottom: 12 },
  activitiesArrowWrapper: { position: "relative", marginBottom: 4 },
  activitiesScroll: { paddingBottom: 12, paddingRight: 20 },
  arrowIndicator: {
    position: "absolute",
    top: 50,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowLeft: { left: 0 },
  arrowRight: { right: 0 },
  activityCard: {
    width: 160,
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  activityImage: { width: "100%", height: 100, backgroundColor: "#E0E0E0" },
  activityCardTitle: { fontFamily: "Nunito_700Bold", fontSize: 13, padding: 10, color: "#333" },
  activityCardPrice: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#007BFF", paddingHorizontal: 10, paddingBottom: 10 },
  activityEmptyText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: "#666", marginBottom: 12 },
  activityStatusBadge: { fontFamily: "Nunito_400Regular", fontSize: 10, color: "#888", paddingHorizontal: 10, paddingBottom: 8 },
  reviewsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 },
  viewAllText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#007BFF" },
  reviewCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  reviewAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E7F0FF", justifyContent: "center", alignItems: "center", marginRight: 8 },
  reviewName: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#333" },
  starsRow: { flexDirection: "row", gap: 2, marginBottom: 6 },
  reviewComment: { fontFamily: "Nunito_400Regular", fontSize: 13, color: "#555", lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", paddingTop: 56, paddingRight: 20, alignItems: "flex-end" },
  menuCard: { backgroundColor: "#FFF", borderRadius: 12, minWidth: 200, overflow: "hidden" },
  modalMenuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  modalMenuRowLast: { borderBottomWidth: 0 },
  modalMenuText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#333", flex: 1 },
  logoutText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#E53935", flex: 1 },

  navbarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontFamily: "Nunito_400Regular", color: "#666" },
});
