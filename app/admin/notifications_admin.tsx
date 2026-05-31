import {
  adminNotificationIcon,
  formatNotificationDate,
  getNotifications,
  markNotificationRead,
  navigateFromAdminNotification,
  registerPushToken,
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
import { ScreenHeaderBar } from "../../components/screen-header";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonBookingTab } from "@/components/Skeleton";

export default function NotificationsAdmin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    const token = await AsyncStorage.getItem("token");
    const role = await AsyncStorage.getItem("userRole");
    if (role === "admin" && token) {
      registerPushToken(token);
    }
    const data = await getNotifications(token, 1, 30);
    if (data) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount ?? 0);
      setLoadError(data.loadError ?? null);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoadError("Could not load notifications");
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
      if (!item.read && token) {
        const ok = await markNotificationRead(token, item.id);
        if (ok) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
          );
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      }
      navigateFromAdminNotification(
        router,
        item.type,
        item.relatedId,
        item.relatedType
      );
    },
    [router]
  );

  const showEmpty = !loading && !refreshing && notifications.length === 0;

  return (
    <View style={styles.root}>
      <ScreenHeaderBar title="Notifications" backColor="#142032" titleStyle={{ color: "#142032" }} />

      {loadError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={20} color="#c2410c" />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}

      {unreadCount > 0 && !loadError ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {unreadCount} unread — guide reports, pending activities, license uploads, and completed
            bookings appear here. Tap to open the related screen.
          </Text>
        </View>
      ) : null}

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
                You will be notified when tourists report guides, guides submit activities or licenses,
                or mark paid bookings complete.
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
                <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
                  <Ionicons
                    name={adminNotificationIcon(item.type)}
                    size={22}
                    color={item.read ? "#8899aa" : "#007BFF"}
                  />
                  {!item.read ? <View style={styles.unreadDot} /> : null}
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemBody} numberOfLines={2}>
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
  banner: {
    marginHorizontal: PAGE_PADDING_HORIZONTAL,
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: PAGE_PADDING_HORIZONTAL,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCC80",
  },
  errorText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#c2410c",
    lineHeight: 19,
  },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: PAGE_PADDING_HORIZONTAL, paddingTop: 16 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  itemUnread: {
    backgroundColor: "#f0f7ff",
    borderColor: "#007BFF33",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    position: "relative",
  },
  iconWrapUnread: {
    backgroundColor: "#E8F4FF",
  },
  unreadDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007BFF",
    borderWidth: 1.5,
    borderColor: "#fff",
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
    lineHeight: 20,
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
