import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { API_URL } from "../../constants/api";

type Guide = {
  id: string;
  name: string;
  role: string;
  location: string;
  experience: string;
  charge: string;
  rating: string;
  image: string;
  description: string;
};

export default function GuideList() {
  const router = useRouter();
  const { category, activityId, duration } = useLocalSearchParams<{ 
    category: string;
    activityId?: string;
    duration?: string;
  }>();

  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGuides = async (categoryParam: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/tourist/guides?category=${encodeURIComponent(categoryParam)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.msg || "Failed to load guides");
        setGuides([]);
        return;
      }

      setGuides(data.guides || []);
    } catch (error) {
      console.error("Fetch guides error:", error);
      Alert.alert("Error", "Failed to load guides. Please try again.");
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (category) {
      fetchGuides(category);
    } else {
      Alert.alert("Error", "Category not provided");
      setLoading(false);
    }
  }, [category]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading guides...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Guides For You</Text>
      </View>

      {guides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No guides found for this category.
          </Text>
        </View>
      ) : (
        guides.map((g) => {
          const guideImage = g.image.startsWith("http") ? g.image : `${API_URL}${g.image}`;
          const profileParams = {
            guideId: g.id,
            guideName: g.name,
            guideRole: g.role,
            guideLocation: g.location,
            guideRating: g.rating,
            guideImage,
            guideCharge: g.charge,
            description: g.description,
            activityId: activityId || undefined,
            duration: duration || undefined,
          };
          return (
            <TouchableOpacity
              key={g.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: "/tourist/guide_profileview", params: profileParams })}
            >
              <View style={styles.cardHeader}>
                <Image
                  source={{ uri: guideImage }}
                  style={styles.profilePic}
                />

                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.guideName}>{g.name}</Text>
                  <Text style={styles.guideRole}>
                    {g.role} • {g.location}
                  </Text>
                </View>

                <Ionicons name="checkmark-circle" size={26} color="#00C851" />
              </View>

              <Text style={styles.description}>
                {g.description || "No description available."}
              </Text>

              <View style={styles.infoRow}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoValue}>{g.experience}</Text>
                  <Text style={styles.infoLabel}>Experience</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={[styles.infoValue, { color: "#E63946" }]}>
                    {g.charge}
                  </Text>
                  <Text style={styles.infoLabel}>Charge</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoValue}>⭐ {g.rating}</Text>
                  <Text style={styles.infoLabel}>Rating</Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    router.push({ pathname: "/tourist/booking", params: profileParams });
                  }}
                >
                  <Text style={styles.bookText}>Book</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    router.push("/tourist/chat_tourist");
                  }}
                >
                  <Text style={styles.messageText}>Message</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  loadingText: {
    marginTop: 10,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    fontSize: 14,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginLeft: 80,
  },

  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#F3F7FF",
    padding: 15,
    borderRadius: 15,
    marginBottom: 32,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  guideName: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },

  guideRole: {
    fontSize: 13,
    color: "#777",
    fontFamily: "Nunito_400Regular",
  },

  description: {
    marginTop: 10,
    fontSize: 14,
    color: "#444",
    fontFamily: "Nunito_400Regular",
    lineHeight: 20,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },

  infoBox: {
    flex: 1,
    alignItems: "center",
  },

  infoValue: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },

  infoLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
    fontFamily: "Nunito_400Regular",
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 12,
  },

  bookButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 8,
    
  },

  bookText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },

  messageButton: {
    backgroundColor: "#E6E6E6",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 5,
  },

  messageText: {
    fontFamily: "Nunito_700Bold",
    color: "#555",
    fontSize: 14,
  },
});
