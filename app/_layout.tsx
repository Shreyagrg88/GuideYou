/**
 *  Layout
 * Route: /_layout
 *
 * Root app layout. Loads fonts, wraps app in Stack navigator for all routes.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { isExpoGo, navigateFromNotification, registerPushToken } from "../api/notifications";
import { pickEntityId } from "../utils/activityRejection";
import { useFonts, Nunito_400Regular, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { SkeletonAppBoot } from "@/components/Skeleton";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
  });

  // --- Effects (load data, listeners) ---
  useEffect(() => {
    if (isExpoGo()) return;
    let sub: { remove: () => void } | null = null;
    (async () => {
      const Notifications = await import("expo-notifications");
      const token = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("userRole");
      if (token && (role === "tourist" || role === "guide" || role === "admin")) {
        registerPushToken(token);
      }
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        const type = String(data?.type ?? "");
        const relatedRaw =
          data?.relatedId ?? data?.related_id ?? data?.activityId ?? data?.activity_id;
        const relatedId = pickEntityId(relatedRaw) || null;
        const relatedTypeRaw = data?.relatedType ?? data?.related_type;
        const relatedType =
          relatedTypeRaw != null && String(relatedTypeRaw).trim()
            ? String(relatedTypeRaw).trim()
            : null;
        AsyncStorage.getItem("userRole").then((r) => {
          const appRole =
            r === "guide" ? "guide" : r === "admin" ? "admin" : "tourist";
          navigateFromNotification(router, appRole, type, relatedId, relatedType);
        });
      });
    })();
    return () => {
      if (sub) sub.remove();
    };
  }, [router]);

  if (!fontsLoaded) {
    return <SkeletonAppBoot />;
  }

  // --- Render ---
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
