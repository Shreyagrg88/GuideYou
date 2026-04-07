import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type PayoutMethod = "esewa" | "bank";

/** Shape returned by GET/PATCH `/api/guide/payout-details`. */
export type GuidePayoutDetailsDto = {
  payoutMethod: PayoutMethod | null;
  esewaId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankBranch: string;
};

function parsePayoutMethod(v: unknown): PayoutMethod | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "esewa") return "esewa";
  if (s === "bank") return "bank";
  return null;
}

const HTML_HINT =
  "The server sent a webpage instead of JSON — often a 404 or proxy error. Confirm the backend is running and API_URL matches it (Android emulator: http://10.0.2.2:5000).";

/** Avoid JSON.parse on HTML bodies (e.g. Express 404 page), which throws "Unexpected character: <". */
async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return {};
  }
  if (trimmed.startsWith("<")) {
    throw new Error(HTML_HINT);
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error(
      "Invalid response from server (not JSON). Check API_URL and that /api/guide/payout-details is deployed."
    );
  }
}

export async function fetchGuidePayoutDetails(): Promise<GuidePayoutDetailsDto> {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(`${API_URL}/api/guide/payout-details`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await readJsonBody(response);
  if (!response.ok) {
    const msg = typeof data.msg === "string" ? data.msg : "Failed to load payout details";
    const err = new Error(msg) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const pd = data.payoutDetails;
  if (!pd || typeof pd !== "object" || Array.isArray(pd)) {
    throw new Error("Invalid payout details response");
  }

  const p = pd as Record<string, unknown>;
  return {
    payoutMethod: parsePayoutMethod(p.payoutMethod),
    esewaId: String(p.esewaId ?? ""),
    bankName: String(p.bankName ?? ""),
    accountName: String(p.accountName ?? ""),
    accountNumber: String(p.accountNumber ?? ""),
    bankBranch: String(p.bankBranch ?? ""),
  };
}

export type PatchGuidePayoutEsewa = { payoutMethod: "esewa"; esewaId: string };

export type PatchGuidePayoutBank = {
  payoutMethod: "bank";
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankBranch: string;
};

/** Create or update payout details. Uses POST (same as PATCH per API). */
export async function patchGuidePayoutDetails(
  body: PatchGuidePayoutEsewa | PatchGuidePayoutBank
): Promise<GuidePayoutDetailsDto> {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  // POST is equivalent to PATCH on the server; use POST to avoid proxies/clients that block PATCH.
  const response = await fetch(`${API_URL}/api/guide/payout-details`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await readJsonBody(response);
  if (!response.ok) {
    const msg = typeof data.msg === "string" ? data.msg : "Failed to save payout details";
    const err = new Error(msg) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const pd = data.payoutDetails;
  if (!pd || typeof pd !== "object" || Array.isArray(pd)) {
    throw new Error("Invalid save response");
  }

  const p = pd as Record<string, unknown>;
  return {
    payoutMethod: parsePayoutMethod(p.payoutMethod),
    esewaId: String(p.esewaId ?? ""),
    bankName: String(p.bankName ?? ""),
    accountName: String(p.accountName ?? ""),
    accountNumber: String(p.accountNumber ?? ""),
    bankBranch: String(p.bankBranch ?? ""),
  };
}
