
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function TouristNavBar() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>

        
        {/* Home */}
        <TouchableOpacity onPress={() => router.push("/tourist/home_tourist")}>
          <Ionicons name="home-outline" size={27} color="#7A7A7A" />
        </TouchableOpacity>

        {/* Chat */}
        <TouchableOpacity onPress={() => router.push("/tourist/chat_tourist")}>
          <Ionicons name="chatbubble-outline" size={27} color="#7A7A7A" />
        </TouchableOpacity>

        {/* Bookings */}
        <TouchableOpacity onPress={() => router.push("/tourist/bookings_tourist")}>
          <Ionicons name="albums-outline" size={27} color="#7A7A7A" />
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity onPress={() => router.push("/tourist/profile_tourist")}>
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
