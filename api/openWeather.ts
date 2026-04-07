const GEO_BASE = "https://api.openweathermap.org/geo/1.0";
const DATA_BASE = "https://api.openweathermap.org/data/2.5";
/** OpenWeather `dt` is UTC; display slots in Nepal Standard Time (UTC+5:45). */
const NEPAL_TIMEZONE = "Asia/Kathmandu";

function formatTimeNepal12h(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("en-US", {
    timeZone: NEPAL_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export type HourlyItem = {
  key: string;
  label: string;
  temp: number;
  iconCode: string;
};

export type WeatherState = {
  locationLabel: string;
  temp: number;
  feelsLike: number;
  description: string;
  iconCode: string;
  hourly: HourlyItem[];
};

export type WeatherFetchResult =
  | { ok: true; data: WeatherState }
  | { ok: false; code: "missing_key" }
  | { ok: false; code: "location_not_found"; query: string }
  | { ok: false; code: "api_error"; message: string };

function titleCaseDescription(raw: string): string {
  if (!raw) return "";
  return raw
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/**
 * OpenWeather key from project root `.env`: EXPO_PUBLIC_OPENWEATHER_API_KEY=your_key
 * (file is gitignored). Restart Expo after changing env.
 */
export function getOpenWeatherApiKey(): string {
  return process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim() ?? "";
}

type GeoHit = { lat: number; lon: number; name: string; country?: string };

async function geocode(query: string, apiKey: string): Promise<GeoHit | null> {
  const t = query.trim();
  if (t.length < 2) return null;
  const q = encodeURIComponent(t);
  const res = await fetch(`${GEO_BASE}/direct?q=${q}&limit=1&appid=${apiKey}`);
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 || res.status === 403) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : "Invalid OpenWeather API key — check EXPO_PUBLIC_OPENWEATHER_API_KEY";
    throw new Error(msg);
  }

  if (!res.ok) {
    const rawMsg = typeof data.message === "string" ? data.message : "";
    const lower = rawMsg.toLowerCase();
    // OpenWeather often returns 404 + "not found" for unknown q — must NOT throw
    // or we never try simpler fallback strings (e.g. Kathmandu, Nepal).
    if (res.status === 404 || res.status === 400 || lower.includes("not found")) {
      return null;
    }
    throw new Error(rawMsg || `Geocoding failed (${res.status})`);
  }

  if (!Array.isArray(data) || data.length === 0) return null;
  const p = data[0];
  if (typeof p.lat !== "number" || typeof p.lon !== "number") return null;
  return {
    lat: p.lat,
    lon: p.lon,
    name: String(p.name ?? ""),
    country: p.country != null ? String(p.country) : "",
  };
}

/** Strip municipal ward suffixes e.g. Kathmandu-08 → Kathmandu */
function stripWardCode(segment: string): string {
  return segment.replace(/\b([A-Za-zÀ-ÿ]+)-\d+\b/g, "$1").trim();
}

/**
 * Build search strings for OpenWeather geocoding: full address, comma parts,
 * ward-normalized forms, and Nepal city fallbacks when the text hints at them.
 */
function geoSearchCandidates(raw: string): string[] {
  const trimmed = (raw || "").trim();
  const out: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (t.length >= 2 && !out.includes(t)) out.push(t);
  };

  push(trimmed || "Kathmandu, Nepal");

  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  for (const p of parts) {
    push(p);
    push(stripWardCode(p));
  }

  push(stripWardCode(trimmed));

  const latinPart = parts.find(
    (p) => /[A-Za-z]{3,}/.test(p) && !/[\u0900-\u097F]/.test(p)
  );
  if (latinPart) {
    const city = stripWardCode(latinPart);
    push(city);
    push(`${city}, Nepal`);
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("kathmandu") || /काठमाडौं/.test(trimmed)) {
    push("Kathmandu, Nepal");
    push("Kathmandu");
  }
  if (lower.includes("pokhara") || /पोखरा/.test(trimmed)) {
    push("Pokhara, Nepal");
    push("Pokhara");
  }
  if (lower.includes("lalitpur")) {
    push("Lalitpur, Nepal");
    push("Lalitpur");
  }
  if (lower.includes("bhaktapur")) {
    push("Bhaktapur, Nepal");
    push("Bhaktapur");
  }

  const head: string[] = [];
  if (lower.includes("pashupatinath")) {
    head.push("Kathmandu, Nepal", "Kathmandu");
  }
  const merged = [...head, ...out];
  return merged.filter((x, i) => merged.indexOf(x) === i);
}

type CurrentJson = {
  main?: { temp?: number; feels_like?: number };
  weather?: { icon?: string; description?: string }[];
  coord?: { lat?: number; lon?: number };
  message?: string;
};

/**
 * 2.5 /weather?q=… often resolves messy activity addresses when /geo/1.0/direct returns 404.
 */
async function currentWeatherByQuery(
  query: string,
  apiKey: string
): Promise<{ lat: number; lon: number; curJson: CurrentJson } | null> {
  const t = query.trim();
  if (t.length < 2) return null;
  const q = encodeURIComponent(t);
  const res = await fetch(`${DATA_BASE}/weather?q=${q}&appid=${apiKey}&units=metric`);
  const curJson = (await res.json().catch(() => ({}))) as CurrentJson;

  if (res.status === 401 || res.status === 403) {
    const msg =
      typeof curJson.message === "string"
        ? curJson.message
        : "Invalid OpenWeather API key — check EXPO_PUBLIC_OPENWEATHER_API_KEY";
    throw new Error(msg);
  }

  if (!res.ok) {
    const m = String(curJson.message ?? "").toLowerCase();
    if (res.status === 404 || res.status === 400 || m.includes("not found")) {
      return null;
    }
    return null;
  }

  const lat = curJson.coord?.lat;
  const lon = curJson.coord?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { lat, lon, curJson };
}

type ResolveResult = { lat: number; lon: number; geo?: GeoHit; curJson?: CurrentJson };

async function resolveLocationForWeather(
  locationQuery: string,
  apiKey: string
): Promise<ResolveResult | null> {
  const trimmed = locationQuery.trim();
  const candidates = geoSearchCandidates(trimmed);

  for (const c of candidates) {
    const hit = await geocode(c, apiKey);
    if (hit) return { lat: hit.lat, lon: hit.lon, geo: hit };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 2) {
    const hit2 = await geocode(words.slice(0, 2).join(" "), apiKey);
    if (hit2) return { lat: hit2.lat, lon: hit2.lon, geo: hit2 };
    const hit3 = await geocode(words.slice(0, 3).join(" "), apiKey);
    if (hit3) return { lat: hit3.lat, lon: hit3.lon, geo: hit3 };
  }

  for (const c of candidates) {
    const byName = await currentWeatherByQuery(c, apiKey);
    if (byName) return { lat: byName.lat, lon: byName.lon, curJson: byName.curJson };
  }

  if (words.length > 2) {
    const by2 = await currentWeatherByQuery(words.slice(0, 2).join(" "), apiKey);
    if (by2) return { lat: by2.lat, lon: by2.lon, curJson: by2.curJson };
    const by3 = await currentWeatherByQuery(words.slice(0, 3).join(" "), apiKey);
    if (by3) return { lat: by3.lat, lon: by3.lon, curJson: by3.curJson };
  }

  return null;
}

export async function fetchWeatherForLocation(
  locationQuery: string,
  apiKey: string
): Promise<WeatherFetchResult> {
  if (!apiKey) return { ok: false, code: "missing_key" };

  let resolved: ResolveResult | null;
  try {
    resolved = await resolveLocationForWeather(locationQuery, apiKey);
  } catch (e) {
    return {
      ok: false,
      code: "api_error",
      message: e instanceof Error ? e.message : "Could not look up location",
    };
  }

  if (!resolved) {
    return { ok: false, code: "location_not_found", query: locationQuery.trim() || locationQuery };
  }

  const { lat, lon, geo, curJson: curFromName } = resolved;

  try {
    let curJson: CurrentJson;
    let foreRes: Response;

    if (curFromName) {
      curJson = curFromName;
      foreRes = await fetch(
        `${DATA_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
      );
    } else {
      const [curRes, fr] = await Promise.all([
        fetch(`${DATA_BASE}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
        fetch(`${DATA_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
      ]);
      foreRes = fr;
      curJson = (await curRes.json().catch(() => ({}))) as CurrentJson;
      if (!curRes.ok) {
        const msg =
          typeof curJson.message === "string"
            ? curJson.message
            : `Weather request failed (${curRes.status})`;
        return { ok: false, code: "api_error", message: msg };
      }
    }

    const iconCode = curJson.weather?.[0]?.icon ?? "02d";
    const description = titleCaseDescription(curJson.weather?.[0]?.description ?? "");

    const hourly: HourlyItem[] = [];
    if (foreRes.ok) {
      const foreJson = await foreRes.json().catch(() => ({}));
      const list = foreJson.list as
        | Array<{ dt: number; main: { temp: number }; weather: { icon: string }[] }>
        | undefined;
      if (Array.isArray(list)) {
        list.slice(0, 8).forEach((item, i) => {
          const t = Math.round(item.main?.temp ?? curJson.main?.temp ?? 0);
          const ic = item.weather?.[0]?.icon ?? iconCode;
          const dt = item.dt * 1000;
          const label = i === 0 ? "Now" : formatTimeNepal12h(dt);
          hourly.push({ key: `f-${item.dt}-${i}`, label, temp: t, iconCode: ic });
        });
      }
    }

    if (hourly.length === 0) {
      hourly.push({
        key: "now",
        label: "Now",
        temp: Math.round(curJson.main?.temp ?? 0),
        iconCode,
      });
    }

    const resolvedLabel =
      geo?.name && geo?.country
        ? `${geo.name}, ${geo.country}`
        : geo?.name || locationQuery.trim();

    return {
      ok: true,
      data: {
        locationLabel: resolvedLabel,
        temp: Math.round(curJson.main?.temp ?? 0),
        feelsLike: Math.round(curJson.main?.feels_like ?? curJson.main?.temp ?? 0),
        description: description || "—",
        iconCode,
        hourly,
      },
    };
  } catch (e) {
    return {
      ok: false,
      code: "api_error",
      message: e instanceof Error ? e.message : "Network error",
    };
  }
}
