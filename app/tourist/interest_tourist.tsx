import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

const interestsList = [
  "Adventure",
  "Culture",
  "Food",
  "Night Life",
  "Photography",
  "Shopping",
  "Music",
  "Sports",
  "Art",
  "History",
  "Nature",
  "Local Experiences",
  "Hiking",
  "Festivals",
  "Architecture",
];

export default function InterestsScreen() {
  const router = useRouter();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What interests you?</Text>
      <Text style={styles.subtitle}>
        Select your interests to get personalized recommendations
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/tourist/home_tourist")}
        style={styles.skipButton}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {interestsList.map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[
              styles.option,
              selectedInterests.includes(interest) && styles.selected,
            ]}
            onPress={() => toggleInterest(interest)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.optionText,
                selectedInterests.includes(interest) && styles.selectedText,
              ]}
            >
              {interest}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.continueButton,
          selectedInterests.length === 0 && { opacity: 0.6 },
        ]}
        activeOpacity={0.9}
        onPress={() => router.push("/tourist/home_tourist")}
        disabled={selectedInterests.length === 0}
      >
        <Text style={styles.continueText}>Continue</Text>
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
    marginBottom: 6,
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
    marginBottom: 25,
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
});
