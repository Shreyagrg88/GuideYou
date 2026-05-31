import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type RefundPolicyTier = {
  key: string;
  minDaysUntilStart: number;
  refundPercent: number;
  summary: string;
};

export type RefundPolicy = {
  version: string;
  timezone: string;
  currency: string;
  tiers: RefundPolicyTier[];
  notes: string[];
};

let cachedPolicy: RefundPolicy | null = null;

export async function fetchRefundPolicy(): Promise<RefundPolicy | null> {
  try {
    const res = await fetch(`${API_URL}/api/tourist/refund-policy`);
    if (!res.ok) return null;
    const data = (await res.json()) as RefundPolicy;
    cachedPolicy = data;
    return data;
  } catch {
    return null;
  }
}

/** Cached per app session — use on booking / pay screens. */
export async function getRefundPolicyCached(): Promise<RefundPolicy | null> {
  if (cachedPolicy) return cachedPolicy;
  return fetchRefundPolicy();
}

export type CancelBookingRefund = {
  refundStatus?: string;
  refundAmount?: number;
  refundPercent?: number | null;
  refundPolicyKey?: string | null;
  refundPolicyLabel?: string | null;
  refundTouristMessage?: string | null;
  hasRefundDue?: boolean;
  isRefunded?: boolean;
};

export type CancelBookingResult = {
  msg: string;
  refund?: CancelBookingRefund;
  booking?: Record<string, unknown>;
};

export async function cancelTouristBooking(bookingId: string): Promise<CancelBookingResult> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const res = await fetch(
    `${API_URL}/api/tourist/bookings/${encodeURIComponent(bookingId)}/cancel`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(String(data.msg || "Failed to cancel booking")) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  return {
    msg: String(data.msg || "Booking cancelled"),
    refund: data.refund as CancelBookingRefund | undefined,
    booking: data.booking as Record<string, unknown> | undefined,
  };
}

export function formatCancelSuccessMessage(result: CancelBookingResult): string {
  const refundMsg = result.refund?.refundTouristMessage;
  if (typeof refundMsg === "string" && refundMsg.trim()) return refundMsg;
  return result.msg;
}
