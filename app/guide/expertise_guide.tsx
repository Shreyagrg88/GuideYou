import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export const expertiseList = [
  "Adventure Guide",
  "Cultural Experiences",
  "Food Tours",
  "Nightlife Guide",
  "Photography Tours",
  "Shopping Assistance",
  "Music & Entertainment Guide",
  "Sports Activities Guide",
  "Art & Creative Tours",
  "Historical Tours",
  "Nature & Wildlife Guide",
  "Local Experiences Guide",
  "Hiking & Trekking Guide",
  "Festival Guide",
  "Architecture Tours",
];

export default function ExpertiseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!userId) {
    Alert.alert("Error", "User session expired. Please login again.");
    router.replace("/login");
    return null;
  }

  const toggleExpertise = (item: string) => {
    setSelectedExpertise((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item]
    );
  };

  const handleContinue = async () => {
    if (selectedExpertise.length === 0) {
      Alert.alert("Validation", "Please select at least one expertise.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://192.168.1.67:5000/api/auth/set-expertise",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            expertise: selectedExpertise,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Error",
          data.message || data.msg || "Failed to save expertise"
        );
        return;
      }

      Alert.alert("Success", "Your expertise has been saved!");

      router.push({
        pathname: "/guide/verification",
        params: { userId },
      });

    } catch (err) {
      console.error("Network Error:", err);
      Alert.alert("Network Error", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What are your areas of expertise?</Text>
      <Text style={styles.subtitle}>
        Select the experiences you specialize in
      </Text>

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/guide/verification",
            params: { userId: userId },
          })
        }
        style={styles.skipButton}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.grid}>
        {expertiseList.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.option,
              selectedExpertise.includes(item) && styles.selected,
            ]}
            onPress={() => toggleExpertise(item)}
          >
            <Text
              style={[
                styles.optionText,
                selectedExpertise.includes(item) && styles.selectedText,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.continueButton, loading && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 20,
  },
  title: {
    fontFamily: "Nunito_700Bold",
    fontSize: 26,
    color: "#000",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
  skipButton: {
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  skipText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#007BFF",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  option: {
    width: "47%",
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#e1e5ee",
    borderRadius: 14,
    marginBottom: 16,
    alignItems: "center",
    backgroundColor: "#f9fafc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  selected: {
    borderColor: "#007BFF",
    backgroundColor: "#E8F0FF",
  },
  optionText: {
    fontFamily: "Nunito_400Regular",
    color: "#333",
    fontSize: 15,
    textAlign: "center",
  },
  selectedText: {
    fontFamily: "Nunito_400Regular",
    color: "#007BFF",
  },
  continueButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  continueText: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    fontSize: 17,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
});
