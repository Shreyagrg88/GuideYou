import { API_URL } from "../constants/api";

const PLACEHOLDER_AVATAR_MARKERS = [
  "photo-1544005313-94ddf0286df2",
  "i.pravatar.cc",
  "unsplash.com/photo-",
  "default-avatar",
  "default_avatar",
  "placeholder",
] as const;

/** True when URL is a known stock / placeholder avatar, not a real user upload. */
export function isPlaceholderAvatarUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  const lower = url.trim().toLowerCase();
  return PLACEHOLDER_AVATAR_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * Returns a displayable avatar URI, or null when unset / placeholder.
 * Relative paths are prefixed with API_URL.
 */
export function resolveAvatarUri(
  raw: string | null | undefined,
  baseUrl: string = API_URL
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || isPlaceholderAvatarUrl(trimmed)) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return isPlaceholderAvatarUrl(trimmed) ? null : trimmed;
  }

  const full = `${baseUrl.replace(/\/$/, "")}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  return isPlaceholderAvatarUrl(full) ? null : full;
}

/** Resolve any uploaded media path; null when missing or a known stock URL. */
export const resolveMediaUri = resolveAvatarUri;
