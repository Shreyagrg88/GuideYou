import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { API_URL } from "../constants/api";
import type { PickedProfileImage } from "./profileImagePicker";

export type ProfileUploadRole = "guide" | "tourist";

async function ensureLocalFileUri(uri: string, fileName: string): Promise<string> {
  let normalized = uri;
  if (
    Platform.OS === "android" &&
    !normalized.startsWith("file://") &&
    normalized.startsWith("/")
  ) {
    normalized = `file://${normalized}`;
  }

  if (normalized.startsWith("file://")) {
    const info = await FileSystem.getInfoAsync(normalized);
    if (info.exists) return normalized;
  }

  const ext = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  const dest = `${FileSystem.cacheDirectory}profile_upload_${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

function parseUploadResponse(result: FileSystem.FileSystemUploadResult): Record<string, unknown> {
  const body = result.body?.trim() || "{}";
  if (body.startsWith("<")) {
    throw new Error("Server sent HTML instead of JSON — check API_URL.");
  }
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid response from server (not JSON).");
  }
}

/**
 * Multipart profile photo upload via expo-file-system (more reliable than fetch + FormData on iOS).
 */
export async function uploadProfileAvatar(
  role: ProfileUploadRole,
  token: string,
  picked: PickedProfileImage,
  extraFields: Record<string, string> = {}
): Promise<{ msg: string; data: Record<string, unknown>; status: number }> {
  const fileUri = await ensureLocalFileUri(picked.uri, picked.fileName);
  const url = `${API_URL}/api/${role}/profile`;

  const runUpload = (method: "POST" | "PATCH") =>
    FileSystem.uploadAsync(url, fileUri, {
      httpMethod: method,
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "avatar",
      mimeType: picked.mimeType || "image/jpeg",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      parameters: extraFields,
    });

  let result = await runUpload("POST");
  if (result.status === 404 || result.status === 405) {
    result = await runUpload("PATCH");
  }

  const data = parseUploadResponse(result);
  if (result.status < 200 || result.status >= 300) {
    const err = new Error(
      typeof data.msg === "string" ? data.msg : "Failed to upload profile photo"
    ) as Error & { status?: number };
    err.status = result.status;
    throw err;
  }

  return {
    msg: typeof data.msg === "string" ? data.msg : "Profile photo updated",
    data,
    status: result.status,
  };
}
