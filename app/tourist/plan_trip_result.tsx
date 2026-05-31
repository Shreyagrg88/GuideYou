import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
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
import type { ItineraryDay } from "../../api/aiPlanner";
import {
  fetchPlanTrip,
  fetchPlanTripByDay,
  type PlanTripWeather,
} from "../../api/planTrip";
import ScreenHeader from "../../components/screen-header";
import { SkeletonBlock, SkeletonWeatherItineraryScreen } from "@/components/Skeleton";

const PAGE_BG = "#E6F2FF";
const ACCENT = "#007BFF";
const FALLBACK_LOCATION = "Pokhara, Nepal";
const MAX_ITINERARY_JSON_PARAM = 2000;

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

function paramOne(v: string | string[] | undefined): string {
  if (v == null) return "";
  const x = Array.isArray(v) ? v[0] : v;
  return String(x ?? "").trim();
}

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

function pickDisplayCondition(apiWeather: PlanTripWeather): string {
  const description = String(apiWeather.currentDescription || "").trim();
  if (description) return titleCaseWords(description);

  const fromIcon = conditionFromIcon(String(apiWeather.currentIcon || ""));
  if (fromIcon) return fromIcon;

  const condition = String(apiWeather.condition || "").trim();
  return condition ? titleCaseWords(condition) : "Unknown";
}

function owmIconUrl(code: string): string {
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
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

function mapApiWeatherToUi(apiWeather: PlanTripWeather): WeatherUi {
  const daily = Array.isArray(apiWeather.daily)
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
    : [];

  const best = apiWeather.bestDayForActivity;

  return {
    tempC: Number(apiWeather.tempC ?? 0),
    feelsLikeC: Number(apiWeather.feelsLikeC ?? apiWeather.tempC ?? 0),
    condition: pickDisplayCondition(apiWeather),
    hourly: Array.isArray(apiWeather.hourly)
      ? apiWeather.hourly.map((h) => ({
          time: String(h.time || ""),
          tempC: Number(h.tempC ?? 0),
          icon: String(h.icon || "03d"),
        }))
      : [],
    daily,
    bestDayForActivity: best
      ? {
          index: Number(best.index ?? 0),
          date: String(best.date || ""),
          label: String(best.label || "Best Day"),
          activityScore:
            typeof best.activityScore === "number" ? Number(best.activityScore) : undefined,
          activityVerdict: best.activityVerdict ? String(best.activityVerdict) : undefined,
          reason: best.reason ? String(best.reason) : undefined,
        }
      : null,
  };
}

export default function PlanTripResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    destination?: string | string[];
    interests?: string | string[];
    numberOfDays?: string | string[];
  }>();

  const destination = paramOne(params.destination);
  const interests = paramOne(params.interests);
  const initialDays = Math.max(1, Number(paramOne(params.numberOfDays) || "3") || 3);

  const [numberOfDays, setNumberOfDays] = useState(initialDays);
  const [headerTitle, setHeaderTitle] = useState(
    (destination || FALLBACK_LOCATION).replace(/\s+/g, " ")
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [loadingSelectedDay, setLoadingSelectedDay] = useState(false);
  const [itineraryError, setItineraryError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const [weather, setWeather] = useState<WeatherUi | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);

  const applyPlanResponse = useCallback(
    (data: { weather: PlanTripWeather; itinerary: ItineraryDay[]; destination: string }) => {
      setWeather(mapApiWeatherToUi(data.weather));
      setItinerary(Array.isArray(data.itinerary) ? data.itinerary : []);
      setItineraryError(null);
      const title =
        String(data.weather.basedOnDestination || data.destination || destination).trim() ||
        FALLBACK_LOCATION;
      setHeaderTitle(title.replace(/\s+/g, " "));
    },
    [destination]
  );

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

      const data = await fetchPlanTrip({ destination, interests, numberOfDays });
      applyPlanResponse(data);
      setSelectedDayIndex(0);
    } catch (e: unknown) {
      setWeather(null);
      setItinerary([]);
      setError(e instanceof Error ? e.message : "Failed to load weather and itinerary");
    } finally {
      setLoading(false);
    }
  }, [applyPlanResponse, destination, interests, numberOfDays]);

  useEffect(() => {
    load();
  }, [load]);

  const regenerateItinerary = useCallback(async () => {
    setLoadingItinerary(true);
    setItineraryError(null);
    try {
      const data = await fetchPlanTrip({ destination, interests, numberOfDays });
      setItinerary(Array.isArray(data.itinerary) ? data.itinerary : []);
      setWeather(mapApiWeatherToUi(data.weather));
    } catch (e: unknown) {
      setItinerary([]);
      setItineraryError(
        e instanceof Error ? e.message : "Failed to generate itinerary"
      );
    } finally {
      setLoadingItinerary(false);
    }
  }, [destination, interests, numberOfDays]);

  const onSelectDay = useCallback(
    async (nextIndex: number) => {
      if (!weather?.daily?.length) return;
      if (nextIndex < 0 || nextIndex >= weather.daily.length) return;
      setSelectedDayIndex(nextIndex);
      setLoadingSelectedDay(true);
      setItineraryError(null);
      try {
        const selected = weather.daily[nextIndex];
        const data = await fetchPlanTripByDay({
          destination,
          interests,
          numberOfDays,
          selectedDayIndex: nextIndex,
          selectedDate: selected?.date || undefined,
        });
        applyPlanResponse(data);
        setSelectedDayIndex(nextIndex);
      } catch (e: unknown) {
        setItineraryError(
          e instanceof Error ? e.message : "Failed to load selected-day itinerary"
        );
      } finally {
        setLoadingSelectedDay(false);
      }
    },
    [applyPlanResponse, destination, interests, numberOfDays, weather]
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
                    onPress={() =>
                      onSelectDay(Math.min(dailyDays.length - 1, safeSelectedIndex + 1))
                    }
                    disabled={
                      safeSelectedIndex >= dailyDays.length - 1 || loadingSelectedDay
                    }
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

            {loadingSelectedDay ? (
              <View style={styles.inlineLoaderWrap}>
                <ActivityIndicator size="small" color={ACCENT} />
              </View>
            ) : null}

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
              <View style={{ marginVertical: 12 }}>
                <SkeletonBlock width="100%" height={56} borderRadius={12} style={{ marginBottom: 10 }} />
                <SkeletonBlock width="100%" height={56} borderRadius={12} />
              </View>
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

            <View style={styles.guideCtaCard}>
              <View style={styles.guideCtaIconWrap}>
                <Ionicons name="people-outline" size={26} color={ACCENT} />
              </View>
              <Text style={styles.guideCtaTitle}>Prefer going with a guide?</Text>
              <Text style={styles.guideCtaBody}>
                Not confident doing this trip alone? Local guides offer activities similar to
                your plan.
              </Text>
              <TouchableOpacity
                style={styles.findGuidesBtn}
                activeOpacity={0.85}
                onPress={() => {
                  const q = new URLSearchParams({
                    destination,
                    interests,
                    numberOfDays: String(numberOfDays),
                  });
                  if (itinerary.length > 0) {
                    const itineraryJson = JSON.stringify(itinerary);
                    if (itineraryJson.length <= MAX_ITINERARY_JSON_PARAM) {
                      q.set("itineraryJson", itineraryJson);
                    }
                  }
                  router.push(`/tourist/plan_trip_guides?${q.toString()}` as Href);
                }}
              >
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.findGuidesBtnText}>Find guides</Text>
              </TouchableOpacity>
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
  inlineLoaderWrap: { marginBottom: 10, alignItems: "flex-start" },
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
  guideCtaCard: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9E8FF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  guideCtaIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8F2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  guideCtaTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#0B2A4A",
    textAlign: "center",
    marginBottom: 8,
  },
  guideCtaBody: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#555",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 16,
  },
  findGuidesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 24,
    width: "100%",
  },
  findGuidesBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold" },
});
