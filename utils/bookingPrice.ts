/** NPR total stored on booking (eSewa amount). */
export function bookingNprTotal(booking: { price: number; priceNpr?: number }): number {
  return booking.priceNpr ?? booking.price;
}

export function formatNprAmount(amount: number): string {
  return `NPR ${Math.round(amount).toLocaleString("en-US")}`;
}

/** Secondary line: USD reference for booking totals. */
export function formatBookingUsdLine(
  priceUsd: number | undefined,
  priceUsdApproximated?: boolean
): string | null {
  if (priceUsd == null || !Number.isFinite(priceUsd)) return null;
  const fixed = priceUsd.toFixed(2);
  if (priceUsdApproximated) {
    return `~$${fixed} USD (approx. for older booking)`;
  }
  return `$${fixed} USD`;
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
      usdSecondaryLine: `$${usd.toFixed(2)} USD`,
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

/** Guide tier: USD rate + NPR hint when API sends priceNpr. */
export function formatGuideTierCharge(p: {
  price: number;
  priceUsd?: number;
  priceNpr?: number;
  unit: string;
}): string {
  const unitRaw = (p.unit || "day").toLowerCase();
  const unitSuffix = unitRaw.includes("day") ? "/day" : `/${p.unit || "day"}`;
  const usd = p.priceUsd ?? p.price;
  if (p.priceNpr != null && Number.isFinite(p.priceNpr)) {
    return `$${usd}${unitSuffix} · NPR ${Math.round(p.priceNpr).toLocaleString("en-US")}`;
  }
  return `$${usd}${unitSuffix}`;
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
    return `$${usd}/day · NPR ${Math.round(npr).toLocaleString("en-US")}`;
  }
  if (usd != null) return `$${usd}/day`;
  return "$10/day";
}

export function estimateNprFromUsd(usdTotal: number, rate: number): number {
  return Math.round(usdTotal * rate);
}

/** Parse USD from guideCharge like "$50/day" or "$50/day · NPR 6,750". */
export function parseUsdFromGuideChargeString(charge: string): number {
  const m = charge.match(/\$\s*([\d,]+\.?\d*)/);
  if (m) return parseFloat(m[1].replace(/,/g, "")) || 0;
  const digits = charge.replace(/[^\d.]/g, "");
  return parseFloat(digits) || 0;
}
