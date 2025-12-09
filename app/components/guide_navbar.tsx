import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";

export default function GuideNavBar() {
  const pathname = usePathname();

  const isActive = (route: string) => pathname.includes(route);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>

        {/* HOME */}
        <TouchableOpacity onPress={() => router.push("/guide/home_guide")}>
          <Ionicons
            name="home-outline"
            size={27}
            color={isActive("home_guide") ? "#007BFF" : "#7A7A7A"}
          />
        </TouchableOpacity>

        {/* CHAT */}
        <TouchableOpacity onPress={() => router.push("/guide/chat_guide")}>
          <Ionicons
            name="chatbubble-outline"
            size={27}
            color={isActive("chat_guide") ? "#007BFF" : "#7A7A7A"}
          />
        </TouchableOpacity>

        {/* PLUS BUTTON */}
        <TouchableOpacity
          style={styles.plusBtn}
          onPress={() => router.push("/guide/create_activity")}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        {/* BOOKINGS */}
        <TouchableOpacity onPress={() => router.push("/guide/bookings_guide")}>
          <Ionicons
            name="albums-outline"
            size={27}
            color={isActive("bookings_guide") ? "#007BFF" : "#7A7A7A"}
          />
        </TouchableOpacity>

        {/* PROFILE */}
        <TouchableOpacity onPress={() => router.push("/guide/profile_guide")}>
          <Ionicons
            name="person-outline"
            size={27}
            color={isActive("profile_guide") ? "#007BFF" : "#7A7A7A"}
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

  plusBtn: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "#007BFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -35,

    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
});
