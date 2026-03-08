import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type EsewaPaymentInit = {
  gatewayUrl: string;
  formUrl?: string;
  params: {
    amount: string;
    tax_amount: string;
    total_amount: string;
    transaction_uuid: string;
    product_code: string;
    product_service_charge: string;
    product_delivery_charge: string;
    success_url: string;
    failure_url: string;
    signed_field_names: string;
    signature: string;
  };
};

/**
 * Start eSewa payment for an accepted booking.
 * Returns gatewayUrl and params to open in WebView.
 */
export async function initiateEsewaPayment(bookingId: string): Promise<EsewaPaymentInit> {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/api/payment/esewa/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bookingId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.msg || "Failed to start payment");
  }

  const payment = data.payment;
  if (!payment?.gatewayUrl || !payment?.params) {
    throw new Error("Invalid payment response");
  }

  // eSewa v2: backend must sign exactly total_amount,transaction_uuid,product_code (that order). We pass params unchanged.
  const p = payment.params;
  return {
    gatewayUrl: payment.gatewayUrl,
    formUrl: typeof payment.formUrl === "string" ? payment.formUrl : undefined,
    params: {
      amount: String(p.amount ?? ""),
      tax_amount: String(p.tax_amount ?? 0),
      total_amount: String(p.total_amount ?? ""),
      transaction_uuid: String(p.transaction_uuid ?? ""),
      product_code: String(p.product_code ?? ""),
      product_service_charge: String(p.product_service_charge ?? 0),
      product_delivery_charge: String(p.product_delivery_charge ?? 0),
      success_url: String(p.success_url ?? ""),
      failure_url: String(p.failure_url ?? ""),
      signed_field_names: String(p.signed_field_names ?? ""),
      signature: String(p.signature ?? ""),
    },
  };
}
