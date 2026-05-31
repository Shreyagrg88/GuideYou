import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type AdminAppealFilter =
  | "open"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "all";

export type AdminAppeal = {
  id: string;
  status: string;
  message: string;
  guideId: string;
  guideName?: string;
  disableReason?: string;
  createdAt: string;
};

export type AdminAppealDetail = AdminAppeal & {
  disabledAt?: string;
  adminNotes?: string;
  resolutionReason?: string;
  guide?: {
    id?: string;
    username?: string;
    fullName?: string;
    email?: string;
    avatar?: string;
    accountStatus?: string;
  };
};

export type AdminAppealsResult = {
  appeals: AdminAppeal[];
  pagination: { total: number; page: number; limit: number; totalPages?: number };
  apiAvailable: boolean;
};

export type AdminAppealPatchBody = {
  status: "under_review" | "approved" | "rejected";
  adminNotes?: string;
  resolutionReason?: string;
};

async function readJson(res: Response): Promise<Record<string, unknown>> {
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

function mapAppeal(item: Record<string, unknown>): AdminAppeal | null {
  const id = String(item.id ?? item._id ?? "").trim();
  if (!id) return null;
  const guide = item.guide as Record<string, unknown> | undefined;
  const guideId = String(guide?.id ?? guide?._id ?? item.guideId ?? "").trim();
  return {
    id,
    status: String(item.status ?? "pending"),
    message: String(item.message ?? ""),
    guideId,
    guideName: pickName(guide) || (item.guideName as string) || undefined,
    disableReason: (item.disableReason as string) ?? undefined,
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
  };
}

function mapAppealDetail(item: Record<string, unknown>): AdminAppealDetail | null {
  const base = mapAppeal(item);
  if (!base) return null;
  const guide = item.guide as Record<string, unknown> | undefined;
  return {
    ...base,
    disabledAt: (item.disabledAt as string) ?? undefined,
    adminNotes: (item.adminNotes as string) ?? undefined,
    resolutionReason: (item.resolutionReason as string) ?? undefined,
    guide: guide
      ? {
          id: String(guide.id ?? guide._id ?? ""),
          username: guide.username as string | undefined,
          fullName: guide.fullName as string | undefined,
          email: guide.email as string | undefined,
          avatar: guide.avatar as string | undefined,
          accountStatus: guide.accountStatus as string | undefined,
        }
      : undefined,
  };
}

async function adminToken(): Promise<string | null> {
  return AsyncStorage.getItem("token");
}

export async function fetchAdminAppeals(
  status: AdminAppealFilter = "open",
  page = 1,
  limit = 20
): Promise<AdminAppealsResult> {
  const token = await adminToken();
  if (!token) {
    return { appeals: [], pagination: { total: 0, page: 1, limit }, apiAvailable: false };
  }

  try {
    const res = await fetch(
      `${API_URL}/api/admin/appeals?status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await readJson(res);

    if (res.status === 404) {
      return { appeals: [], pagination: { total: 0, page: 1, limit }, apiAvailable: false };
    }

    if (!res.ok) {
      return { appeals: [], pagination: { total: 0, page: 1, limit }, apiAvailable: true };
    }

    const rawList = Array.isArray(data.appeals)
      ? data.appeals
      : Array.isArray(data.items)
        ? data.items
        : [];
    const paginationRaw = (data.pagination as Record<string, unknown>) ?? data;

    return {
      appeals: rawList
        .map((row) => mapAppeal(row as Record<string, unknown>))
        .filter((a): a is AdminAppeal => a != null),
      pagination: {
        total: Number(paginationRaw.total ?? rawList.length),
        page: Number(paginationRaw.page ?? page),
        limit: Number(paginationRaw.limit ?? limit),
        totalPages: paginationRaw.totalPages as number | undefined,
      },
      apiAvailable: true,
    };
  } catch {
    return { appeals: [], pagination: { total: 0, page: 1, limit }, apiAvailable: false };
  }
}

export async function fetchAdminAppealDetail(
  appealId: string
): Promise<AdminAppealDetail | null> {
  const token = await adminToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/admin/appeals/${encodeURIComponent(appealId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readJson(res);
    if (!res.ok) return null;
    const raw = (data.appeal ?? data) as Record<string, unknown>;
    return mapAppealDetail(raw);
  } catch {
    return null;
  }
}

export async function patchAdminAppeal(
  appealId: string,
  body: AdminAppealPatchBody
): Promise<{ ok: boolean; msg: string }> {
  const token = await adminToken();
  if (!token) return { ok: false, msg: "Not signed in" };

  try {
    const res = await fetch(`${API_URL}/api/admin/appeals/${encodeURIComponent(appealId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await readJson(res);
    if (!res.ok) {
      return { ok: false, msg: String(data.msg ?? "Update failed") };
    }
    return { ok: true, msg: String(data.msg ?? "Updated") };
  } catch {
    return { ok: false, msg: "Network error" };
  }
}
