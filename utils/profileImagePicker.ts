import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export type PickedProfileImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

/** @deprecated alias — use launchProfileImagePicker */
export async function pickProfileImageFromLibrary(): Promise<
  PickedProfileImage | "denied" | null
> {
  return launchProfileImagePicker();
}

export async function launchProfileImagePicker(): Promise<PickedProfileImage | "denied" | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return "denied";
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  const uri = normalizeUploadUri(asset.uri);
  const fileName =
    asset.fileName ||
    uri.split("/").pop()?.split("?")[0] ||
    `avatar_${Date.now()}.jpg`;

  return {
    uri,
    mimeType: asset.mimeType || guessMimeType(fileName),
    fileName: fileName.includes(".") ? fileName : `${fileName}.jpg`,
  };
}

function normalizeUploadUri(uri: string): string {
  if (!uri) return uri;
  if (Platform.OS === "ios" && uri.startsWith("file://")) {
    return uri;
  }
  if (Platform.OS === "android" && !uri.startsWith("file://") && uri.startsWith("/")) {
    return `file://${uri}`;
  }
  return uri;
}

function guessMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

export function toFormDataFilePart(picked: PickedProfileImage): {
  uri: string;
  name: string;
  type: string;
} {
  return {
    uri: picked.uri,
    name: picked.fileName,
    type: picked.mimeType,
  };
}
