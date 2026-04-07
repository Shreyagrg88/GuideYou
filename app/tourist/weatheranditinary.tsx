import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
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
  recommendActivitiesByGps,
  type AiRecommendedActivity,
  type ItineraryDay,
} from "../../api/aiPlanner";
import { API_URL } from "../../constants/api";
import {
  fetchWeatherForLocation,
  getOpenWeatherApiKey,
  type WeatherState,
} from "../../api/openWeather";

const PAGE_BG = "#E6F2FF";
const ACCENT = "#007BFF";

const MOCK_LOCATION = "Pokhara, Nepal";

const DEMO_WEATHER: WeatherState = {
  locationLabel: MOCK_LOCATION,
  temp: 23,
  feelsLike: 22,
  description: "Partly Cloudy",
  iconCode: "02d",
  hourly: [
    { key: "0", label: "Now", temp: 23, iconCode: "02d" },
    { key: "1", label: "2:00 PM", temp: 24, iconCode: "01d" },
    { key: "2", label: "3:00 PM", temp: 24, iconCode: "01d" },
    { key: "3", label: "4:00 PM", temp: 21, iconCode: "02d" },
    { key: "4", label: "5:00 PM", temp: 20, iconCode: "03d" },
  ],
};

function owmIconUrl(code: string): string {
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
}

function buildAiTips(
  temp: number,
  feelsLike: number,
  description: string,
  activityName?: string
): string[] {
  const d = description.toLowerCase();
  const feels = Math.max(temp, feelsLike);
  const tips: string[] = [];

  if (activityName?.trim()) {
    tips.push(`Tailor your pace for "${activityName.trim()}" using today's forecast.`);
  }

  if (feels >= 22) {
    tips.push("Start early to avoid the midday heat.");
    tips.push("Wear light, breathable clothes and a sunhat.");
    tips.push("Take frequent water breaks and rest in shaded spots.");
    tips.push("Use sunscreen and sunglasses to protect from strong UV rays.");
  } else if (feels <= 12) {
    tips.push("Bring a warm layer for early morning and evening.");
    tips.push("If you gain elevation, temperatures can drop quickly—pack accordingly.");
  }

  if (d.includes("rain") || d.includes("drizzle") || d.includes("thunderstorm")) {
    tips.push("Pack a waterproof jacket and quick-dry layers.");
    tips.push("Allow extra time on paths that may be slippery.");
  }

  if (
    d.includes("clear") ||
    d.includes("sun") ||
    d.includes("cloud") ||
    d.includes("partly")
  ) {
    tips.push("Enjoy clear mountain views and bright, sunny trails all day.");
  }

  const unique = [...new Set(tips)];
  if (unique.length === 0) {
    return [
      "Check the forecast again before you leave.",
      "Stay hydrated and keep a flexible schedule.",
    ];
  }
  return unique.slice(0, 8);
}

export default function WeatherAndItineraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    location?: string;
    activityName?: string;
    activityId?: string;
  }>();

  const locationQuery = (params.location?.trim() || MOCK_LOCATION).replace(/\s+/g, " ");
  const activityName = params.activityName?.trim();
  const preselectedActivityId = params.activityId?.trim();

  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedLiveData, setUsedLiveData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [missingKeyHint, setMissingKeyHint] = useState(false);
  const [recommendationWeather, setRecommendationWeather] = useState<string>("");
  const [recommendedActivities, setRecommendedActivities] = useState<
    AiRecommendedActivity[]
  >([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    preselectedActivityId || null
  );
  const [selectedActivityName, setSelectedActivityName] = useState<string>(
    activityName || ""
  );
  const [numberOfDays, setNumberOfDays] = useState(2);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [itineraryError, setItineraryError] = useState<string | null>(null);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setMissingKeyHint(false);

    const apiKey = getOpenWeatherApiKey();
    if (!apiKey) {
      setWeather({
        ...DEMO_WEATHER,
        locationLabel: locationQuery,
      });
      setUsedLiveData(false);
      setMissingKeyHint(true);
      setLoading(false);
      return;
    }

    const result = await fetchWeatherForLocation(locationQuery, apiKey);
    if (result.ok) {
      setWeather(result.data);
      setUsedLiveData(true);
      setFetchError(null);
    } else if (result.code === "location_not_found") {
      setWeather(null);
      setUsedLiveData(false);
      setFetchError(
        `No weather data for "${result.query}". Try a nearby city or region.`
      );
    } else {
      setWeather(null);
      setUsedLiveData(false);
      setFetchError(
        result.code === "api_error"
          ? result.message
          : "Something went wrong loading the forecast."
      );
    }
    setLoading(false);
  }, [locationQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const loadRecommendations = useCallback(async () => {
    setLoadingRecommendations(true);
    setRecommendationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setRecommendedActivities([]);
        setRecommendationError("Location permission is required for AI recommendations.");
        return;
      }
      let current = null as Awaited<
        ReturnType<typeof Location.getCurrentPositionAsync>
      > | null;
      try {
        current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch {
        // If fresh GPS fails, fallback to last known point (common on emulators).
        current = await Location.getLastKnownPositionAsync({
          maxAge: 120000,
          requiredAccuracy: 1000,
        });
      }
      if (!current) {
        setRecommendedActivities([]);
        setRecommendationError(
          "Current location is unavailable. Make sure emulator/device location is ON and set a mock GPS point."
        );
        return;
      }
      const data = await recommendActivitiesByGps(
        current.coords.latitude,
        current.coords.longitude
      );
      setRecommendationWeather(data.weather?.condition || "");
      setRecommendedActivities(data.activityRecommendations || []);
    } catch (e: any) {
      setRecommendedActivities([]);
      setRecommendationError(
        e?.message ||
          "Failed to load AI recommendations. Check network and location provider."
      );
    } finally {
      setLoadingRecommendations(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleGenerateItinerary = useCallback(
    async (activityId: string, activityLabel: string) => {
      setSelectedActivityId(activityId);
      setSelectedActivityName(activityLabel);
      setLoadingItinerary(true);
      setItineraryError(null);
      try {
        const data = await generateItineraryForActivity(activityId, numberOfDays);
        setItineraryDays(data.itinerary || []);
      } catch (e: any) {
        setItineraryDays([]);
        setItineraryError(e?.message || "Failed to generate itinerary");
      } finally {
        setLoadingItinerary(false);
      }
    },
    [numberOfDays]
  );

  useEffect(() => {
    if (preselectedActivityId && activityName) {
      handleGenerateItinerary(preselectedActivityId, activityName);
    }
  }, [preselectedActivityId, activityName, handleGenerateItinerary]);

  /** Always show the activity’s location from tour detail, not OpenWeather’s resolved city label. */
  const headerTitle = locationQuery;
  const tips =
    weather != null
      ? buildAiTips(weather.temp, weather.feelsLike, weather.description, activityName)
      : [];

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

        {missingKeyHint && weather && (
          <View style={styles.keyHintBanner}>
            <Ionicons name="key-outline" size={20} color="#92400E" style={{ marginRight: 10 }} />
            <Text style={styles.keyHintText}>
              Add your free OpenWeather API key in a root{" "}
              <Text style={styles.keyHintMono}>.env</Text> file:{" "}
              <Text style={styles.keyHintMono}>EXPO_PUBLIC_OPENWEATHER_API_KEY</Text>, then restart
              Expo. Below is demo data only.
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading live weather…</Text>
          </View>
        ) : fetchError && !weather ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={48} color="#999" />
            <Text style={styles.errorTitle}>Couldn’t load forecast</Text>
            <Text style={styles.errorMessage}>{fetchError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : weather ? (
          <>
            <View style={styles.currentCard}>
              <Text style={styles.currentTemp}>{weather.temp}°C</Text>
              <Text style={styles.currentCondition}>{weather.description}</Text>
              <Text style={styles.feelsLike}>Feels like {weather.feelsLike}°</Text>
            </View>

            <Text style={styles.sectionTitle}>Hourly Forecast</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourlyRow}
            >
              {weather.hourly.map((h) => (
                <View key={h.key} style={styles.hourlyCard}>
                  <Text style={styles.hourlyTime}>{h.label}</Text>
                  <Image source={{ uri: owmIconUrl(h.iconCode) }} style={styles.hourlyIcon} />
                  <Text style={styles.hourlyTemp}>{h.temp}°</Text>
                </View>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>AI Recommendation</Text>
            <Text style={styles.aiSubtitle}>
              Based on weather and the activity you are planning
            </Text>
            <View style={styles.aiCard}>
              {tips.map((line, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recommended Activities</Text>
              <TouchableOpacity onPress={loadRecommendations}>
                <Text style={styles.linkText}>Refresh</Text>
              </TouchableOpacity>
            </View>
            {recommendationWeather ? (
              <Text style={styles.aiSubtitle}>
                Based on GPS weather condition: {recommendationWeather}
              </Text>
            ) : null}

            {loadingRecommendations ? (
              <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 12 }} />
            ) : recommendationError ? (
              <Text style={styles.errorInline}>{recommendationError}</Text>
            ) : recommendedActivities.length === 0 ? (
              <Text style={styles.errorInline}>No recommended activities found.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recommendedActivities.map((a, index) => {
                  const img = a.photos?.[0];
                  const uri =
                    img && !img.startsWith("http") ? `${API_URL}${img}` : img || "";
                  const isSelected = selectedActivityId === a.id;
                  const stableKey =
                    a.id || `${a.name || "activity"}-${a.location || "unknown"}-${index}`;
                  return (
                    <TouchableOpacity
                      key={stableKey}
                      style={[styles.recCard, isSelected && styles.recCardActive]}
                      activeOpacity={0.9}
                      onPress={() => handleGenerateItinerary(a.id, a.name)}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={styles.recImage} />
                      ) : (
                        <View style={[styles.recImage, styles.placeholderImage]}>
                          <Ionicons name="image-outline" size={24} color="#ccc" />
                        </View>
                      )}
                      <View style={styles.recBody}>
                        <Text style={styles.recTitle} numberOfLines={1}>
                          {a.name}
                        </Text>
                        <Text style={styles.recSub} numberOfLines={1}>
                          {a.location || "Location not set"}
                        </Text>
                        <Text style={styles.recSub} numberOfLines={1}>
                          {a.category || "Activity"} • {a.difficulty || "Moderate"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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

            {selectedActivityId ? (
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={() =>
                  handleGenerateItinerary(selectedActivityId, selectedActivityName || "Selected activity")
                }
              >
                <Text style={styles.generateBtnText}>Generate itinerary</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.errorInline}>
                Select an activity to generate itinerary.
              </Text>
            )}

            <Text style={styles.sectionTitle}>Itinerary</Text>
            {loadingItinerary ? (
              <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 12 }} />
            ) : itineraryError ? (
              <Text style={styles.errorInline}>{itineraryError}</Text>
            ) : itineraryDays.length > 0 ? (
              itineraryDays.map((day) => (
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
              <Text style={styles.errorInline}>
                No itinerary yet. Pick an activity and generate one.
              </Text>
            )}

            <Text style={styles.footerNote}>
              {usedLiveData
                ? "Weather data provided by OpenWeather"
                : "Demo forecast — connect OpenWeather for live data."}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  backWrap: {
    width: 40,
    justifyContent: "center",
  },
  backPlaceholder: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    textAlign: "center",
  },
  keyHintBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  keyHintText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#78350F",
    lineHeight: 20,
  },
  keyHintMono: {
    fontFamily: "Nunito_700Bold",
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    fontSize: 14,
  },
  errorBox: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#333",
  },
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
  retryButtonText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },
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
  currentTemp: {
    fontSize: 42,
    fontFamily: "Nunito_700Bold",
    color: "#000",
  },
  currentCondition: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: ACCENT,
  },
  feelsLike: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: ACCENT,
    marginBottom: 8,
  },
  hourlyRow: {
    paddingBottom: 24,
  },
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
  hourlyIcon: {
    width: 40,
    height: 40,
  },
  hourlyTemp: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#000",
  },
  aiSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginBottom: 12,
  },
  aiCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bullet: {
    fontSize: 16,
    color: "#000",
    marginRight: 8,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: "#000",
    lineHeight: 22,
  },
  footerNote: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  linkText: {
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
  errorInline: {
    fontSize: 13,
    color: "#666",
    fontFamily: "Nunito_400Regular",
    marginBottom: 12,
  },
  recCard: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  recCardActive: {
    borderColor: "#007BFF",
  },
  recImage: {
    width: "100%",
    height: 110,
  },
  recBody: {
    padding: 10,
  },
  recTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    marginBottom: 4,
  },
  recSub: {
    fontSize: 12,
    color: "#666",
    fontFamily: "Nunito_400Regular",
    marginBottom: 2,
  },
  placeholderImage: {
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  daysControlRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  daysLabel: {
    fontSize: 14,
    color: "#555",
    fontFamily: "Nunito_700Bold",
  },
  daysStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  daysBtn: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  daysValue: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
  generateBtn: {
    backgroundColor: "#007BFF",
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  dayTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    marginBottom: 8,
  },
  dayLine: {
    fontSize: 13,
    color: "#444",
    fontFamily: "Nunito_400Regular",
    marginBottom: 6,
    lineHeight: 20,
  },
  dayPart: {
    fontFamily: "Nunito_700Bold",
  },
});
