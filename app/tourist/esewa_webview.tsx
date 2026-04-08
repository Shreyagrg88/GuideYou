import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { API_URL } from "../../constants/api";
import { SkeletonBlock } from "../components/Skeleton";

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_MS = 60000;
const FAILURE_BACK_DELAY_MS = 2000;

/** eSewa v2 form params (all string for form fields) */
type EsewaParams = {
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

/** Build form from API params only — same values backend used to sign (no reformatting, no booking.price). */
function buildPostFormHtml(gatewayUrl: string, params: EsewaParams): string {
  const escape = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const inputs = Object.entries(params)
    .map(([k, v]) => {
      const raw = String(v ?? "");
      return `<input type="hidden" name="${escape(k)}" value="${escape(raw)}" />`;
    })
    .join("");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>eSewa</title></head>
<body>
<form id="esewaForm" method="POST" action="${escape(gatewayUrl)}">
${inputs}
</form>
<script>document.getElementById('esewaForm').submit();</script>
<p style="font-family:sans-serif;padding:20px;">Redirecting to eSewa…</p>
</body>
</html>
  `.trim();
}

export default function EsewaWebViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    bookingId?: string;
    formUrl?: string;
    gatewayUrl?: string;
    paramsJson?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const redirectHandledRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDeadlineRef = useRef<number>(0);

  const bookingId = Array.isArray(params.bookingId)
    ? params.bookingId[0]
    : params.bookingId;

  const formUrl = params.formUrl ?? "";
  const gatewayUrl = params.gatewayUrl ?? "";
  let esewaParams: EsewaParams | null = null;
  try {
    if (params.paramsJson) {
      esewaParams = JSON.parse(params.paramsJson) as EsewaParams;
    }
  } catch (_) {}

  const html =
    gatewayUrl && esewaParams
      ? buildPostFormHtml(gatewayUrl, esewaParams)
      : "<html><body><p>Missing payment data.</p></body></html>";

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const goBackSafe = useCallback(() => {
    clearPoll();
    if (failureTimeoutRef.current) {
      clearTimeout(failureTimeoutRef.current);
      failureTimeoutRef.current = null;
    }
    setConfirmingPayment(false);
    router.back();
  }, [clearPoll, router]);

  const pollUntilPaid = useCallback(() => {
    if (!bookingId) {
      goBackSafe();
      return;
    }
    setConfirmingPayment(true);
    pollDeadlineRef.current = Date.now() + POLL_MAX_MS;

    const tick = async () => {
      if (Date.now() > pollDeadlineRef.current) {
        clearPoll();
        setConfirmingPayment(false);
        router.back();
        return;
      }
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          goBackSafe();
          return;
        }
        const res = await fetch(`${API_URL}/api/tourist/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.booking?.status === "paid") {
          clearPoll();
          setConfirmingPayment(false);
          router.back();
        }
      } catch {
        // keep polling until timeout
      }
    };

    void tick();
    pollTimerRef.current = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);
  }, [bookingId, clearPoll, goBackSafe, router]);

  useEffect(() => {
    return () => {
      clearPoll();
      if (failureTimeoutRef.current) {
        clearTimeout(failureTimeoutRef.current);
        failureTimeoutRef.current = null;
      }
    };
  }, [clearPoll]);

  const handleNavigationStateChange = useCallback(
    (navState: { url?: string }) => {
      const url = navState.url ?? "";
      if (redirectHandledRef.current) return;

      if (url.includes("payment-success")) {
        redirectHandledRef.current = true;
        pollUntilPaid();
        return;
      }

      if (url.includes("payment-failed")) {
        redirectHandledRef.current = true;
        failureTimeoutRef.current = setTimeout(() => {
          failureTimeoutRef.current = null;
          goBackSafe();
        }, FAILURE_BACK_DELAY_MS);
      }
    },
    [goBackSafe, pollUntilPaid]
  );

  // Prefer server-rendered formUrl (avoids signature issues through client routing)
  if (!formUrl && (!gatewayUrl || !esewaParams)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>eSewa Payment</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Missing payment data. Go back and try again.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>eSewa Payment</Text>
        <View style={styles.backBtn} />
      </View>
      {loading && (
        <View style={styles.loadingWrap}>
          <SkeletonBlock width="85%" height={36} borderRadius={8} style={{ marginBottom: 16 }} />
          <SkeletonBlock width="100%" height={420} borderRadius={12} />
          <Text style={styles.loadingText}>Loading eSewa…</Text>
        </View>
      )}
      {confirmingPayment && (
        <View style={styles.confirmingWrap} pointerEvents="box-none">
          <SkeletonBlock width="85%" height={36} borderRadius={8} style={{ marginBottom: 16 }} />
          <SkeletonBlock width="100%" height={200} borderRadius={12} style={{ marginBottom: 16 }} />
          <Text style={styles.confirmingTitle}>Confirming payment</Text>
          <Text style={styles.confirmingSub}>
            Waiting for your booking to update. This may take a few seconds.
          </Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={formUrl ? { uri: formUrl } : { html }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  webview: {
    flex: 1,
  },
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  confirmingWrap: {
    ...StyleSheet.absoluteFillObject,
    top: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 28,
  },
  confirmingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },
  confirmingSub: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
