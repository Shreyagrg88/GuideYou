import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";
import type { AdminPayoutDetails } from "./adminBookingsPayments";

export type RefundStatusFilter = "due" | "completed" | "denied" | "all";

export type AdminRefundPerson = {
  id: string;
  username?: string;
  email?: string;
  fullName?: string;
};

export type AdminRefundBooking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  paidAt: string | null;
  cancelledAt: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  price: number;
  participantCount: number;
  tourName: string | null;
  customLocation: string | null;
  isCustomTour: boolean;
  refundStatus: string | null;
  refundAmount: number;
  refundPercent: number | null;
  refundPolicyKey: string | null;
  refundPolicyLabel: string | null;
  daysUntilStartAtCancel: number | null;
  cancelledBy: string | null;
  refundNote: string | null;
  refundedAt: string | null;
  hasRefundDue: boolean;
  isRefunded: boolean;
  canMarkRefundCompleted: boolean;
  touristId: string;
  guide: AdminRefundPerson;
  tourist: AdminRefundPerson;
  activity: {
    id: string;
    name?: string;
    location?: string;
    photo?: string | null;
  } | null;
};

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) {
    throw new Error("Server returned HTML instead of JSON. Check API_URL and admin routes.");
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON from server.");
  }
}

function pickId(raw: Record<string, unknown> | undefined): string {
  if (!raw) return "";
  return String(raw.id ?? raw._id ?? "").trim();
}

function mapPerson(raw: unknown): AdminRefundPerson {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { id: "" };
  }
  const r = raw as Record<string, unknown>;
  return {
    id: pickId(r),
    username: r.username != null ? String(r.username) : undefined,
    email: r.email != null ? String(r.email) : undefined,
    fullName: r.fullName != null ? String(r.fullName) : undefined,
  };
}

function mapRefundBooking(raw: Record<string, unknown>): AdminRefundBooking | null {
  const id = pickId(raw);
  if (!id) return null;

  const activityRaw = raw.activity;
  let activity: AdminRefundBooking["activity"] = null;
  if (activityRaw && typeof activityRaw === "object" && !Array.isArray(activityRaw)) {
    const a = activityRaw as Record<string, unknown>;
    activity = {
      id: pickId(a),
      name: a.name != null ? String(a.name) : undefined,
      location: a.location != null ? String(a.location) : undefined,
      photo: a.photo != null ? String(a.photo) : null,
    };
  }

  const touristId = String(raw.touristId ?? mapPerson(raw.tourist as Record<string, unknown>).id ?? "").trim();

  return {
    id,
    status: String(raw.status ?? ""),
    startDate: String(raw.startDate ?? ""),
    endDate: String(raw.endDate ?? ""),
    paidAt: raw.paidAt != null ? String(raw.paidAt) : null,
    cancelledAt: raw.cancelledAt != null ? String(raw.cancelledAt) : null,
    paymentId: raw.paymentId != null ? String(raw.paymentId) : null,
    paymentStatus: raw.paymentStatus != null ? String(raw.paymentStatus) : null,
    price: typeof raw.price === "number" ? raw.price : Number(raw.price) || 0,
    participantCount:
      typeof raw.participantCount === "number" ? raw.participantCount : Number(raw.participantCount) || 1,
    tourName: raw.tourName != null ? String(raw.tourName) : null,
    customLocation: raw.customLocation != null ? String(raw.customLocation) : null,
    isCustomTour: Boolean(raw.isCustomTour),
    refundStatus: raw.refundStatus != null ? String(raw.refundStatus) : null,
    refundAmount: typeof raw.refundAmount === "number" ? raw.refundAmount : Number(raw.refundAmount) || 0,
    refundPercent:
      raw.refundPercent == null
        ? null
        : typeof raw.refundPercent === "number"
          ? raw.refundPercent
          : Number(raw.refundPercent),
    refundPolicyKey: raw.refundPolicyKey != null ? String(raw.refundPolicyKey) : null,
    refundPolicyLabel: raw.refundPolicyLabel != null ? String(raw.refundPolicyLabel) : null,
    daysUntilStartAtCancel:
      raw.daysUntilStartAtCancel == null
        ? null
        : typeof raw.daysUntilStartAtCancel === "number"
          ? raw.daysUntilStartAtCancel
          : Number(raw.daysUntilStartAtCancel),
    cancelledBy: raw.cancelledBy != null ? String(raw.cancelledBy) : null,
    refundNote: raw.refundNote != null ? String(raw.refundNote) : null,
    refundedAt: raw.refundedAt != null ? String(raw.refundedAt) : null,
    hasRefundDue: Boolean(raw.hasRefundDue),
    isRefunded: Boolean(raw.isRefunded),
    canMarkRefundCompleted: Boolean(raw.canMarkRefundCompleted),
    touristId,
    guide: mapPerson(raw.guide as Record<string, unknown>),
    tourist: mapPerson(raw.tourist as Record<string, unknown>),
    activity,
  };
}

export async function fetchAdminRefundBookings(params: {
  refundStatus?: RefundStatusFilter;
  page?: number;
  limit?: number;
}): Promise<{
  page: number;
  limit: number;
  total: number;
  refundStatus: string;
  bookings: AdminRefundBooking[];
}> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const q = new URLSearchParams();
  q.set("refundStatus", params.refundStatus ?? "due");
  q.set("page", String(Math.max(1, params.page ?? 1)));
  q.set("limit", String(Math.min(50, Math.max(1, params.limit ?? 20))));

  const response = await fetch(`${API_URL}/api/admin/bookings/refunds?${q.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await readJsonBody(response);
  if (!response.ok) {
    const err = new Error(
      typeof data.msg === "string" ? data.msg : "Failed to load refund bookings"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const rawList = Array.isArray(data.bookings) ? data.bookings : [];
  const bookings = rawList
    .map((item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? mapRefundBooking(item as Record<string, unknown>)
        : null
    )
    .filter((b): b is AdminRefundBooking => b != null);

  return {
    page: typeof data.page === "number" ? data.page : 1,
    limit: typeof data.limit === "number" ? data.limit : 20,
    total: typeof data.total === "number" ? data.total : bookings.length,
    refundStatus: typeof data.refundStatus === "string" ? data.refundStatus : "due",
    bookings,
  };
}

export async function fetchAdminRefundBookingById(
  bookingId: string
): Promise<AdminRefundBooking | null> {
  const limit = 50;
  let page = 1;
  let total = Infinity;

  while (page <= 40 && (page - 1) * limit < total) {
    const res = await fetchAdminRefundBookings({
      refundStatus: "all",
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

export async function fetchAdminTouristPaymentDetails(touristId: string): Promise<{
  tourist: AdminRefundPerson;
  paymentDetails: AdminPayoutDetails;
}> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const response = await fetch(
    `${API_URL}/api/admin/tourists/${encodeURIComponent(touristId)}/payment-details`,
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
      typeof data.msg === "string" ? data.msg : "Failed to load tourist payment details"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const tourist = mapPerson(data.tourist as Record<string, unknown>);
  const pd = data.paymentDetails;
  const raw = pd && typeof pd === "object" && !Array.isArray(pd) ? pd : {};
  const r = raw as Record<string, unknown>;
  const method = String(r.payoutMethod || "").toLowerCase();
  const paymentDetails: AdminPayoutDetails = {
    payoutMethod: method === "esewa" || method === "bank" ? method : null,
    esewaId: String(r.esewaId ?? ""),
    bankName: String(r.bankName ?? ""),
    accountName: String(r.accountName ?? ""),
    accountNumber: String(r.accountNumber ?? ""),
    bankBranch: String(r.bankBranch ?? ""),
  };

  return { tourist: { ...tourist, id: tourist.id || touristId }, paymentDetails };
}

export async function markAdminRefundCompleted(
  bookingId: string,
  refundNote?: string
): Promise<{ msg: string; booking?: AdminRefundBooking }> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const body: Record<string, string> = {};
  if (refundNote?.trim()) body.refundNote = refundNote.trim();

  const response = await fetch(
    `${API_URL}/api/admin/bookings/${encodeURIComponent(bookingId)}/mark-refund`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await readJsonBody(response);
  if (!response.ok) {
    const err = new Error(
      typeof data.msg === "string" ? data.msg : "Failed to mark refund sent"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const b = data.booking;
  const booking =
    b && typeof b === "object" && !Array.isArray(b)
      ? mapRefundBooking(b as Record<string, unknown>) ?? undefined
      : undefined;

  return {
    msg: typeof data.msg === "string" ? data.msg : "Refund marked as sent",
    booking,
  };
}
