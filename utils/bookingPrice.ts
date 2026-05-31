export const DEFAULT_USD_TO_NPR = 135;

/** NPR total stored on booking (eSewa amount). */
export function bookingNprTotal(booking: { price: number; priceNpr?: number }): number {
  return booking.priceNpr ?? booking.price;
}

export function formatNprAmount(amount: number): string {
  return `NPR ${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatUsdAmount(
  amount: number,
  options?: { approx?: boolean; decimals?: number | "auto" }
): string {
  if (!Number.isFinite(amount)) return "$0 USD";
  let decimals = 0;
  if (options?.decimals === "auto") {
    decimals = Number.isInteger(amount) ? 0 : 2;
  } else if (typeof options?.decimals === "number") {
    decimals = options.decimals;
  } else {
    decimals = Number.isInteger(amount) ? 0 : 2;
  }
  const prefix = options?.approx ? "~" : "";
  return `${prefix}$${amount.toFixed(decimals)} USD`;
}

export function formatUsdPerPersonDay(usd: number): string {
  return `$${Math.round(usd)} USD/person/day`;
}

export function formatNprPerPersonDay(npr: number): string {
  return `NPR ${Math.round(npr).toLocaleString("en-US")}/person/day`;
}

/** Profile / booking card: daily rate in USD and NPR. */
export function formatDailyRateOnCard(
  usdPerPersonDay: number,
  usdToNprRate: number = DEFAULT_USD_TO_NPR
): string {
  if (usdPerPersonDay <= 0) return "";
  const npr = estimateNprFromUsd(usdPerPersonDay, usdToNprRate);
  return `${formatUsdPerPersonDay(usdPerPersonDay)} · ${formatNprPerPersonDay(npr)}`;
}

/** Bottom bar subtext for booking / custom-tour estimates. */
export function formatBookingEstimateBreakdown(opts: {
  participants: number;
  days: number;
  usdPerPersonDay: number;
  usdTotal: number;
  finalNote?: string;
}): string {
  const { participants, days, usdPerPersonDay, usdTotal, finalNote } = opts;
  const dayLabel = days === 1 ? "day" : "days";
  let line =
    usdPerPersonDay > 0
      ? `${participants} people × ${days} ${dayLabel} × ${formatUsdPerPersonDay(usdPerPersonDay)} = ${formatUsdAmount(usdTotal)}`
      : formatUsdAmount(usdTotal);
  if (finalNote) line += ` · ${finalNote}`;
  return line;
}

export type BookingPriceLines = {
  nprPrimary: string;
  usdSecondary: string | null;
};

export function formatBookingPriceLines(
  booking: Parameters<typeof resolveEsewaBookingDisplay>[0]
): BookingPriceLines {
  const d = resolveEsewaBookingDisplay(booking);
  return {
    nprPrimary: formatNprAmount(d.nprDisplay),
    usdSecondary: d.usdSecondaryLine,
  };
}

/** Step-2 summary block (custom tour / booking review). */
export function formatBookingSummaryPricing(opts: {
  nprTotal: number;
  usdTotal: number;
  usdPerPersonDay: number;
  participants: number;
  days: number;
  usdToNprRate: number;
}): { rateLine: string; totalLine: string; breakdownLine: string } {
  const nprPerDay = estimateNprFromUsd(opts.usdPerPersonDay, opts.usdToNprRate);
  return {
    rateLine: `${formatUsdPerPersonDay(opts.usdPerPersonDay)} · ${formatNprPerPersonDay(nprPerDay)}`,
    totalLine: `${formatNprAmount(opts.nprTotal)} · ${formatUsdAmount(opts.usdTotal, { approx: true })} est.`,
    breakdownLine: formatBookingEstimateBreakdown({
      participants: opts.participants,
      days: opts.days,
      usdPerPersonDay: opts.usdPerPersonDay,
      usdTotal: opts.usdTotal,
    }),
  };
}

/** Secondary line: USD reference for booking totals. */
export function formatBookingUsdLine(
  priceUsd: number | undefined,
  priceUsdApproximated?: boolean
): string | null {
  if (priceUsd == null || !Number.isFinite(priceUsd)) return null;
  if (priceUsdApproximated) {
    return `${formatUsdAmount(priceUsd, { approx: true, decimals: 2 })} (approx. for older booking)`;
  }
  return formatUsdAmount(priceUsd, { decimals: 2 });
}

/**
 * Some legacy rows stored the guide’s **USD** amount in `price` while newer APIs treat `price` as NPR.
 * When the server approximates USD by dividing `price` by the FX rate, $15/day becomes ~$0.11
 * (15 ÷ 135). We detect that pattern so the pay screen matches the guide profile.
 *
 * The backend may still sign eSewa with the raw stored `price` until that row is migrated — use
 * `legacyUsdInPriceField` to warn in the UI.
 */
export function resolveEsewaBookingDisplay(booking: {
  price: number;
  priceNpr?: number;
  priceUsd?: number;
  priceUsdApproximated?: boolean;
  usdToNprRate?: number;
}): {
  nprDisplay: number;
  usdSecondaryLine: string | null;
  legacyUsdInPriceField: boolean;
  /** Raw `price` from API (what older servers may still send to eSewa). */
  storedRawPrice: number;
} {
  const rate =
    typeof booking.usdToNprRate === "number" && booking.usdToNprRate > 0
      ? booking.usdToNprRate
      : 135;

  const storedNpr = booking.priceNpr ?? booking.price;

  const likelyLegacyUsd =
    booking.priceNpr == null &&
    booking.priceUsdApproximated === true &&
    booking.priceUsd != null &&
    Number.isFinite(booking.priceUsd) &&
    booking.priceUsd <= 0.2 &&
    booking.price >= 5 &&
    booking.price <= 500;

  if (likelyLegacyUsd) {
    const usd = booking.price;
    return {
      nprDisplay: Math.round(usd * rate),
      usdSecondaryLine: formatUsdAmount(usd, { decimals: 2 }),
      legacyUsdInPriceField: true,
      storedRawPrice: booking.price,
    };
  }

  return {
    nprDisplay: storedNpr,
    usdSecondaryLine: formatBookingUsdLine(booking.priceUsd, booking.priceUsdApproximated),
    legacyUsdInPriceField: false,
    storedRawPrice: booking.price,
  };
}

/** Shown next to USD amount so totals (people × days × rate) are understood. */
const PERSON_UNIT_SUFFIX = (unit: string): string => {
  const u = (unit || "day").trim().toLowerCase();
  if (u.includes("day")) return "/person/day";
  return `/person/${unit || "day"}`;
};

/** Guide tier: USD rate + NPR hint when API sends priceNpr. */
export function formatGuideTierCharge(p: {
  price: number;
  priceUsd?: number;
  priceNpr?: number;
  unit: string;
}): string {
  const unitSuffix = PERSON_UNIT_SUFFIX(p.unit || "day");
  const usd = p.priceUsd ?? p.price;
  if (p.priceNpr != null && Number.isFinite(p.priceNpr)) {
    return `$${usd} USD${unitSuffix} · NPR ${Math.round(p.priceNpr).toLocaleString("en-US")}${unitSuffix}`;
  }
  return `$${usd} USD${unitSuffix}`;
}

export type GuideProfileRateLines = { usdLine: string; nprLine: string | null };

/**
 * Two-line rate for narrow UI (e.g. profile stat column): USD with unit on first line;
 * NPR on second line without repeating /person/day to reduce clutter.
 */
export function formatGuideProfileRateLines(
  tier:
    | {
        price: number;
        priceUsd?: number;
        priceNpr?: number;
        unit: string;
      }
    | null
    | undefined,
  fallbackCharge?: string
): GuideProfileRateLines {
  if (tier != null && tier.price != null && Number.isFinite(Number(tier.price))) {
    const usd = tier.priceUsd ?? tier.price;
    const unitSuffix = PERSON_UNIT_SUFFIX(tier.unit || "day");
    const usdLine = `$${usd} USD${unitSuffix}`;
    const nprLine =
      tier.priceNpr != null && Number.isFinite(tier.priceNpr)
        ? `NPR ${Math.round(tier.priceNpr).toLocaleString("en-US")}`
        : null;
    return { usdLine, nprLine };
  }

  const fb = (fallbackCharge || "").trim();
  if (fb) {
    const parts = fb.split(/\s*·\s*/);
    if (parts.length >= 2) {
      const nprRaw = parts[1].trim().replace(/\/person\/day$/i, "").trim();
      return { usdLine: parts[0].trim(), nprLine: nprRaw || null };
    }
    return { usdLine: fb, nprLine: null };
  }

  return { usdLine: "Not set", nprLine: null };
}

/** Homepage / search guide card charge string. */
export function formatGuideListCharge(g: {
  charge?: string;
  chargeUsd?: number;
  chargeNpr?: number;
  rate?: number;
}): string {
  if (typeof g.charge === "string" && g.charge.trim().length > 0) {
    return g.charge.trim();
  }
  const usd = g.chargeUsd ?? g.rate;
  const npr = g.chargeNpr;
  if (usd != null && npr != null && Number.isFinite(usd) && Number.isFinite(npr)) {
    return `$${usd} USD/person/day · NPR ${Math.round(npr).toLocaleString("en-US")}/person/day`;
  }
  if (usd != null) return `$${usd} USD/person/day`;
  return "Rate not set";
}

export function estimateNprFromUsd(usdTotal: number, rate: number): number {
  return Math.round(usdTotal * rate);
}

/** Parse USD from guideCharge like "$50/person/day" or legacy "$50/day · NPR …". */
export function parseUsdFromGuideChargeString(charge: string): number {
  const m = charge.match(/\$\s*([\d,]+\.?\d*)/);
  if (m) return parseFloat(m[1].replace(/,/g, "")) || 0;
  const digits = charge.replace(/[^\d.]/g, "");
  return parseFloat(digits) || 0;
}
