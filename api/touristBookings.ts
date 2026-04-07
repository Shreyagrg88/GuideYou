import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) {
    throw new Error(
      "Server returned a webpage instead of JSON. Check API_URL and that PATCH /api/tourist/bookings/:id/complete exists."
    );
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid response from server.");
  }
}

export type MarkCompleteApiBooking = {
  id?: string;
  status?: string;
  completedAt?: string | null;
  canMarkComplete?: boolean;
  guide?: { id?: string; name?: string; username?: string };
  activityName?: string;
};

/** Tourist confirms the paid tour has finished. */
export async function markTouristBookingComplete(bookingId: string): Promise<{
  msg: string;
  booking: MarkCompleteApiBooking | undefined;
}> {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(
    `${API_URL}/api/tourist/bookings/${encodeURIComponent(bookingId)}/complete`,
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
      typeof data.msg === "string" ? data.msg : "Could not mark booking as completed"
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const bookingRaw = data.booking;
  const booking =
    bookingRaw && typeof bookingRaw === "object" && !Array.isArray(bookingRaw)
      ? (bookingRaw as MarkCompleteApiBooking)
      : undefined;

  return {
    msg: typeof data.msg === "string" ? data.msg : "Booking marked as completed",
    booking,
  };
}
