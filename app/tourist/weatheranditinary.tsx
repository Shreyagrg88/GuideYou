import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  generateItineraryForActivity,
  type ItineraryDay,
} from "../../api/aiPlanner";

const PAGE_BG = "#E6F2FF";
const ACCENT = "#007BFF";
const FALLBACK_LOCATION = "Pokhara, Nepal";

type WeatherUi = {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  hourly: Array<{ time: string; tempC: number; icon: string }>;
};

function owmIconUrl(code: string): string {
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
}

function defaultTips(activityName?: string): string[] {
  return [
    activityName ? `Plan "${activityName}" with flexible timing.` : "Plan your activity with flexible timing.",
    "Carry water and check weather again before heading out.",
    "Adjust pace and rest stops based on current conditions.",
  ];
}

function parseHourLabel(raw: string): string {
  // Backend can send "YYYY-MM-DD HH:mm:ss" without timezone; treat as UTC and display Nepal time.
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const withZone = /([zZ]|[+\-]\d{2}:\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const d = new Date(withZone);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function WeatherAndItineraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    location?: string;
    activityName?: string;
    activityId?: string;
    numberOfDays?: string;
  }>();

  const headerTitle = (params.location?.trim() || FALLBACK_LOCATION).replace(/\s+/g, " ");
  const activityName = params.activityName?.trim() || "Selected activity";
  const activityId = params.activityId?.trim() || "";
  const initialDays = Math.max(1, Number(params.numberOfDays || "1") || 1);

  const [numberOfDays, setNumberOfDays] = useState(initialDays);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [itineraryError, setItineraryError] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherUi | null>(null);
  const [recommendation, setRecommendation] = useState<{
    title: string;
    subtitle: string;
    bullets: string[];
  } | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!activityId) {
        throw new Error("Missing activity id. Open this page from activity detail.");
      }

      const data = await generateItineraryForActivity(activityId, numberOfDays);
      const apiWeather = data.weather;

      setWeather({
        tempC: Number(apiWeather?.tempC ?? 0),
        feelsLikeC: Number(apiWeather?.feelsLikeC ?? apiWeather?.tempC ?? 0),
        condition: String(apiWeather?.condition || apiWeather?.description || "Unknown"),
        hourly: Array.isArray(apiWeather?.hourly)
          ? apiWeather!.hourly!.map((h) => ({
              time: String(h.time || ""),
              tempC: Number(h.tempC ?? 0),
              icon: String(h.icon || "03d"),
            }))
          : [],
      });

      setRecommendation({
        title: data.recommendation?.title || "AI Recommendation",
        subtitle:
          data.recommendation?.subtitle ||
          "Based on weather and the activity you are planning",
        bullets:
          Array.isArray(data.recommendation?.bullets) && data.recommendation!.bullets!.length > 0
            ? data.recommendation!.bullets!
            : defaultTips(activityName),
      });

      setItinerary(Array.isArray(data.itinerary) ? data.itinerary : []);
      setItineraryError(null);
    } catch (e: any) {
      setWeather(null);
      setRecommendation(null);
      setItinerary([]);
      setError(e?.message || "Failed to load weather and itinerary");
    } finally {
      setLoading(false);
    }
  }, [activityId, activityName, numberOfDays]);

  useEffect(() => {
    load();
  }, [load]);

  const regenerateItinerary = useCallback(async () => {
    if (!activityId) return;
    setLoadingItinerary(true);
    setItineraryError(null);
    try {
      const data = await generateItineraryForActivity(activityId, numberOfDays);
      setItinerary(Array.isArray(data.itinerary) ? data.itinerary : []);
    } catch (e: any) {
      setItinerary([]);
      setItineraryError(e?.message || "Failed to generate itinerary");
    } finally {
      setLoadingItinerary(false);
    }
  }, [activityId, numberOfDays]);

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
      >
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backWrap} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {headerTitle}
          </Text>
          <View style={styles.backPlaceholder} />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading weather and itinerary...</Text>
          </View>
        ) : error || !weather ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={48} color="#999" />
            <Text style={styles.errorTitle}>Couldn’t load details</Text>
            <Text style={styles.errorMessage}>{error || "Unknown error"}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.currentCard}>
              <Text style={styles.currentTemp}>{Math.round(weather.tempC)}°C</Text>
              <Text style={styles.currentCondition}>{weather.condition}</Text>
              <Text style={styles.feelsLike}>Feels like {Math.round(weather.feelsLikeC)}°</Text>
            </View>

            {weather.hourly.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Hourly Forecast</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hourlyRow}
                >
                  {weather.hourly.map((h, i) => (
                    <View key={`${h.time}-${i}`} style={styles.hourlyCard}>
                      <Text style={styles.hourlyTime}>{parseHourLabel(h.time)}</Text>
                      <Image source={{ uri: owmIconUrl(h.icon) }} style={styles.hourlyIcon} />
                      <Text style={styles.hourlyTemp}>{Math.round(h.tempC)}°</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.sectionTitle}>{recommendation?.title || "AI Recommendation"}</Text>
            <Text style={styles.aiSubtitle}>
              {recommendation?.subtitle || "Based on weather and the activity you are planning"}
            </Text>
            <View style={styles.aiCard}>
              {(recommendation?.bullets || defaultTips(activityName)).map((line, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </View>

            <View style={styles.daysControlRow}>
              <Text style={styles.daysLabel}>Number of days</Text>
              <View style={styles.daysStepper}>
                <TouchableOpacity
                  onPress={() => setNumberOfDays((d) => Math.max(1, d - 1))}
                  style={styles.daysBtn}
                >
                  <Ionicons name="remove" size={16} color="#007BFF" />
                </TouchableOpacity>
                <Text style={styles.daysValue}>{numberOfDays}</Text>
                <TouchableOpacity
                  onPress={() => setNumberOfDays((d) => Math.min(14, d + 1))}
                  style={styles.daysBtn}
                >
                  <Ionicons name="add" size={16} color="#007BFF" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.generateBtn, loadingItinerary && { opacity: 0.7 }]}
              onPress={regenerateItinerary}
              activeOpacity={0.85}
              disabled={loadingItinerary}
            >
              <Text style={styles.generateBtnText}>Generate itinerary</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Itinerary</Text>
            {loadingItinerary ? (
              <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 12 }} />
            ) : itineraryError ? (
              <Text style={styles.errorInline}>{itineraryError}</Text>
            ) : itinerary.length > 0 ? (
              itinerary.map((day) => (
                <View key={`day-${day.day}`} style={styles.dayCard}>
                  <Text style={styles.dayTitle}>Day {day.day}</Text>
                  <Text style={styles.dayLine}>
                    <Text style={styles.dayPart}>Morning: </Text>
                    {day.morning}
                  </Text>
                  <Text style={styles.dayLine}>
                    <Text style={styles.dayPart}>Afternoon: </Text>
                    {day.afternoon}
                  </Text>
                  <Text style={styles.dayLine}>
                    <Text style={styles.dayPart}>Evening: </Text>
                    {day.evening}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.errorInline}>No itinerary available right now.</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  scrollContent: { paddingHorizontal: 20 },
  titleRow: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 20 },
  backWrap: { width: 40, justifyContent: "center" },
  backPlaceholder: { width: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    textAlign: "center",
  },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  loadingText: { marginTop: 12, fontFamily: "Nunito_400Regular", color: "#666", fontSize: 14 },
  errorBox: { paddingVertical: 32, paddingHorizontal: 16, alignItems: "center" },
  errorTitle: { marginTop: 16, fontSize: 18, fontFamily: "Nunito_700Bold", color: "#333" },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  retryButtonText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 16 },
  currentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  currentTemp: { fontSize: 42, fontFamily: "Nunito_700Bold", color: "#000" },
  currentCondition: { marginTop: 8, fontSize: 18, fontFamily: "Nunito_700Bold", color: ACCENT },
  feelsLike: { marginTop: 12, fontSize: 14, fontFamily: "Nunito_400Regular", color: "#666" },
  sectionTitle: { fontSize: 18, fontFamily: "Nunito_700Bold", color: ACCENT, marginBottom: 8 },
  hourlyRow: { paddingBottom: 24 },
  hourlyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 12,
    alignItems: "center",
    minWidth: 72,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  hourlyTime: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginBottom: 6,
  },
  hourlyIcon: { width: 40, height: 40 },
  hourlyTemp: { marginTop: 4, fontSize: 15, fontFamily: "Nunito_700Bold", color: "#000" },
  aiSubtitle: { fontSize: 13, fontFamily: "Nunito_400Regular", color: "#666", marginBottom: 12 },
  aiCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  bullet: { fontSize: 16, color: "#000", marginRight: 8, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 15, fontFamily: "Nunito_400Regular", color: "#000", lineHeight: 22 },
  daysControlRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  daysLabel: { fontSize: 14, color: "#555", fontFamily: "Nunito_700Bold" },
  daysStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  daysBtn: { width: 24, height: 24, justifyContent: "center", alignItems: "center" },
  daysValue: { minWidth: 24, textAlign: "center", fontSize: 14, fontFamily: "Nunito_700Bold" },
  generateBtn: {
    backgroundColor: "#007BFF",
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  generateBtnText: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
  dayCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 10 },
  dayTitle: { fontSize: 16, fontFamily: "Nunito_700Bold", marginBottom: 8 },
  dayLine: {
    fontSize: 13,
    color: "#444",
    fontFamily: "Nunito_400Regular",
    marginBottom: 6,
    lineHeight: 20,
  },
  dayPart: { fontFamily: "Nunito_700Bold" },
  errorInline: { fontSize: 13, color: "#666", fontFamily: "Nunito_400Regular", marginBottom: 12 },
});
