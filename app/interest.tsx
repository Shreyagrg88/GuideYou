import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

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
  "Technology",
  "Fitness",
  "Nature",
  "Travel",
  "Movies",
  "Reading",
];

export default function InterestsScreen() {
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

      <TouchableOpacity style={styles.continueButton}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  option: {
    width: "47%",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  selected: {
    borderColor: "#007BFF",
    backgroundColor: "#E8F0FF",
  },
  optionText: {
    color: "#333",
    fontWeight: "500",
  },
  selectedText: {
    color: "#007BFF",
    fontWeight: "600",
  },
  continueButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 10,
    alignItems: "center",
  },
  continueText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
