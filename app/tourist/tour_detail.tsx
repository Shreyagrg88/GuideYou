import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function TourDetails() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>

      <View style={styles.titleRow}>
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Trek to Annapurna Basecamp</Text>
      </View>

      <Image
        source={{
          uri: "https://www.havenholidaysnepal.com/storage/trip-galleries/55/ABC%20with%20fishtail.JPG0.21441100%201728277965.webp",
        }}
        style={styles.mainImage}
      />

      <View style={styles.infoRow}>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={18} color="#007BFF" />
          <Text style={styles.locationText}>Pokhara, Nepal</Text>
        </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={18} color="#FFD700" />
          <Text style={styles.ratingText}>4.5</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>About ABC</Text>
      <Text style={styles.aboutText}>
        The Annapurna Base Camp trek takes you on an unforgettable journey to
        the foot of the majestic Annapurna mountain, while also taking you
        through the breathtaking base of Machhapuchhre, the iconic “Fishtail”
        peak.
      </Text>

      <View style={styles.cardRow}>
        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={30} color="#007BFF" />
          <Text style={styles.cardTitle}>12 days</Text>
          <Text style={styles.cardSubtitle}>Duration</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="bar-chart-outline" size={30} color="#007BFF" />
          <Text style={styles.cardTitle}>Hard</Text>
          <Text style={styles.cardSubtitle}>Difficulty</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Equipment Needed</Text>
      <Text style={styles.aboutText}>
        waterproof, sturdy trekking shoes, sleeping bag and camping tent, a
        trekking pole/stick, clothing (shell jackets, windcheater, sweatshirt,
        base layer t-shirt and trekking pants), and winter gear and accessories
        like gloves, cap.
      </Text>

      <TouchableOpacity style={styles.weatherBox}>
        <Ionicons name="cloud-outline" size={22} color="#007BFF" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.weatherTitle}>Weather & AI suggestions</Text>
          <Text style={styles.weatherSubtitle}>
            Check forecast and smart tips
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#000"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/tourist/guide_list")}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Find guides</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F7FF",
    padding: 20,
  },
  
  backButton: {
    marginBottom: 10,
    width: 40,
  },

  titleRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 30,
  marginTop: 30,
  },

  title: {
  fontSize: 22,
  fontFamily: "Nunito_700Bold",
  marginLeft: 25,
  flexShrink: 1, // to prevent overflow
  alignItems: "center",
  },

  mainImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationText: {
    marginLeft: 5,
    color: "#007BFF",
    fontFamily: "Nunito_400Regular",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  ratingText: {
    marginLeft: 5,
    fontFamily: "Nunito_400Regular",
  },

  sectionTitle: {
    fontSize: 20,
    marginBottom: 8,
    fontFamily: "Nunito_700Bold",
  },

  aboutText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 15,
    fontFamily: "Nunito_400Regular",
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  infoCard: {
    width: "48%",
    backgroundColor: "#E7F0FF",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 25,

    
  },

  cardTitle: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  cardSubtitle: {
    fontSize: 13,
    color: "#777",
    fontFamily: "Nunito_400Regular",
  },

  weatherBox: {
    backgroundColor: "#E7F0FF",
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
    marginTop: 20,

  },

  weatherTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },

  weatherSubtitle: {
    fontSize: 15,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },

  primaryButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
});
