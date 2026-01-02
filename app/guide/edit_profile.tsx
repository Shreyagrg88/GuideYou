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

const BASE_URL = "http://192.168.1.67:5000";

type GuideProfile = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatar: string;
  bio: string;
  mainExpertise: string;
  location: string;
  expertise: string[];
};

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [mainExpertise, setMainExpertise] = useState("");
  const [location, setLocation] = useState("");
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

      const response = await fetch(`${BASE_URL}/api/guide/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert("Session Expired", "Please login again");
          router.push("/login");
        } else {
          Alert.alert("Error", data.msg || "Failed to load profile");
        }
        return;
      }

      const profile: GuideProfile = data.guide;
      setFullName(profile.fullName || "");
      setBio(profile.bio || "");
      setMainExpertise(profile.mainExpertise || "");
      setLocation(profile.location || "");
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
      Alert.alert(
        "Permission Required",
        "Please allow access to photos."
      );
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

  const updateProfile = async () => {
    if (bio.length > 500) {
      Alert.alert("Error", "Bio must be 500 characters or less");
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Authentication Required", "Please login again");
        router.push("/login");
        return;
      }

      const formData = new FormData();

      if (fullName.trim()) {
        formData.append("fullName", fullName.trim());
      }
      if (bio.trim()) {
        formData.append("bio", bio.trim());
      }
      if (mainExpertise.trim()) {
        formData.append("mainExpertise", mainExpertise.trim());
      }
      if (location.trim()) {
        formData.append("location", location.trim());
      }

      // Only append avatar if user selected a new image
      if (avatarUri) {
        formData.append("avatar", {
          uri: avatarUri,
          type: "image/jpeg",
          name: "avatar.jpg",
        } as any);
      }

      const response = await fetch(`${BASE_URL}/api/guide/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - React Native will set it automatically for FormData
        },
        body: formData,
      });

      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        Alert.alert("Server Error", `Server returned ${response.status}. Please try again.`);
        setSaving(false);
        return;
      }

      if (!response.ok) {
        Alert.alert("Update Failed", data.msg || "Failed to update profile");
        return;
      }

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Update profile error:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUri = () => {
    if (avatarUri) {
      return avatarUri;
    }
    if (originalAvatar) {
      if (originalAvatar.startsWith("http")) {
        return originalAvatar;
      }
      return `${BASE_URL}${originalAvatar}`;
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={s(26)} color="#000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: s(18) }]}>
          Edit Profile
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <Image
          source={{ uri: getAvatarUri() }}
          style={[styles.avatar, { width: s(90), height: s(90) }]}
        />

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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 30,
  },

  headerTitle: {
    fontFamily: "Nunito_700Bold",
  },

  avatarWrapper: {
    alignItems: "center",
    marginBottom: 30,
  },

  avatar: {
    borderRadius: 100,
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
