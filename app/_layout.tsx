import AsyncStorage from "@react-native-async-storage/async-storage";
import { isExpoGo, navigateFromNotification, registerPushToken } from "../api/notifications";
import { useFonts, Nunito_400Regular, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { SkeletonAppBoot } from "./components/Skeleton";
import { Stack } from "expo-router";

export default function Layout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
  });

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
        const data = response.notification.request.content.data as { type?: string; relatedId?: string } | undefined;
        const type = data?.type ?? "";
        const relatedId = data?.relatedId ?? null;
        AsyncStorage.getItem("userRole").then((r) => {
          const appRole =
            r === "guide" ? "guide" : r === "admin" ? "admin" : "tourist";
          navigateFromNotification(router, appRole, type, relatedId);
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

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
