/**
 * Single place for guide star ratings: one decimal, consistent "N/A" when unknown.
 */

/** Prefer review average when the API sends it, else the guide’s overall rating. */
export function pickGuideListRatingSource(guide: {
  averageRating?: number | null;
  rating?: number | string | null;
}): number | string | null | undefined {
  const avg = guide?.averageRating;
  if (avg != null && Number.isFinite(Number(avg))) return Number(avg);
  const r = guide?.rating;
  if (r != null && r !== "") {
    const n = typeof r === "number" ? r : parseFloat(String(r).replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function formatGuideRatingDisplay(
  value: number | string | null | undefined
): string {
  if (value == null || value === "") return "N/A";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toFixed(1) : "N/A";
  }
  const s = String(value).trim();
  if (/^n\/?a$/i.test(s) || s === "—" || s === "-") return "N/A";
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n.toFixed(1) : "N/A";
}
