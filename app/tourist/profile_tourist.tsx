import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import {
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
import TouristNavbar from "../components/tourist_navbar";

const NAVBAR_HEIGHT = 70;

export default function ProfileTourist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const scale = width / 375;
  const s = (size: number) => Math.round(size * scale);

  // Placeholder profile data
  const profile = {
    fullName: "Tourist User",
    username: "tourist",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
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
            await AsyncStorage.multiRemove(["token", "user", "role", "userRole", "userId"]);
            router.replace("/login");
          },
        },
      ]
    );
  };


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
          <TouchableOpacity onPress={() => router.push("/tourist/home_tourist")}>
            <Ionicons name="chevron-back" size={s(26)} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: s(20) }]}>
            Profile
          </Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: profile.avatar }}
            style={[styles.avatar, { width: s(90), height: s(90) }]}
          />
          <Text style={[styles.name, { fontSize: s(18) }]}>
            {profile.fullName || profile.username}
          </Text>
          <Text style={[styles.role, { fontSize: s(14) }]}>
            Tourist
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsWrapper}>
          <ProfileOption
            icon="person-outline"
            label="Edit Profile"
            onPress={() => {
              Alert.alert("Coming Soon", "Edit profile feature will be available soon");
            }}
          />

          <ProfileOption
            icon="card-outline"
            label="Payment Method"
            onPress={() => router.push("/tourist/payment")}
          />

          <ProfileOption
            icon="bookmark-outline"
            label="My Bookings"
            onPress={() => router.push("/tourist/bookings_tourist")}
          />

          {/* LOGOUT */}
          <TouchableOpacity
            style={[styles.optionCard, styles.logoutCard]}
            onPress={handleLogout}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.iconBox, styles.logoutIconBox]}>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color="#E53935"
                />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#E53935" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View
        style={[
          styles.navbarWrapper,
          { paddingBottom: insets.bottom },
        ]}
      >
        <TouristNavbar />
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
    <TouchableOpacity style={styles.optionCard} onPress={onPress}>
      <View style={styles.optionLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color="#007BFF" />
        </View>
        <Text style={styles.optionText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#777" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F7FF" },
  container: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 30,
  },

  headerTitle: { fontFamily: "Nunito_700Bold" },

  profileSection: { alignItems: "center", marginBottom: 30 },

  avatar: { borderRadius: 100, marginBottom: 14 },

  name: { fontFamily: "Nunito_700Bold" },

  role: { fontFamily: "Nunito_400Regular", color: "#777" },

  optionsWrapper: { gap: 14 },

  optionCard: {
    backgroundColor: "#E7F0FF",
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  optionLeft: { flexDirection: "row", alignItems: "center" },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#D6E6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  optionText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
  },

  /* LOGOUT */
  logoutCard: {
    backgroundColor: "#FFF1F1",
  },

  logoutIconBox: {
    backgroundColor: "#FDECEA",
  },

  logoutText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#E53935",
  },

  navbarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

});
