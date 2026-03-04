import {
  getNotifications,
  markNotificationRead,
  navigateFromNotification,
  formatNotificationDate,
  type NotificationItem,
} from "../../api/notifications";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TouristNavbar from "../components/tourist_navbar";

const NAVBAR_HEIGHT = 70;

export default function NotificationsTourist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    const token = await AsyncStorage.getItem("token");
    const data = await getNotifications(token, 1, 20);
    if (data) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount ?? 0);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onItemPress = useCallback(
    async (item: NotificationItem) => {
      const token = await AsyncStorage.getItem("token");
      if (!item.read) await markNotificationRead(token, item.id);
      navigateFromNotification(router, "tourist", item.type, item.relatedId);
    },
    [router]
  );

  const showEmpty = !loading && !refreshing && notifications.length === 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: NAVBAR_HEIGHT + insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
        >
          {showEmpty ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={48} color="#B0B0B0" />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                When you get booking updates, reminders, or messages from guides, they'll show up here.
              </Text>
            </View>
          ) : (
            notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, !item.read && styles.itemUnread]}
                onPress={() => onItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
                  <Text style={styles.itemTime}>{formatNotificationDate(item.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <View style={[styles.navbarWrapper, { paddingBottom: insets.bottom }]}>
        <TouristNavbar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F7FF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#000",
  },
  placeholder: { width: 42 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemUnread: {
    backgroundColor: "#E8F4FF",
    borderColor: "#007BFF33",
  },
  itemContent: { flex: 1, marginRight: 8 },
  itemTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8ECF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  navbarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
});
