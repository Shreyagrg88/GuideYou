import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TouristNavBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => pathname.includes(route);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.container}>

        {/* Home */}
        <TouchableOpacity onPress={() => router.push("/tourist/home_tourist")}>
          <Ionicons
            name="home-outline"
            size={27}
            color={isActive("home_tourist") ? "#007BFF" : "#7A7A7A"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/tourist/search")}>
          <Ionicons
            name="search-outline"
            size={27}
            color={isActive("search_tourist") ? "#007BFF" : "#7A7A7A"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/tourist/chat_tourist")}>
          <Ionicons
            name="chatbubble-outline"
            size={27}
            color={isActive("chat_tourist") ? "#007BFF" : "#7A7A7A"}
          />
        </TouchableOpacity>

        {/* Bookings */}
        <TouchableOpacity
          onPress={() => router.push("/tourist/bookings_tourist")}
        >
          <Ionicons
            name="albums-outline"
            size={27}
            color={isActive("bookings_tourist") ? "#007BFF" : "#7A7A7A"}
          />
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity onPress={() => router.push("/tourist/profile_tourist")}>
          <Ionicons
            name="person-outline"
            size={27}
            color={isActive("profile_tourist") ? "#007BFF" : "#7A7A7A"}
          />
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
    zIndex: 999,
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
