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

export type RecommendActivitiesResponse = {
  weather?: { condition?: WeatherCondition };
  totalPublishedActivities?: number;
  activityRecommendations: AiRecommendedActivity[];
};

export type ItineraryDay = {
  day: number;
  morning: string;
  afternoon: string;
  evening: string;
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
      ? data.activityRecommendations
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
