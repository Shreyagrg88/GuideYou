import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { API_URL } from "../constants/api";
import type { PayoutMethod } from "./guidePayout";

export type { PayoutMethod };

/** Shape returned by GET/PATCH `/api/tourist/payment-details`. */
export type TouristPaymentDetailsDto = {
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
  "The server sent a webpage instead of JSON — often a 404 or proxy error. Confirm the backend is running and API_URL matches it.";

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) {
    throw new Error(HTML_HINT);
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error(
      "Invalid response from server (not JSON). Check API_URL and that /api/tourist/payment-details is deployed."
    );
  }
}

function mapPaymentDetails(pd: Record<string, unknown>): TouristPaymentDetailsDto {
  return {
    payoutMethod: parsePayoutMethod(pd.payoutMethod),
    esewaId: String(pd.esewaId ?? ""),
    bankName: String(pd.bankName ?? ""),
    accountName: String(pd.accountName ?? ""),
    accountNumber: String(pd.accountNumber ?? ""),
    bankBranch: String(pd.bankBranch ?? ""),
  };
}

export const EMPTY_TOURIST_PAYMENT_DETAILS: TouristPaymentDetailsDto = {
  payoutMethod: null,
  esewaId: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  bankBranch: "",
};

export async function fetchTouristPaymentDetails(): Promise<TouristPaymentDetailsDto> {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(`${API_URL}/api/tourist/payment-details`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await readJsonBody(response);

  // No details saved yet, or route returns 404 before first save — show empty form.
  if (response.status === 404) {
    return EMPTY_TOURIST_PAYMENT_DETAILS;
  }

  if (!response.ok) {
    const msg = typeof data.msg === "string" ? data.msg : "Failed to load payment details";
    const err = new Error(msg) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const pd = data.paymentDetails;
  if (!pd || typeof pd !== "object" || Array.isArray(pd)) {
    return EMPTY_TOURIST_PAYMENT_DETAILS;
  }

  return mapPaymentDetails(pd as Record<string, unknown>);
}

export type PatchTouristPaymentEsewa = { payoutMethod: "esewa"; esewaId: string };

export type PatchTouristPaymentBank = {
  payoutMethod: "bank";
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankBranch: string;
};

export async function patchTouristPaymentDetails(
  body: PatchTouristPaymentEsewa | PatchTouristPaymentBank
): Promise<TouristPaymentDetailsDto> {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const payload =
    body.payoutMethod === "bank"
      ? {
          ...body,
          accountNumber: body.accountNumber.replace(/\s/g, ""),
        }
      : body;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  let response = await fetch(`${API_URL}/api/tourist/payment-details`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  // Some setups only expose POST (same as guide payout API).
  if (response.status === 404 || response.status === 405) {
    response = await fetch(`${API_URL}/api/tourist/payment-details`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }

  const data = await readJsonBody(response);
  if (!response.ok) {
    const msg = typeof data.msg === "string" ? data.msg : "Failed to save payment details";
    const err = new Error(msg) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const pd = data.paymentDetails;
  if (!pd || typeof pd !== "object" || Array.isArray(pd)) {
    throw new Error("Invalid save response");
  }

  return mapPaymentDetails(pd as Record<string, unknown>);
}

export function isPaymentDetailsConfigured(details: TouristPaymentDetailsDto): boolean {
  return details.payoutMethod === "esewa" || details.payoutMethod === "bank";
}

/** Soft gate before Pay Now — returns true if payment should proceed. */
export async function promptRefundDetailsBeforePay(
  navigateToPayment: () => void
): Promise<boolean> {
  try {
    const details = await fetchTouristPaymentDetails();
    if (isPaymentDetailsConfigured(details)) return true;
  } catch {
    return true;
  }

  return new Promise((resolve) => {
    Alert.alert(
      "Add refund details",
      "Add eSewa or bank details so we can refund you if you cancel a paid booking.",
      [
        {
          text: "Add details",
          onPress: () => {
            navigateToPayment();
            resolve(false);
          },
        },
        { text: "Continue anyway", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
