/**
 * Normalizes API `itineraryDays` into a fixed-length array of day summaries (strings).
 * Supports:
 * - `string[]` (index 0 = Day 1)
 * - `{ day: number; summary: string }[]` (1-based `day`)
 * - Legacy JSON string of either shape
 */
export const ITINERARY_DAY_MAX_CHARS = 8000;

export function normalizeItineraryDaysFromApi(
  raw: unknown,
  dayCount: number
): string[] {
  const base = Array.from({ length: dayCount }, () => "");
  if (raw == null || dayCount < 1) return base;

  if (Array.isArray(raw)) {
    if (raw.length === 0) return base;
    const first = raw[0];
    const isObjectDay =
      first !== null &&
      typeof first === "object" &&
      !Array.isArray(first) &&
      ("summary" in first || "day" in first);

    if (isObjectDay) {
      const byDay = new Map<number, string>();
      for (const item of raw) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const rec = item as { day?: unknown; summary?: unknown };
        const d =
          typeof rec.day === "number" ? rec.day : Number(rec.day);
        if (!Number.isFinite(d) || d < 1 || d > dayCount) continue;
        const s = rec.summary;
        byDay.set(Math.floor(d), s == null ? "" : String(s));
      }
      for (let i = 0; i < dayCount; i++) {
        base[i] = byDay.get(i + 1) ?? "";
      }
      return base;
    }

    for (let i = 0; i < dayCount; i++) {
      const v = raw[i];
      base[i] = v == null ? "" : String(v);
    }
    return base;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizeItineraryDaysFromApi(parsed, dayCount);
    } catch {
      return base;
    }
  }

  return base;
}
