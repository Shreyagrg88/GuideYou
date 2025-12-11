import React, { useState } from "react";
import TouristNavBar from "../components/tourist_navbar"; 
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const categories = ["For you", "Nature", "Food", "Culture"];

const trips = [
  {
    id: "1",
    title: "Trek to Annapurna Basecamp",
    days: "12 DAYS TRIP",
    rating: 4.5,
    image:
      "https://www.annapurnaencounter.com/public/uploads/annapurna-north-base-camp.jpg",
  },
  {
    id: "2",
    title: "Trek to Shrey Phokshundo Lake",
    days: "10 DAYS TRIP",
    rating: 4.5,
    image:
      "https://cdn.kimkim.com/files/a/content_articles/featured_photos/7d682b1c719ef1e1efffb28c33cec64ca4c31371/big-a1d4c2e965a8a9b8c800587f1b7a7dfd.jpg",
  },
    {
    id: "3",
    title: "Trek to Shrey Phokshundo Lake",
    days: "10 DAYS TRIP",
    rating: 4.5,
    image:
      "https://cdn.kimkim.com/files/a/content_articles/featured_photos/7d682b1c719ef1e1efffb28c33cec64ca4c31371/big-a1d4c2e965a8a9b8c800587f1b7a7dfd.jpg",
  },
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("For you");
  const router = useRouter();

  const renderTrip = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/tourist/tour_detail", params: item })}
      style={styles.card}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image }} style={styles.tripImage} />

      <View style={styles.cardContent}>
        <Text style={styles.tripDays}>{item.days}</Text>
        <Text style={styles.tripTitle}>{item.title}</Text>

        <View style={styles.ratingRow}>
          <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
          <Text style={styles.rating}>{item.rating}</Text>
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

        <FlatList
          data={trips}
          renderItem={renderTrip}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
      <TouristNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#fff",
  },

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

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 25,
  },

  searchInput: {
    marginLeft: 10,
    flex: 1,
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

  activeCategory: {
    backgroundColor: "#007BFF",
  },

  categoryText: {
    color: "#555",
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },

  activeCategoryText: {
    color: "#fff",
  },

  card: {
    backgroundColor: "#F7FAFF",
    borderRadius: 15,
    marginBottom: 35,
    overflow: "hidden",
  },

  tripImage: {
    width: "100%",
    height: 160,
  },

  cardContent: {
    padding: 12,
  },

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

  stars: {
    fontSize: 14,
  },

  rating: {
    marginLeft: 5,
    marginRight: "auto",
    fontFamily: "Nunito_400Regular",
  },
});
