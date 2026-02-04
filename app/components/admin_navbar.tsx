import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminNavBar() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.push("/admin/home_admin")}>
          <Ionicons name="home-outline" size={27} color="#7A7A7A" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/admin/report")}>
          <Ionicons name="flag-outline" size={27} color="#7A7A7A" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/admin/verification")}>
          <Ionicons name="document-text-outline" size={27} color="#7A7A7A" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/admin/admin_profile")}>
          <Ionicons name="person-outline" size={27} color="#7A7A7A" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    backgroundColor: "transparent",
  },

  container: {
    height: 68,
    marginHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 5,
  },

});
