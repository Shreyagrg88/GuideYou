import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type AppealStatus = "pending" | "under_review" | "approved" | "rejected";

export type GuideAppeal = {
  id: string;
  status: AppealStatus;
  message: string;
  resolutionReason?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type GuideDisableInfo = {
  accountStatus: string;
  disableReason: string;
  disabledAt: string;
  canSubmitAppeal: boolean;
  latestAppeal: GuideAppeal | null;
  openAppealId?: string | null;
  openAppealStatus?: string | null;
};

export class GuideAccountApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GuideAccountApiError";
    this.status = status;
  }
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { msg: text.trim() };
  }
}

function mapAppeal(raw: Record<string, unknown> | null | undefined): GuideAppeal | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? raw._id ?? "").trim();
  if (!id) return null;
  return {
    id,
    status: String(raw.status ?? "pending") as AppealStatus,
    message: String(raw.message ?? ""),
    resolutionReason: (raw.resolutionReason as string) ?? null,
    adminNotes: (raw.adminNotes as string) ?? null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: (raw.updatedAt as string) ?? undefined,
  };
}

function mapDisableInfo(data: Record<string, unknown>): GuideDisableInfo {
  const latestRaw =
    (data.latestAppeal as Record<string, unknown> | null | undefined) ??
    (data.appeal as Record<string, unknown> | null | undefined);
  return {
    accountStatus: String(data.accountStatus ?? "disabled"),
    disableReason: String(data.disableReason ?? ""),
    disabledAt: String(data.disabledAt ?? ""),
    canSubmitAppeal: Boolean(data.canSubmitAppeal ?? true),
    latestAppeal: mapAppeal(latestRaw),
    openAppealId: (data.openAppealId as string) ?? null,
    openAppealStatus: (data.openAppealStatus as string) ?? null,
  };
}

async function authToken(explicit?: string): Promise<string> {
  const token = explicit ?? (await AsyncStorage.getItem("token"));
  if (!token) throw new GuideAccountApiError("Not signed in", 401);
  return token;
}

export async function getGuideDisableInfo(token?: string): Promise<GuideDisableInfo> {
  const jwt = await authToken(token);
  const res = await fetch(`${API_URL}/api/guide/account/disable-info`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new GuideAccountApiError(String(data.msg ?? "Failed to load account info"), res.status);
  }
  return mapDisableInfo(data);
}

export async function getGuideAppeal(token?: string): Promise<GuideAppeal | null> {
  const jwt = await authToken(token);
  const res = await fetch(`${API_URL}/api/guide/account/appeal`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new GuideAccountApiError(String(data.msg ?? "Failed to load appeal"), res.status);
  }
  return mapAppeal(data.appeal as Record<string, unknown> | null | undefined);
}

export async function submitGuideAppeal(
  message: string,
  token?: string
): Promise<GuideAppeal> {
  const jwt = await authToken(token);
  const res = await fetch(`${API_URL}/api/guide/account/appeal`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: message.trim() }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new GuideAccountApiError(String(data.msg ?? "Failed to submit appeal"), res.status);
  }
  const appeal = mapAppeal(data.appeal as Record<string, unknown>);
  if (!appeal) throw new GuideAccountApiError("Invalid appeal response");
  return appeal;
}
