import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";
import { getStoredAuthUser, type StoredAuthUser } from "../utils/authSession";

export type AdminProfile = StoredAuthUser & {
  id: string;
};

export type AdminStats = {
  guides: { total: number; active: number };
  tourists: { total: number; active: number };
};

function normalizeAdminUser(raw: Record<string, unknown> | null | undefined): AdminProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? raw._id ?? "");
  if (!id) return null;
  return {
    id,
    username: (raw.username as string) ?? undefined,
    email: (raw.email as string) ?? undefined,
    fullName: (raw.fullName as string) ?? (raw.name as string) ?? undefined,
    name: (raw.name as string) ?? undefined,
    role: (raw.role as string) ?? "admin",
    avatar: (raw.avatar as string) ?? undefined,
  };
}

export async function fetchAdminProfile(): Promise<AdminProfile | null> {
  const token = await AsyncStorage.getItem("token");
  if (!token) return null;

  const endpoints = [
    `${API_URL}/api/admin/profile`,
    `${API_URL}/api/admin/me`,
    `${API_URL}/api/auth/me`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const text = await res.text();
      if (!res.ok || text.trim().startsWith("<")) continue;
      const data = JSON.parse(text);
      const candidate = normalizeAdminUser(
        (data.admin ?? data.user ?? data) as Record<string, unknown>
      );
      if (candidate) return candidate;
    } catch {
      /* try next endpoint */
    }
  }

  const stored = await getStoredAuthUser();
  if (stored?.id) {
    return normalizeAdminUser(stored as Record<string, unknown>);
  }

  const userId = await AsyncStorage.getItem("userId");
  if (userId) {
    return {
      id: userId,
      username: "Admin",
      fullName: "Administrator",
      role: "admin",
    };
  }

  return null;
}

export async function fetchAdminStats(): Promise<AdminStats | null> {
  const token = await AsyncStorage.getItem("token");
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/admin/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok || text.trim().startsWith("<")) return null;
    return JSON.parse(text) as AdminStats;
  } catch {
    return null;
  }
}

export type { AdminReport, AdminReportsResult } from "./reports";
export { fetchAdminReports, updateAdminReportStatus } from "./reports";

export type AdminPendingLicense = {
  userId: string;
  username: string;
  email: string;
  licenseFile: string;
  submittedAt: string;
  status?: string;
};

export function parseApiErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Request failed";
  try {
    const data = JSON.parse(trimmed) as { msg?: string; message?: string };
    if (typeof data.msg === "string" && data.msg.trim()) return data.msg.trim();
    if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  } catch {
    /* not JSON */
  }
  return trimmed;
}

export async function getStoredUserRole(): Promise<string> {
  const role =
    (await AsyncStorage.getItem("userRole")) ??
    (await AsyncStorage.getItem("role")) ??
    "";
  return role.trim().toLowerCase();
}

function normalizePendingLicense(raw: unknown): AdminPendingLicense | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const userId = String(row.userId ?? row.id ?? row._id ?? "").trim();
  if (!userId) return null;
  return {
    userId,
    username: String(row.username ?? row.name ?? "Guide"),
    email: String(row.email ?? ""),
    licenseFile: String(row.licenseFile ?? row.file ?? ""),
    submittedAt: String(
      row.submittedAt ?? row.createdAt ?? new Date().toISOString()
    ),
    status: row.status != null ? String(row.status) : undefined,
  };
}

/** Admin-only pending license queue; tries common backend route variants. */
export async function fetchAdminPendingLicenses(
  token: string
): Promise<AdminPendingLicense[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const urls = [
    `${API_URL}/api/admin/licenses/pending`,
    `${API_URL}/api/admin/license/pending`,
    `${API_URL}/api/license/pending`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      const list = data.licenses ?? data.pending ?? data;
      if (!Array.isArray(list)) continue;
      const licenses: AdminPendingLicense[] = [];
      for (const item of list) {
        const mapped = normalizePendingLicense(item);
        if (mapped) licenses.push(mapped);
      }
      return licenses;
    } catch {
      continue;
    }
  }

  return [];
}
