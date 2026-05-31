import { Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import { isGuideOnboardingRoute } from "../../utils/onboardingNav";
import {
  isGuideAccountDisabledStored,
  replaceWithAccountDisabled,
} from "../../utils/guideAccountGuard";

const ONBOARDING_SCREEN_OPTIONS = {
  gestureEnabled: false,
  headerShown: false,
} as const;

export default function GuideLayout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.includes("account-disabled")) return;

    void (async () => {
      const disabled = await isGuideAccountDisabledStored();
      if (disabled) {
        replaceWithAccountDisabled(router);
      }
    })();
  }, [pathname, router]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isGuideOnboardingRoute(pathname)) {
          return true;
        }

        if (pathname.includes("account-disabled")) {
          BackHandler.exitApp();
          return true;
        }

        if (
          pathname === "/guide/home_guide" ||
          pathname.includes("home_guide")
        ) {
          BackHandler.exitApp();
          return true;
        }

        if (router.canGoBack()) {
          router.back();
          return true;
        }

        router.replace("/guide/home_guide");
        return true;
      }
    );

    return () => backHandler.remove();
  }, [pathname, router]);

  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen
        name="account-disabled"
        options={{ gestureEnabled: false, headerShown: false }}
      />
      <Stack.Screen
        name="expertise_guide"
        options={ONBOARDING_SCREEN_OPTIONS}
      />
      <Stack.Screen name="verification" options={ONBOARDING_SCREEN_OPTIONS} />
      <Stack.Screen
        name="verification_status"
        options={ONBOARDING_SCREEN_OPTIONS}
      />
    </Stack>
  );
}
