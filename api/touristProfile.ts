import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";
import { uploadProfileAvatar } from "../utils/profileAvatarUpload";

export const TOURIST_INTERESTS = [
  "Adventure",
  "Food",
  "Photography",
  "Music",
  "Art",
  "Nature",
  "Hiking",
  "Architecture",
  "Culture",
  "Night Life",
  "Shopping",
  "Sports",
  "History",
  "Local Experiences",
  "Festivals",
] as const;

export type TouristProfileDto = {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  languages?: string[];
  interests?: string[];
};

export type UpdateTouristProfileBody = {
  fullName?: string;
  bio?: string;
  location?: string;
  languages?: string[];
  interests?: string[];
};

const HTML_HINT =
  "The server sent a webpage instead of JSON — check API_URL and that the backend is running.";

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) {
    throw new Error(HTML_HINT);
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid response from server (not JSON).");
  }
}

function mapTouristProfile(raw: unknown): TouristProfileDto {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid profile response");
  }
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? r._id ?? "").trim();
  if (!id) throw new Error("Invalid profile response");

  return {
    id,
    username: String(r.username ?? ""),
    fullName: String(r.fullName ?? r.username ?? ""),
    email: r.email != null ? String(r.email) : undefined,
    avatar: r.avatar != null ? String(r.avatar) : undefined,
    bio: r.bio != null ? String(r.bio) : undefined,
    location: r.location != null ? String(r.location) : undefined,
    languages: Array.isArray(r.languages)
      ? r.languages.map((x) => String(x).trim()).filter(Boolean)
      : undefined,
    interests: Array.isArray(r.interests)
      ? r.interests.map((x) => String(x).trim()).filter(Boolean)
      : undefined,
  };
}

function authHeaders(token: string, json = true): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export async function fetchTouristProfile(): Promise<TouristProfileDto> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const response = await fetch(`${API_URL}/api/tourist/profile`, {
    method: "GET",
    headers: authHeaders(token),
  });

  const data = await readJsonBody(response);
  if (!response.ok) {
    const err = new Error(
      typeof data.msg === "string" ? data.msg : "Failed to fetch profile"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const raw = data.tourist ?? data.user ?? data;
  return mapTouristProfile(raw);
}

export async function patchTouristProfile(
  body: UpdateTouristProfileBody
): Promise<{ msg: string; tourist: TouristProfileDto }> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const response = await fetch(`${API_URL}/api/tourist/profile`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });

  const data = await readJsonBody(response);
  if (!response.ok) {
    const err = new Error(
      typeof data.msg === "string" ? data.msg : "Failed to update profile"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return {
    msg: typeof data.msg === "string" ? data.msg : "Profile updated successfully",
    tourist: mapTouristProfile(data.tourist),
  };
}

export async function patchTouristProfileWithAvatar(
  updates: UpdateTouristProfileBody,
  imageUri: string,
  fileMeta?: { mimeType?: string; fileName?: string }
): Promise<{ msg: string; tourist: TouristProfileDto }> {
  const textResult = await patchTouristProfile(updates);

  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const picked = {
    uri: imageUri,
    mimeType: fileMeta?.mimeType || "image/jpeg",
    fileName: fileMeta?.fileName || "avatar.jpg",
  };

  const upload = await uploadProfileAvatar("tourist", token, picked);
  const tourist = mapTouristProfile(upload.data.tourist ?? textResult.tourist);

  return {
    msg: upload.msg || textResult.msg,
    tourist,
  };
}
