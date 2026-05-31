import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Router } from "expo-router";
import { Platform } from "react-native";
import { API_URL } from "../constants/api";
import { pickEntityId } from "../utils/activityRejection";
import { clearGuideAccountDisabled, markGuideAccountDisabled } from "../utils/guideAccountGuard";

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
  relatedType: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  /** Set when the API request failed (distinct from an empty inbox). */
  loadError?: string;
};

export async function getNotifications(
  token: string | null,
  page = 1,
  limit = 20
): Promise<NotificationsResponse | null> {
  if (!token) {
    return {
      notifications: [],
      unreadCount: 0,
      loadError: "Not signed in",
    };
  }
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
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      data = { msg: text.trim() || "Invalid server response" };
    }

    if (!res.ok) {
      return {
        notifications: [],
        unreadCount: 0,
        loadError: String(
          data.msg ?? data.message ?? `Could not load notifications (${res.status})`
        ),
      };
    }

    const rawList = Array.isArray(data.notifications)
      ? data.notifications
      : Array.isArray(data.items)
        ? data.items
        : [];
    const pagination = data.pagination as Record<string, unknown> | undefined;
    const notifications = rawList
      .map((row: unknown) => normalizeNotificationItem(row as Record<string, unknown>))
      .filter((item) => item.id);
    return {
      notifications,
      unreadCount: parseUnreadCount(data, notifications),
      total: (pagination?.total as number | undefined) ?? (data.total as number | undefined),
      page: (pagination?.page as number | undefined) ?? (data.page as number | undefined),
      limit: (pagination?.limit as number | undefined) ?? (data.limit as number | undefined),
      totalPages: pagination?.totalPages as number | undefined,
    };
  } catch (err) {
    return {
      notifications: [],
      unreadCount: 0,
      loadError:
        err instanceof Error
          ? err.message
          : "Network error. Check your connection and API URL.",
    };
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

/** Mark every unread notification as read (bulk endpoint when available, else paginate). */
export async function markAllNotificationsRead(
  token: string | null
): Promise<boolean> {
  if (!token) return false;

  for (const path of ["/api/notifications/read-all", "/api/notifications/mark-all-read"]) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) return true;
    } catch {
      // try next path or paginate
    }
  }

  let page = 1;
  const limit = 50;
  let markedAny = false;
  const maxPages = 10;

  for (; page <= maxPages; ) {
    const data = await getNotifications(token, page, limit);
    if (!data) return markedAny;

    const unread = data.notifications.filter((item) => !item.read);
    if (unread.length === 0) {
      if ((data.unreadCount ?? 0) === 0 || data.notifications.length < limit) {
        break;
      }
    } else {
      const results = await Promise.all(
        unread.map((item) => markNotificationRead(token, item.id))
      );
      if (results.some(Boolean)) markedAny = true;
    }

    if (data.notifications.length < limit) break;
    const totalPages = data.totalPages ?? page;
    if (page >= totalPages) break;
    page += 1;
  }

  return markedAny;
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

export type NotificationAppRole = "tourist" | "guide" | "admin";

function normalizeReadFlag(raw: Record<string, unknown>): boolean {
  const readVal = raw.read ?? raw.isRead ?? raw.is_read;
  if (readVal === true || readVal === 1 || readVal === "1" || readVal === "true") {
    return true;
  }
  if (readVal === false || readVal === 0 || readVal === "0" || readVal === "false") {
    return false;
  }
  if (raw.readAt ?? raw.read_at) return true;
  const status = String(raw.status ?? "").toLowerCase();
  if (status === "read") return true;
  if (status === "unread") return false;
  return Boolean(readVal);
}

function parseUnreadCount(
  data: Record<string, unknown>,
  notifications: NotificationItem[]
): number {
  const pagination = data.pagination as Record<string, unknown> | undefined;
  const raw =
    data.unreadCount ??
    data.unread_count ??
    pagination?.unreadCount ??
    pagination?.unread_count;
  if (raw != null && raw !== "" && !Number.isNaN(Number(raw))) {
    return Math.max(0, Number(raw));
  }
  return notifications.filter((item) => !item.read).length;
}

function normalizeNotificationItem(raw: Record<string, unknown>): NotificationItem {
  const relatedRaw =
    raw.relatedId ?? raw.related_id ?? raw.activityId ?? raw.activity_id;
  const relatedId = pickEntityId(relatedRaw);
  const relatedTypeRaw = raw.relatedType ?? raw.related_type;
  return {
    id: pickEntityId(raw.id ?? raw._id),
    type: String(raw.type ?? ""),
    title: String(raw.title ?? ""),
    body: String(raw.body ?? ""),
    read: normalizeReadFlag(raw),
    relatedId: relatedId || null,
    relatedType:
      relatedTypeRaw != null && String(relatedTypeRaw).trim()
        ? String(relatedTypeRaw).trim()
        : null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
  };
}

function isActivityRejectedNotification(type: string): boolean {
  const t = type.trim().toLowerCase();
  return (
    t === "activity_rejected" ||
    t === "activity_not_approved" ||
    t === "activity_rejection"
  );
}

function isGuideReportNotification(type: string): boolean {
  const t = type.trim().toLowerCase();
  return (
    t === "guide_report_submitted" ||
    t === "guide_report" ||
    t === "report_received" ||
    t === "guide_reported"
  );
}

function isGuideAppealNotification(type: string): boolean {
  const t = type.trim().toLowerCase();
  return t === "guide_appeal_submitted";
}

/** Admin in-app list + push tap navigation. */
export function navigateFromAdminNotification(
  router: Router,
  type: string,
  relatedId: string | null,
  relatedType?: string | null
) {
  const id = relatedId ? pickEntityId(relatedId) || relatedId : null;

  if (isGuideAppealNotification(type) || relatedType === "appeal") {
    if (id) {
      router.push({
        pathname: "/admin/appeal_detail",
        params: { appealId: id },
      } as any);
    } else {
      router.push("/admin/appeals" as any);
    }
    return;
  }

  if (isGuideReportNotification(type)) {
    if (id) {
      router.push({
        pathname: "/admin/report_detail",
        params: { reportId: id },
      } as any);
    } else {
      router.push("/admin/report" as any);
    }
    return;
  }

  switch (type) {
    case "activity_pending":
      if (id) {
        router.push({
          pathname: "/admin/review_activity",
          params: { activityId: id },
        } as any);
      } else {
        router.push("/admin/verification" as any);
      }
      return;

    case "license_pending":
      if (id) {
        router.push({
          pathname: "/admin/review_license",
          params: { userId: id },
        } as any);
      } else {
        router.push("/admin/verification" as any);
      }
      return;

    case "booking_completed":
      if (id) {
        router.push({
          pathname: "/admin/booking_payment_detail",
          params: { bookingId: id },
        } as any);
      } else {
        router.push("/admin/booking_payments" as any);
      }
      return;

    default:
      if (relatedType === "report" && id) {
        router.push({
          pathname: "/admin/report_detail",
          params: { reportId: id },
        } as any);
        return;
      }
      if (relatedType === "activity" && id) {
        router.push({
          pathname: "/admin/review_activity",
          params: { activityId: id },
        } as any);
        return;
      }
      if (relatedType === "license" && id) {
        router.push({
          pathname: "/admin/review_license",
          params: { userId: id },
        } as any);
        return;
      }
      if (relatedType === "booking" && id) {
        router.push({
          pathname: "/admin/booking_payment_detail",
          params: { bookingId: id },
        } as any);
        return;
      }
      router.push("/admin/notifications_admin" as any);
  }
}

/** Navigate from notification type + relatedId. Use for list tap and push tap. */
export function navigateFromNotification(
  router: Router,
  role: NotificationAppRole,
  type: string,
  relatedId: string | null,
  relatedType?: string | null
) {
  if (role === "admin") {
    navigateFromAdminNotification(router, type, relatedId, relatedType);
    return;
  }

  if (role === "tourist") {
    const touristBookingTypes = [
      "booking_accepted",
      "booking_rejected",
      "booking_payment_reminder",
      "booking_cancelled",
      "refund_completed",
    ];
    if (touristBookingTypes.includes(type) && relatedId) {
      router.push({ pathname: "/tourist/booking_detail", params: { bookingId: relatedId } } as any);
      return;
    }
  }

  if (role === "guide") {
    if (type === "account_disabled") {
      void markGuideAccountDisabled();
      router.replace("/guide/account-disabled" as any);
      return;
    }
    if (type === "account_reenabled") {
      void clearGuideAccountDisabled();
      router.replace("/guide/home_guide" as any);
      return;
    }
    if (
      type === "guide_appeal_rejected" ||
      type === "guide_appeal_under_review"
    ) {
      router.replace("/guide/account-disabled" as any);
      return;
    }
    if (
      (type === "booking_request" || type === "booking_cancelled") &&
      relatedId
    ) {
      router.push({ pathname: "/guide/booking_detail", params: { bookingId: relatedId } } as any);
      return;
    }
    if (type === "activity_approved" && relatedId) {
      router.push({ pathname: "/guide/create_activity", params: { activityId: relatedId } } as any);
      return;
    }
    if (isActivityRejectedNotification(type)) {
      const activityId = pickEntityId(relatedId);
      if (activityId) {
        router.push({
          pathname: "/guide/create_activity",
          params: { activityId },
        } as any);
        return;
      }
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

export function adminNotificationIcon(
  type: string
): "flag-outline" | "map-outline" | "document-text-outline" | "wallet-outline" | "notifications-outline" {
  switch (type) {
    case "guide_report_submitted":
      return "flag-outline";
    case "guide_appeal_submitted":
      return "document-text-outline";
    case "activity_pending":
      return "map-outline";
    case "license_pending":
      return "document-text-outline";
    case "booking_completed":
      return "wallet-outline";
    default:
      return "notifications-outline";
  }
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
