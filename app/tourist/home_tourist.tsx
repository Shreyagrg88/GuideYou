import React, { useState } from "react";
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
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("For you");

  const renderTrip = ({ item }: any) => (
    <View style={styles.card}>
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
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.logo}>
        Guide<Text style={{ color: "#007BFF" }}>You</Text>
      </Text>
      <Text style={styles.subTitle}>
        Discover amazing places and guides with us
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#777" />
        <TextInput placeholder="Search places..." style={styles.searchInput} />
      </View>

      {/* Categories */}
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

      {/* Trips */}
      <FlatList
        data={trips}
        renderItem={renderTrip}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <Ionicons name="home" size={26} color="#007BFF" />
        <Ionicons name="chatbubble-outline" size={26} color="#777" />
        <Ionicons name="grid-outline" size={26} color="#777" />
        <Ionicons name="person-outline" size={26} color="#777" />
      </View>
    </View>
  );
}

// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
  },

  logo: {
    fontSize: 30,
    fontFamily: "Nunito_400Regular",
  },

  subTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    marginTop: 5,
    fontFamily: "Nunito_400Regular",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },

  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontFamily: "Nunito_400Regular",
  },

  categoryRow: {
    flexDirection: "row",
    marginBottom: 15,
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
    marginBottom: 15,
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

  bottomNav: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 25,
    elevation: 5,
  },
});
