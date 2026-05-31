import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type ApiReportCategory =
  | "misconduct"
  | "harassment"
  | "safety"
  | "fraud"
  | "no_show"
  | "other";

export type ReportReasonId =
  | "inappropriate_behavior"
  | "harassment"
  | "fraud"
  | "no_show"
  | "misleading_profile"
  | "safety"
  | "other";

export const UI_REASON_TO_API_CATEGORY: Record<ReportReasonId, ApiReportCategory> = {
  inappropriate_behavior: "misconduct",
  harassment: "harassment",
  fraud: "fraud",
  no_show: "no_show",
  misleading_profile: "fraud",
  safety: "safety",
  other: "other",
};

export const API_CATEGORY_LABELS: Record<ApiReportCategory, string> = {
  misconduct: "Inappropriate behavior",
  harassment: "Harassment or abuse",
  safety: "Safety concern",
  fraud: "Fraud or scam",
  no_show: "No-show or cancellation",
  other: "Other",
};

export type TouristReport = {
  id: string;
  guideId: string;
  guideName?: string;
  category: ApiReportCategory;
  description: string;
  status: string;
  createdAt: string;
};

export type AdminReport = {
  id: string;
  status: string;
  category: string;
  reason: string;
  description?: string;
  reporterName?: string;
  guideId?: string;
  guideName?: string;
  reportedLabel?: string;
  hasVerifiedBooking?: boolean;
  adminNotes?: string;
  actionTaken?: string;
  createdAt: string;
};

export type AdminReportDetail = AdminReport & {
  tourist?: {
    id?: string;
    username?: string;
    fullName?: string;
    email?: string;
  };
  guide?: {
    id?: string;
    username?: string;
    fullName?: string;
    accountStatus?: string;
  };
  booking?: {
    id?: string;
    startDate?: string;
    endDate?: string;
    tourName?: string;
    status?: string;
  };
};

export type AdminReportFilter = "open" | "under_review" | "resolved" | "all";

export type AdminReportsResult = {
  reports: AdminReport[];
  apiAvailable: boolean;
  total?: number;
};

export class ReportApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ReportApiError";
    this.status = status;
  }
}

async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { msg: text.trim() };
  }
}

function pickName(raw: Record<string, unknown> | undefined): string {
  if (!raw) return "";
  return (
    (raw.fullName as string) ||
    (raw.username as string) ||
    (raw.name as string) ||
    ""
  ).trim();
}

function categoryLabel(category: string): string {
  const key = category as ApiReportCategory;
  return API_CATEGORY_LABELS[key] ?? category.replace(/_/g, " ");
}

function mapAdminReport(item: Record<string, unknown>): AdminReport | null {
  const id = String(item.id ?? item._id ?? "").trim();
  if (!id) return null;

  const tourist = (item.tourist ?? item.reporter ?? item.reportedBy) as
    | Record<string, unknown>
    | undefined;
  const guide = item.guide as Record<string, unknown> | undefined;
  const category = String(item.category ?? item.reason ?? item.type ?? "other");

  const guideName =
    pickName(guide) ||
    (item.guideName as string) ||
    (item.reportedLabel as string) ||
    "";

  return {
    id,
    status: String(item.status ?? "open"),
    category,
    reason: categoryLabel(category),
    description: (item.description ?? item.details ?? item.message) as string | undefined,
    reporterName: pickName(tourist) || (item.reporterName as string) || "Unknown",
    guideId: String(guide?.id ?? guide?._id ?? item.guideId ?? "").trim() || undefined,
    guideName: guideName || undefined,
    reportedLabel: guideName || (item.reportedLabel as string) || undefined,
    hasVerifiedBooking: Boolean(item.hasVerifiedBooking),
    adminNotes: (item.adminNotes as string) ?? undefined,
    actionTaken: (item.actionTaken as string) ?? undefined,
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
  };
}

function mapAdminReportDetail(item: Record<string, unknown>): AdminReportDetail | null {
  const base = mapAdminReport(item);
  if (!base) return null;

  const tourist = (item.tourist ?? item.reporter) as Record<string, unknown> | undefined;
  const guide = item.guide as Record<string, unknown> | undefined;
  const booking = item.booking as Record<string, unknown> | undefined;

  return {
    ...base,
    tourist: tourist
      ? {
          id: String(tourist.id ?? tourist._id ?? ""),
          username: tourist.username as string | undefined,
          fullName: tourist.fullName as string | undefined,
          email: tourist.email as string | undefined,
        }
      : undefined,
    guide: guide
      ? {
          id: String(guide.id ?? guide._id ?? ""),
          username: guide.username as string | undefined,
          fullName: guide.fullName as string | undefined,
          accountStatus: (guide.accountStatus as string) ?? undefined,
        }
      : undefined,
    booking: booking
      ? {
          id: String(booking.id ?? booking._id ?? ""),
          startDate: booking.startDate as string | undefined,
          endDate: booking.endDate as string | undefined,
          tourName: (booking.tourName ??
            (booking.activity as Record<string, unknown> | undefined)?.name) as
            | string
            | undefined,
          status: booking.status as string | undefined,
        }
      : undefined,
  };
}

export async function submitGuideReport(
  token: string,
  guideId: string,
  body: {
    category: ApiReportCategory;
    description: string;
    bookingId?: string;
  }
): Promise<{ msg: string; report: { id: string; status: string } }> {
  const res = await fetch(`${API_URL}/api/tourist/guides/${encodeURIComponent(guideId)}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) {
    throw new ReportApiError(
      String(data.msg ?? data.message ?? "Failed to submit report"),
      res.status
    );
  }
  return data as { msg: string; report: { id: string; status: string } };
}

export async function fetchTouristReports(token: string): Promise<TouristReport[]> {
  const res = await fetch(`${API_URL}/api/tourist/reports`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await readJsonResponse(res);
  if (!res.ok) {
    throw new ReportApiError(
      String(data.msg ?? data.message ?? "Failed to load reports"),
      res.status
    );
  }
  const list = (data.reports ?? []) as unknown[];
  if (!Array.isArray(list)) return [];
  const reports: TouristReport[] = [];
  for (const row of list) {
    const item = row as Record<string, unknown>;
    const id = String(item.id ?? item._id ?? "").trim();
    if (!id) continue;
    const category = String(item.category ?? "other") as ApiReportCategory;
    reports.push({
      id,
      guideId: String(item.guideId ?? ""),
      guideName: (item.guideName as string) ?? undefined,
      category,
      description: String(item.description ?? ""),
      status: String(item.status ?? "open"),
      createdAt: String(item.createdAt ?? ""),
    });
  }
  return reports;
}

export async function fetchAdminReports(
  status: AdminReportFilter = "open",
  page = 1,
  limit = 20
): Promise<AdminReportsResult> {
  const token = await AsyncStorage.getItem("token");
  if (!token) return { reports: [], apiAvailable: false };

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  const q = params.toString() ? `?${params.toString()}` : "";

  try {
    const res = await fetch(`${API_URL}/api/admin/reports${q}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (res.status === 404) {
      return { reports: [], apiAvailable: false };
    }
    const data = await readJsonResponse(res);
    if (!res.ok) {
      return { reports: [], apiAvailable: false };
    }
    const list = (data.reports ?? data.items ?? []) as unknown[];
    if (!Array.isArray(list)) {
      return { reports: [], apiAvailable: true, total: 0 };
    }
    return {
      reports: list
        .map((row) => mapAdminReport(row as Record<string, unknown>))
        .filter((r): r is AdminReport => r != null),
      apiAvailable: true,
      total: typeof data.total === "number" ? data.total : undefined,
    };
  } catch {
    return { reports: [], apiAvailable: false };
  }
}

export async function fetchAdminReportDetail(
  reportId: string
): Promise<AdminReportDetail | null> {
  const token = await AsyncStorage.getItem("token");
  if (!token) return null;

  try {
    const res = await fetch(
      `${API_URL}/api/admin/reports/${encodeURIComponent(reportId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await readJsonResponse(res);
    if (!res.ok) return null;
    const raw = (data.report ?? data) as Record<string, unknown>;
    return mapAdminReportDetail(raw);
  } catch {
    return null;
  }
}

export async function patchAdminReport(
  reportId: string,
  body: {
    status?: "under_review" | "resolved" | "dismissed";
    adminNotes?: string;
    actionTaken?: "none" | "guide_warned" | "guide_disabled";
  }
): Promise<{ ok: true; msg?: string } | { ok: false; msg: string }> {
  const token = await AsyncStorage.getItem("token");
  if (!token) return { ok: false, msg: "Not authenticated" };

  try {
    const res = await fetch(
      `${API_URL}/api/admin/reports/${encodeURIComponent(reportId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = await readJsonResponse(res);
    if (!res.ok) {
      return {
        ok: false,
        msg: String(data.msg ?? data.message ?? "Could not update report"),
      };
    }
    return { ok: true, msg: data.msg as string | undefined };
  } catch {
    return { ok: false, msg: "Network error. Please try again." };
  }
}

/** @deprecated Use patchAdminReport */
export async function updateAdminReportStatus(
  reportId: string,
  status: "resolved" | "dismissed"
): Promise<boolean> {
  const result = await patchAdminReport(reportId, { status });
  return result.ok;
}

export async function updateGuideAccountStatus(
  guideId: string,
  body: {
    status: "active" | "disabled";
    reason: string;
    reportId?: string;
  }
): Promise<{ ok: true; msg?: string } | { ok: false; msg: string }> {
  const token = await AsyncStorage.getItem("token");
  if (!token) return { ok: false, msg: "Not authenticated" };

  try {
    const res = await fetch(
      `${API_URL}/api/admin/guides/${encodeURIComponent(guideId)}/account-status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = await readJsonResponse(res);
    if (!res.ok) {
      return {
        ok: false,
        msg: String(data.msg ?? data.message ?? "Could not update guide account"),
      };
    }
    return { ok: true, msg: data.msg as string | undefined };
  } catch {
    return { ok: false, msg: "Network error. Please try again." };
  }
}
