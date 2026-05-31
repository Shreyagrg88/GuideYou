import { API_URL } from "../constants/api";
import type { BestDayForActivity, DailyWeatherItem, ItineraryDay } from "./aiPlanner";

export type PlanTripRequest = {
  destination: string;
  interests: string;
  numberOfDays: number;
};

export type PlanTripWeather = {
  condition?: string;
  currentMain?: string;
  currentDescription?: string;
  currentIcon?: string;
  source?: string;
  basedOnDestination?: string;
  tempC?: number;
  feelsLikeC?: number;
  humidity?: number;
  windSpeed?: number;
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
  selectedDayIndex?: number;
  selectedDay?: DailyWeatherItem;
};

export type PlanTripResponse = {
  destination: string;
  interests: string;
  numberOfDays: number;
  weather: PlanTripWeather;
  itinerary: ItineraryDay[];
};

export async function fetchPlanTrip(body: PlanTripRequest): Promise<PlanTripResponse> {
  const res = await fetch(`${API_URL}/api/plan-trip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination: body.destination.trim(),
      interests: body.interests.trim(),
      numberOfDays: body.numberOfDays,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.msg || "Failed to load plan");
  }

  return {
    destination: String(data.destination ?? body.destination),
    interests: String(data.interests ?? body.interests),
    numberOfDays: Number(data.numberOfDays ?? body.numberOfDays),
    weather: data.weather ?? {},
    itinerary: Array.isArray(data.itinerary) ? data.itinerary : [],
  };
}

export type PlanTripByDayRequest = PlanTripRequest & {
  selectedDayIndex?: number;
  selectedDate?: string;
};

export async function fetchPlanTripByDay(
  body: PlanTripByDayRequest
): Promise<PlanTripResponse> {
  const payload: Record<string, unknown> = {
    destination: body.destination.trim(),
    interests: body.interests.trim(),
    numberOfDays: body.numberOfDays,
  };
  if (typeof body.selectedDayIndex === "number") {
    payload.selectedDayIndex = body.selectedDayIndex;
  }
  if (body.selectedDate) payload.selectedDate = body.selectedDate;

  const res = await fetch(`${API_URL}/api/plan-trip-by-day`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.msg || "Failed to load plan for selected day");
  }

  return {
    destination: String(data.destination ?? body.destination),
    interests: String(data.interests ?? body.interests),
    numberOfDays: Number(data.numberOfDays ?? body.numberOfDays),
    weather: data.weather ?? {},
    itinerary: Array.isArray(data.itinerary) ? data.itinerary : [],
  };
}

export type PlanTripSimilarActivity = {
  id: string;
  name: string;
  location: string;
  description: string;
  category: string;
  duration: number;
  difficulty: string;
  photos: string[];
  itineraryDays: Array<{ day: number; summary: string }>;
};

export type PlanTripGuideMatch = {
  id: string;
  username: string;
  name: string;
  role: string;
  location: string;
  experience: string;
  charge: string;
  chargeUsd: number;
  chargeNpr: number;
  usdToNprRate: number;
  rating: string;
  reviewCount: number;
  image: string;
  description: string;
  matchLabel: string;
  matchScore: number;
  similarActivityLine: string;
  similarActivity: PlanTripSimilarActivity;
};

export type PlanTripGuidesResponse = {
  destination: string;
  interests: string;
  numberOfDays: number;
  count: number;
  guides: PlanTripGuideMatch[];
};

function pickId(raw: Record<string, unknown>): string {
  for (const c of [raw.id, raw._id]) {
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

function normalizeSimilarActivity(raw: unknown): PlanTripSimilarActivity {
  const a = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const photos = Array.isArray(a.photos) ? (a.photos as string[]) : [];
  const itineraryDays = Array.isArray(a.itineraryDays)
    ? (a.itineraryDays as Array<{ day?: number; summary?: string }>).map((d, i) => ({
        day: typeof d.day === "number" ? d.day : i + 1,
        summary: d.summary != null ? String(d.summary) : "",
      }))
    : [];
  return {
    id: pickId(a),
    name: a.name != null ? String(a.name) : "Activity",
    location: a.location != null ? String(a.location) : "",
    description: a.description != null ? String(a.description) : "",
    category: a.category != null ? String(a.category) : "",
    duration: Number(a.duration) || 1,
    difficulty: a.difficulty != null ? String(a.difficulty) : "",
    photos,
    itineraryDays,
  };
}

function normalizePlanTripGuide(raw: unknown): PlanTripGuideMatch | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const id = pickId(g);
  if (!id) return null;
  const similarActivity = normalizeSimilarActivity(g.similarActivity);
  return {
    id,
    username: g.username != null ? String(g.username) : "",
    name: g.name != null ? String(g.name) : "Guide",
    role: g.role != null ? String(g.role) : "",
    location: g.location != null ? String(g.location) : "",
    experience: g.experience != null ? String(g.experience) : "—",
    charge: g.charge != null && String(g.charge).trim() ? String(g.charge) : "Rate not set",
    chargeUsd: Number(g.chargeUsd) || 0,
    chargeNpr: Number(g.chargeNpr) || 0,
    usdToNprRate: Number(g.usdToNprRate) || 0,
    rating: g.rating != null ? String(g.rating) : "—",
    reviewCount: Number(g.reviewCount) || 0,
    image: g.image != null ? String(g.image) : "",
    description: g.description != null ? String(g.description) : "",
    matchLabel: g.matchLabel != null ? String(g.matchLabel) : "Related activity",
    matchScore: Number(g.matchScore) || 0,
    similarActivityLine:
      g.similarActivityLine != null
        ? String(g.similarActivityLine)
        : similarActivity.name,
    similarActivity,
  };
}

export async function fetchPlanTripGuides(params: {
  destination: string;
  interests: string;
  numberOfDays: number;
  itinerary?: ItineraryDay[];
  limit?: number;
}): Promise<PlanTripGuidesResponse> {
  const payload: Record<string, unknown> = {
    destination: params.destination.trim(),
    interests: params.interests.trim(),
    numberOfDays: params.numberOfDays,
  };
  if (params.itinerary?.length) {
    payload.itinerary = params.itinerary;
  }
  if (typeof params.limit === "number") {
    payload.limit = params.limit;
  }

  const res = await fetch(`${API_URL}/api/plan-trip/guides`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.msg || "Failed to load guides");
  }

  const guidesRaw: unknown[] = Array.isArray(data.guides) ? data.guides : [];
  const guides: PlanTripGuideMatch[] = [];
  for (const raw of guidesRaw) {
    const match = normalizePlanTripGuide(raw);
    if (match) guides.push(match);
  }

  return {
    destination: String(data.destination ?? params.destination),
    interests: String(data.interests ?? params.interests),
    numberOfDays: Number(data.numberOfDays ?? params.numberOfDays),
    count: Number(data.count ?? guides.length),
    guides,
  };
}
