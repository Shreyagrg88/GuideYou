import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";
import type { PickedProfileImage } from "../utils/profileImagePicker";
import { uploadProfileAvatar } from "../utils/profileAvatarUpload";

export type GuideProfileDto = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatar?: string;
  bio?: string;
  mainExpertise?: string;
  location?: string;
  expertise?: string[];
  yearsOfExperience?: number;
  languages?: string[];
};

export type UpdateGuideProfileBody = {
  fullName?: string;
  bio?: string;
  mainExpertise?: string;
  location?: string;
  yearsOfExperience?: number;
  languages?: string[];
};

const HTML_HINT =
  "The server sent a webpage instead of JSON — check API_URL and that the backend is running.";

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) throw new Error(HTML_HINT);
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid response from server (not JSON).");
  }
}

function mapGuideProfile(raw: unknown): GuideProfileDto {
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
    email: String(r.email ?? ""),
    avatar: r.avatar != null ? String(r.avatar) : undefined,
    bio: r.bio != null ? String(r.bio) : undefined,
    mainExpertise: r.mainExpertise != null ? String(r.mainExpertise) : undefined,
    location: r.location != null ? String(r.location) : undefined,
    expertise: Array.isArray(r.expertise)
      ? r.expertise.map((x) => String(x).trim()).filter(Boolean)
      : undefined,
    yearsOfExperience:
      r.yearsOfExperience != null && !Number.isNaN(Number(r.yearsOfExperience))
        ? Number(r.yearsOfExperience)
        : undefined,
    languages: Array.isArray(r.languages)
      ? r.languages.map((x) => String(x).trim()).filter(Boolean)
      : undefined,
  };
}

async function authToken(): Promise<string> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");
  return token;
}

export async function fetchGuideProfile(): Promise<GuideProfileDto> {
  const token = await authToken();
  const response = await fetch(`${API_URL}/api/guide/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await readJsonBody(response);
  if (!response.ok) {
    const err = new Error(
      typeof data.msg === "string" ? data.msg : "Failed to fetch profile"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return mapGuideProfile(data.guide);
}

export async function patchGuideProfile(
  body: UpdateGuideProfileBody
): Promise<{ msg: string; guide: GuideProfileDto }> {
  const token = await authToken();
  const response = await fetch(`${API_URL}/api/guide/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
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
    guide: mapGuideProfile(data.guide),
  };
}

export async function saveGuideProfile(
  body: UpdateGuideProfileBody,
  pickedAvatar?: PickedProfileImage | null
): Promise<{ msg: string; guide: GuideProfileDto }> {
  const token = await authToken();

  const textResult = await patchGuideProfile(body);

  if (!pickedAvatar) {
    return textResult;
  }

  const upload = await uploadProfileAvatar("guide", token, pickedAvatar);
  const guide = mapGuideProfile(upload.data.guide ?? textResult.guide);

  return {
    msg: upload.msg || textResult.msg,
    guide,
  };
}
