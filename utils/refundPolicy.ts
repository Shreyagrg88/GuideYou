/** Refund tier logic aligned with server policy `2026-05` (Asia/Kathmandu calendar days). */

import { formatNprAmount } from "./bookingPrice";

export const REFUND_POLICY_TIMEZONE = "Asia/Kathmandu";

export function nepalDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: REFUND_POLICY_TIMEZONE }).format(d);
}

export function startDateKey(startDate: string): string {
  return startDate.slice(0, 10);
}

export function daysUntilStartFromNepal(startDate: string): number {
  const start = startDateKey(startDate);
  const today = nepalDateKey();
  const startMs = Date.parse(`${start}T00:00:00`);
  const todayMs = Date.parse(`${today}T00:00:00`);
  return Math.round((startMs - todayMs) / 86400000);
}

export type RefundPreview = {
  refundPercent: number;
  refundAmount: number;
  policyKey: string;
  daysUntilStart: number;
};

export function computeRefundPreview(priceNpr: number, startDate: string): RefundPreview {
  const days = daysUntilStartFromNepal(startDate);
  const price = Math.round(priceNpr);
  if (days >= 7) {
    return { refundPercent: 100, refundAmount: price, policyKey: "full_7_plus", daysUntilStart: days };
  }
  if (days >= 3) {
    return {
      refundPercent: 50,
      refundAmount: Math.round(price * 0.5),
      policyKey: "partial_3_6",
      daysUntilStart: days,
    };
  }
  if (days >= 1) {
    return { refundPercent: 0, refundAmount: 0, policyKey: "none_1_2", daysUntilStart: days };
  }
  return { refundPercent: 0, refundAmount: 0, policyKey: "none_0", daysUntilStart: days };
}

export function isPaidBookingForRefund(booking: {
  status: string;
  paymentStatus?: string | null;
  paidAt?: string | null;
}): boolean {
  if (booking.status === "paid") return true;
  if (booking.paymentStatus === "completed") return true;
  if (booking.paidAt) return true;
  return false;
}

function refundPolicyHumanLabel(policyKey: string): string {
  switch (policyKey) {
    case "full_7_plus":
      return "7+ days before tour";
    case "partial_3_6":
      return "3–6 days before tour";
    case "none_1_2":
      return "Within 2 days of tour";
    case "none_0":
      return "Tour day or later";
    default:
      return "";
  }
}

export function buildCancelConfirmDialog(
  isPaid: boolean,
  priceNpr: number,
  startDate: string
): { title: string; message: string; confirmLabel: string } {
  if (!isPaid) {
    return {
      title: "Cancel booking?",
      message: "Are you sure you want to cancel this booking?",
      confirmLabel: "Yes, cancel",
    };
  }

  const preview = computeRefundPreview(priceNpr, startDate);
  const paidAmount = Math.round(priceNpr);
  const kept = Math.max(0, paidAmount - preview.refundAmount);
  const policyLabel = refundPolicyHumanLabel(preview.policyKey);
  const intro = "Are you sure you want to cancel this booking?";

  if (preview.refundPercent === 100) {
    return {
      title: "Cancel booking?",
      message: `${intro}

Amount paid: ${formatNprAmount(paidAmount)}
Refund: ${formatNprAmount(preview.refundAmount)} (100%)
Policy: ${policyLabel}

Your refund will be processed manually within 5–7 business days to your saved eSewa or bank details.`,
      confirmLabel: "Yes, cancel",
    };
  }

  if (preview.refundPercent === 50) {
    return {
      title: "Cancel booking?",
      message: `${intro}

Amount paid: ${formatNprAmount(paidAmount)}
Refund: ${formatNprAmount(preview.refundAmount)} (50%)
Non-refundable: ${formatNprAmount(kept)}
Policy: ${policyLabel}

Your refund will be processed manually within 5–7 business days to your saved eSewa or bank details.`,
      confirmLabel: "Yes, cancel",
    };
  }

  return {
    title: "Cancel without refund?",
    message: `${intro}

Amount paid: ${formatNprAmount(paidAmount)}
Refund: ${formatNprAmount(0)} — no refund applies
Policy: ${policyLabel} (tour starts in ${preview.daysUntilStart} day${preview.daysUntilStart === 1 ? "" : "s"})

You will not receive money back if you cancel now.`,
    confirmLabel: "Cancel anyway",
  };
}
