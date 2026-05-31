import type { BookingMilestoneFields } from "../api/bookingMilestone";

export const PLATFORM_COMMISSION_RATE = 0.15;

export function payoutTierLabel(tier: string | null | undefined): string {
  return tier === "verified" ? "Verified (40% / 60%)" : "Standard (20% / 80%)";
}

export function formatGuidePayoutStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "Released";
    case "partial":
      return "Start released";
    case "pending":
      return "Pending";
    default:
      return "Pending";
  }
}

export function mergeMilestoneFields<T extends Record<string, unknown>>(
  prev: T,
  patch: Partial<BookingMilestoneFields> & { id?: string; status?: string }
): T {
  return { ...prev, ...patch };
}

export function releaseAmountForBooking(booking: {
  guidePayoutStatus: string | null;
  guideFinalPayoutAmount?: number;
  guideEarning: number;
}): number {
  return booking.guidePayoutStatus === "partial"
    ? booking.guideFinalPayoutAmount ?? 0
    : booking.guideEarning;
}

export function releaseAmountLabel(guidePayoutStatus: string | null): string {
  return guidePayoutStatus === "partial" ? "final payout tranche" : "full guide payout";
}
