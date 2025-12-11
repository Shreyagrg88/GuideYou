import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

export default function AddNewActivity() {
  // Category
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [category, setCategory] = useState(null);

  const categories = [
    "Adventure", "Culture", "Food", "Night Life", "Photography", "Shopping",
    "Music", "Sports", "Art", "History", "Nature", "Local Experiences",
    "Hiking", "Festivals", "Architecture"
  ].map((item) => ({ label: item, value: item }));

  // Duration
  const [duration, setDuration] = useState(3);

  // Difficulty
  const [difficulty, setDifficulty] = useState("Moderate");

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);

  // Select image
  const pickImage = async () => {
    let res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) {
      alert("Permission required to access photos.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((img) => img.uri);
      setPhotos((prev) => [...prev, ...newImages]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>New Activity</Text>
      </View>

      <Text style={styles.label}>Activity Name</Text>
      <TextInput style={styles.input} placeholder="Enter activity name" />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} placeholder="Enter location" />

      <Text style={styles.label}>Detailed Description</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        multiline
      />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <DropDownPicker
        open={categoryOpen}
        value={category}
        items={categories}
        setOpen={setCategoryOpen}
        setValue={setCategory}
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        placeholder="Select Category"
      />

      {/* Photo Upload */}
      <Text style={styles.label}>Photo Gallery</Text>
      <Text style={styles.subText}>Upload high-quality images.</Text>

      <View style={styles.photoContainer}>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          <Ionicons name="image-outline" size={30} color="#007BFF" />
          <Text style={styles.photoButtonText}>Add photos</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {photos.map((uri, index) => (
            <Image
              key={index}
              source={{ uri }}
              style={styles.photoPreview}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.durationBox}>
        <Text style={styles.durationLabel}>Duration</Text>

        <View style={styles.durationRow}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => duration > 1 && setDuration(duration - 1)}
          >
            <Text style={styles.circleButtonText}>–</Text>
          </TouchableOpacity>

          <Text style={styles.durationNumber}>{duration}</Text>

          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => setDuration(duration + 1)}
          >
            <Text style={styles.circleButtonText}>+</Text>
          </TouchableOpacity>

          <Text style={styles.daysLabel}>Days</Text>
        </View>

        <Text style={styles.diffLabel}>Difficulty Level</Text>

        <View style={styles.diffRow}>
          {["Easy", "Moderate", "Hard"].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.diffButton,
                difficulty === level && styles.diffActive
              ]}
              onPress={() => setDifficulty(level)}
            >
              <Text
                style={[
                  styles.diffText,
                  difficulty === level && styles.diffTextActive
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Equipment Needed</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="List required equipment"
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity style={styles.publishButton}>
        <Text style={styles.publishText}>Publish Activity</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F3F7FF",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 25,
  },

  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginLeft: 100,
  },

  label: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    marginTop: 15,
  },

  subText: {
    fontSize: 12,
    color: "#777",
    fontFamily: "Nunito_400Regular",
  },

  input: {
    height: 45,
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#ffffffff",
    color: "#777",
    fontFamily: "Nunito_400Regular",
  },

  multilineInput: {
    height: 100,
  },

  dropdown: {
    borderRadius: 10,
    borderColor: "#D0D6E0",
    marginTop: 8,
  },

  dropdownContainer: {
    borderColor: "#D0D6E0",
  },

  photoContainer: {
    marginTop: 10,
  },

  photoButton: {
    height: 90,
    width: 110,
    borderWidth: 1,
    borderColor: "#007BFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E6F2FF",
    marginBottom: 15,
  },

  photoButtonText: {
    fontSize: 12,
    marginTop: 5,
    color: "#007BFF",
    fontFamily: "Nunito_400Regular",
  },

  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 10,
  },

  durationBox: {
    marginTop: 20,
    backgroundColor: "#E6F2FF",
    padding: 15,
    borderRadius: 14,
  },

  durationLabel: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
  },

  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  circleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    borderColor: "#007BFF",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  circleButtonText: {
    fontSize: 22,
    color: "#007BFF",
  },

  durationNumber: {
    marginHorizontal: 18,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  daysLabel: {
    marginLeft: 10,
    fontFamily: "Nunito_400Regular",
  },

  diffLabel: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
  },

  diffRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },

  diffButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#A0A0A0",
    backgroundColor: "#fff",
  },

  diffActive: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },

  diffText: {
    color: "#555",
    fontFamily: "Nunito_400Regular",
  },

  diffTextActive: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
  },

  publishButton: {
    marginTop: 25,
    backgroundColor: "#007BFF",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },

  publishText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
});
