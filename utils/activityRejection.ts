/** Normalize expo-router search param (string | string[] | undefined). */
export function pickRouteParam(
  value: string | string[] | undefined
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

/** Extract a Mongo/API id string from common payload shapes. */
export function pickEntityId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.$oid === "string" && o.$oid.trim()) return o.$oid.trim();
    for (const key of ["id", "_id", "activityId"]) {
      const nested = o[key];
      if (nested == null) continue;
      const id = pickEntityId(nested);
      if (id) return id;
    }
  }
  const fallback = String(value).trim();
  return fallback === "[object Object]" ? "" : fallback;
}

/** Parse activity object from GET /api/activities/:id (nested or root). */
export function parseActivityFromResponse(
  data: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const raw = (data.activity ?? data) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return null;
  const id = pickEntityId(raw.id ?? raw._id);
  if (!id) return null;
  return { ...raw, id };
}

/** True when admin has not approved the activity (common backend status strings). */
export function isActivityRejectedStatus(status?: string | null): boolean {
  const normalized = (status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return (
    normalized === "rejected" ||
    normalized === "not_approved" ||
    normalized === "denied" ||
    normalized === "declined"
  );
}

/** Read rejection feedback from activity API payload (supports common field names). */
export function pickRejectionReason(
  raw: Record<string, unknown> | null | undefined
): string | null {
  if (!raw || typeof raw !== "object") return null;
  for (const key of ["rejectionReason", "rejection_reason", "reason", "rejectReason"]) {
    const value = raw[key];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return null;
}
