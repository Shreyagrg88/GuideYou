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
  generateItineraryForSelectedDay,
  generateItineraryForActivity,
  type GenerateItineraryResponse,
} from "../../api/aiPlanner";
import ScreenHeader from "../../components/screen-header";
import { SkeletonWeatherItineraryScreen } from "@/components/Skeleton";

const PAGE_BG = "#E6F2FF";
const ACCENT = "#007BFF";
const FALLBACK_LOCATION = "Pokhara, Nepal";

type WeatherUi = {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  hourly: Array<{ time: string; tempC: number; icon: string }>;
  daily: Array<{
    date: string;
    label: string;
    condition: string;
    description: string;
    minTempC: number;
    maxTempC: number;
    rainChance: number;
    unavailable: boolean;
    activityScore?: number;
    activityVerdict?: string;
    reason?: string;
  }>;
  bestDayForActivity: {
    index: number;
    date: string;
    label: string;
    activityScore?: number;
    activityVerdict?: string;
    reason?: string;
  } | null;
};

function titleCaseWords(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function conditionFromIcon(icon?: string): string {
  if (!icon) return "";
  if (icon.startsWith("09") || icon.startsWith("10") || icon.startsWith("11")) return "Rainy";
  if (icon.startsWith("13")) return "Snowy";
  if (icon.startsWith("50")) return "Misty";
  if (icon.startsWith("01")) return "Clear";
  if (icon.startsWith("02") || icon.startsWith("03") || icon.startsWith("04")) return "Cloudy";
  return "";
}

function pickDisplayCondition(apiWeather: any): string {
  const description = String(apiWeather?.description || "").trim();
  if (description) return titleCaseWords(description);

  const fromIcon = conditionFromIcon(String(apiWeather?.icon || ""));
  if (fromIcon) return fromIcon;

  const condition = String(apiWeather?.condition || "").trim();
  return condition ? titleCaseWords(condition) : "Unknown";
}

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

function formatDayDate(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function paramOne(v: string | string[] | undefined): string {
  if (v == null) return "";
  const x = Array.isArray(v) ? v[0] : v;
  return String(x ?? "").trim();
}

function mapApiWeatherToUi(apiWeather: GenerateItineraryResponse["weather"]): WeatherUi {
  return {
    tempC: Number(apiWeather?.tempC ?? 0),
    feelsLikeC: Number(apiWeather?.feelsLikeC ?? apiWeather?.tempC ?? 0),
    condition: pickDisplayCondition(apiWeather),
    hourly: Array.isArray(apiWeather?.hourly)
      ? apiWeather!.hourly!.map((h) => ({
          time: String(h.time || ""),
          tempC: Number(h.tempC ?? 0),
          icon: String(h.icon || "03d"),
        }))
      : [],
    daily: Array.isArray(apiWeather?.daily)
      ? apiWeather.daily.map((d) => ({
          date: String(d.date || ""),
          label: String(d.label || ""),
          condition: String(d.condition || d.description || "Unknown"),
          description: String(d.description || ""),
          minTempC: Number(d.minTempC ?? 0),
          maxTempC: Number(d.maxTempC ?? 0),
          rainChance: Number(d.rainChance ?? 0),
          unavailable: Boolean(d.unavailable),
          activityScore:
            typeof d.activityScore === "number" ? Number(d.activityScore) : undefined,
          activityVerdict: d.activityVerdict ? String(d.activityVerdict) : undefined,
          reason: d.reason ? String(d.reason) : undefined,
        }))
      : [],
    bestDayForActivity: apiWeather?.bestDayForActivity
      ? {
          index: Number(apiWeather.bestDayForActivity.index ?? 0),
          date: String(apiWeather.bestDayForActivity.date || ""),
          label: String(apiWeather.bestDayForActivity.label || "Best Day"),
          activityScore:
            typeof apiWeather.bestDayForActivity.activityScore === "number"
              ? Number(apiWeather.bestDayForActivity.activityScore)
              : undefined,
          activityVerdict: apiWeather.bestDayForActivity.activityVerdict
            ? String(apiWeather.bestDayForActivity.activityVerdict)
            : undefined,
          reason: apiWeather.bestDayForActivity.reason
            ? String(apiWeather.bestDayForActivity.reason)
            : undefined,
        }
      : null,
  };
}

export default function WeatherAndItineraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    location?: string | string[];
    activityName?: string | string[];
    activityId?: string | string[];
    numberOfDays?: string | string[];
  }>();

  const headerTitle = (paramOne(params.location) || FALLBACK_LOCATION).replace(/\s+/g, " ");
  const activityName = paramOne(params.activityName) || "Selected activity";
  const activityId = paramOne(params.activityId);
  const numberOfDays = Math.max(1, Number(paramOne(params.numberOfDays) || "1") || 1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loadingSelectedDay, setLoadingSelectedDay] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherUi | null>(null);
  const [recommendation, setRecommendation] = useState<{
    title: string;
    subtitle: string;
    bullets: string[];
  } | null>(null);

  const applyRecommendation = useCallback(
    (data: GenerateItineraryResponse) => {
      setRecommendation({
        title: data.recommendation?.title || "AI Recommendation",
        subtitle:
          data.recommendation?.subtitle ||
          "Based on weather and the activity you are planning",
        bullets:
          Array.isArray(data.recommendation?.bullets) && data.recommendation.bullets.length > 0
            ? data.recommendation.bullets
            : defaultTips(activityName),
      });
      setRecommendationError(null);
    },
    [activityName]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!activityId) {
        throw new Error("Missing activity id. Open this page from activity detail.");
      }

      const data = await generateItineraryForActivity(activityId, numberOfDays);
      setWeather(mapApiWeatherToUi(data.weather));
      setSelectedDayIndex(0);
      applyRecommendation(data);
    } catch (e: unknown) {
      setWeather(null);
      setRecommendation(null);
      setError(e instanceof Error ? e.message : "Failed to load weather and recommendations");
    } finally {
      setLoading(false);
    }
  }, [activityId, applyRecommendation, numberOfDays]);

  useEffect(() => {
    load();
  }, [load]);

  const onSelectDay = useCallback(
    async (nextIndex: number) => {
      if (!activityId || !weather?.daily?.length) return;
      if (nextIndex < 0 || nextIndex >= weather.daily.length) return;
      setSelectedDayIndex(nextIndex);
      setLoadingSelectedDay(true);
      setRecommendationError(null);
      try {
        const selected = weather.daily[nextIndex];
        const data = await generateItineraryForSelectedDay(
          activityId,
          nextIndex,
          1,
          selected?.date || undefined
        );
        applyRecommendation(data);
      } catch (e: unknown) {
        setRecommendationError(
          e instanceof Error ? e.message : "Failed to load recommendation for this day"
        );
      } finally {
        setLoadingSelectedDay(false);
      }
    },
    [activityId, applyRecommendation, weather]
  );

  if (loading) {
    return (
      <View style={[styles.page, { paddingTop: insets.top, flex: 1 }]}>
        <SkeletonWeatherItineraryScreen />
      </View>
    );
  }

  const dailyDays = weather?.daily ?? [];
  const safeSelectedIndex =
    dailyDays.length > 0 ? Math.min(Math.max(selectedDayIndex, 0), dailyDays.length - 1) : 0;
  const selectedDay = dailyDays[safeSelectedIndex];
  const bestDay = weather?.bestDayForActivity;

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
      >
        <ScreenHeader title={headerTitle} marginBottom={20} />

        {error || !weather ? (
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

            {dailyDays.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>7-Day Forecast</Text>
                <View style={styles.dailyNavRow}>
                  <TouchableOpacity
                    onPress={() => onSelectDay(Math.max(0, safeSelectedIndex - 1))}
                    disabled={safeSelectedIndex <= 0 || loadingSelectedDay}
                    style={[styles.navBtn, safeSelectedIndex <= 0 && styles.navBtnDisabled]}
                  >
                    <Ionicons name="chevron-back" size={18} color="#007BFF" />
                  </TouchableOpacity>
                  <View style={styles.dailyHeaderCenter}>
                    <Text style={styles.dailyLabel}>{selectedDay?.label || "Day"}</Text>
                    <Text style={styles.dailyDate}>{formatDayDate(selectedDay?.date || "")}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onSelectDay(Math.min(dailyDays.length - 1, safeSelectedIndex + 1))}
                    disabled={safeSelectedIndex >= dailyDays.length - 1 || loadingSelectedDay}
                    style={[
                      styles.navBtn,
                      safeSelectedIndex >= dailyDays.length - 1 && styles.navBtnDisabled,
                    ]}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#007BFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.dailyCard}>
                  {selectedDay?.unavailable ? (
                    <Text style={styles.unavailableText}>
                      Forecast not available for this day yet.
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.dailyCondition}>
                        {titleCaseWords(selectedDay?.condition || "Unknown")}
                      </Text>
                      <Text style={styles.dailyTemps}>
                        {Math.round(selectedDay?.minTempC ?? 0)}° /{" "}
                        {Math.round(selectedDay?.maxTempC ?? 0)}°
                      </Text>
                      <Text style={styles.dailyMeta}>
                        Rain chance {Math.round((selectedDay?.rainChance ?? 0) * 100)}%
                      </Text>
                      {(selectedDay?.activityVerdict || selectedDay?.reason) && (
                        <View style={styles.verdictBox}>
                          {selectedDay?.activityVerdict ? (
                            <Text style={styles.verdictTitle}>
                              {titleCaseWords(selectedDay.activityVerdict)}
                              {typeof selectedDay.activityScore === "number"
                                ? ` (${Math.round(selectedDay.activityScore)}/100)`
                                : ""}
                            </Text>
                          ) : null}
                          {selectedDay?.reason ? (
                            <Text style={styles.verdictReason}>{selectedDay.reason}</Text>
                          ) : null}
                        </View>
                      )}
                    </>
                  )}
                </View>
              </>
            )}

            {bestDay && (
              <View
                style={[
                  styles.bestDayCard,
                  bestDay.index === safeSelectedIndex && styles.bestDayCardSelected,
                ]}
              >
                <Text style={styles.bestDayTitle}>Best day for this activity</Text>
                <Text style={styles.bestDayLabel}>
                  {bestDay.label || "Best day"}
                  {bestDay.date ? ` - ${formatDayDate(bestDay.date)}` : ""}
                </Text>
                {bestDay.activityVerdict ? (
                  <Text style={styles.bestDayVerdict}>
                    {titleCaseWords(bestDay.activityVerdict)}
                    {typeof bestDay.activityScore === "number"
                      ? ` (${Math.round(bestDay.activityScore)}/100)`
                      : ""}
                  </Text>
                ) : null}
                {bestDay.reason ? <Text style={styles.bestDayReason}>{bestDay.reason}</Text> : null}
              </View>
            )}

            <Text style={styles.sectionTitle}>{recommendation?.title || "AI Recommendation"}</Text>
            <Text style={styles.aiSubtitle}>
              {recommendation?.subtitle || "Based on weather and the activity you are planning"}
            </Text>
            {loadingSelectedDay ? (
              <View style={styles.inlineLoaderWrap}>
                <ActivityIndicator size="small" color={ACCENT} />
              </View>
            ) : null}
            {recommendationError ? (
              <Text style={styles.errorInline}>{recommendationError}</Text>
            ) : null}
            <View style={styles.aiCard}>
              {(recommendation?.bullets || defaultTips(activityName)).map((line, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  scrollContent: { paddingHorizontal: 20 },
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
  dailyNavRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnDisabled: { opacity: 0.4 },
  dailyHeaderCenter: { flex: 1, alignItems: "center" },
  dailyLabel: { fontSize: 15, fontFamily: "Nunito_700Bold", color: "#0B2A4A" },
  dailyDate: { marginTop: 2, fontSize: 12, color: "#666", fontFamily: "Nunito_400Regular" },
  dailyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  dailyCondition: { fontSize: 16, fontFamily: "Nunito_700Bold", color: "#0B2A4A" },
  dailyTemps: { marginTop: 6, fontSize: 15, fontFamily: "Nunito_700Bold", color: "#000" },
  dailyMeta: { marginTop: 6, fontSize: 13, color: "#666", fontFamily: "Nunito_400Regular" },
  unavailableText: { fontSize: 13, color: "#666", fontFamily: "Nunito_400Regular" },
  verdictBox: {
    marginTop: 10,
    backgroundColor: "#F3F8FF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  verdictTitle: { fontSize: 13, color: "#005FCC", fontFamily: "Nunito_700Bold" },
  verdictReason: {
    marginTop: 4,
    fontSize: 12,
    color: "#35506B",
    fontFamily: "Nunito_400Regular",
    lineHeight: 18,
  },
  bestDayCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D9E8FF",
  },
  bestDayCardSelected: {
    borderColor: "#007BFF",
    backgroundColor: "#F5FAFF",
  },
  bestDayTitle: { fontSize: 16, fontFamily: "Nunito_700Bold", color: "#007BFF" },
  bestDayLabel: { marginTop: 4, fontSize: 14, fontFamily: "Nunito_700Bold", color: "#0B2A4A" },
  bestDayVerdict: { marginTop: 6, fontSize: 13, fontFamily: "Nunito_700Bold", color: "#005FCC" },
  bestDayReason: {
    marginTop: 4,
    fontSize: 12,
    color: "#35506B",
    fontFamily: "Nunito_400Regular",
    lineHeight: 18,
  },
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
  inlineLoaderWrap: { marginBottom: 10, alignItems: "flex-start" },
  errorInline: { fontSize: 13, color: "#666", fontFamily: "Nunito_400Regular", marginBottom: 12 },
});
