import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getNotifications, registerPushToken } from "../../api/notifications";
import { fetchAdminAppeals } from "../../api/adminAppeals";
import {
  fetchAdminPendingLicenses,
  getStoredUserRole,
  parseApiErrorMessage,
  type AdminPendingLicense,
} from "../../api/adminAccount";
import { API_URL } from "../../constants/api";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonAdminHomeScreen } from "@/components/Skeleton";

type Stats = {
  guides: { total: number; active: number };
  tourists: { total: number; active: number };
};

type UserItem = {
  id: string;
  name: string;
  joined: string;
};

type LicenseItem = AdminPendingLicense;

type ActivityItem = {
  id: string;
  name: string;
  guideName: string;
  submittedAt: string;
};

type QuickAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  route: string;
  badge?: number;
};

function mapActivity(item: any): ActivityItem {
  const guide = item.guide || {};
  const guideName = guide.username || guide.fullName || guide.name || "Guide";
  const submittedAt = item.createdAt || item.submittedAt || new Date().toISOString();
  return { id: item.id, name: item.name || "Activity", guideName, submittedAt };
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function EmptyRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.emptyRow}>
      <Ionicons name={icon} size={20} color="#B0BEC5" />
      <Text style={styles.emptyRowText}>{text}</Text>
    </View>
  );
}

export default function HomeAdmin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"guides" | "tourists">("guides");
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentGuides, setRecentGuides] = useState<UserItem[]>([]);
  const [recentTourists, setRecentTourists] = useState<UserItem[]>([]);
  const [pendingLicenses, setPendingLicenses] = useState<LicenseItem[]>([]);
  const [pendingActivities, setPendingActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const [openAppeals, setOpenAppeals] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      BackHandler.exitApp();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const fetchAdminData = useCallback(
    async (silent?: boolean) => {
      try {
        if (!silent) setLoading(true);

        const token = await AsyncStorage.getItem("token");
        if (!token) {
          Alert.alert("Unauthorized", "Please login again");
          router.replace("/login");
          return;
        }

        const role = await getStoredUserRole();
        if (role !== "admin") {
          Alert.alert(
            "Access denied",
            "This area is for administrators only. Please log in with an admin account."
          );
          router.replace("/login");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [statsRes, guidesRes, touristsRes, pendingLicensesList, activitiesRes, notifData, appealsData] =
          await Promise.all([
            fetch(`${API_URL}/api/admin/stats`, { headers }),
            fetch(`${API_URL}/api/admin/guides/recent?limit=7`, { headers }),
            fetch(`${API_URL}/api/admin/tourists/recent?limit=7`, { headers }),
            fetchAdminPendingLicenses(token),
            fetch(`${API_URL}/api/admin/activities/pending?limit=50`, { headers }),
            getNotifications(token, 1, 1),
            fetchAdminAppeals("open", 1, 1),
          ]);

        if (!statsRes.ok) throw new Error(parseApiErrorMessage(await statsRes.text()));
        if (!guidesRes.ok) throw new Error(parseApiErrorMessage(await guidesRes.text()));
        if (!touristsRes.ok) throw new Error(parseApiErrorMessage(await touristsRes.text()));

        const statsData = await statsRes.json();
        const guidesData = await guidesRes.json();
        const touristsData = await touristsRes.json();

        setStats(statsData);
        setRecentGuides(guidesData.guides || []);
        setRecentTourists(touristsData.tourists || []);
        setPendingLicenses(pendingLicensesList);
        setNotifUnread(notifData?.unreadCount ?? 0);
        setOpenAppeals(appealsData.pagination.total ?? 0);

        if (role === "admin" && token) {
          registerPushToken(token);
        }

        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          const list = activitiesData.activities || activitiesData || [];
          setPendingActivities(Array.isArray(list) ? list.map(mapActivity) : []);
        } else {
          setPendingActivities([]);
        }
      } catch (error: unknown) {
        console.error("Admin fetch error:", error);
        const message =
          error instanceof Error ? error.message : "Failed to load admin data";
        Alert.alert("Error", message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useFocusEffect(
    useCallback(() => {
      fetchAdminData(true);
    }, [fetchAdminData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData(true);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.root}>
        <SkeletonAdminHomeScreen />
        <AdminNavBar />
      </View>
    );
  }

  const isGuideTab = activeTab === "guides";
  const recentItems = isGuideTab ? recentGuides : recentTourists;
  const pendingReviewCount = pendingLicenses.length + pendingActivities.length;

  const quickActions: QuickAction[] = [
    {
      id: "verification",
      title: "Verification",
      subtitle: "Licenses & activities",
      icon: "document-text-outline",
      color: "#007BFF",
      bg: "#E3F2FD",
      route: "/admin/verification",
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    {
      id: "reports",
      title: "Reports",
      subtitle: "Guide moderation",
      icon: "flag-outline",
      color: "#c2410c",
      bg: "#FFEDD5",
      route: "/admin/report",
    },
    {
      id: "appeals",
      title: "Appeals",
      subtitle: "Disabled guides",
      icon: "mail-outline",
      color: "#0d9488",
      bg: "#CCFBF1",
      route: "/admin/appeals",
      badge: openAppeals > 0 ? openAppeals : undefined,
    },
    {
      id: "payouts",
      title: "Payouts",
      subtitle: "Release guide earnings",
      icon: "wallet-outline",
      color: "#15803d",
      bg: "#E8F5E9",
      route: "/admin/booking_payments",
    },
    {
      id: "refunds",
      title: "Refunds",
      subtitle: "Cancelled bookings — pay tourists",
      icon: "return-down-back-outline",
      color: "#c2410c",
      bg: "#FFEDD5",
      route: "/admin/refunds",
    },
    {
      id: "notifications",
      title: "Alerts",
      subtitle: "Platform updates",
      icon: "notifications-outline",
      color: "#7c3aed",
      bg: "#EDE9FE",
      route: "/admin/notifications_admin",
      badge: notifUnread > 0 ? notifUnread : undefined,
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007BFF" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.logo}>
                Guide<Text style={styles.logoAccent}>You</Text>
              </Text>
              <Text style={styles.headerSubtitle}>Admin dashboard</Text>
            </View>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => router.push("/admin/notifications_admin")}
              hitSlop={12}
            >
              <Ionicons name="notifications-outline" size={24} color="#142032" />
              {notifUnread > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {notifUnread > 9 ? "9+" : notifUnread}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
          <Text style={styles.greeting}>Hello, Admin</Text>
        </View>

        {/* Summary banner */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats?.guides?.total ?? 0}</Text>
            <Text style={styles.summaryLabel}>Guides</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats?.tourists?.total ?? 0}</Text>
            <Text style={styles.summaryLabel}>Tourists</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{pendingReviewCount}</Text>
            <Text style={styles.summaryLabel}>Pending review</Text>
          </View>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>Quick actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickCard}
              activeOpacity={0.85}
              onPress={() => router.push(action.route as never)}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
                {action.badge != null && action.badge > 0 ? (
                  <View style={styles.quickBadge}>
                    <Text style={styles.quickBadgeText}>
                      {action.badge > 9 ? "9+" : action.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.quickTitle}>{action.title}</Text>
              <Text style={styles.quickSub}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* User stats toggle */}
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentItem, isGuideTab && styles.segmentActive]}
            onPress={() => setActiveTab("guides")}
          >
            <Ionicons
              name="compass-outline"
              size={16}
              color={isGuideTab ? "#007BFF" : "#5a6570"}
            />
            <Text style={[styles.segmentText, isGuideTab && styles.segmentTextActive]}>
              Guides
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentItem, !isGuideTab && styles.segmentActive]}
            onPress={() => setActiveTab("tourists")}
          >
            <Ionicons
              name="airplane-outline"
              size={16}
              color={!isGuideTab ? "#007BFF" : "#5a6570"}
            />
            <Text style={[styles.segmentText, !isGuideTab && styles.segmentTextActive]}>
              Tourists
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending queue — guides tab only */}
        {isGuideTab ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Action queue</Text>
              {pendingReviewCount > 0 ? (
                <TouchableOpacity onPress={() => router.push("/admin/verification")}>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: "#FFF3E0" }]}>
                  <Ionicons name="id-card-outline" size={18} color="#e65100" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Pending licenses</Text>
                  <Text style={styles.cardMeta}>{pendingLicenses.length} awaiting review</Text>
                </View>
              </View>
              {pendingLicenses.length === 0 ? (
                <EmptyRow icon="checkmark-circle-outline" text="No pending license requests" />
              ) : (
                pendingLicenses.slice(0, 3).map((item) => (
                  <TouchableOpacity
                    key={item.userId}
                    style={styles.queueRow}
                    onPress={() =>
                      router.push({
                        pathname: "/admin/review_license",
                        params: { userId: item.userId, licenseFile: item.licenseFile },
                      })
                    }
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{userInitials(item.username)}</Text>
                    </View>
                    <View style={styles.queueBody}>
                      <Text style={styles.queueTitle} numberOfLines={1}>
                        {item.username}
                      </Text>
                      <Text style={styles.queueSub}>
                        Submitted {formatShortDate(item.submittedAt)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9aa5b5" />
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: "#E8EAF6" }]}>
                  <Ionicons name="map-outline" size={18} color="#3949ab" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Pending activities</Text>
                  <Text style={styles.cardMeta}>{pendingActivities.length} awaiting approval</Text>
                </View>
              </View>
              {pendingActivities.length === 0 ? (
                <EmptyRow icon="checkmark-circle-outline" text="No pending activities" />
              ) : (
                pendingActivities.slice(0, 3).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.queueRow}
                    onPress={() =>
                      router.push({
                        pathname: "/admin/review_activity",
                        params: { activityId: item.id },
                      })
                    }
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: "#E8EAF6" }]}>
                      <Ionicons name="trail-sign-outline" size={16} color="#3949ab" />
                    </View>
                    <View style={styles.queueBody}>
                      <Text style={styles.queueTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.queueSub} numberOfLines={1}>
                        {item.guideName} · {formatShortDate(item.submittedAt)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9aa5b5" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        ) : null}

        {/* Recent users */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            Recent {isGuideTab ? "guides" : "tourists"}
          </Text>
        </View>
        <View style={styles.card}>
          {recentItems.length === 0 ? (
            <EmptyRow
              icon="people-outline"
              text={`No recent ${isGuideTab ? "guides" : "tourists"} yet`}
            />
          ) : (
            recentItems.map((item, index) => (
              <View
                key={item.id}
                style={[styles.recentRow, index === recentItems.length - 1 && styles.recentRowLast]}
              >
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: isGuideTab ? "#E3F2FD" : "#F3E5F5" },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      { color: isGuideTab ? "#007BFF" : "#7B1FA2" },
                    ]}
                  >
                    {userInitials(item.name)}
                  </Text>
                </View>
                <View style={styles.queueBody}>
                  <Text style={styles.queueTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.queueSub}>{item.joined}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EAF3FA",
  },
  container: {
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  logo: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: "#142032",
  },
  logoAccent: {
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#5a6570",
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Nunito_700Bold",
    color: "#142032",
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E63946",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#EAF3FA",
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
  },
  summaryBanner: {
    flexDirection: "row",
    backgroundColor: "#007BFF",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 22,
    shadowColor: "#007BFF",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#142032",
    marginBottom: 12,
  },
  seeAll: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#007BFF",
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 22,
  },
  quickCard: {
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },
  quickBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E63946",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  quickBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  quickTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#142032",
    marginBottom: 2,
  },
  quickSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: "#8899aa",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#dde5ee",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#5a6570",
  },
  segmentTextActive: {
    fontFamily: "Nunito_700Bold",
    color: "#007BFF",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#142032",
  },
  cardMeta: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#8899aa",
    marginTop: 2,
  },
  queueRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 12,
  },
  queueBody: {
    flex: 1,
  },
  queueTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#142032",
    marginBottom: 2,
  },
  queueSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#8899aa",
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#007BFF",
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 12,
  },
  recentRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  emptyRowText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#8899aa",
  },
});
