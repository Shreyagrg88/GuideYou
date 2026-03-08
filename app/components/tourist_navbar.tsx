import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, usePathname } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchConversations } from "../../api/chat";

export default function TouristNavBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [totalUnread, setTotalUnread] = useState(0);

  const loadUnread = useCallback(() => {
    fetchConversations()
      .then((data) => {
        const list = data.conversations || [];
        const total = list.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        const hasAny = list.some((c) => c.hasUnread || (c.unreadCount ?? 0) > 0);
        setTotalUnread(total > 0 ? total : hasAny ? 1 : 0);
      })
      .catch(() => setTotalUnread(0));
  }, []);

  useEffect(() => {
    loadUnread();
  }, [pathname, loadUnread]);

  useFocusEffect(loadUnread);

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

        {/* Chat */}
        <View style={styles.chatIconWrap}>
          <TouchableOpacity onPress={() => router.push("/tourist/chat_list_tourist")}>
            <Ionicons
              name="chatbubble-outline"
              size={27}
              color={isActive("chat_list_tourist") ? "#007BFF" : "#7A7A7A"}
            />
          </TouchableOpacity>
          {totalUnread > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>
                {totalUnread > 9 ? "9+" : totalUnread}
              </Text>
            </View>
          )}
        </View>

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

  chatIconWrap: {
    position: "relative",
    overflow: "visible",
  },
  chatBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
    color: "#FFF",
  },
  container: {
    height: 68,
    marginHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    overflow: "visible",

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 5,
  },
});
