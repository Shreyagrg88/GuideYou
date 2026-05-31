/**
 * Edit Profile
 * Route: /guide/edit_profile
 *
 * Edit guide profile and avatar. PATCH /api/guide/profile
 */

import { Ionicons } from "@expo/vector-icons";
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
import ScreenHeader from "../../components/screen-header";
import { API_URL } from "../../constants/api";
import { fetchGuideProfile, saveGuideProfile } from "../../api/guideProfile";
import { resolveAvatarUri } from "../../utils/avatar";
import {
  launchProfileImagePicker,
  type PickedProfileImage,
} from "../../utils/profileImagePicker";
import { SkeletonProfileScreen } from "@/components/Skeleton";

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();


  // --- Local state ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [mainExpertise, setMainExpertise] = useState("");
  const [location, setLocation] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [languagesStr, setLanguagesStr] = useState("");
  const [pickedAvatar, setPickedAvatar] = useState<PickedProfileImage | null>(null);
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(null);

  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  // --- Effects (load data, listeners) ---
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profile = await fetchGuideProfile();
      setFullName(profile.fullName || "");
      setBio(profile.bio || "");
      setMainExpertise(profile.mainExpertise || "");
      setLocation(profile.location || "");
      setYearsOfExperience(profile.yearsOfExperience?.toString() || "");
      setLanguagesStr(Array.isArray(profile.languages) ? profile.languages.join(", ") : "");
      setOriginalAvatar(profile.avatar || null);
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      console.error("Profile fetch error:", err);
      if (err.status === 401 || err.message === "Not logged in") {
        Alert.alert("Authentication Required", "Please login again");
        router.push("/login");
        return;
      }
      Alert.alert("Error", err.message || "Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const picked = await launchProfileImagePicker();
    if (picked === "denied") {
      Alert.alert("Permission Required", "Please allow access to photos.");
      return;
    }
    if (picked) {
      setPickedAvatar(picked);
    }
  };

  const updateProfile = async () => {
    if (bio.length > 500) {
      Alert.alert("Error", "Bio must be 500 characters or less");
      return;
    }

    try {
      setSaving(true);

      const languagesArray = languagesStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const result = await saveGuideProfile(
        {
          fullName: fullName.trim() || undefined,
          bio: bio.trim() || undefined,
          mainExpertise: mainExpertise.trim() || undefined,
          location: location.trim() || undefined,
          yearsOfExperience: yearsOfExperience.trim()
            ? parseInt(yearsOfExperience.trim(), 10)
            : undefined,
          languages: languagesArray.length > 0 ? languagesArray : undefined,
        },
        pickedAvatar
      );

      if (result.guide.avatar) {
        setOriginalAvatar(result.guide.avatar);
        setPickedAvatar(null);
      }

      Alert.alert("Success", result.msg || "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      console.error("Update profile error:", err);
      if (err.status === 401 || err.message === "Not logged in") {
        Alert.alert("Authentication Required", "Please login again");
        router.push("/login");
        return;
      }
      if (err.message?.includes("Network request failed")) {
        Alert.alert(
          "Connection error",
          `Could not reach the server at ${API_URL}. Ensure your phone and Mac are on the same Wi‑Fi and the backend is running on port 5001.`
        );
        return;
      }
      Alert.alert("Update Failed", err.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUri = (): string | null => {
    if (pickedAvatar?.uri) {
      return pickedAvatar.uri;
    }
    return resolveAvatarUri(originalAvatar);
  };

  if (loading) {
    return <SkeletonProfileScreen />;
  }

  // --- Render ---
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 40 + insets.bottom,
      }}
    >
      {/* Header */}
      <ScreenHeader
        title="Edit Profile"
        includeTopInset
        titleStyle={{ fontSize: s(20) }}
        marginBottom={30}
      />

      <View style={styles.avatarWrapper}>
        {getAvatarUri() ? (
          <Image
            source={{ uri: getAvatarUri()! }}
            style={[styles.avatar, { width: s(90), height: s(90) }]}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              { width: s(90), height: s(90) },
            ]}
          >
            <Ionicons name="person" size={s(40)} color="#94A3B8" />
          </View>
        )}

        <TouchableOpacity
          style={styles.editAvatarBtn}
          onPress={pickImage}
        >
          <Ionicons name="pencil" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Form */}
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
          <Text style={styles.charCount}>
            {bio.length} / 500 characters
          </Text>
        )}

        <Text style={styles.label}>Main expertise</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Trek Guide, Adventure Guide"
          placeholderTextColor="#999"
          value={mainExpertise}
          onChangeText={setMainExpertise}
          maxLength={50}
        />

        <Text style={styles.label}>Based on</Text>
        <View style={styles.locationInput}>
          <Ionicons name="location-outline" size={18} color="#007BFF" />
          <TextInput
            style={styles.locationText}
            placeholder="e.g., Kathmandu, Nepal"
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />
        </View>

        <Text style={styles.label}>Years of Experience</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 5"
          placeholderTextColor="#999"
          value={yearsOfExperience}
          onChangeText={(text) => {
            const numericValue = text.replace(/[^0-9]/g, "");
            setYearsOfExperience(numericValue);
          }}
          keyboardType="numeric"
          maxLength={3}
        />

        <Text style={styles.label}>Languages</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. English, Nepali, Hindi"
          placeholderTextColor="#999"
          value={languagesStr}
          onChangeText={setLanguagesStr}
          maxLength={200}
        />
      </View>

      {/* Save Button */}
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

  avatarWrapper: {
    alignItems: "center",
    marginBottom: 30,
  },

  avatar: {
    borderRadius: 100,
  },

  avatarPlaceholder: {
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

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

  form: {
    gap: 14,
  },

  label: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    marginTop: 6,
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

  textArea: {
    height: 100,
  },

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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
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
