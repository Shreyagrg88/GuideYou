import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ItineraryDay } from "../../api/aiPlanner";
import {
  fetchPlanTripGuides,
  type PlanTripGuideMatch,
} from "../../api/planTrip";
import ScreenHeader from "../../components/screen-header";
import UserAvatar from "../../components/user-avatar";
import { PAGE_PADDING_HORIZONTAL } from "../../constants/layout";
import { resolveAvatarUri } from "../../utils/avatar";

const PAGE_BG = "#E6F2FF";
const ACCENT = "#007BFF";

function paramOne(v: string | string[] | undefined): string {
  if (v == null) return "";
  const x = Array.isArray(v) ? v[0] : v;
  return String(x ?? "").trim();
}

function parseItineraryParam(raw: string | string[] | undefined): ItineraryDay[] {
  const s = paramOne(raw);
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PlanTripGuidesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    destination?: string | string[];
    interests?: string | string[];
    numberOfDays?: string | string[];
    itineraryJson?: string | string[];
  }>();

  const destination = paramOne(params.destination);
  const interests = paramOne(params.interests);
  const numberOfDays = Math.max(1, Number(paramOne(params.numberOfDays) || "3") || 3);
  const itineraryJsonParam = paramOne(params.itineraryJson);

  const itineraryFromParams = useMemo(
    () => parseItineraryParam(params.itineraryJson),
    [itineraryJsonParam]
  );

  const [guides, setGuides] = useState<PlanTripGuideMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (destination.length < 2) {
        throw new Error("destination is required (at least 2 characters)");
      }
      if (interests.length < 2) {
        throw new Error("interests is required (at least 2 characters)");
      }

      const data = await fetchPlanTripGuides({
        destination,
        interests,
        numberOfDays,
        itinerary: itineraryFromParams.length ? itineraryFromParams : undefined,
      });
      setGuides(data.guides);
    } catch (e: unknown) {
      setGuides([]);
      setError(e instanceof Error ? e.message : "Failed to load guides");
    } finally {
      setLoading(false);
    }
  }, [destination, interests, numberOfDays, itineraryFromParams]);

  useEffect(() => {
    load();
  }, [load]);

  const onOpenProfile = (g: PlanTripGuideMatch) => {
    const avatar = resolveAvatarUri(g.image);
    router.push({
      pathname: "/tourist/guide_profileview",
      params: {
        guideId: g.id,
        guideName: g.name,
        ...(avatar ? { guideImage: avatar } : {}),
        activityId: g.similarActivity.id || undefined,
        duration: g.similarActivity.duration
          ? String(g.similarActivity.duration)
          : undefined,
      },
    } as Href);
  };

  const onBook = (g: PlanTripGuideMatch) => {
    if (!g.similarActivity.id) return;
    router.push({
      pathname: "/tourist/tour_detail",
      params: { id: g.similarActivity.id },
    } as Href);
  };

  const onMessage = (g: PlanTripGuideMatch) => {
    router.push({
      pathname: "/tourist/chat_tourist",
      params: {
        counterpartId: g.id,
        guideName: g.name,
        guideAvatar: resolveAvatarUri(g.image) ?? undefined,
      },
    } as Href);
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
      >
        <ScreenHeader title="Guides for your plan" marginBottom={12} />

        <View style={styles.contextCard}>
          <Ionicons name="compass-outline" size={22} color={ACCENT} />
          <View style={styles.contextTextCol}>
            <Text style={styles.contextTitle}>Matched to your AI itinerary</Text>
            <Text style={styles.contextBody} numberOfLines={3}>
              {interests || "Your activity"} in {destination || "your destination"} ·{" "}
              {numberOfDays} {numberOfDays === 1 ? "day" : "days"}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : error ? (
          <View style={styles.centerBlock}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load} activeOpacity={0.85}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : guides.length === 0 ? (
          <Text style={styles.emptyText}>
            No guides with similar published activities yet. Try a different destination or check
            back later.
          </Text>
        ) : (
          guides.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => onOpenProfile(g)}
            >
              <View style={styles.matchRow}>
                <View style={styles.matchPill}>
                  <Ionicons name="sparkles" size={12} color={ACCENT} />
                  <Text style={styles.matchPillText}>{g.matchLabel}</Text>
                </View>
              </View>

              <View style={styles.cardHeader}>
                <UserAvatar uri={g.image} name={g.name} size={50} style={styles.profilePic} />
                <View style={styles.headerTextCol}>
                  <Text style={styles.guideName}>{g.name}</Text>
                  <Text style={styles.guideRole}>
                    {[g.role, g.location].filter(Boolean).join(" • ") || "—"}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color="#00C851" />
              </View>

              <View style={styles.similarBox}>
                <Text style={styles.similarLabel}>Similar published activity</Text>
                <Text style={styles.similarValue}>{g.similarActivityLine}</Text>
              </View>

              <Text style={[styles.description, !g.description && styles.mutedText]}>
                {g.description || "No description added"}
              </Text>

              <View style={styles.infoRow}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoValue}>{g.experience}</Text>
                  <Text style={styles.infoLabel}>Experience</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={[styles.infoValue, styles.chargeValue]} numberOfLines={2}>
                    {g.charge || "Rate not set"}
                  </Text>
                  <Text style={styles.infoLabel}>Charge</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoValue}>
                    ⭐ {g.rating && g.rating !== "—" ? g.rating : "N/A"}
                  </Text>
                  <Text style={styles.infoLabel}>Rating</Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onBook(g);
                  }}
                >
                  <Text style={styles.bookText}>Book</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onMessage(g);
                  }}
                >
                  <Text style={styles.messageText}>Message</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={ACCENT} />
          <Text style={styles.backLinkText}>Back to trip plan</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  scrollContent: { paddingHorizontal: PAGE_PADDING_HORIZONTAL },
  contextCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#D9E8FF",
  },
  contextTextCol: { flex: 1, minWidth: 0 },
  contextTitle: { fontSize: 16, fontFamily: "Nunito_700Bold", color: "#0B2A4A" },
  contextBody: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#555",
    lineHeight: 18,
  },
  centerBlock: { paddingVertical: 32, alignItems: "center" },
  errorText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  retryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 11,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  retryButtonText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  matchRow: { marginBottom: 10 },
  matchPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#E8F2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchPillText: { fontSize: 11, fontFamily: "Nunito_700Bold", color: ACCENT },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  profilePic: { width: 50, height: 50, borderRadius: 25 },
  headerTextCol: { flex: 1, marginLeft: 10, minWidth: 0 },
  guideName: { fontSize: 16, fontFamily: "Nunito_700Bold", color: "#000" },
  guideRole: { fontSize: 13, color: "#777", fontFamily: "Nunito_400Regular", marginTop: 2 },
  similarBox: {
    marginTop: 12,
    backgroundColor: "#F5FAFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D9E8FF",
  },
  similarLabel: { fontSize: 11, fontFamily: "Nunito_600SemiBold", color: ACCENT },
  similarValue: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#333",
    lineHeight: 18,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    color: "#444",
    fontFamily: "Nunito_400Regular",
    lineHeight: 20,
  },
  mutedText: { color: "#8899aa", fontStyle: "italic" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  infoBox: { flex: 1, alignItems: "center" },
  infoValue: { fontSize: 14, fontFamily: "Nunito_700Bold", textAlign: "center" },
  chargeValue: { fontSize: 12, color: "#E63946" },
  infoLabel: { fontSize: 11, color: "#777", marginTop: 3, fontFamily: "Nunito_400Regular" },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, gap: 12 },
  bookButton: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  bookText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 14 },
  messageButton: {
    flex: 1,
    backgroundColor: "#E6E6E6",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  messageText: { fontFamily: "Nunito_700Bold", color: "#555", fontSize: 14 },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  backLinkText: { fontSize: 14, fontFamily: "Nunito_700Bold", color: ACCENT },
});
