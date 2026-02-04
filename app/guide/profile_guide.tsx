import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../../constants/api";
import GuideNavbar from "../components/guide_navbar";

const NAVBAR_HEIGHT = 70;

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
  yearsOfExperience?: number | string;
};

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  useEffect(() => {
    fetchProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/guide/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        router.replace("/login");
        return;
      }

      setProfile(data.guide);
    } catch (error) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove(["token", "user", "role"]);
            router.replace("/login");
          },
        },
      ]
    );
  };

  const getAvatarUri = () => {
    if (!profile?.avatar) {
      return "https://images.unsplash.com/photo-1544005313-94ddf0286df2";
    }
    return profile.avatar.startsWith("http")
      ? profile.avatar
      : `${API_URL}${profile.avatar}`;
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) return null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: NAVBAR_HEIGHT + insets.bottom + 30,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/guide/home_guide")}>
            <Ionicons name="chevron-back" size={s(26)} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: s(20) }]}>
            Profile
          </Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Profile block – Instagram-style (like tourists see) */}
        <View style={styles.profileBlock}>
          <Image
            source={{ uri: getAvatarUri() }}
            style={[styles.avatar, { width: s(100), height: s(100) }]}
          />
          <Text style={[styles.displayName, { fontSize: s(20) }]}>
            {profile.fullName || profile.username}
          </Text>
          <Text style={[styles.mainExpertise, { fontSize: s(14) }]}>
            {profile.mainExpertise || "Guide"}
          </Text>
          {profile.bio ? (
            <Text style={[styles.bio, { fontSize: s(14) }]}>{profile.bio}</Text>
          ) : null}
          {profile.yearsOfExperience != null && profile.yearsOfExperience !== "" ? (
            <Text style={[styles.meta, { fontSize: s(13) }]}>
              {Number(profile.yearsOfExperience) === 1
                ? "1 year of experience"
                : `${profile.yearsOfExperience} years of experience`}
            </Text>
          ) : null}
          {profile.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={s(14)} color="#666" />
              <Text style={[styles.locationText, { fontSize: s(13) }]}>{profile.location}</Text>
            </View>
          ) : null}
          {profile.expertise && profile.expertise.length > 0 ? (
            <View style={styles.expertiseWrap}>
              {profile.expertise.slice(0, 5).map((e, i) => (
                <View key={i} style={styles.expertiseChip}>
                  <Text style={styles.expertiseChipText}>{e}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/guide/edit_profile")}
          >
            <Ionicons name="pencil-outline" size={18} color="#007BFF" />
            <Text style={styles.primaryBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/guide/availability")}
          >
            <Ionicons name="calendar-outline" size={18} color="#007BFF" />
            <Text style={styles.primaryBtnText}>Edit Availability</Text>
          </TouchableOpacity>
        </View>

        {/* Menu list */}
        <View style={styles.menuList}>
          <ProfileOption
            icon="card-outline"
            label="Payment Method"
            onPress={() => router.push("/guide/payment")}
          />
          <TouchableOpacity style={[styles.menuRow, styles.logoutRow]} onPress={handleLogout}>
            <View style={styles.menuRowLeft}>
              <Ionicons name="log-out-outline" size={20} color="#E53935" />
              <Text style={styles.logoutText}>Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View
        style={[
          styles.navbarWrapper,
          { paddingBottom: insets.bottom },
        ]}
      >
        <GuideNavbar />
      </View>
    </View>
  );
}

function ProfileOption({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuRowLeft}>
        <Ionicons name={icon} size={20} color="#333" />
        <Text style={styles.menuRowText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F7FF" },
  container: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 20 },

  profileBlock: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: { borderRadius: 100, marginBottom: 12 },
  displayName: { fontFamily: "Nunito_700Bold", color: "#1a1a1a", marginBottom: 4 },
  mainExpertise: { fontFamily: "Nunito_700Bold", color: "#007BFF", marginBottom: 8 },
  bio: {
    fontFamily: "Nunito_400Regular",
    color: "#444",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  meta: { fontFamily: "Nunito_400Regular", color: "#666", marginBottom: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  locationText: { fontFamily: "Nunito_400Regular", color: "#666" },
  expertiseWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  expertiseChip: {
    backgroundColor: "#E7F0FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expertiseChipText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#333" },

  actionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#007BFF",
  },
  primaryBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#007BFF" },

  menuList: { gap: 0, backgroundColor: "#FFF", borderRadius: 16, overflow: "hidden", marginBottom: 20 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuRowText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#333" },
  logoutRow: { borderBottomWidth: 0 },
  logoutText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#E53935" },

  navbarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontFamily: "Nunito_400Regular", color: "#666" },
});
