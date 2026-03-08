import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
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

type TouristProfile = {
  id: string;
  fullName?: string;
  username?: string;
  email?: string | null;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  languages?: string[];
  interests?: string[];
};

type PastActivityItem = {
  id: string;
  title: string;
  location: string;
  imageUri: string;
  dateRange: string;
  isCustomTour: boolean;
  participantCount: number;
};

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1544005313-94ddf0286df2";
const DEFAULT_ACTIVITY_IMAGE = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";

const toArray = (v: unknown): string[] => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
};

export default function TouristProfileView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    touristId?: string;
    touristName?: string;
    touristAvatar?: string;
    touristEmail?: string;
    touristUsername?: string;
  }>();

  const touristId = params.touristId;
  const [profile, setProfile] = useState<TouristProfile | null>(null);
  const [pastActivities, setPastActivities] = useState<PastActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(!!touristId);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pastScrollX, setPastScrollX] = useState(0);
  const [pastContentWidth, setPastContentWidth] = useState(0);
  const [pastContainerWidth, setPastContainerWidth] = useState(0);
  const pastScrollRef = useRef<ScrollView>(null);

  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  const setProfileFromParams = useCallback((tid: string) => {
    setProfile({
      id: tid,
      fullName: params.touristName ?? undefined,
      username: params.touristUsername ?? "",
      email: params.touristEmail ?? null,
      avatar: params.touristAvatar ?? null,
      bio: null,
      location: null,
      languages: [],
      interests: [],
    });
  }, [params.touristName, params.touristAvatar, params.touristEmail, params.touristUsername]);

  const fetchTouristProfile = useCallback(async (tid: string) => {
    try {
      setProfileLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setProfileFromParams(tid);
        return;
      }

      const response = await fetch(`${API_URL}/api/guide/tourists/${tid}/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const raw = data.tourist || data;
        if (raw) {
          setProfile({
            id: raw.id ?? tid,
            fullName: raw.fullName ?? raw.name ?? params.touristName,
            username: raw.username ?? params.touristUsername ?? "",
            email: raw.email ?? params.touristEmail ?? null,
            avatar: raw.avatar ?? params.touristAvatar ?? null,
            bio: raw.bio ?? null,
            location: raw.location ?? null,
            languages: toArray(raw.languages),
            interests: toArray(raw.interests),
          });
          return;
        }
      }
      setProfileFromParams(tid);
    } catch {
      setProfileFromParams(tid);
    } finally {
      setProfileLoading(false);
    }
  }, [params.touristName, params.touristAvatar, params.touristEmail, params.touristUsername, setProfileFromParams]);

  const fetchPastBookings = useCallback(async (tid: string) => {
    try {
      setActivitiesLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setPastActivities([]);
        return;
      }

      const response = await fetch(`${API_URL}/api/guide/bookings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await response.text();
      if (!response.ok || text.trim().startsWith("<")) {
        setPastActivities([]);
        return;
      }

      const data = JSON.parse(text);
      const bookings = data.bookings ?? [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const withThisTourist = bookings.filter((b: any) => {
        const bid = b.tourist?.id ?? b.touristId;
        return String(bid) === String(tid);
      });

      const pastFiltered = withThisTourist.filter((b: any) => {
        const status = b.status ?? "";
        const startDate = new Date(b.startDate);
        startDate.setHours(0, 0, 0, 0);
        return status === "completed" || (status === "paid" && startDate < now);
      });

      const past: PastActivityItem[] = pastFiltered
        .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        .map((b: any) => {
          const title = b.activity?.name || b.tourName || "Custom Tour";
          const location = b.activity?.location || b.location || "—";
          const photo = b.activity?.photos?.[0] || b.activity?.photo;
          const imageUri = photo
            ? (photo.startsWith("http") ? photo : `${API_URL}${photo}`)
            : DEFAULT_ACTIVITY_IMAGE;
          const startStr = b.startDate
            ? new Date(b.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "";
          const endDate = b.endDate ? new Date(b.endDate) : null;
          const endStr = endDate ? endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
          const dateRange = startStr === endStr ? startStr : `${startStr} – ${endStr}`;
          return {
            id: b.id,
            title,
            location,
            imageUri,
            dateRange,
            isCustomTour: !b.activity,
            participantCount: b.participantCount ?? 1,
          };
        });

      setPastActivities(past);
    } catch {
      setPastActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  // Show profile from params immediately so details appear before API (if any)
  useEffect(() => {
    if (!touristId) return;
    if (params.touristName || params.touristAvatar || params.touristEmail || params.touristUsername) {
      setProfile({
        id: touristId,
        fullName: params.touristName ?? undefined,
        username: params.touristUsername ?? "",
        email: params.touristEmail ?? null,
        avatar: params.touristAvatar ?? null,
        bio: null,
        location: null,
        languages: [],
        interests: [],
      });
    }
  }, [touristId, params.touristName, params.touristAvatar, params.touristEmail, params.touristUsername]);

  useEffect(() => {
    if (!touristId) {
      setError("Tourist not specified.");
      setLoading(false);
      setProfileLoading(false);
      setActivitiesLoading(false);
      return;
    }
    setLoading(false);
    fetchTouristProfile(touristId);
    fetchPastBookings(touristId);
  }, [touristId, fetchTouristProfile, fetchPastBookings]);

  const name = profile?.fullName ?? profile?.username ?? params.touristName ?? "Tourist";
  const username = profile?.username ?? params.touristUsername ?? "";
  const email = profile?.email ?? params.touristEmail ?? null;
  const avatarSrc = profile?.avatar ?? params.touristAvatar ?? null;
  const bio = profile?.bio ?? null;
  const location = profile?.location ?? null;
  const languages = profile?.languages ?? [];
  const interests = profile?.interests ?? [];

  const getAvatarUri = (): string | null => {
    if (!avatarSrc) return null;
    // Treat the shared stock image as "no custom dp"
    const normalized = avatarSrc.startsWith("http") ? avatarSrc : `${API_URL}${avatarSrc}`;
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
  const handlePastScroll = (e: {
    nativeEvent: {
      contentOffset: { x: number };
      contentSize: { width: number };
      layoutMeasurement: { width: number };
    };
  }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setPastScrollX(contentOffset.x);
    setPastContentWidth(contentSize.width);
    setPastContainerWidth(layoutMeasurement.width);
  };

  const handleOpenBooking = (bookingId: string) => {
    router.push({
      pathname: "/guide/booking_detail",
      params: { bookingId },
    });
  };

  const handleChat = () => {
    if (!touristId) return;
    router.push({
      pathname: "/guide/chat_guide",
      params: {
        counterpartId: touristId,
        touristName: name,
        touristAvatar: avatarSrc ?? undefined,
      },
    });
  };

  if (!touristId) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.errorText}>Tourist not specified.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color="#999" />
        <Text style={[styles.errorText, { marginTop: 12 }]}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalBookings = pastActivities.length;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: NAVBAR_HEIGHT + insets.bottom + 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={s(26)} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: s(20) }]}>Profile</Text>
          <View style={styles.headerBtn} />
        </View>

        {(loading || profileLoading) && !profile ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : profile ? (
          <>
            <View style={styles.profileBlock}>
              {getAvatarUri() ? (
                <Image
                  source={{ uri: getAvatarUri()! }}
                  style={[styles.avatar, { width: s(100), height: s(100) }]}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { width: s(100), height: s(100) }]}>
                  <Text style={styles.avatarInitials}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.displayName, { fontSize: s(20) }]}>{name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="person-outline" size={s(14)} color="#666" />
                <Text style={[styles.locationText, { fontSize: s(13) }]}>Tourist</Text>
              </View>
              {location ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={s(14)} color="#666" />
                  <Text style={[styles.locationText, { fontSize: s(13) }]}>{location}</Text>
                </View>
              ) : null}
              <View style={styles.statsRow}>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>Completed tours with you</Text>
                  <Text style={styles.statValue}>{totalBookings}</Text>
                </View>
              </View>
              {bio != null && bio !== "" ? (
                <View style={styles.bioBlock}>
                  <Text style={styles.bioLabel}>Bio</Text>
                  <Text style={[styles.bio, { fontSize: s(14) }]}>{bio}</Text>
                </View>
              ) : null}
              {languages.length > 0 ? (
                <View style={styles.bioBlock}>
                  <Text style={styles.bioLabel}>Languages</Text>
                  <Text style={[styles.bio, { fontSize: s(14) }]}>{languages.join(", ")}</Text>
                </View>
              ) : null}
              {interests.length > 0 ? (
                <View style={styles.bioBlock}>
                  <Text style={styles.bioLabel}>Interests</Text>
                  <Text style={[styles.bio, { fontSize: s(14) }]}>{interests.join(", ")}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleChat}>
                <Ionicons name="chatbubble-outline" size={18} color="#007BFF" />
                <Text style={styles.primaryBtnText}>Message</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Past activities with you</Text>
            {activitiesLoading ? (
              <View style={styles.loadingSmall}>
                <ActivityIndicator size="small" color="#007BFF" />
              </View>
            ) : pastActivities.length === 0 ? (
              <Text style={styles.activityEmptyText}>
                No past activities with this tourist yet. Completed tours will appear here.
              </Text>
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
                      onPress={() => handleOpenBooking(a.id)}
                    >
                      <Image source={{ uri: a.imageUri }} style={styles.activityImage} />
                      <Text style={styles.activityCardTitle} numberOfLines={2}>
                        {a.title}
                      </Text>
                      <Text style={styles.activityCardPrice}>{a.dateRange}</Text>
                      <Text style={styles.activityCardSub}>
                        Party of {a.participantCount}
                      </Text>
                      {a.isCustomTour ? (
                        <Text style={styles.activityStatusBadge}>Custom tour</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {showPastLeftArrow && (
                  <TouchableOpacity
                    style={[styles.arrowIndicator, styles.arrowLeft]}
                    onPress={scrollPastLeft}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
                {showPastRightArrow && (
                  <TouchableOpacity
                    style={[styles.arrowIndicator, styles.arrowRight]}
                    onPress={scrollPastRight}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.navbarWrap, { paddingBottom: insets.bottom }]}>
        <GuideNavbar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F7FF" },
  centered: { justifyContent: "center", alignItems: "center", padding: 24 },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: "#000" },
  loadingWrap: { paddingVertical: 48, alignItems: "center" },
  loadingText: { marginTop: 10, fontFamily: "Nunito_400Regular", color: "#666" },
  loadingSmall: { paddingVertical: 24, alignItems: "center" },
  errorText: { fontFamily: "Nunito_400Regular", fontSize: 16, color: "#666" },
  backBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#007BFF",
    borderRadius: 12,
  },
  backBtnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: "#FFF" },

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

  navbarWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
});
