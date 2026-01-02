import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TouristNavBar from "../components/tourist_navbar";

const BASE_URL = "http://192.168.1.67:5000";
const categories = ["For you", "Nature", "Food", "Culture"];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("For you");
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchHomepageActivities = async (category: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const url = `${BASE_URL}/api/tourist/homepage?category=${encodeURIComponent(
        category
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
        setTrips([]);
        return;
      }

      // Map API response to component format
      const mappedActivities = (data.activities || []).map((activity: any) => ({
        id: activity.id,
        title: activity.title,
        days: activity.days,
        rating: activity.rating || 4.5,
        image: activity.image ? `${BASE_URL}${activity.image}` : null,
        location: activity.location,
        category: activity.category,
        difficulty: activity.difficulty,
      }));

      setTrips(mappedActivities);
    } catch (error: any) {
      console.error("Homepage fetch error:", error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomepageActivities(activeCategory);
  }, [activeCategory]);

  const renderTrip = ({ item }: any) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/tourist/tour_detail",
          params: { id: item.id },
        })
      }
      style={styles.card}
      activeOpacity={0.8}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.tripImage} />
      ) : (
        <View style={[styles.tripImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={40} color="#ccc" />
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.tripDays}>{item.days}</Text>
        <Text style={styles.tripTitle}>{item.title}</Text>

        {item.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#777" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        )}

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.rating}>{item.rating || 4.5}</Text>
          <Ionicons name="bookmark-outline" size={20} color="#555" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.logo}>
          Guide<Text style={{ color: "#007BFF" }}>You</Text>
        </Text>

        <Text style={styles.subTitle}>
          Discover amazing places and guides with us
        </Text>

        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryBtn,
                activeCategory === cat && styles.activeCategory,
              ]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === cat && styles.activeCategoryText,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Loading activities...</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No activities found</Text>
            <Text style={styles.emptySubtext}>
              Try selecting a different category
            </Text>
          </View>
        ) : (
          <FlatList
            data={trips}
            renderItem={renderTrip}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
          />
        )}
      </View>

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
    marginBottom: 25,
    marginTop: 5,
    fontFamily: "Nunito_400Regular",
  },

  categoryRow: {
    flexDirection: "row",
    marginBottom: 25,
  },

  categoryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    marginRight: 10,
  },

  activeCategory: { backgroundColor: "#007BFF" },

  categoryText: {
    color: "#555",
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },

  activeCategoryText: { color: "#fff" },

  card: {
    backgroundColor: "#F7FAFF",
    borderRadius: 15,
    marginBottom: 35,
    overflow: "hidden",
  },

  tripImage: { width: "100%", height: 160 },

  cardContent: { padding: 12 },

  tripDays: {
    fontSize: 12,
    color: "#777",
    marginBottom: 4,
    fontFamily: "Nunito_400Regular",
  },

  tripTitle: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    marginBottom: 8,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  stars: { fontSize: 14 },

  rating: {
    marginLeft: 5,
    marginRight: "auto",
    fontFamily: "Nunito_400Regular",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  locationText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#777",
    fontFamily: "Nunito_400Regular",
  },
  placeholderImage: {
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
    fontFamily: "Nunito_700Bold",
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: "#999",
    fontFamily: "Nunito_400Regular",
  },
});
