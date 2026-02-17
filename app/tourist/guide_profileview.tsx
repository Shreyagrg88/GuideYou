import { Ionicons } from "@expo/vector-icons";
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
import TouristNavbar from "../components/tourist_navbar";

const NAVBAR_HEIGHT = 70;

type GuidePublicProfile = {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  bio: string;
  mainExpertise: string;
  location: string;
  yearsOfExperience: number;
  expertise: string[];
  languages: string[];
  pricing: Array<{ title: string; subtitle?: string; price: number; unit: string }>;
  rating: number;
  reviewCount: number;
};

type GuideActivityItem = {
  id: string;
  name: string;
  location?: string;
  photos: string[];
  duration: number;
  difficulty: string;
};

type DummyReview = { id: string; name: string; rating: number; comment: string };

const DUMMY_REVIEWS: DummyReview[] = [
  { id: "1", name: "Sarah Miller", rating: 5, comment: "Lukas was incredible! His knowledge of the Dolomites made our trek safe and unforgettable." },
  { id: "2", name: "James Dupont", rating: 5, comment: "Very professional and patient. He taught us so much about the flora of the region." },
];

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1544005313-94ddf0286df2";

export default function GuideProfileView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    guideId?: string;
    guideName?: string;
    guideImage?: string;
    guideRole?: string;
    guideLocation?: string;
    guideRating?: string;
    guideCharge?: string;
    description?: string;
    activityId?: string;
    duration?: string;
  }>();

  const guideId = params.guideId;
  const [guide, setGuide] = useState<GuidePublicProfile | null>(null);
  const [loading, setLoading] = useState(!!guideId);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<GuideActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesScrollX, setActivitiesScrollX] = useState(0);
  const [activitiesContentWidth, setActivitiesContentWidth] = useState(0);
  const [activitiesContainerWidth, setActivitiesContainerWidth] = useState(0);
  const activitiesScrollRef = useRef<ScrollView>(null);

  const fetchProfile = useCallback(async () => {
    if (!guideId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${API_URL}/api/tourist/guides/${guideId}/profile`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.msg || "Failed to load guide profile");
        setGuide(null);
        return;
      }
      setGuide(data.guide);
    } catch {
      setError("Failed to load guide profile");
      setGuide(null);
    } finally {
      setLoading(false);
    }
  }, [guideId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const id = guideId ?? guide?.id;
    if (!id) return;
    const fetchActivities = async () => {
      setActivitiesLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/api/activities?guideId=${encodeURIComponent(id)}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );
        const data = await response.json();
        if (response.ok) setActivities(data.activities || []);
      } catch {
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    };
    fetchActivities();
  }, [guideId, guide?.id]);

  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  const name = (guide?.fullName || guide?.username || params.guideName) ?? "Guide";
  const role = (guide?.mainExpertise || (guide?.expertise?.length ? guide.expertise[0] : null) || params.guideRole) ?? "—";
  const location = (guide?.location || params.guideLocation) ?? "—";
  const bio = (guide?.bio || params.description) ?? "No bio yet.";
  const experience =
    guide?.yearsOfExperience != null
      ? `${guide.yearsOfExperience} Yrs`
      : "—";
  const pricing = guide?.pricing;
  const rateDisplay =
    (pricing?.length ?? 0) > 0 && pricing?.[0].price != null
      ? (() => {
          const p = pricing[0];
          const unit = (p.unit || "day").toLowerCase().includes("day") ? "/day" : `/${p.unit || "day"}`;
          return `$${p.price}${unit}`;
        })()
      : (params.guideCharge ?? "$10/day");
  const ratingDisplay =
    guide?.rating != null ? guide.rating.toFixed(1) : params.guideRating ?? "4.9";
  const languagesDisplay =
    guide?.languages?.length
      ? (Array.isArray(guide.languages) ? guide.languages : [guide.languages]).join(", ")
      : "—";

  const getAvatarUri = () => {
    const img = guide?.avatar ?? params.guideImage;
    if (!img) return DEFAULT_AVATAR;
    return img.startsWith("http") ? img : `${API_URL}${img}`;
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

  const goToBooking = () => {
    const id = guideId ?? guide?.id;
    if (!id) return;
    const guideImage =
      guide?.avatar != null
        ? (guide.avatar.startsWith("http") ? guide.avatar : `${API_URL}${guide.avatar}`)
        : params.guideImage?.startsWith("http")
          ? params.guideImage
          : params.guideImage
            ? `${API_URL}${params.guideImage}`
            : "";
    router.push({
      pathname: "/tourist/custom_tour_request",
      params: {
        guideId: id,
        guideName: (guide?.fullName || guide?.username || params.guideName) ?? "",
        guideRole: (guide?.mainExpertise || params.guideRole) ?? "",
        guideLocation: (guide?.location || params.guideLocation) ?? "",
        guideRating: guide?.rating != null ? String(guide.rating) : params.guideRating ?? "4.9",
        guideImage,
        guideCharge: rateDisplay,
        activityId: params.activityId ?? undefined,
        duration: params.duration ?? undefined,
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading guide profile...</Text>
      </View>
    );
  }

  if (error && !guide) {
    return (
      <View style={[styles.root, styles.loadingContainer]}>
        <Ionicons name="alert-circle-outline" size={48} color="#999" />
        <Text style={[styles.loadingText, { marginTop: 12, textAlign: "center", paddingHorizontal: 24 }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: "#007BFF", borderRadius: 12 }}
          onPress={() => router.back()}
        >
          <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: "#FFF" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: NAVBAR_HEIGHT + insets.bottom + 30,
        }}
      >
        {/* Header - no ellipsis */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={s(26)} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: s(20) }]}>Profile</Text>
          <View style={styles.ellipsisBtn} />
        </View>

        {/* Profile block */}
        <View style={styles.profileBlock}>
          <Image source={{ uri: getAvatarUri() }} style={[styles.avatar, { width: s(100), height: s(100) }]} />
          <Text style={[styles.displayName, { fontSize: s(20) }]}>{name}</Text>
          {role !== "—" ? (
            <View style={styles.locationRow}>
              <Ionicons name="ribbon-outline" size={s(14)} color="#666" />
              <Text style={[styles.locationText, { fontSize: s(13) }]}>{role}</Text>
            </View>
          ) : null}
          {location !== "—" ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={s(14)} color="#666" />
              <Text style={[styles.locationText, { fontSize: s(13) }]}>{location}</Text>
            </View>
          ) : null}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Exp</Text>
              <Text style={styles.statValue}>{experience}</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statLabel}>Rate</Text>
              <Text style={styles.statValue}>{rateDisplay}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statValue}>{ratingDisplay}</Text>
            </View>
          </View>
          <View style={styles.bioBlock}>
            <Text style={styles.bioLabel}>Bio</Text>
            <Text style={[styles.bio, { fontSize: s(14) }]}>{bio}</Text>
          </View>
          <View style={styles.bioBlock}>
            <Text style={styles.bioLabel}>Language:</Text>
            <Text style={[styles.bio, { fontSize: s(14) }]}>{languagesDisplay}</Text>
          </View>
        </View>

        {/* Tourist action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryBtnFilled} onPress={goToBooking}>
            <Text style={styles.primaryBtnFilledText}>Request a tour</Text>
          </TouchableOpacity>
        </View>

        {/* Activities */}
        <Text style={styles.sectionTitle}>Activities</Text>
        {activitiesLoading ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#007BFF" />
          </View>
        ) : activities.length === 0 ? (
          <Text style={styles.activityEmptyText}>No published activities yet.</Text>
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
                  onPress={() => router.push({ pathname: "/tourist/tour_detail", params: { id: a.id } })}
                >
                  <Image source={{ uri: getActivityImageUri(a.photos) }} style={styles.activityImage} />
                  <Text style={styles.activityCardTitle} numberOfLines={2}>{a.name}</Text>
                  <Text style={styles.activityCardPrice}>{a.duration} days • {a.difficulty || "—"}</Text>
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
  primaryBtnFilled: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#007BFF",
  },
  primaryBtnFilledText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#FFF" },
  primaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#007BFF",
    backgroundColor: "#FFF",
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
