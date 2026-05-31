import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type BookingMilestoneFields = {
  platformCommission: number;
  guideEarning: number;
  guidePayoutTier: "standard" | "verified" | string;
  guideStartPayoutAmount: number;
  guideFinalPayoutAmount: number;
  guidePayoutReleasedAmount: number;
  guidePayoutStatus: string | null;
  touristTourStartedConfirmedAt: string | null;
  guideTourStartedConfirmedAt: string | null;
  tourStartedAt: string | null;
  guideStartPayoutReleasedAt: string | null;
  payoutDate: string | null;
  canConfirmTourStarted: boolean;
  tourStartedConfirmedByTourist: boolean;
  tourStartedConfirmedByGuide: boolean;
  canReleaseFinalPayout?: boolean;
};

export type ConfirmTourStartedResponse = {
  msg: string;
  bothConfirmed: boolean;
  startPayoutReleased: boolean;
  booking: { id: string; status?: string } & Partial<BookingMilestoneFields>;
};

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) {
    throw new Error("Server returned HTML instead of JSON. Check API_URL and routes.");
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid response from server.");
  }
}

/** Tourist confirms the tour has started (on or after start date). */
export async function confirmTourStartedTourist(
  bookingId: string
): Promise<ConfirmTourStartedResponse> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const response = await fetch(
    `${API_URL}/api/tourist/bookings/${encodeURIComponent(bookingId)}/confirm-tour-started`,
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
      typeof data.msg === "string" ? data.msg : "Could not confirm tour started"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const bookingRaw = data.booking;
  const booking =
    bookingRaw && typeof bookingRaw === "object" && !Array.isArray(bookingRaw)
      ? (bookingRaw as ConfirmTourStartedResponse["booking"])
      : { id: bookingId };

  return {
    msg: typeof data.msg === "string" ? data.msg : "Tour started confirmed",
    bothConfirmed: Boolean(data.bothConfirmed),
    startPayoutReleased: Boolean(data.startPayoutReleased),
    booking,
  };
}

/** Guide confirms the tour has started (on or after start date). */
export async function confirmTourStartedGuide(
  bookingId: string
): Promise<ConfirmTourStartedResponse> {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Not logged in");

  const response = await fetch(
    `${API_URL}/api/guide/bookings/${encodeURIComponent(bookingId)}/confirm-tour-started`,
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
      typeof data.msg === "string" ? data.msg : "Could not confirm tour started"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const bookingRaw = data.booking;
  const booking =
    bookingRaw && typeof bookingRaw === "object" && !Array.isArray(bookingRaw)
      ? (bookingRaw as ConfirmTourStartedResponse["booking"])
      : { id: bookingId };

  return {
    msg: typeof data.msg === "string" ? data.msg : "Tour started confirmed",
    bothConfirmed: Boolean(data.bothConfirmed),
    startPayoutReleased: Boolean(data.startPayoutReleased),
    booking,
  };
}
