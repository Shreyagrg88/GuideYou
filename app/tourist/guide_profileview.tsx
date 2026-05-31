import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    canReviewGuide,
    getMyGuideReview,
    submitGuideReview,
} from "../../api/guideReviews";
import ScreenHeader from "../../components/screen-header";
import { API_URL } from "../../constants/api";
import { formatGuideProfileRateLines } from "../../utils/bookingPrice";
import { formatGuideRatingDisplay } from "../../utils/guideRating";
import { resolveAvatarUri } from "../../utils/avatar";
import { SkeletonBlock } from "@/components/Skeleton";
import TouristNavbar from "../components/tourist_navbar";
import { SkeletonProfileScreen } from "@/components/Skeleton";

const NAVBAR_HEIGHT = 70;

type GuidePublicProfile = {
  id: string;
  username: string;
  fullName: string;
  avatar: string | null;
  bio: string;
  mainExpertise: string;
  location: string;
  yearsOfExperience: number | null;
  expertise: string[];
  languages: string[];
  pricing: Array<{
    title: string;
    subtitle?: string;
    price: number;
    priceUsd?: number;
    priceNpr?: number;
    unit: string;
  }>;
  usdToNprRate?: number;
  rating: number | null;
  reviewCount: number;
};

function hasValidPricing(
  pricing: GuidePublicProfile["pricing"] | undefined
): boolean {
  const tier = pricing?.[0];
  if (!tier) return false;
  const price = tier.priceUsd ?? tier.price;
  return price != null && Number.isFinite(Number(price)) && Number(price) > 0;
}

type GuideActivityItem = {
  id: string;
  name: string;
  location?: string;
  photos: string[];
  duration: number;
  difficulty: string;
};

const PLACEHOLDER_TEXT = "Not set";

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
  const [canMessageGuide, setCanMessageGuide] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [guideReviews, setGuideReviewsState] = useState<
    {
      id: string;
      rating: number;
      comment?: string;
      tourist?: { username?: string; fullName?: string };
      createdAt: string;
    }[]
  >([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [canReviewLoading, setCanReviewLoading] = useState(false);
  const [myReview, setMyReview] = useState<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
  } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookingsForMessageCheck = useCallback(async (gId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setCanMessageGuide(false);
        return;
      }
      const response = await fetch(`${API_URL}/api/tourist/bookings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const text = await response.text();
      if (!response.ok || text.trim().startsWith("<")) {
        setCanMessageGuide(false);
        return;
      }
      const data = JSON.parse(text);
      const bookings = data.bookings || [];
      const hasAccepted = bookings.some(
        (b: any) =>
          (b.guide?.id ?? b.guideId) === gId &&
          ["accepted", "paid", "completed"].includes(b.status)
      );
      setCanMessageGuide(hasAccepted);
    } catch {
      setCanMessageGuide(false);
    }
  }, []);

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

  useEffect(() => {
    const id = guideId ?? guide?.id;
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setReviewsLoading(true);
        setReviewsError(null);
        const response = await fetch(
          `${API_URL}/api/reviews/guide/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.msg || "Failed to fetch guide reviews");
        }
        if (cancelled) return;
        setGuideReviewsState(
          (data.reviews || []).map(
            (r: {
              id: string;
              rating: number;
              comment?: string;
              tourist?: { username?: string; fullName?: string };
              createdAt: string;
            }) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              tourist: r.tourist,
              createdAt: r.createdAt,
            })
          )
        );
        setAverageRating(data.averageRating ?? null);
        setReviewCount(data.reviewCount ?? 0);
      } catch (err: any) {
        if (!cancelled) {
          console.error("Guide reviews fetch error:", err);
          setReviewsError(err.message || "Failed to load reviews");
          setGuideReviewsState([]);
          setAverageRating(null);
          setReviewCount(0);
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guideId, guide?.id]);

  useEffect(() => {
    const id = guideId ?? guide?.id;
    if (id) fetchBookingsForMessageCheck(id);
  }, [guideId, guide?.id, fetchBookingsForMessageCheck]);

  const fetchCanReviewAndMyReview = useCallback(async (gId: string) => {
    setCanReviewLoading(true);
    try {
      const [canReviewRes, myReviewRes] = await Promise.all([
        canReviewGuide(gId).catch(() => ({ canReview: false })),
        getMyGuideReview(gId).catch(() => null),
      ]);
      setCanReview(canReviewRes.canReview === true);
      setMyReview(myReviewRes ?? null);
    } catch {
      setCanReview(false);
      setMyReview(null);
    } finally {
      setCanReviewLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = guideId ?? guide?.id;
    if (id) fetchCanReviewAndMyReview(id);
  }, [guideId, guide?.id, fetchCanReviewAndMyReview]);

  const refetchReviews = useCallback(async () => {
    const id = guideId ?? guide?.id;
    if (!id) return;
    try {
      const response = await fetch(`${API_URL}/api/reviews/guide/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok && data.reviews) {
        setGuideReviewsState(
          (data.reviews || []).map(
            (r: { id: string; rating: number; comment?: string; tourist?: { username?: string; fullName?: string }; createdAt: string }) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              tourist: r.tourist,
              createdAt: r.createdAt,
            })
          )
        );
        setAverageRating(data.averageRating ?? null);
        setReviewCount(data.reviewCount ?? 0);
      }
      const my = await getMyGuideReview(id).catch(() => null);
      setMyReview(my);
    } catch {}
  }, [guideId, guide?.id]);

  const handleSubmitReview = async () => {
    const id = guideId ?? guide?.id;
    if (!id) return;
    setSubmittingReview(true);
    try {
      await submitGuideReview(id, reviewRating, reviewComment.trim());
      setShowReviewForm(false);
      setReviewComment("");
      setReviewRating(5);
      await refetchReviews();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  const name = guide?.fullName || guide?.username || params.guideName || "Guide";

  const roleRaw =
    guide?.mainExpertise ||
    (guide?.expertise?.length ? guide.expertise[0] : null);
  const role = roleRaw?.trim() || null;

  const location = guide?.location?.trim() || null;
  const bio = guide?.bio?.trim() || null;

  const experience =
    guide?.yearsOfExperience != null && guide.yearsOfExperience > 0
      ? `${guide.yearsOfExperience} Yrs`
      : "—";

  const rateTier =
    hasValidPricing(guide?.pricing) && guide?.pricing?.[0]
      ? guide.pricing[0]
      : undefined;
  const rateLines = rateTier
    ? formatGuideProfileRateLines(rateTier)
    : { usdLine: PLACEHOLDER_TEXT, nprLine: null };

  const ratingDisplay =
    reviewCount > 0 && averageRating != null
      ? formatGuideRatingDisplay(averageRating)
      : "N/A";

  const languagesDisplay = guide?.languages?.length
    ? (Array.isArray(guide.languages) ? guide.languages : [guide.languages])
        .filter(Boolean)
        .join(", ")
    : null;

  const avatarUri = resolveAvatarUri(guide?.avatar ?? params.guideImage);

  const getActivityImageUri = (photos: string[]): string | null => {
    if (photos?.length > 0 && photos[0]) {
      const uri = photos[0].startsWith("http") ? photos[0] : `${API_URL}${photos[0]}`;
      return uri;
    }
    return null;
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
    router.push({
      pathname: "/tourist/custom_tour_request",
      params: {
        guideId: id,
        guideName: (guide?.fullName || guide?.username || params.guideName) ?? "",
        guideRole: role ?? "",
        guideLocation: location ?? "",
        guideRating: ratingDisplay,
        guideImage: avatarUri ?? "",
        guideCharge: rateTier
          ? rateLines.nprLine
            ? `${rateLines.usdLine} · ${rateLines.nprLine}`
            : rateLines.usdLine
          : "",
        activityId: params.activityId ?? undefined,
        duration: params.duration ?? undefined,
      },
    });
  };

  const goToReportGuide = () => {
    const id = guideId ?? guide?.id;
    if (!id) return;
    router.push({
      pathname: "/tourist/report_guide",
      params: {
        guideId: id,
        guideName: name,
        guideImage: avatarUri ?? undefined,
        guideRole: role ?? undefined,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <SkeletonProfileScreen showFormFields={false} />
        <View style={[styles.navbarWrapper, { paddingBottom: insets.bottom }]}>
          <TouristNavbar />
        </View>
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
        <ScreenHeader
          title="Profile"
          includeTopInset
          titleStyle={{ fontSize: s(20) }}
          marginBottom={24}
          right={
            <TouchableOpacity
              onPress={goToReportGuide}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <Ionicons name="flag-outline" size={22} color="#E53935" />
            </TouchableOpacity>
          }
        />

        {/* Profile block */}
        <View style={styles.profileBlock}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
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
              <Ionicons name="person" size={s(44)} color="#9aa5b5" />
            </View>
          )}
          <Text style={[styles.displayName, { fontSize: s(20) }]}>{name}</Text>
          {role ? (
            <View style={styles.locationRow}>
              <Ionicons name="ribbon-outline" size={s(14)} color="#666" />
              <Text style={[styles.locationText, { fontSize: s(13) }]}>{role}</Text>
            </View>
          ) : null}
          {location ? (
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
            <View style={[styles.statCell, styles.statCellBorder, styles.statCellRate]}>
              <Text style={styles.statLabel}>Rate</Text>
              <View style={styles.rateValueBlock}>
                <Text
                  style={[
                    styles.statValueRatePrimary,
                    rateLines.usdLine === PLACEHOLDER_TEXT && styles.placeholderValue,
                  ]}
                  numberOfLines={2}
                >
                  {rateLines.usdLine}
                </Text>
                {rateLines.nprLine ? (
                  <Text style={styles.statValueRateSecondary} numberOfLines={1}>
                    {rateLines.nprLine}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Rating</Text>
              <Text
                style={[
                  styles.statValue,
                  ratingDisplay === "N/A" && styles.placeholderValue,
                ]}
              >
                {ratingDisplay}
              </Text>
            </View>
          </View>
          <View style={styles.bioBlock}>
            <Text style={styles.bioLabel}>Bio</Text>
            <Text style={[styles.bio, { fontSize: s(14) }, !bio && styles.placeholderText]}>
              {bio || "Not added yet"}
            </Text>
          </View>
          <View style={styles.bioBlock}>
            <Text style={styles.bioLabel}>Language</Text>
            <Text
              style={[
                styles.bio,
                { fontSize: s(14) },
                !languagesDisplay && styles.placeholderText,
              ]}
            >
              {languagesDisplay || "Not added yet"}
            </Text>
          </View>
        </View>

        {/* Tourist action buttons */}
        {canMessageGuide && (
          <View style={styles.chatHint}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#007BFF" />
            <Text style={styles.chatHintText}>You can now chat with this guide.</Text>
          </View>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryBtnFilled} onPress={goToBooking}>
            <Text style={styles.primaryBtnFilledText}>Request a tour</Text>
          </TouchableOpacity>
          {canMessageGuide ? (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnRow]}
              onPress={() => {
                const id = guideId ?? guide?.id;
                if (!id) return;
                router.push({
                  pathname: "/tourist/chat_tourist",
                  params: {
                    counterpartId: id,
                    guideName: name,
                    guideAvatar: avatarUri ?? undefined,
                  },
                });
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#007BFF" />
              <Text style={styles.primaryBtnText}>Message</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {!canMessageGuide && (
          <Text style={styles.messageHint}>
            You can message this guide after they accept your request.
          </Text>
        )}

        <TouchableOpacity style={styles.reportLink} onPress={goToReportGuide}>
          <Ionicons name="flag-outline" size={16} color="#E53935" />
          <Text style={styles.reportLinkText}>Report this guide</Text>
        </TouchableOpacity>

        {/* Activities */}
        <Text style={styles.sectionTitle}>Activities</Text>
        {activitiesLoading ? (
          <View style={{ flexDirection: "row", paddingVertical: 16, paddingRight: 8 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonBlock
                key={i}
                width={200}
                height={160}
                borderRadius={12}
                style={{ marginRight: 12 }}
              />
            ))}
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
              {activities.map((a) => {
                const activityUri = getActivityImageUri(a.photos);
                return (
                <TouchableOpacity
                  key={a.id}
                  style={styles.activityCard}
                  onPress={() => router.push({ pathname: "/tourist/tour_detail", params: { id: a.id } })}
                >
                  {activityUri ? (
                    <Image source={{ uri: activityUri }} style={styles.activityImage} />
                  ) : (
                    <View style={[styles.activityImage, styles.activityImagePlaceholder]}>
                      <Ionicons name="image-outline" size={28} color="#bbb" />
                    </View>
                  )}
                  <Text style={styles.activityCardTitle} numberOfLines={2}>{a.name}</Text>
                  <Text style={styles.activityCardPrice}>{a.duration} days • {a.difficulty || "—"}</Text>
                </TouchableOpacity>
              );
              })}
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
          {reviewCount > 0 && averageRating != null && (
            <Text style={styles.viewAllText}>
              {formatGuideRatingDisplay(averageRating)} ({reviewCount} reviews)
            </Text>
          )}
        </View>

        {/* Rate / Your review */}
        {canReviewLoading ? null : myReview ? (
          <View style={styles.myReviewCard}>
            <Text style={styles.myReviewTitle}>Your review</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= myReview.rating ? "star" : "star-outline"}
                  size={18}
                  color="#FFD700"
                />
              ))}
            </View>
            {myReview.comment ? (
              <Text style={styles.reviewComment}>{myReview.comment}</Text>
            ) : null}
          </View>
        ) : canReview && !showReviewForm ? (
          <TouchableOpacity
            style={styles.rateGuideBtn}
            onPress={() => setShowReviewForm(true)}
          >
            <Ionicons name="star-outline" size={18} color="#007BFF" />
            <Text style={styles.rateGuideBtnText}>Rate this guide</Text>
          </TouchableOpacity>
        ) : null}

        {showReviewForm && (
          <View style={styles.reviewFormCard}>
            <Text style={styles.reviewFormTitle}>Write a review</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setReviewRating(i)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={i <= reviewRating ? "star" : "star-outline"}
                    size={28}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewCommentInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor="#999"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={3}
            />
            <View style={styles.reviewFormActions}>
              <TouchableOpacity
                style={styles.reviewFormCancelBtn}
                onPress={() => {
                  setShowReviewForm(false);
                  setReviewComment("");
                  setReviewRating(5);
                }}
                disabled={submittingReview}
              >
                <Text style={styles.reviewFormCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reviewFormSubmitBtn, submittingReview && { opacity: 0.6 }]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.reviewFormSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {reviewsLoading ? (
          <View style={{ paddingVertical: 16, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#007BFF" />
          </View>
        ) : reviewsError ? (
          <Text style={styles.activityEmptyText}>{reviewsError}</Text>
        ) : guideReviews.length === 0 ? (
          <Text style={styles.activityEmptyText}>No reviews yet.</Text>
        ) : (
          guideReviews.map((r: {
            id: string;
            rating: number;
            comment?: string;
            tourist?: { username?: string; fullName?: string };
            createdAt: string;
          }) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Ionicons name="person" size={16} color="#666" />
                </View>
                <Text style={styles.reviewName}>
                  {r.tourist?.fullName || r.tourist?.username || "Traveler"}
                </Text>
              </View>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= r.rating ? "star" : "star-outline"}
                    size={14}
                    color="#FFD700"
                  />
                ))}
              </View>
              {r.comment ? (
                <Text style={styles.reviewComment}>{r.comment}</Text>
              ) : null}
            </View>
          ))
        )}
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
  avatarPlaceholder: {
    backgroundColor: "#E8EDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderValue: { color: "#8899aa" },
  placeholderText: { color: "#8899aa", fontStyle: "italic" },
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
    alignItems: "stretch",
  },
  statCell: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  statCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#E5E7EB" },
  /** Slightly wider middle column so rate lines fit without crowding dividers. */
  statCellRate: { flex: 1.15, paddingHorizontal: 6 },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "#666", marginBottom: 4 },
  statValue: { fontFamily: "Nunito_700Bold", fontSize: 13, color: "#333", textAlign: "center" },
  rateValueBlock: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  statValueRatePrimary: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 15,
    color: "#333",
    textAlign: "center",
  },
  statValueRateSecondary: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    lineHeight: 13,
    color: "#5c6570",
    textAlign: "center",
    marginTop: 3,
  },
  bioBlock: { width: "100%", marginBottom: 10, paddingHorizontal: 4 },
  bioLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#333", marginBottom: 4 },
  bio: { fontFamily: "Nunito_400Regular", color: "#444", lineHeight: 20 },

  chatHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#E8F4FF",
    borderRadius: 10,
  },
  chatHintText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#007BFF",
  },
  messageHint: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#666",
    marginTop: -8,
    marginBottom: 16,
  },
  reportLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
    paddingVertical: 10,
  },
  reportLinkText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#E53935",
  },
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
  primaryBtnRow: { flexDirection: "row", gap: 6 },
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
  activityImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F6",
  },
  activityCardTitle: { fontFamily: "Nunito_700Bold", fontSize: 13, padding: 10, color: "#333" },
  activityCardPrice: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#007BFF", paddingHorizontal: 10, paddingBottom: 10 },
  activityEmptyText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: "#666", marginBottom: 12 },
  reviewsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 },
  viewAllText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#007BFF" },
  myReviewCard: {
    backgroundColor: "#E8F4FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#007BFF40",
  },
  myReviewTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#333", marginBottom: 6 },
  rateGuideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#007BFF",
    backgroundColor: "#FFF",
  },
  rateGuideBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#007BFF" },
  reviewFormCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewFormTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#333", marginBottom: 10 },
  reviewCommentInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 12,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#333",
    minHeight: 80,
    textAlignVertical: "top",
  },
  reviewFormActions: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  reviewFormCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  reviewFormCancelText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#666" },
  reviewFormSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#007BFF",
  },
  reviewFormSubmitText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#FFF" },
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
