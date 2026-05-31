import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { enrichGuidesWithReviewAverage } from "../../api/guideReviews";
import {
  fetchAvailableGuidesThisWeek,
  type AvailableGuideThisWeek,
} from "../../api/availableGuides";
import { getNotifications } from "../../api/notifications";
import { API_URL } from "../../constants/api";
import { formatGuideListCharge } from "../../utils/bookingPrice";
import { formatGuideRatingDisplay, pickGuideListRatingSource } from "../../utils/guideRating";
import { resolveAvatarUri } from "../../utils/avatar";
import {
  SkeletonActivityCarousel,
  SkeletonBlock,
} from "@/components/Skeleton";
import TouristNavBar from "../components/tourist_navbar";

const filters = ["All", "Guides", "Activities"];

type Guide = {
  id: string;
  name: string;
  role: string;
  location: string;
  experience: string;
  rating: string;
  image: string;
  verified: boolean;
};

type HomepageActivityCard = {
  id: string;
  title: string;
  days: string;
  rating: number | null;
  image: string | null;
  location?: string;
  category?: string;
  difficulty?: string;
};

function mapHomepageActivity(activity: any): HomepageActivityCard {
  return {
    id: activity.id,
    title: activity.title,
    days: activity.days || `${activity.duration || 12} DAYS TRIP`,
    rating:
      activity.rating != null && Number.isFinite(Number(activity.rating))
        ? Number(activity.rating)
        : null,
    image: activity.image ? `${API_URL}${activity.image}` : null,
    location: activity.location,
    category: activity.category,
    difficulty: activity.difficulty,
  };
}

function interestsFromProfilePayload(profileData: any): string[] {
  const raw = profileData?.tourist || profileData?.user || profileData;
  if (!raw) return [];
  const toArray = (v: unknown): string[] => {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    return String(v)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };
  return toArray(raw.interests);
}

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeSearchFilter, setActiveSearchFilter] = useState<"Guides" | "Activities">("Guides");
  const [showListView, setShowListView] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [availableGuides, setAvailableGuides] = useState<AvailableGuideThisWeek[]>([]);
  const [availableGuidesLoading, setAvailableGuidesLoading] = useState(false);
  const [availableWindow, setAvailableWindow] = useState<{
    windowStart: string | null;
    windowEnd: string | null;
    timezone: string;
  } | null>(null);
  const [interestSections, setInterestSections] = useState<
    { category: string; activities: HomepageActivityCard[] }[]
  >([]);
  const [interestSectionsLoading, setInterestSectionsLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      BackHandler.exitApp();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const fetchNotificationUnread = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    const data = await getNotifications(token, 1, 1);
    if (data) setNotificationUnread(data.unreadCount ?? 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotificationUnread();
    }, [fetchNotificationUnread])
  );

  useEffect(() => {
    if (pathname.includes("home_tourist")) {
      fetchNotificationUnread();
    }
  }, [pathname, fetchNotificationUnread]);

  /** Single API: guides free tomorrow through next 7 days (Nepal time). */
  const fetchAvailableGuides = useCallback(async () => {
    setAvailableGuidesLoading(true);
    setAvailableGuides([]);
    try {
      const data = await fetchAvailableGuidesThisWeek({ days: 7, limit: 30 });
      setAvailableGuides(data.guides);
      setAvailableWindow({
        windowStart: data.windowStart,
        windowEnd: data.windowEnd,
        timezone: data.timezone,
      });
    } catch (e) {
      console.error("Fetch available guides error:", e);
      setAvailableGuides([]);
      setAvailableWindow(null);
    } finally {
      setAvailableGuidesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAvailableGuides();
    }, [fetchAvailableGuides])
  );

  const loadHomepageActivities = useCallback(async () => {
    if (activeFilter === "Guides") {
      setLoading(false);
      setInterestSectionsLoading(false);
      setInterestSections([]);
      return;
    }

    setLoading(true);
    setInterestSectionsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const forYouUrl = `${API_URL}/api/tourist/homepage?category=${encodeURIComponent("For you")}`;
      const forYouRes = await fetch(forYouUrl, { method: "GET", headers });
      const forYouData = await forYouRes.json().catch(() => ({}));

      if (!forYouRes.ok) {
        console.error(forYouData?.msg || "Failed to fetch activities");
        setActivities([]);
      } else {
        const mappedForYou = (forYouData.activities || []).map(mapHomepageActivity);
        setActivities(mappedForYou);
      }

      if (!token) {
        setInterestSections([]);
        return;
      }

      const profileRes = await fetch(`${API_URL}/api/tourist/profile`, {
        method: "GET",
        headers,
      });
      const profileText = await profileRes.text();
      let interestLabels: string[] = [];
      if (profileRes.ok && profileText.trim() && !profileText.trim().startsWith("<")) {
        try {
          const profileData = JSON.parse(profileText);
          interestLabels = interestsFromProfilePayload(profileData);
        } catch {
          interestLabels = [];
        }
      }

      const uniqueCategories = [...new Set(interestLabels)].slice(0, 10);
      if (uniqueCategories.length === 0) {
        setInterestSections([]);
        return;
      }

      const sectionResults = await Promise.all(
        uniqueCategories.map(async (category) => {
          const url = `${API_URL}/api/tourist/homepage?category=${encodeURIComponent(category)}`;
          const res = await fetch(url, { method: "GET", headers });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return { category, activities: [] as HomepageActivityCard[] };
          const mapped = (data.activities || []).map(mapHomepageActivity);
          return { category, activities: mapped };
        })
      );

      setInterestSections(
        sectionResults.filter((row) =>
          row.activities.some((a: HomepageActivityCard) => a.id)
        )
      );
    } catch (error: any) {
      console.error("Homepage fetch error:", error);
      setActivities([]);
      setInterestSections([]);
    } finally {
      setLoading(false);
      setInterestSectionsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadHomepageActivities();
    // Show list view when "Activities" filter is selected
    setShowListView(activeFilter === "Activities");
  }, [activeFilter, loadHomepageActivities]);

  useEffect(() => {
    // Update arrow visibility when activities change
    if (activities.length > 1 && !showListView) {
      setShowRightArrow(true);
      setShowLeftArrow(false);
      // Reset scroll position
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }
  }, [activities, showListView]);

  // Cleanup search debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const clearSearch = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setSearchQuery("");
    setSearchResults(null);
    setIsSearching(false);
    setActiveSearchFilter("Guides");
  };

  const scrollLeft = () => {
    if (flatListRef.current) {
      const newPosition = Math.max(0, scrollPosition - 300);
      flatListRef.current.scrollToOffset({ offset: newPosition, animated: true });
    }
  };

  const scrollRight = () => {
    if (flatListRef.current && contentWidth > containerWidth) {
      const maxScroll = contentWidth - containerWidth;
      const newPosition = Math.min(maxScroll, scrollPosition + 300);
      flatListRef.current.scrollToOffset({ offset: newPosition, animated: true });
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const contentWidth = event.nativeEvent.contentSize.width;
    const containerWidth = event.nativeEvent.layoutMeasurement.width;
    
    setScrollPosition(offsetX);
    setContentWidth(contentWidth);
    setContainerWidth(containerWidth);
    
    // Show left arrow if scrolled past start
    setShowLeftArrow(offsetX > 10);
    // Show right arrow if not scrolled to end
    setShowRightArrow(offsetX < contentWidth - containerWidth - 10);
  };

  // Search function
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/tourist/search?q=${encodeURIComponent(query)}&type=all&limit=10`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        if (Array.isArray(data.guides) && data.guides.length > 0) {
          const guides = await enrichGuidesWithReviewAverage(data.guides);
          setSearchResults({ ...data, guides });
        } else {
          setSearchResults(data);
        }
      } else {
        console.error("Search error:", data.msg);
        setSearchResults(null);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search handler
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!text.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      performSearch(text);
    }, 400);
  };

  const renderActivityCard = ({ item }: any) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/tourist/tour_detail",
          params: { id: item.id },
        })
      }
      style={styles.activityCard}
      activeOpacity={0.8}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.activityImage} />
      ) : (
        <View style={[styles.activityImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={40} color="#ccc" />
        </View>
      )}

      <View style={styles.activityCardContent}>
        <Text style={styles.activityDays}>{item.days}</Text>
        <View style={styles.activityTitleRow}>
          <Text style={styles.activityTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Ionicons name="bookmark-outline" size={20} color="#555" />
        </View>
        {item.location && (
          <View style={styles.activityLocationRow}>
            <Ionicons name="location-outline" size={14} color="#007BFF" />
            <Text style={styles.activityLocation}>{item.location}</Text>
          </View>
        )}
        <View style={styles.activityRatingRow}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.activityRating}>
            {item.rating != null ? item.rating : "N/A"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderActivityListItem = ({ item }: any) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/tourist/tour_detail",
          params: { id: item.id },
        })
      }
      style={styles.activityListItem}
      activeOpacity={0.8}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.activityListImage} />
      ) : (
        <View style={[styles.activityListImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={30} color="#ccc" />
        </View>
      )}

      <View style={styles.activityListContent}>
        <Text style={styles.activityListDays}>{item.days}</Text>
        <Text style={styles.activityListTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.location && (
          <View style={styles.activityListLocationRow}>
            <Ionicons name="location-outline" size={14} color="#007BFF" />
            <Text style={styles.activityListLocation}>{item.location}</Text>
          </View>
        )}
        <View style={styles.activityListRatingRow}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.activityListRating}>
            {item.rating != null ? item.rating : "N/A"}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  /** Card for "Available tomorrow & this week" – links to profile */
  const renderAvailableGuideCard = (guide: AvailableGuideThisWeek) => {
    const guideImage = resolveAvatarUri(guide.avatar ?? guide.image);
    const name = String(guide.fullName || guide.username || guide.name || "Guide");
    const role = String(
      guide.mainExpertise ||
        (Array.isArray(guide.expertise) ? guide.expertise[0] : "") ||
        guide.role ||
        ""
    );
    const location = String(guide.location || "");
    const rating = formatGuideRatingDisplay(pickGuideListRatingSource(guide));
    const availabilityLabel = String(guide.availabilityLabel || "");
    return (
      <TouchableOpacity
        key={String(guide.id)}
        style={styles.guideCard}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: "/tourist/guide_profileview",
            params: {
              guideId: String(guide.id),
              guideName: name,
              ...(guideImage ? { guideImage } : {}),
            },
          })
        }
      >
        {guideImage ? (
          <Image source={{ uri: guideImage }} style={styles.guideAvatar} />
        ) : (
          <View style={[styles.guideAvatar, styles.guideAvatarPlaceholder]}>
            <Ionicons name="person" size={22} color="#9aa5b5" />
          </View>
        )}
        <View style={styles.guideCardContent}>
          {guide.verified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#00C851" />
              <Text style={styles.verifiedText}>Verified Guide</Text>
            </View>
          ) : null}
          <Text style={styles.guideName}>{name}</Text>
          <Text style={styles.guideRole}>
            {[role, location].filter(Boolean).join(" • ") || "—"}
          </Text>
          {availabilityLabel ? (
            <View style={styles.availabilityBadge}>
              <Ionicons name="calendar-outline" size={13} color="#15803d" />
              <Text style={styles.availabilityBadgeText}>{availabilityLabel}</Text>
            </View>
          ) : null}
          <View style={styles.guideInfoRow}>
            <View style={styles.guideInfoItem}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.guideInfoText}>{rating}</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.page}>
      <View style={[styles.headerArea, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>
            Guide<Text style={{ color: "#007BFF" }}>You</Text>
          </Text>
          <TouchableOpacity onPress={() => router.push("/tourist/notifications_tourist" as any)} style={{ position: "relative" }}>
            <Ionicons name="notifications-outline" size={24} color="#B0B0B0" />
            {notificationUnread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationUnread > 99 ? "99+" : notificationUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.subTitle}>
          Discover amazing activities and guides with us
        </Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <View style={styles.searchInputWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search activities, guides, places..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={() => performSearch(searchQuery)}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="never"
            />
          </View>
          <View style={styles.searchTrailing}>
            {isSearching ? (
              <ActivityIndicator size="small" color="#007BFF" />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={clearSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Search Results Section */}
        {searchQuery.trim() && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                Results for "{searchQuery}"
              </Text>
              <TouchableOpacity onPress={clearSearch}>
                <Text style={styles.seeAllText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {isSearching && !searchResults ? (
              <View style={styles.searchLoadingWrap}>
                <ActivityIndicator size="small" color="#007BFF" />
                <Text style={styles.searchLoadingText}>Searching...</Text>
              </View>
            ) : searchResults ? (
              <>
            {/* Instagram-style Filter Tabs */}
            <View style={styles.searchFilterRow}>
              <TouchableOpacity
                style={[
                  styles.searchFilterBtn,
                  activeSearchFilter === "Guides" && styles.activeSearchFilter,
                ]}
                onPress={() => setActiveSearchFilter("Guides")}
              >
                <Text
                  style={[
                    styles.searchFilterText,
                    activeSearchFilter === "Guides" && styles.activeSearchFilterText,
                  ]}
                >
                  Guides
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.searchFilterBtn,
                  activeSearchFilter === "Activities" && styles.activeSearchFilter,
                ]}
                onPress={() => setActiveSearchFilter("Activities")}
              >
                <Text
                  style={[
                    styles.searchFilterText,
                    activeSearchFilter === "Activities" && styles.activeSearchFilterText,
                  ]}
                >
                  Activities
                </Text>
              </TouchableOpacity>
            </View>

            {/* Guides Results - Only show when Guides tab is active */}
            {activeSearchFilter === "Guides" && (
              <>
                {searchResults.guides && searchResults.guides.length > 0 ? (
                  searchResults.guides.map((guide: any) => {
                    const guideImage = resolveAvatarUri(guide.avatar);
                    const name = guide.fullName || guide.username || "Guide";
                    const role = guide.mainExpertise || guide.expertise?.[0] || "";
                    const location = guide.location || "";
                    return (
                      <TouchableOpacity
                        key={guide.id}
                        style={styles.guideCard}
                        onPress={() => router.push({
                          pathname: "/tourist/guide_profileview",
                          params: {
                            guideId: guide.id,
                            guideName: name,
                            ...(guideImage ? { guideImage } : {}),
                          },
                        })}
                      >
                        {guideImage ? (
                          <Image
                            source={{ uri: guideImage }}
                            style={styles.guideAvatar}
                          />
                        ) : (
                          <View style={[styles.guideAvatar, styles.guideAvatarPlaceholder]}>
                            <Ionicons name="person" size={22} color="#9aa5b5" />
                          </View>
                        )}
                        <View style={styles.guideCardContent}>
                          {guide.verified && (
                            <View style={styles.verifiedBadge}>
                              <Ionicons name="checkmark-circle" size={14} color="#00C851" />
                              <Text style={styles.verifiedText}>Verified Guide</Text>
                            </View>
                          )}
                          <Text style={styles.guideName}>{name}</Text>
                          <Text style={styles.guideRole}>
                            {[role, location].filter(Boolean).join(" • ") || "—"}
                          </Text>
                          <View style={styles.guideInfoRow}>
                            <View style={styles.guideInfoItem}>
                              <Ionicons name="star" size={14} color="#FFD700" />
                              <Text style={styles.guideInfoText}>
                                {formatGuideRatingDisplay(pickGuideListRatingSource(guide))}
                              </Text>
                            </View>
                            {guide.reviewCount > 0 && (
                              <Text style={[styles.guideInfoText, { marginLeft: 8 }]}>
                                ({guide.reviewCount} reviews)
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>No guides found</Text>
                )}
              </>
            )}

            {/* Activities Results - Only show when Activities tab is active */}
            {activeSearchFilter === "Activities" && (
              <>
                {searchResults.activities && searchResults.activities.length > 0 ? (
                  <FlatList
                    data={searchResults.activities}
                    renderItem={({ item }) => renderActivityListItem({ 
                      item: {
                        id: item.id,
                        title: item.name || item.title,
                        days: `${item.duration || 12} DAYS TRIP`,
                        rating: item.rating || 0,
                        image: item.photos?.[0]?.startsWith('/')
                          ? `${API_URL}${item.photos[0]}`
                          : item.photos?.[0] || item.image?.startsWith('/')
                          ? `${API_URL}${item.image}`
                          : item.image || null,
                        location: item.location,
                      }
                    })}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                ) : (
                  <Text style={styles.emptyText}>No activities found</Text>
                )}
              </>
            )}
              </>
            ) : (
              <Text style={styles.emptyText}>No results found</Text>
            )}
          </View>
        )}

        {/* Regular Content (only show when not searching) */}
        {!searchQuery.trim() && (
          <>
            {/* Filter Buttons */}
            <View style={styles.filterRow}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterBtn,
                    activeFilter === filter && styles.activeFilter,
                  ]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === filter && styles.activeFilterText,
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.tripPlannerCard}
              activeOpacity={0.88}
              onPress={() => router.push("/tourist/plan_trip")}
            >
              <View style={styles.tripPlannerIconWrap}>
                <Ionicons name="sparkles" size={20} color="#007BFF" />
              </View>
              <View style={styles.tripPlannerTextWrap}>
                <Text style={styles.tripPlannerTitle}>Plan your trip with AI</Text>
                <Text style={styles.tripPlannerSubtitle}>
                  Enter your destination, interests, and trip length to build a smart itinerary.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#007BFF" />
            </TouchableOpacity>

            {/* For you Section */}
            {(activeFilter === "All" || activeFilter === "Activities") && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {showListView ? "All Activities" : "For you"}
              </Text>
              {showListView ? (
                <TouchableOpacity onPress={() => setShowListView(false)}>
                  <Ionicons name="chevron-back" size={20} color="#007BFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setShowListView(true)}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <View style={{ marginVertical: 16 }}>
                <SkeletonActivityCarousel />
              </View>
            ) : activities.length > 0 ? (
              showListView ? (
                <FlatList
                  data={activities}
                  renderItem={renderActivityListItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.listContainer}
                />
              ) : (
                <View style={styles.horizontalWrapper}>
                  <View style={styles.horizontalContainer}>
                    <FlatList
                      ref={flatListRef}
                      data={activities}
                      renderItem={renderActivityCard}
                      keyExtractor={(item) => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalList}
                      style={styles.horizontalFlatList}
                      onScroll={handleScroll}
                      scrollEventThrottle={16}
                      onContentSizeChange={(width) => setContentWidth(width)}
                      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
                    />
                  </View>
                  {/* Left Arrow Indicator */}
                  {activities.length > 1 && showLeftArrow && (
                    <TouchableOpacity 
                      style={[styles.arrowIndicator, styles.leftArrow]} 
                      onPress={scrollLeft}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                  {/* Right Arrow Indicator */}
                  {activities.length > 1 && showRightArrow && (
                    <TouchableOpacity 
                      style={[styles.arrowIndicator, styles.rightArrow]} 
                      onPress={scrollRight}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              )
            ) : (
              <Text style={styles.emptyText}>No activities found</Text>
            )}
          </View>
        )}

            {(activeFilter === "All" || activeFilter === "Activities") &&
              !showListView &&
              interestSectionsLoading &&
              interestSections.length === 0 && (
                <View style={styles.section}>
                  <View style={{ marginVertical: 16 }}>
                    <SkeletonActivityCarousel />
                  </View>
                </View>
              )}

            {(activeFilter === "All" || activeFilter === "Activities") &&
              !showListView &&
              interestSections.map((section) => (
                <View key={section.category} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Activity for {section.category}
                    </Text>
                  </View>
                  <View style={styles.horizontalContainer}>
                    <FlatList
                      data={section.activities}
                      renderItem={renderActivityCard}
                      keyExtractor={(item, index) =>
                        item.id ? `${section.category}-${item.id}` : `${section.category}-${index}`
                      }
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalList}
                      style={styles.horizontalFlatList}
                    />
                  </View>
                </View>
              ))}

            {/* Available tomorrow & this week — GET /api/tourist/guides/available-this-week */}
            {(activeFilter === "All" || activeFilter === "Guides") && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available tomorrow & this week</Text>
                <Text style={styles.sectionSubtitle}>
                  {availableWindow?.windowStart && availableWindow?.windowEnd
                    ? `${availableWindow.windowStart} – ${availableWindow.windowEnd} (${availableWindow.timezone})`
                    : "Nepal time · free slots not booked or held"}
                </Text>
                {availableGuidesLoading ? (
                  <View style={{ paddingVertical: 12 }}>
                    <View style={{ flexDirection: "row", marginBottom: 10 }}>
                      {[0, 1, 2].map((i) => (
                        <SkeletonBlock
                          key={i}
                          width={160}
                          height={100}
                          borderRadius={12}
                          style={{ marginRight: 12 }}
                        />
                      ))}
                    </View>
                    <Text style={styles.availableGuidesLoadingText}>Checking guide availability...</Text>
                  </View>
                ) : availableGuides.length === 0 ? (
                  <Text style={styles.emptyText}>No guides available for tomorrow or this week.</Text>
                ) : (
                  availableGuides.map(renderAvailableGuideCard)
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <TouristNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  headerArea: {
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  logo: {
    fontSize: 24,
    fontFamily: "Nunito_700Bold",
    color: "#000",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  subTitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 15,
    marginTop: 5,
    fontFamily: "Nunito_400Regular",
  },
  tripPlannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F8FF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  tripPlannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginRight: 12,
  },
  tripPlannerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  tripPlannerTitle: {
    fontSize: 16,
    color: "#111111",
    fontFamily: "Nunito_700Bold",
    marginBottom: 2,
  },
  tripPlannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
    fontFamily: "Nunito_400Regular",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputWrap: {
    flex: 1,
    minWidth: 0,
  },
  searchInput: {
    width: "100%",
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: "#000",
    paddingVertical: 0,
  },
  searchTrailing: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  searchLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
  },
  searchLoadingText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#666",
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 25,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  activeFilter: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  filterText: {
    color: "#555",
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  activeFilterText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
  },
  section: {
    marginBottom: 30,
    position: "relative",
  },
  horizontalWrapper: {
    position: "relative",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#888",
    marginBottom: 12,
    lineHeight: 17,
  },
  availableGuidesLoading: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 10,
  },
  availableGuidesLoadingText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
  },
  seeAllText: {
    fontSize: 14,
    color: "#007BFF",
    fontFamily: "Nunito_400Regular",
  },
  searchFilterRow: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  searchFilterBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeSearchFilter: {
    borderBottomColor: "#007BFF",
  },
  searchFilterText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },
  activeSearchFilterText: {
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
  },
  horizontalContainer: {
    position: "relative",
  },
  horizontalFlatList: {
    flex: 1,
  },
  horizontalList: {
    paddingRight: 60,
  },
  arrowIndicator: {
    position: "absolute",
    top: 120,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  leftArrow: {
    left: 5,
  },
  rightArrow: {
    right: 5,
  },
  listContainer: {
    paddingBottom: 10,
  },
  activityListItem: {
    flexDirection: "row",
    backgroundColor: "#F7FAFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  activityListImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 12,
  },
  activityListContent: {
    flex: 1,
  },
  activityListDays: {
    fontSize: 11,
    color: "#777",
    marginBottom: 4,
    fontFamily: "Nunito_400Regular",
  },
  activityListTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 6,
  },
  activityListLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  activityListLocation: {
    marginLeft: 4,
    fontSize: 12,
    color: "#007BFF",
    fontFamily: "Nunito_400Regular",
  },
  activityListRatingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityListRating: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  activityCard: {
    width: 280,
    backgroundColor: "#F7FAFF",
    borderRadius: 15,
    marginRight: 15,
    overflow: "hidden",
  },
  activityImage: {
    width: "100%",
    height: 180,
  },
  activityCardContent: {
    padding: 12,
  },
  activityDays: {
    fontSize: 11,
    color: "#777",
    marginBottom: 4,
    fontFamily: "Nunito_400Regular",
  },
  activityTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    flex: 1,
    marginRight: 8,
  },
  activityLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  activityLocation: {
    marginLeft: 4,
    fontSize: 12,
    color: "#007BFF",
    fontFamily: "Nunito_400Regular",
  },
  activityRatingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityRating: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  guideCard: {
    flexDirection: "row",
    backgroundColor: "#E8F1FF",
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    alignItems: "center",
  },
  guideAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  guideAvatarPlaceholder: {
    backgroundColor: "#D8E4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  guideCardContent: {
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  verifiedText: {
    marginLeft: 4,
    fontSize: 11,
    color: "#00C851",
    fontFamily: "Nunito_400Regular",
  },
  guideName: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 2,
  },
  guideRole: {
    fontSize: 13,
    color: "#666",
    fontFamily: "Nunito_400Regular",
    marginBottom: 6,
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  availabilityBadgeText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#15803d",
    flexShrink: 1,
  },
  guideInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  guideInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  guideInfoText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },
  messageButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  messageButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  placeholderImage: {
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderAvatar: {
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    paddingVertical: 20,
  },
});
