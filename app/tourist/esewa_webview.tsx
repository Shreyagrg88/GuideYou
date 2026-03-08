import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

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
  const webViewRef = useRef<WebView>(null);

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

  const handleNavigationStateChange = (navState: { url?: string }) => {
    const url = navState.url ?? "";
    if (url.includes("payment-success") || url.includes("payment-failed")) {
      router.back();
    }
  };

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
          <ActivityIndicator size="large" color="#1B8BFF" />
          <Text style={styles.loadingText}>Loading eSewa…</Text>
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
