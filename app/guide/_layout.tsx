import { Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { BackHandler, Platform } from "react-native";

export default function GuideLayout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS === "android") {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          // If on home page, exit the app
          if (pathname === "/guide/home_guide" || pathname.includes("home_guide")) {
            BackHandler.exitApp();
            return true;
          }

          // For other pages, allow normal back navigation
          if (router.canGoBack()) {
            router.back();
            return true;
          }

          // If can't go back, navigate to home
          router.push("/guide/home_guide");
          return true;
        }
      );

      return () => backHandler.remove();
    }
  }, [pathname, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true, // Allow swipe back on iOS for normal navigation
      }}
    />
  );
}

