import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Router } from "expo-router";
import { Platform } from "react-native";
import { API_URL } from "../constants/api";

/** Push notifications are not supported in Expo Go (SDK 53+). Use a development build to test push. */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  relatedId: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
  total?: number;
  page?: number;
  limit?: number;
};

export async function getNotifications(
  token: string | null,
  page = 1,
  limit = 20
): Promise<NotificationsResponse | null> {
  if (!token) return null;
  try {
    const res = await fetch(
      `${API_URL}/api/notifications?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) return null;
    return {
      notifications: data.notifications ?? [],
      unreadCount: data.unreadCount ?? 0,
      total: data.total,
      page: data.page,
      limit: data.limit,
    };
  } catch {
    return null;
  }
}

export async function markNotificationRead(
  token: string | null,
  notificationId: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(
      `${API_URL}/api/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function registerDevice(
  token: string | null,
  pushToken: string,
  platform: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/api/notifications/register-device`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pushToken, platform }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Navigate from notification type + relatedId. Use for list tap and push tap. */
export function navigateFromNotification(
  router: Router,
  role: "tourist" | "guide",
  type: string,
  relatedId: string | null
) {
  if (role === "tourist") {
    const touristTypes = ["booking_accepted", "booking_rejected", "booking_payment_reminder"];
    if (touristTypes.includes(type) && relatedId) {
      router.push({ pathname: "/tourist/booking_detail", params: { bookingId: relatedId } } as any);
      return;
    }
  }

  if (role === "guide") {
    if (type === "booking_request" && relatedId) {
      router.push({ pathname: "/guide/booking_detail", params: { bookingId: relatedId } } as any);
      return;
    }
    if (type === "activity_approved" && relatedId) {
      router.push({ pathname: "/guide/create_activity", params: { activityId: relatedId } } as any);
      return;
    }
    if (type === "activity_rejected") {
      router.push("/guide/profile_guide" as any);
      return;
    }
    if (type === "license_approved" || type === "license_rejected") {
      router.push("/guide/verification_status" as any);
      return;
    }
  }

  // Fallback: open role-specific notifications list
  if (role === "tourist") router.push("/tourist/notifications_tourist" as any);
  else router.push("/guide/notifications_guide" as any);
}

/** Request permission, get Expo push token, and register with backend. No-op in Expo Go (SDK 53+). */
export async function registerPushToken(authToken: string | null): Promise<void> {
  if (!authToken || isExpoGo()) return;
  try {
    const Notifications = await import("expo-notifications");
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData?.data;
    if (pushToken) await registerDevice(authToken, pushToken, Platform.OS);
  } catch (e) {
    console.warn("Push registration failed:", e);
  }
}

export function formatNotificationDate(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}
