import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type AvailableGuideThisWeek = {
  id: string;
  name: string;
  fullName?: string;
  username?: string;
  mainExpertise?: string;
  expertise?: string[];
  role?: string;
  location?: string;
  avatar?: string | null;
  image?: string | null;
  verified?: boolean;
  averageRating?: number | null;
  rating?: string | number | null;
  reviewCount?: number;
  freeDateKeys: string[];
  availabilityLabel: string;
};

export type AvailableGuidesThisWeekResponse = {
  count: number;
  windowDays: number;
  timezone: string;
  windowStart: string | null;
  windowEnd: string | null;
  guides: AvailableGuideThisWeek[];
};

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) {
    throw new Error("Server returned HTML instead of JSON. Check API_URL.");
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON from server.");
  }
}

function mapGuide(raw: unknown): AvailableGuideThisWeek | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? r._id ?? "").trim();
  if (!id) return null;

  const freeDateKeys = Array.isArray(r.freeDateKeys)
    ? r.freeDateKeys.map((k) => String(k).slice(0, 10)).filter(Boolean)
    : [];

  const expertise = Array.isArray(r.expertise)
    ? r.expertise.map((x) => String(x).trim()).filter(Boolean)
    : undefined;

  const name =
    String(r.name ?? r.fullName ?? r.username ?? "Guide").trim() || "Guide";

  return {
    id,
    name,
    fullName: r.fullName != null ? String(r.fullName) : undefined,
    username: r.username != null ? String(r.username) : undefined,
    mainExpertise: r.mainExpertise != null ? String(r.mainExpertise) : undefined,
    expertise,
    role: r.role != null ? String(r.role) : undefined,
    location: r.location != null ? String(r.location) : undefined,
    avatar: r.avatar != null ? String(r.avatar) : null,
    image: r.image != null ? String(r.image) : null,
    verified: r.verified === true || r.verified === "true",
    averageRating:
      r.averageRating == null
        ? null
        : typeof r.averageRating === "number"
          ? r.averageRating
          : Number(r.averageRating),
    rating: r.rating as string | number | null | undefined,
    reviewCount:
      typeof r.reviewCount === "number"
        ? r.reviewCount
        : r.reviewCount != null
          ? Number(r.reviewCount)
          : undefined,
    freeDateKeys,
    availabilityLabel: String(r.availabilityLabel ?? "").trim(),
  };
}

export async function fetchAvailableGuidesThisWeek(params?: {
  days?: number;
  limit?: number;
}): Promise<AvailableGuidesThisWeekResponse> {
  const token = await AsyncStorage.getItem("token");
  const q = new URLSearchParams();
  const days = params?.days ?? 7;
  const limit = params?.limit ?? 30;
  q.set("days", String(Math.min(14, Math.max(1, days))));
  q.set("limit", String(Math.min(50, Math.max(1, limit))));

  const url = `${API_URL}/api/tourist/guides/available-this-week?${q.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await readJsonBody(response);
  if (!response.ok) {
    throw new Error(typeof data.msg === "string" ? data.msg : "Failed to load available guides");
  }

  const rawList = Array.isArray(data.guides) ? data.guides : [];
  const guides = rawList
    .map(mapGuide)
    .filter((g): g is AvailableGuideThisWeek => g != null);

  return {
    count: typeof data.count === "number" ? data.count : guides.length,
    windowDays: typeof data.windowDays === "number" ? data.windowDays : days,
    timezone: typeof data.timezone === "string" ? data.timezone : "Asia/Kathmandu",
    windowStart: typeof data.windowStart === "string" ? data.windowStart : null,
    windowEnd: typeof data.windowEnd === "string" ? data.windowEnd : null,
    guides,
  };
}
