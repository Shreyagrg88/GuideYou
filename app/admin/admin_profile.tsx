/**
 * Admin Profile
 * Route: /admin/admin_profile
 *
 * Admin profile and logout.
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchAdminProfile,
  fetchAdminStats,
  type AdminProfile,
  type AdminStats,
} from "../../api/adminAccount";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import { confirmLogout } from "../../utils/authSession";
import AdminNavBar from "../components/admin_navbar";
import { SkeletonBlock } from "@/components/Skeleton";

const NAVBAR_CLEARANCE = 100;

type QuickLink = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  route: string;
};

const QUICK_LINKS: QuickLink[] = [
  {
    id: "payouts",
    title: "Guide payouts",
    subtitle: "Release earnings after NPR transfer",
    icon: "wallet-outline",
    color: "#15803d",
    bg: "#E8F5E9",
    route: "/admin/booking_payments",
  },
  {
    id: "refunds",
    title: "Tourist refunds",
    subtitle: "Cancelled paid bookings",
    icon: "return-down-back-outline",
    color: "#c2410c",
    bg: "#FFEDD5",
    route: "/admin/refunds",
  },
  {
    id: "verification",
    title: "Verification",
    subtitle: "Review licenses & activities",
    icon: "document-text-outline",
    color: "#007BFF",
    bg: "#E3F2FD",
    route: "/admin/verification",
  },
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Platform alerts & updates",
    icon: "notifications-outline",
    color: "#7c3aed",
    bg: "#EDE9FE",
    route: "/admin/notifications_admin",
  },
  {
    id: "reports",
    title: "Reports",
    subtitle: "User flags & moderation",
    icon: "flag-outline",
    color: "#c2410c",
    bg: "#FFEDD5",
    route: "/admin/report",
  },
];

function displayName(profile: AdminProfile | null): string {
  if (!profile) return "Administrator";
  return (
    profile.fullName ||
    profile.name ||
    profile.username ||
    "Administrator"
  );
}

function initials(profile: AdminProfile | null): string {
  const name = displayName(profile);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "AD";
}

export default function AdminProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- Local state ---
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const [p, s] = await Promise.all([fetchAdminProfile(), fetchAdminStats()]);
    setProfile(p);
    setStats(s);
    setLoading(false);
  }, [router]);

  // --- Effects (load data, listeners) ---
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={[styles.loadingWrap, { paddingTop: insets.top + 16 }]}>
          <SkeletonBlock width="60%" height={28} borderRadius={8} style={{ marginBottom: 24 }} />
          <SkeletonBlock width="100%" height={160} borderRadius={16} style={{ marginBottom: 20 }} />
          <SkeletonBlock width="100%" height={88} borderRadius={14} style={{ marginBottom: 12 }} />
          <SkeletonBlock width="100%" height={88} borderRadius={14} />
        </View>
        <AdminNavBar />
      </View>
    );
  }

  // --- Render ---
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: NAVBAR_CLEARANCE + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Text style={styles.logo}>
            Guide<Text style={styles.logoAccent}>You</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            hitSlop={12}
            style={styles.menuBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={26} color="#142032" />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Admin profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(profile)}</Text>
          </View>
          <Text style={styles.displayName}>{displayName(profile)}</Text>
          {profile?.email ? (
            <Text style={styles.email}>{profile.email}</Text>
          ) : null}
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#007BFF" />
            <Text style={styles.roleText}>Administrator</Text>
          </View>
        </View>

        {stats ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Guides</Text>
              <Text style={styles.statValue}>{stats.guides?.total ?? 0}</Text>
              <Text style={styles.statSub}>{stats.guides?.active ?? 0} active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Tourists</Text>
              <Text style={styles.statValue}>{stats.tourists?.total ?? 0}</Text>
              <Text style={styles.statSub}>{stats.tourists?.active ?? 0} active</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Admin tools</Text>
        {QUICK_LINKS.map((link) => (
          <TouchableOpacity
            key={link.id}
            style={styles.linkCard}
            activeOpacity={0.85}
            onPress={() => router.push(link.route as never)}
          >
            <View style={[styles.linkIconWrap, { backgroundColor: link.bg }]}>
              <Ionicons name={link.icon} size={22} color={link.color} />
            </View>
            <View style={styles.linkBody}>
              <Text style={styles.linkTitle}>{link.title}</Text>
              <Text style={styles.linkSub}>{link.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9aa5b5" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.homeLink}
          onPress={() => router.push("/admin/home_admin")}
        >
          <Ionicons name="home-outline" size={20} color="#007BFF" />
          <Text style={styles.homeLinkText}>Back to dashboard</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setMenuVisible(false);
                router.push("/admin/notifications_admin");
              }}
            >
              <Ionicons name="notifications-outline" size={20} color="#333" />
              <Text style={styles.menuText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowLast]}
              onPress={() => {
                setMenuVisible(false);
                confirmLogout(router);
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#E53935" />
              <Text style={styles.logoutText}>Logout</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdminNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EAF3FA" },
  scroll: { paddingHorizontal: PAGE_PADDING_HORIZONTAL },
  loadingWrap: { paddingHorizontal: PAGE_PADDING_HORIZONTAL, flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  logo: { fontSize: 22, fontFamily: "Nunito_700Bold", color: "#142032" },
  logoAccent: { color: "#007BFF", fontFamily: "Nunito_700Bold" },
  menuBtn: { padding: 4 },
  pageTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: "#142032",
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontFamily: "Nunito_700Bold", fontSize: 28, color: "#007BFF" },
  displayName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
    color: "#142032",
    marginBottom: 4,
  },
  email: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#5a6570",
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: "#007BFF" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e3ecf4",
  },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#5a6570" },
  statValue: {
    fontFamily: "Nunito_700Bold",
    fontSize: 22,
    color: "#142032",
    marginVertical: 4,
  },
  statSub: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "#8899aa" },
  sectionTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
    color: "#142032",
    marginBottom: 12,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e3ecf4",
    gap: 12,
  },
  linkIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkBody: { flex: 1 },
  linkTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#142032" },
  linkSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#5a6570",
    marginTop: 2,
    lineHeight: 17,
  },
  homeLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
  },
  homeLinkText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: "#007BFF" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingTop: 56,
    paddingRight: PAGE_PADDING_HORIZONTAL,
    alignItems: "flex-end",
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    minWidth: 220,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#333", flex: 1 },
  logoutText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: "#E53935", flex: 1 },
});
