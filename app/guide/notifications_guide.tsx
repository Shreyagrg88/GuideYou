/**
 * Notifications Guide
 * Route: /guide/notifications_guide
 *
 * Guide notifications inbox.
 */

import {
  getNotifications,
  markAllNotificationsRead,
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
import GuideNavbar from "../components/guide_navbar";
import { SkeletonBookingTab } from "@/components/Skeleton";

const NAVBAR_HEIGHT = 70;

export default function NotificationsGuide() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- Local state ---
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

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

  // --- Effects (load data, listeners) ---
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
          setUnreadCount((count) => Math.max(0, count - 1));
        }
      }
      navigateFromNotification(router, "guide", item.type, item.relatedId, item.relatedType);
    },
    [router]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    const token = await AsyncStorage.getItem("token");
    await markAllNotificationsRead(token);
    await load(true);
    setMarkingAll(false);
  }, [load, markingAll, unreadCount]);

  const showEmpty = !loading && !refreshing && notifications.length === 0;

  // --- Render ---
  return (
    <View style={styles.root}>
      <ScreenHeaderBar title="Notifications" />

      {unreadCount > 0 && !loading ? (
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllRead}
          disabled={markingAll}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-done-outline" size={18} color="#007BFF" />
          <Text style={styles.markAllButtonText}>
            {markingAll ? "Marking all as read..." : "Mark all as read"}
          </Text>
          {!markingAll ? (
            <View style={styles.markAllBadge}>
              <Text style={styles.markAllBadgeText}>{unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <SkeletonBookingTab rows={8} />
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
                When you get new booking requests, cancellations, or payment updates, they'll show up here.
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
        <GuideNavbar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F7FF" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: PAGE_PADDING_HORIZONTAL, paddingTop: 16 },
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
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: PAGE_PADDING_HORIZONTAL,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#E8F1FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007BFF",
  },
  markAllButtonText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#007BFF",
  },
  markAllBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#007BFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  markAllBadgeText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#fff",
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
