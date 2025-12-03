import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function GuideList() {
  const router = useRouter();

  const guides = [
    {
      id: 1,
      name: "Nema Sherpa",
      role: "Trek Guide",
      location: "Pokhara",
      experience: "10 Y",
      charge: "$200",
      rating: "4.5",
      image:
        "https://images.squarespace-cdn.com/content/v1/5522d488e4b05f384d080ecd/1563991565432-7GP2C8383XRQLW8PSWBK/bishnu_mardi_himal.jpeg",
    },
    {
      id: 2,
      name: "Dawa Rai",
      role: "Trek Guide",
      location: "Pokhara",
      experience: "10 Y",
      charge: "$200",
      rating: "4.5",
      image:
        "https://www.nepalguideinfo.com/new/wp-content/uploads/2025/01/Sanjib.jpg",
    },
    {
      id: 3,
      name: "Kumari Poudel",
      role: "Trek Guide",
      location: "Pokhara",
      experience: "10 Y",
      charge: "$200",
      rating: "4.5",
      image:
        "https://communitytrek.com/uploads/photos/3/Guide/Climbing-Guide.jpg",
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerText}>
        <Text style={{ color: "#0066FF", fontFamily: "Nunito_700Bold" }}>
          Guide
        </Text>
        <Text style={{ fontFamily: "Nunito_700Bold" }}>You</Text>
      </Text>

      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>
          Guides For You        </Text>
      </View>

      {guides.map((g) => (
        <View key={g.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Image source={{ uri: g.image }} style={styles.profilePic} />

            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.guideName}>{g.name}</Text>
              <Text style={styles.guideRole}>
                {g.role}  •  {g.location}
              </Text>
            </View>

            <Ionicons name="checkmark-circle" size={26} color="#00C851" />
          </View>

          <Text style={styles.description}>
            I am a Trek tour guide who has 10 years of experience in trekking
            and can speak fluent English, French and Spanish.
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
            <TouchableOpacity style={styles.bookButton}>
              <Text style={styles.bookText}>Book</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.messageButton}>
              <Text style={styles.messageText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

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

  headerText: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    marginBottom: 30,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 20,
    width: "95%",
  },

  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginLeft: 100,
    flexShrink: 1,
    lineHeight: 26,
    alignItems: "center",

  },

  card: {
    backgroundColor: "#F3F7FF",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
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
  },

  bookButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 55,
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
    paddingHorizontal: 55,
    borderRadius: 8,
  },

  messageText: {
    fontFamily: "Nunito_700Bold",
    color: "#555",
    fontSize: 14,
  },
});
