import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../../constants/api";

/** Valid interest categories per API (GET/PATCH /api/tourist/profile) */
const TOURIST_INTERESTS = [
  "Adventure",
  "Food",
  "Photography",
  "Music",
  "Art",
  "Nature",
  "Hiking",
  "Architecture",
  "Culture",
  "Night Life",
  "Shopping",
  "Sports",
  "History",
  "Local Experiences",
  "Festivals",
];

type TouristProfile = {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  languages?: string[];
  interests?: string[];
};

export default function EditProfileTourist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [languagesStr, setLanguagesStr] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(null);

  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Authentication Required", "Please login again");
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/tourist/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const text = await response.text();
      if (!response.ok || text.trim().startsWith("<")) {
        setFullName("");
        setBio("");
        setLocation("");
        setLanguagesStr("");
        setSelectedInterests([]);
        setOriginalAvatar(null);
        setLoading(false);
        return;
      }

      const data = JSON.parse(text);
      const profile: TouristProfile = data.tourist || data.user || data;

      setFullName(profile.fullName || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setLanguagesStr(
        Array.isArray(profile.languages) ? profile.languages.join(", ") : ""
      );
      setSelectedInterests(
        Array.isArray(profile.interests) ? profile.interests : []
      );
      setOriginalAvatar(profile.avatar || null);
    } catch (error) {
      console.error("Profile fetch error:", error);
      Alert.alert("Error", "Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const updateProfile = async () => {
    if (bio.length > 500) {
      Alert.alert("Error", "Bio must be 500 characters or less");
      return;
    }

    const languagesArray = languagesStr
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Authentication Required", "Please login again");
        router.push("/login");
        return;
      }

      let response: Response;
      if (!avatarUri) {
        response = await fetch(`${API_URL}/api/tourist/profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: fullName.trim() || undefined,
            bio: bio.trim() || undefined,
            location: location.trim() || undefined,
            languages: languagesArray.length > 0 ? languagesArray : undefined,
            interests: selectedInterests.length > 0 ? selectedInterests : undefined,
          }),
        });
      } else {
        const formData = new FormData();
        if (fullName.trim()) formData.append("fullName", fullName.trim());
        if (bio.trim()) formData.append("bio", bio.trim());
        if (location.trim()) formData.append("location", location.trim());
        formData.append("languages", JSON.stringify(languagesArray));
        formData.append("interests", JSON.stringify(selectedInterests));

        const filename = avatarUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("avatar", {
          uri: avatarUri,
          name: filename,
          type,
        } as any);

        response = await fetch(`${API_URL}/api/tourist/profile`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      const text = await response.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        Alert.alert(
          "Server Error",
          "Could not read server response. Please try again."
        );
        setSaving(false);
        return;
      }

      if (!response.ok) {
        Alert.alert(
          "Update Failed",
          data.msg || "Failed to update profile"
        );
        setSaving(false);
        return;
      }

      Alert.alert("Success", data.msg || "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Update profile error:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUri = () => {
    if (avatarUri) return avatarUri;
    if (originalAvatar) {
      return originalAvatar.startsWith("http")
        ? originalAvatar
        : `${API_URL}${originalAvatar}`;
    }
    return "https://images.unsplash.com/photo-1544005313-94ddf0286df2";
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 40 + insets.bottom,
      }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={s(26)} color="#000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: s(20) }]}>
          Edit Profile
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.avatarWrapper}>
        <Image
          source={{ uri: getAvatarUri() }}
          style={[styles.avatar, { width: s(90), height: s(90) }]}
        />
        <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage}>
          <Ionicons name="pencil" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#999"
          value={fullName}
          onChangeText={setFullName}
          maxLength={100}
        />

        <Text style={styles.label}>Bio / About you</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          textAlignVertical="top"
          placeholder="Tell us about yourself (max 500 characters)"
          placeholderTextColor="#999"
          value={bio}
          onChangeText={setBio}
          maxLength={500}
        />
        {bio.length > 0 && (
          <Text style={styles.charCount}>{bio.length} / 500 characters</Text>
        )}

        <Text style={styles.label}>Location</Text>
        <View style={styles.locationInput}>
          <Ionicons name="location-outline" size={18} color="#007BFF" />
          <TextInput
            style={styles.locationText}
            placeholder="e.g., New York, USA"
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />
        </View>

        <Text style={styles.label}>Languages</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. English, Spanish, French"
          placeholderTextColor="#999"
          value={languagesStr}
          onChangeText={setLanguagesStr}
          maxLength={200}
        />

        <Text style={styles.label}>Interests</Text>
        <Text style={styles.labelHint}>
          Select your interests for better recommendations
        </Text>
        <View style={styles.interestsGrid}>
          {TOURIST_INTERESTS.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.interestChip,
                selectedInterests.includes(interest) && styles.interestChipSelected,
              ]}
              onPress={() => toggleInterest(interest)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.interestChipText,
                  selectedInterests.includes(interest) &&
                    styles.interestChipTextSelected,
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={updateProfile}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F7FF",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 30,
  },
  headerTitle: { fontFamily: "Nunito_700Bold" },
  avatarWrapper: { alignItems: "center", marginBottom: 30 },
  avatar: { borderRadius: 100 },
  editAvatarBtn: {
    position: "absolute",
    right: "35%",
    bottom: 0,
    backgroundColor: "#007BFF",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: 14 },
  label: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    marginTop: 6,
  },
  labelHint: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#666",
    marginTop: -4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#E7F0FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#000",
  },
  textArea: { height: 100 },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F0FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#000",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#E7F0FF",
    borderWidth: 1.5,
    borderColor: "#B8D4F0",
  },
  interestChipSelected: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  interestChipText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: "#333",
  },
  interestChipTextSelected: {
    color: "#fff",
  },
  saveButton: {
    marginTop: 40,
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  saveButtonDisabled: { opacity: 0.6 },
  loadingContainer: { justifyContent: "center", alignItems: "center", flex: 1 },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },
  charCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginTop: 4,
    fontFamily: "Nunito_400Regular",
  },
});
