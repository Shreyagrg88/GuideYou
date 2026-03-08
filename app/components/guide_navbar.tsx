import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, usePathname } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchConversations } from "../../api/chat";

export default function GuideNavBar() {
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

        <TouchableOpacity onPress={() => router.push("/guide/home_guide")}>
          <Ionicons
            name="home-outline"
            size={27}
            color={isActive("home_guide") ? "#007BFF" : "#7A7A7A"}
          />
        </TouchableOpacity>

        <View style={styles.chatIconWrap}>
          <TouchableOpacity onPress={() => router.push("/guide/chat_list_guide")}>
            <Ionicons
              name="chatbubble-outline"
              size={27}
              color={isActive("chat_list_guide") ? "#007BFF" : "#7A7A7A"}
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

        <TouchableOpacity
          style={styles.plusBtn}
          onPress={() => router.push("/guide/create_activity")}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/guide/bookings_guide")}>
          <Ionicons
            name="albums-outline"
            size={27}
            color={isActive("bookings_guide") ? "#007BFF" : "#7A7A7A"}
          />
        </TouchableOpacity>

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
    overflow: "visible",

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 5,
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
