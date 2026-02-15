import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../../constants/api";
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

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [activeSearchFilter, setActiveSearchFilter] = useState<"Guides" | "Activities">("Guides");
  const [showListView, setShowListView] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Placeholder guide data (no API for now)
  const placeholderGuides: Guide[] = [
    {
      id: "1",
      name: "Nema Sherpa",
      role: "Trek Guide",
      location: "Pokhara",
      experience: "10Y",
      rating: "4.5",
      image: "https://images.squarespace-cdn.com/content/v1/5522d488e4b05f384d080ecd/1563991565432-7GP2C8383XRQLW8PSWBK/bishnu_mardi_himal.jpeg",
      verified: true,
    },
    {
      id: "2",
      name: "Raj Thapa",
      role: "Adventure Guide",
      location: "Kathmandu",
      experience: "8Y",
      rating: "4.8",
      image: "https://d1kz4z644261g1.cloudfront.net/guide_profiles/avatars/000/000/048/medium/Ang_Rita_Sherpa.jpg?1521089517",
      verified: true,
    },
  ];

  const fetchHomepageActivities = async () => {
    if (activeFilter === "Guides") {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");

      // Keep existing API call for "For you" category
      const url = `${API_URL}/api/tourist/homepage?category=${encodeURIComponent(
        "For you"
      )}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data.msg || "Failed to fetch activities");
        setActivities([]);
        return;
      }

      // Map API response to component format
      const mappedActivities = (data.activities || []).map((activity: any) => ({
        id: activity.id,
        title: activity.title,
        days: activity.days || `${activity.duration || 12} DAYS TRIP`,
        rating: activity.rating || 4.5,
        image: activity.image ? `${API_URL}${activity.image}` : null,
        location: activity.location,
        category: activity.category,
        difficulty: activity.difficulty,
      }));

      setActivities(mappedActivities);
    } catch (error: any) {
      console.error("Homepage fetch error:", error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomepageActivities();
    // Show list view when "Activities" filter is selected
    setShowListView(activeFilter === "Activities");
  }, [activeFilter]);

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

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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
        setSearchResults(data);
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
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      if (text.trim()) {
        performSearch(text);
      } else {
        setSearchResults(null);
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    setSearchTimeout(timeout);
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
          <Text style={styles.activityRating}>{item.rating}</Text>
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
          <Text style={styles.activityListRating}>{item.rating}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  const renderGuideCard = (guide: Guide) => (
    <TouchableOpacity
      key={guide.id}
      style={styles.guideCard}
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: "/tourist/guide_list",
          params: { category: guide.role },
        })
      }
    >
      {guide.image ? (
        <Image source={{ uri: guide.image }} style={styles.guideAvatar} />
      ) : (
        <View style={[styles.guideAvatar, styles.placeholderAvatar]}>
          <Ionicons name="person" size={30} color="#ccc" />
        </View>
      )}

      <View style={styles.guideCardContent}>
        {guide.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#00C851" />
            <Text style={styles.verifiedText}>Verified Guide</Text>
          </View>
        )}
        <Text style={styles.guideName}>{guide.name}</Text>
        <Text style={styles.guideRole}>
          {guide.role} • {guide.location}
        </Text>
        <View style={styles.guideInfoRow}>
          <View style={styles.guideInfoItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.guideInfoText}>{guide.experience}</Text>
          </View>
          <View style={styles.guideInfoItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.guideInfoText}>{guide.rating}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.messageButton}
        onPress={() => router.push("/tourist/chat_tourist")}
      >
        <Text style={styles.messageButtonText}>Message</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
      >
        <Text style={styles.logo}>
          Guide<Text style={{ color: "#007BFF" }}>You</Text>
        </Text>

        <Text style={styles.subTitle}>
          Discover amazing places and guides with us
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search activities, guides, places..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={() => performSearch(searchQuery)}
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#007BFF" style={{ marginLeft: 10 }} />
          )}
        </View>

        {/* Search Results Section */}
        {searchResults && searchQuery.trim() && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Search Results for "{searchQuery}"
              </Text>
              <TouchableOpacity onPress={() => {
                setSearchQuery("");
                setSearchResults(null);
                setActiveSearchFilter("Guides");
                if (searchTimeout) {
                  clearTimeout(searchTimeout);
                }
              }}>
                <Text style={styles.seeAllText}>Clear</Text>
              </TouchableOpacity>
            </View>

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
                    const guideImage = guide.avatar?.startsWith("/")
                      ? `${API_URL}${guide.avatar}`
                      : guide.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2";
                    return (
                      <TouchableOpacity
                        key={guide.id}
                        style={styles.guideCard}
                        onPress={() => router.push({
                          pathname: "/tourist/guide_profileview",
                          params: {
                            guideId: guide.id,
                            guideName: guide.fullName || guide.username,
                            guideImage,
                            guideRole: guide.mainExpertise || guide.expertise?.[0] || "Guide",
                            guideLocation: guide.location || "",
                            guideRating: guide.rating != null ? String(guide.rating) : "N/A",
                            guideCharge: guide.rate != null ? `$${guide.rate}/day` : "$10/day",
                            description: guide.bio || "",
                          },
                        })}
                      >
                        <Image
                          source={{ uri: guideImage }}
                          style={styles.guideAvatar}
                        />
                        <View style={styles.guideCardContent}>
                          {guide.verified && (
                            <View style={styles.verifiedBadge}>
                              <Ionicons name="checkmark-circle" size={14} color="#00C851" />
                              <Text style={styles.verifiedText}>Verified Guide</Text>
                            </View>
                          )}
                          <Text style={styles.guideName}>{guide.fullName || guide.username}</Text>
                          <Text style={styles.guideRole}>
                            {guide.mainExpertise || guide.expertise?.[0] || "Guide"} • {guide.location}
                          </Text>
                          <View style={styles.guideInfoRow}>
                            <View style={styles.guideInfoItem}>
                              <Ionicons name="star" size={14} color="#FFD700" />
                              <Text style={styles.guideInfoText}>{guide.rating || "N/A"}</Text>
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
          </View>
        )}

        {/* Regular Content (only show when not searching) */}
        {!searchResults && (
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
              <ActivityIndicator size="small" color="#007BFF" style={{ marginVertical: 20 }} />
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

            {/* Top Rated guides Section */}
            {(activeFilter === "All" || activeFilter === "Guides") && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Rated guides</Text>
                {placeholderGuides.map(renderGuideCard)}
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
  },
  logo: {
    fontSize: 24,
    fontFamily: "Nunito_700Bold",
    color: "#000",
  },
  subTitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 15,
    marginTop: 5,
    fontFamily: "Nunito_400Regular",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#000",
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
    marginBottom: 15,
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
    marginBottom: 8,
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
