import { API_URL } from "../constants/api";

export type WeatherCondition = "rainy" | "sunny" | "cloudy" | string;

export type AiRecommendedActivity = {
  id: string;
  name: string;
  location?: string;
  category?: string;
  difficulty?: string;
  photos?: string[];
  duration?: number;
};

function pickRawActivityId(raw: Record<string, unknown> | null | undefined): string {
  if (!raw || typeof raw !== "object") return "";
  const candidates = [
    raw.id,
    raw._id,
    raw.activityId,
    raw.activity_id,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === "string" || typeof c === "number") {
      const s = String(c).trim();
      if (s) return s;
    }
    if (typeof c === "object" && c !== null && "$oid" in c) {
      const oid = (c as { $oid?: string }).$oid;
      if (oid && String(oid).trim()) return String(oid).trim();
    }
  }
  return "";
}

/** Normalize one recommendation object from POST /api/recommend-activities. */
export function normalizeAiRecommendedActivity(raw: unknown): AiRecommendedActivity {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id = pickRawActivityId(r);
  const photos = Array.isArray(r.photos)
    ? (r.photos as string[])
    : r.image
      ? [String(r.image)]
      : r.photo
        ? [String(r.photo)]
        : undefined;
  const nameRaw = r.name ?? r.title;
  const name =
    nameRaw != null && String(nameRaw).trim()
      ? String(nameRaw).trim()
      : "Activity";
  let duration: number | undefined;
  if (typeof r.duration === "number" && !Number.isNaN(r.duration)) duration = r.duration;
  else if (r.duration != null) {
    const n = Number(r.duration);
    if (!Number.isNaN(n)) duration = n;
  }
  return {
    id,
    name,
    location: r.location != null ? String(r.location) : undefined,
    category: r.category != null ? String(r.category) : undefined,
    difficulty: r.difficulty != null ? String(r.difficulty) : undefined,
    photos,
    duration,
  };
}

export type RecommendActivitiesResponse = {
  weather?: {
    condition?: WeatherCondition;
    description?: string;
    currentDescription?: string;
    currentMain?: string;
    currentIcon?: string;
  };
  totalPublishedActivities?: number;
  activityRecommendations: AiRecommendedActivity[];
};

export type ItineraryDay = {
  day: number;
  morning: string;
  afternoon: string;
  evening: string;
};

export type DailyWeatherItem = {
  date: string;
  label?: string;
  condition?: string;
  description?: string;
  minTempC?: number;
  maxTempC?: number;
  avgTempC?: number;
  rainChance?: number;
  humidity?: number;
  windSpeed?: number;
  unavailable?: boolean;
  activityScore?: number;
  activityVerdict?: string;
  reason?: string;
};

export type BestDayForActivity = {
  index?: number;
  date?: string;
  label?: string;
  activityScore?: number;
  activityVerdict?: string;
  reason?: string;
};

export type GenerateItineraryResponse = {
  weather?: {
    condition?: WeatherCondition;
    description?: string;
    tempC?: number;
    feelsLikeC?: number;
    humidity?: number;
    windSpeed?: number;
    icon?: string;
    hourly?: Array<{
      time: string;
      condition?: string;
      description?: string;
      tempC?: number;
      feelsLikeC?: number;
      icon?: string;
    }>;
    daily?: DailyWeatherItem[];
    activityProfile?: string;
    bestDayForActivity?: BestDayForActivity;
    strategy?: string;
    weatherQueryUsed?: string;
    basedOnActivityLocation?: string;
    source?: string;
    triedQueries?: string[];
  };
  numberOfDays?: number;
  chosenActivity?: AiRecommendedActivity;
  recommendation?: {
    title?: string;
    subtitle?: string;
    bullets?: string[];
  };
  itinerary: ItineraryDay[];
};

export async function recommendActivitiesByGps(
  lat: number,
  lng: number
): Promise<RecommendActivitiesResponse> {
  const res = await fetch(`${API_URL}/api/recommend-activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.msg || "Failed to fetch recommendations");
  }
  return {
    weather: data.weather,
    totalPublishedActivities: data.totalPublishedActivities,
    activityRecommendations: Array.isArray(data.activityRecommendations)
      ? data.activityRecommendations.map(normalizeAiRecommendedActivity)
      : [],
  };
}

export async function generateItineraryForActivity(
  activityId: string,
  numberOfDays: number
): Promise<GenerateItineraryResponse> {
  const res = await fetch(`${API_URL}/api/generate-itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityId, numberOfDays }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.msg || "Failed to generate itinerary");
  }
  return {
    weather: data.weather,
    numberOfDays: data.numberOfDays,
    chosenActivity: data.chosenActivity,
    recommendation: data.recommendation,
    itinerary: Array.isArray(data.itinerary) ? data.itinerary : [],
  };
}

export async function generateItineraryForSelectedDay(
  activityId: string,
  selectedDayIndex: number,
  numberOfDays: number,
  selectedDate?: string
): Promise<GenerateItineraryResponse> {
  const body: Record<string, unknown> = {
    activityId,
    selectedDayIndex,
    numberOfDays,
  };
  if (selectedDate) body.selectedDate = selectedDate;

  const res = await fetch(`${API_URL}/api/generate-itinerary-by-day`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.msg || "Failed to generate selected-day itinerary");
  }
  return {
    weather: data.weather,
    numberOfDays: data.numberOfDays,
    chosenActivity: data.chosenActivity,
    recommendation: data.recommendation,
    itinerary: Array.isArray(data.itinerary) ? data.itinerary : [],
  };
}
