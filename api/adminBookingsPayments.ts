import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type GuidePayoutStatusFilter = "pending" | "paid" | "all";

export type AdminPaymentBooking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  paidAt: string | null;
  completedAt: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  price: number;
  priceUsd?: number;
  platformCommission: number;
  guideEarning: number;
  guidePayoutStatus: string | null;
  guidePayoutTier?: "standard" | "verified" | string;
  guideStartPayoutAmount?: number;
  guideFinalPayoutAmount?: number;
  guidePayoutReleasedAmount?: number;
  touristTourStartedConfirmedAt?: string | null;
  guideTourStartedConfirmedAt?: string | null;
  tourStartedAt?: string | null;
  guideStartPayoutReleasedAt?: string | null;
  payoutDate: string | null;
  canReleaseFinalPayout?: boolean;
  participantCount: number;
  tourName: string | null;
  customLocation: string | null;
  notes: string;
  guide: {
    id: string;
    username?: string;
    email?: string;
    fullName?: string;
  };
  tourist: {
    id: string;
    username?: string;
    email?: string;
    fullName?: string;
  };
  activity: {
    id: string;
    name?: string;
    location?: string;
    category?: string;
    duration?: number;
    photo?: string | null;
  } | null;
  isCustomTour: boolean;
};

export type AdminPayoutDetails = {
  payoutMethod: "esewa" | "bank" | null;
  esewaId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankBranch: string;
};

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) {
    throw new Error(
      "Server returned HTML instead of JSON. Check API_URL and admin routes."
    );
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON from server.");
  }
}

export async function fetchAdminPaymentBookings(params: {
  guidePayoutStatus?: GuidePayoutStatusFilter;
  page?: number;
  limit?: number;
}): Promise<{
  page: number;
  limit: number;
  total: number;
  guidePayoutStatus: string;
  bookings: AdminPaymentBooking[];
}> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const q = new URLSearchParams();
  q.set("guidePayoutStatus", params.guidePayoutStatus ?? "pending");
  q.set("page", String(Math.max(1, params.page ?? 1)));
  q.set("limit", String(Math.min(50, Math.max(1, params.limit ?? 20))));

  const response = await fetch(`${API_URL}/api/admin/bookings/payments?${q.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await readJsonBody(response);
  if (!response.ok) {
    const err = new Error(
      typeof data.msg === "string" ? data.msg : "Failed to load payment bookings"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const bookings = Array.isArray(data.bookings) ? (data.bookings as AdminPaymentBooking[]) : [];

  return {
    page: typeof data.page === "number" ? data.page : 1,
    limit: typeof data.limit === "number" ? data.limit : 20,
    total: typeof data.total === "number" ? data.total : bookings.length,
    guidePayoutStatus: typeof data.guidePayoutStatus === "string" ? data.guidePayoutStatus : "pending",
    bookings,
  };
}

/** Find one booking by id (scans paginated list; for detail screen without single-booking GET). */
export async function fetchAdminPaymentBookingById(
  bookingId: string
): Promise<AdminPaymentBooking | null> {
  const limit = 50;
  let page = 1;
  let total = Infinity;

  while (page <= 40 && (page - 1) * limit < total) {
    const res = await fetchAdminPaymentBookings({
      guidePayoutStatus: "all",
      page,
      limit,
    });
    total = res.total;
    const found = res.bookings.find((b) => b.id === bookingId);
    if (found) return found;
    if (res.bookings.length === 0) break;
    page += 1;
  }
  return null;
}

export async function releaseAdminBookingPayout(bookingId: string): Promise<{
  msg: string;
  releasedAmount?: number;
  releaseKind?: string;
  booking: AdminPaymentBooking | undefined;
}> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const response = await fetch(
    `${API_URL}/api/admin/bookings/${encodeURIComponent(bookingId)}/release-payout`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  const data = await readJsonBody(response);
  if (!response.ok) {
    const err = new Error(
      typeof data.msg === "string" ? data.msg : "Failed to release payout"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const b = data.booking;
  const booking =
    b && typeof b === "object" && !Array.isArray(b) ? (b as AdminPaymentBooking) : undefined;

  return {
    msg: typeof data.msg === "string" ? data.msg : "Payout released",
    releasedAmount:
      typeof data.releasedAmount === "number" ? data.releasedAmount : undefined,
    releaseKind: typeof data.releaseKind === "string" ? data.releaseKind : undefined,
    booking,
  };
}

export async function fetchAdminGuidePayoutDetails(guideId: string): Promise<{
  guide: { id: string; username?: string; email?: string; fullName?: string };
  payoutDetails: AdminPayoutDetails;
}> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const response = await fetch(
    `${API_URL}/api/admin/guides/${encodeURIComponent(guideId)}/payout-details`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await readJsonBody(response);
  if (!response.ok) {
    const err = new Error(
      typeof data.msg === "string" ? data.msg : "Failed to load guide payout details"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const g = data.guide;
  const pd = data.payoutDetails;
  const guide =
    g && typeof g === "object"
      ? (g as { id: string; username?: string; email?: string; fullName?: string })
      : { id: guideId };

  const raw = pd && typeof pd === "object" && !Array.isArray(pd) ? pd : {};
  const r = raw as Record<string, unknown>;
  const method = String(r.payoutMethod || "").toLowerCase();
  const payoutDetails: AdminPayoutDetails = {
    payoutMethod: method === "esewa" || method === "bank" ? method : null,
    esewaId: String(r.esewaId ?? ""),
    bankName: String(r.bankName ?? ""),
    accountName: String(r.accountName ?? ""),
    accountNumber: String(r.accountNumber ?? ""),
    bankBranch: String(r.bankBranch ?? ""),
  };

  return { guide, payoutDetails };
}
