import {
  formatNotificationDate,
  getNotifications,
  markNotificationRead,
  navigateFromNotification,
  type NotificationItem,
} from "../../api/notifications";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonBookingTab } from "../components/Skeleton";

export default function NotificationsAdmin() {
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
    const data = await getNotifications(token, 1, 30);
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
      navigateFromNotification(router, "admin", item.type, item.relatedId);
    },
    [router]
  );

  const showEmpty = !loading && !refreshing && notifications.length === 0;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#142032" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      {unreadCount > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {unreadCount} unread — e.g. when a tourist marks a tour complete, you can open the booking to review payout.
          </Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <SkeletonBookingTab rows={8} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#007BFF" />
          }
        >
          {showEmpty ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={48} color="#9aa5b5" />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                When tourists complete tours or other admin events fire, they will appear here. Tap an item to open the
                related payout or screen.
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
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemBody} numberOfLines={3}>
                    {item.body}
                  </Text>
                  <Text style={styles.itemTime}>{formatNotificationDate(item.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9aa5b5" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EAF3FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#dde5ee",
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#142032",
  },
  placeholder: { width: 42 },
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  bannerText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#1565C0",
    lineHeight: 19,
  },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  itemUnread: {
    backgroundColor: "#f0f7ff",
    borderColor: "#007BFF33",
  },
  itemContent: { flex: 1, marginRight: 8 },
  itemTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#142032",
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#5a6570",
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#8899aa",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dde5ee",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#142032",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#5a6570",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 300,
  },
});
