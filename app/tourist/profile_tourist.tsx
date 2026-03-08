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
import TouristNavbar from "../components/tourist_navbar";

const NAVBAR_HEIGHT = 70;

type TouristProfile = {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  languages?: string[];
  interests?: string[];
};

type PastActivityItem = {
  id: string;
  title: string;
  location: string;
  imageUri: string;
  guideName: string;
  dateRange: string;
  isCustomTour: boolean;
};

export default function ProfileTourist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [profile, setProfile] = useState<TouristProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pastActivities, setPastActivities] = useState<PastActivityItem[]>([]);
  const [pastActivitiesLoading, setPastActivitiesLoading] = useState(false);
  const [pastScrollX, setPastScrollX] = useState(0);
  const [pastContentWidth, setPastContentWidth] = useState(0);
  const [pastContainerWidth, setPastContainerWidth] = useState(0);
  const pastScrollRef = useRef<ScrollView>(null);

  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }
      const response = await fetch(`${API_URL}/api/tourist/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const text = await response.text();
      if (!response.ok || text.trim().startsWith("<")) {
        if (response.status === 401 || response.status === 404) {
          setProfile({
            id: "",
            username: "Tourist",
            fullName: "Tourist User",
            avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
          });
          return;
        }
        router.replace("/login");
        return;
      }
      const data = JSON.parse(text);
      const raw = data.tourist || data.user || data;
      if (!raw) {
        setProfile(null);
        return;
      }
      const toArray = (v: unknown): string[] => {
        if (v == null) return [];
        if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
        return String(v).split(",").map((s) => s.trim()).filter(Boolean);
      };
      setProfile({
        ...raw,
        languages: toArray(raw.languages),
        interests: toArray(raw.interests),
      });
    } catch {
      setProfile({
        id: "",
        username: "Tourist",
        fullName: "Tourist User",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchPastActivities = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;
    setPastActivitiesLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/tourist/bookings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const text = await response.text();
      if (!response.ok || text.trim().startsWith("<")) {
        setPastActivities([]);
        return;
      }
      const data = JSON.parse(text);
      const bookings = data.bookings || [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const past: PastActivityItem[] = [];
      bookings.forEach((b: any) => {
        const status = b.status;
        const endDateStr = b.endDate || b.startDate;
        const endDate = endDateStr ? new Date(endDateStr) : null;
        const isPast = status === "completed" || (status === "paid" && endDate && endDate < now);
        if (!isPast) return;

        const title = b.activity?.name || b.tourName || "Custom Tour";
        const location = b.activity?.location || b.location || "—";
        const photo = b.activity?.photos?.[0] || b.activity?.photo;
        const imageUri = photo
          ? (photo.startsWith("http") ? photo : `${API_URL}${photo}`)
          : "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";
        const guideName = b.guide?.name || b.guide?.username || "Guide";
        const startStr = b.startDate ? new Date(b.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
        const endStr = endDate ? endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
        const dateRange = startStr === endStr ? startStr : `${startStr} – ${endStr}`;

        past.push({
          id: b.id,
          title,
          location,
          imageUri,
          guideName,
          dateRange,
          isCustomTour: !b.activity,
        });
      });
      setPastActivities(past);
    } catch {
      setPastActivities([]);
    } finally {
      setPastActivitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!loading && profile?.id !== undefined) {
      fetchPastActivities();
    }
  }, [loading, profile?.id, fetchPastActivities]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

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
            await AsyncStorage.multiRemove(["token", "user", "role", "userRole", "userId"]);
            router.replace("/login");
          },
        },
      ]
    );
  };

  const getAvatarUri = (): string | null => {
    if (!profile?.avatar) return null;
    const normalized = profile.avatar.startsWith("http")
      ? profile.avatar
      : `${API_URL}${profile.avatar}`;
    // Treat the shared stock image as "no custom dp"
    if (normalized.includes("photo-1544005313-94ddf0286df2")) {
      return null;
    }
    return normalized;
  };

  const showPastLeftArrow = pastActivities.length > 1 && pastScrollX > 10;
  const showPastRightArrow =
    pastActivities.length > 1 &&
    pastContentWidth > pastContainerWidth &&
    pastScrollX < pastContentWidth - pastContainerWidth - 10;

  const scrollPastLeft = () => {
    const newX = Math.max(0, pastScrollX - 172);
    pastScrollRef.current?.scrollTo({ x: newX, animated: true });
  };
  const scrollPastRight = () => {
    const maxScroll = Math.max(0, pastContentWidth - pastContainerWidth);
    const newX = Math.min(maxScroll, pastScrollX + 172);
    pastScrollRef.current?.scrollTo({ x: newX, animated: true });
  };
  const handlePastScroll = (e: { nativeEvent: { contentOffset: { x: number }; contentSize: { width: number }; layoutMeasurement: { width: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setPastScrollX(contentOffset.x);
    setPastContentWidth(contentSize.width);
    setPastContainerWidth(layoutMeasurement.width);
  };

  const totalBookings = pastActivities.length;

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/tourist/home_tourist")}>
            <Ionicons name="chevron-back" size={s(26)} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: s(20) }]}>Profile</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.ellipsisBtn}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileBlock}>
          {getAvatarUri() ? (
            <Image
              source={{ uri: getAvatarUri()! }}
              style={[styles.avatar, { width: s(100), height: s(100) }]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { width: s(100), height: s(100) },
              ]}
            >
              <Text style={styles.avatarInitials}>
                {(profile.fullName || profile.username || "T").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.displayName, { fontSize: s(20) }]}>{profile.fullName || profile.username}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="person-outline" size={s(14)} color="#666" />
            <Text style={[styles.locationText, { fontSize: s(13) }]}>Tourist</Text>
          </View>
          {profile.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={s(14)} color="#666" />
              <Text style={[styles.locationText, { fontSize: s(13) }]}>{profile.location}</Text>
            </View>
          ) : null}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Completed tours</Text>
              <Text style={styles.statValue}>{totalBookings}</Text>
            </View>
          </View>
          {(profile.bio != null && profile.bio !== "") && (
            <View style={styles.bioBlock}>
              <Text style={styles.bioLabel}>Bio</Text>
              <Text style={[styles.bio, { fontSize: s(14) }]}>{profile.bio}</Text>
            </View>
          )}
          {profile.languages && profile.languages.length > 0 && (
            <View style={styles.bioBlock}>
              <Text style={styles.bioLabel}>Languages</Text>
              <Text style={[styles.bio, { fontSize: s(14) }]}>
                {(Array.isArray(profile.languages) ? profile.languages : [profile.languages]).join(", ")}
              </Text>
            </View>
          )}
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.bioBlock}>
              <Text style={styles.bioLabel}>Interests</Text>
              <Text style={[styles.bio, { fontSize: s(14) }]}>
                {(Array.isArray(profile.interests) ? profile.interests : [profile.interests]).join(", ")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/tourist/edit_profile")}
          >
            <Ionicons name="pencil-outline" size={18} color="#007BFF" />
            <Text style={styles.primaryBtnText}>Edit profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/tourist/bookings_tourist")}>
            <Ionicons name="albums-outline" size={18} color="#007BFF" />
            <Text style={styles.primaryBtnText}>My Bookings</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Past Activities</Text>
        {pastActivitiesLoading ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#007BFF" />
          </View>
        ) : pastActivities.length === 0 ? (
          <Text style={styles.activityEmptyText}>No past activities yet. Your completed tours will appear here.</Text>
        ) : (
          <View style={styles.activitiesArrowWrapper}>
            <ScrollView
              ref={pastScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activitiesScroll}
              onScroll={handlePastScroll}
              scrollEventThrottle={16}
              onContentSizeChange={(w) => setPastContentWidth(w)}
              onLayout={(e) => setPastContainerWidth(e.nativeEvent.layout.width)}
            >
              {pastActivities.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.activityCard}
                  onPress={() => router.push({ pathname: "/tourist/booking_detail", params: { bookingId: a.id } })}
                >
                  <Image source={{ uri: a.imageUri }} style={styles.activityImage} />
                  <Text style={styles.activityCardTitle} numberOfLines={2}>{a.title}</Text>
                  <Text style={styles.activityCardPrice}>{a.dateRange}</Text>
                  <Text style={styles.activityCardSub}>{a.guideName}</Text>
                  {a.isCustomTour && (
                    <Text style={styles.activityStatusBadge}>Custom tour</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {showPastLeftArrow && (
              <TouchableOpacity style={[styles.arrowIndicator, styles.arrowLeft]} onPress={scrollPastLeft} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {showPastRightArrow && (
              <TouchableOpacity style={[styles.arrowIndicator, styles.arrowRight]} onPress={scrollPastRight} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.modalMenuRow}
              onPress={() => {
                setMenuVisible(false);
                router.push("/tourist/payment");
              }}
            >
              <Ionicons name="card-outline" size={20} color="#333" />
              <Text style={styles.modalMenuText}>Payment method</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalMenuRow, styles.modalMenuRowLast]}
              onPress={() => {
                setMenuVisible(false);
                handleLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#E53935" />
              <Text style={styles.logoutText}>Logout</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.navbarWrapper, { paddingBottom: insets.bottom }]}>
        <TouristNavbar />
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
  avatar: { borderRadius: 100, marginBottom: 10, justifyContent: "center", alignItems: "center" },
  avatarPlaceholder: { backgroundColor: "#E5E7EB" },
  avatarInitials: {
    fontFamily: "Nunito_700Bold",
    fontSize: 32,
    color: "#111827",
  },
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
  activityCardPrice: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#007BFF", paddingHorizontal: 10 },
  activityCardSub: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "#666", paddingHorizontal: 10, paddingBottom: 4 },
  activityEmptyText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: "#666", marginBottom: 12 },
  activityStatusBadge: { fontFamily: "Nunito_400Regular", fontSize: 10, color: "#888", paddingHorizontal: 10, paddingBottom: 8 },

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
