import { Alert } from "react-native";
import { cancelTouristBooking, formatCancelSuccessMessage } from "../api/refundPolicy";
import { bookingNprTotal } from "./bookingPrice";
import { buildCancelConfirmDialog, isPaidBookingForRefund } from "./refundPolicy";

export type CancelBookingContext = {
  bookingId: string;
  status: string;
  paymentStatus?: string | null;
  paidAt?: string | null;
  price: number;
  priceNpr?: number;
  startDate: string;
};

export function showCancelBookingConfirm(
  ctx: CancelBookingContext,
  onSuccess: (message: string) => void | Promise<void>,
  onError?: (message: string) => void
): void {
  const isPaid = isPaidBookingForRefund(ctx);
  const priceNpr = bookingNprTotal({ price: ctx.price, priceNpr: ctx.priceNpr });
  const dialog = buildCancelConfirmDialog(isPaid, priceNpr, ctx.startDate);

  Alert.alert(dialog.title, dialog.message, [
    { text: "No", style: "cancel" },
    {
      text: dialog.confirmLabel,
      style: "destructive",
      onPress: async () => {
        try {
          const result = await cancelTouristBooking(ctx.bookingId);
          const msg = formatCancelSuccessMessage(result);
          await onSuccess(msg);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to cancel booking";
          if (onError) onError(message);
          else Alert.alert("Error", message);
        }
      },
    },
  ]);
}
