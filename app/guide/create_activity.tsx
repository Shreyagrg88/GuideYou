import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../../constants/api";

import LocationAutocomplete from "../components/locationAutocomplete";

export default function AddNewActivity() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [equipment, setEquipment] = useState("");

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const [duration, setDuration] = useState(3);
  const [difficulty, setDifficulty] = useState("Moderate");
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const categories = [
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
  ].map((item) => ({ label: item, value: item }));

  const pickImage = async () => {
    if (photos.length >= 10) {
      Alert.alert(
        "Photo Limit Reached",
        "You can upload a maximum of 10 photos."
      );
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to photos."
      );
      return;
    }

    const remainingSlots = 10 - photos.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map((img) => img.uri);
      setPhotos((prev) => [...prev, ...newImages].slice(0, 10));
    }
  };

  const publishActivity = async () => {
    if (!name || !location || !description || !category) {
      Alert.alert(
        "Missing Fields",
        "Please fill in all required fields."
      );
      return;
    }

    if (description.trim().length < 20) {
      Alert.alert(
        "Description Too Short",
        "Please provide a detailed description (20+ characters)."
      );
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert(
          "Authentication Error",
          "Please login again to continue."
        );
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("location", location.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("duration", duration.toString());
      formData.append("difficulty", difficulty);

      if (equipment.trim()) {
        formData.append("equipment", equipment.trim());
      }

      photos.slice(0, 10).forEach((uri, index) => {
        formData.append("photos", {
          uri,
          name: `photo_${index}.jpg`,
          type: "image/jpeg",
        } as any);
      });

      const response = await fetch(
        `${API_URL}/api/activities`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      let data: any;

      try {
        data = await response.json();
      } catch {
        Alert.alert(
          "Server Error",
          `Server returned ${response.status}.`
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        Alert.alert(
          "Publish Failed",
          data.msg || data.message || "Something went wrong."
        );
        setLoading(false);
        return;
      }

      Alert.alert(
        "Submitted for review",
        "Your activity has been sent for admin review. Once approved, it will be published and visible to tourists. If it's not approved, you'll see the reason in My Activities and can edit and resubmit.",
        [
          {
            text: "OK",
            onPress: () => {
              setName("");
              setLocation("");
              setDescription("");
              setEquipment("");
              setCategory(null);
              setDuration(3);
              setDifficulty("Moderate");
              setPhotos([]);
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Error",
        "Failed to upload activity. Check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F7FF" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={26} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>New Activity</Text>
          </View>

          {/* Activity Name */}
          <Text style={styles.label}>Activity Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter activity name"
            value={name}
            onChangeText={setName}
          />

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <LocationAutocomplete
            value={location}
            onSelect={(data) => setLocation(data.name)}
          />

          {/* Description */}
          <Text style={styles.label}>Detailed Description</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            multiline
            placeholder="Describe the activity in detail. Include what tourists can expect, highlights, and any important information..."
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
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
            listMode="MODAL"
          />

          {/* Photos */}
          <Text style={styles.label}>Photo Gallery</Text>
          <Text style={styles.subText}>
            Upload high-quality images (max 10).
          </Text>

          <View style={styles.photoContainer}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickImage}
            >
              <Ionicons
                name="image-outline"
                size={30}
                color="#007BFF"
              />
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

          {/* Duration & Difficulty */}
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
                    difficulty === level && styles.diffActive,
                  ]}
                  onPress={() => setDifficulty(level)}
                >
                  <Text
                    style={[
                      styles.diffText,
                      difficulty === level && styles.diffTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Equipment Needed</Text>
            <Text style={styles.subText}>
              Write each item on a new line (list format)
            </Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              placeholder={`• Hiking boots
• Water bottle
• Backpack
• Camera`}
              value={equipment}
              onChangeText={setEquipment}
              textAlignVertical="top"
            />
          </View>

          {/* Publish */}
          <TouchableOpacity
            style={[
              styles.publishButton,
              loading && styles.publishButtonDisabled,
            ]}
            onPress={publishActivity}
            disabled={loading}
          >
            <Text style={styles.publishText}>
              {loading ? "Publishing..." : "Publish Activity"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 25,
  },
  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginLeft: 80,
  },
  label: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    marginTop: 15,
  },
  subText: { fontSize: 12, color: "#777" },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#fff",
    color: "#777",
  },
  multilineInput: { height: 100 },
  dropdown: {
    borderRadius: 10,
    borderColor: "#D0D6E0",
    marginTop: 8,
  },
  dropdownContainer: { borderColor: "#D0D6E0" },
  photoContainer: { marginTop: 10 },
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
  photoButtonText: { fontSize: 12, marginTop: 5, color: "#007BFF" },
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
  circleButtonText: { fontSize: 22, color: "#007BFF" },
  durationNumber: {
    marginHorizontal: 18,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },
  daysLabel: { marginLeft: 10 },
  diffLabel: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
  },
  diffRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
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
  diffText: { color: "#555" },
  diffTextActive: { color: "#fff", fontFamily: "Nunito_700Bold" },
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
  publishButtonDisabled: { opacity: 0.6 },
});
