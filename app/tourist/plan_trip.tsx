import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../components/screen-header";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import TouristNavBar from "../components/tourist_navbar";

const PAGE_BG = "#DDEEFF";
const PRIMARY = "#007BFF";

export default function PlanTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [destination, setDestination] = useState("");
  const [interests, setInterests] = useState("");
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);

  const canGenerate = useMemo(
    () => destination.trim().length > 1 && interests.trim().length > 1 && !loading,
    [destination, interests, loading]
  );

  const adjustDays = (delta: number) => {
    setDays((current) => Math.min(14, Math.max(1, current + delta)));
  };

  const handleGenerate = () => {
    if (destination.trim().length < 2) {
      Alert.alert("Destination required", "Please enter at least 2 characters for your destination.");
      return;
    }
    if (interests.trim().length < 2) {
      Alert.alert(
        "Activity required",
        "Tell us what you want to do (at least 2 characters)."
      );
      return;
    }

    setLoading(true);
    router.push({
      pathname: "/tourist/plan_trip_result",
      params: {
        destination: destination.trim(),
        interests: interests.trim(),
        numberOfDays: String(days),
      },
    });
    setLoading(false);
  };

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Plan your trip" marginBottom={28} />

        <View style={styles.heroCard}>
          <View style={styles.sparkleBadge}>
            <Ionicons name="sparkles" size={20} color={PRIMARY} />
          </View>
          <Text style={styles.heroTitle}>Plan your itinerary with AI</Text>
          <Text style={styles.heroSubtitle}>
            Tell us where you are going, what you want to do, and how many days you have. We
            will build a weather-aware itinerary for your trip.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter destination"
            placeholderTextColor="#9AA4B2"
            value={destination}
            onChangeText={setDestination}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Activities and interests</Text>
          <TextInput
            style={styles.textArea}
            placeholder="What do you want to do? Hiking, museum, local food, photography..."
            placeholderTextColor="#9AA4B2"
            value={interests}
            onChangeText={setInterests}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Number of days</Text>
          <View style={styles.daysCard}>
            <TouchableOpacity
              style={[styles.dayButton, days <= 1 && styles.dayButtonDisabled]}
              onPress={() => adjustDays(-1)}
              disabled={days <= 1}
            >
              <Ionicons name="remove" size={20} color={days <= 1 ? "#9AA4B2" : "#1B1B1B"} />
            </TouchableOpacity>

            <View style={styles.dayValueWrap}>
              <Text style={styles.dayValue}>{days}</Text>
              <Text style={styles.dayLabel}>{days === 1 ? "day" : "days"}</Text>
            </View>

            <TouchableOpacity
              style={[styles.dayButton, days >= 14 && styles.dayButtonDisabled]}
              onPress={() => adjustDays(1)}
              disabled={days >= 14}
            >
              <Ionicons name="add" size={20} color={days >= 14 ? "#9AA4B2" : "#1B1B1B"} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
          activeOpacity={0.88}
          onPress={handleGenerate}
          disabled={!canGenerate}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.generateButtonText}>Generate with AI</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <TouristNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
    backgroundColor: PAGE_BG,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
    marginBottom: 28,
  },
  sparkleBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7FF",
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
    color: "#111111",
    fontFamily: "Nunito_700Bold",
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#657182",
    fontFamily: "Nunito_400Regular",
  },
  section: {
    marginBottom: 22,
  },
  label: {
    fontSize: 17,
    color: "#111111",
    fontFamily: "Nunito_700Bold",
    marginBottom: 12,
  },
  input: {
    height: 56,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#111111",
    fontFamily: "Nunito_400Regular",
  },
  textArea: {
    minHeight: 132,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    lineHeight: 22,
    color: "#111111",
    fontFamily: "Nunito_400Regular",
  },
  daysCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonDisabled: {
    backgroundColor: "#F3F5F8",
  },
  dayValueWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayValue: {
    fontSize: 24,
    color: "#111111",
    fontFamily: "Nunito_700Bold",
  },
  dayLabel: {
    fontSize: 13,
    color: "#657182",
    fontFamily: "Nunito_400Regular",
  },
  generateButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 17,
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },
});
