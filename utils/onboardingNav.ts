import { Router } from "expo-router";

export const GUIDE_ONBOARDING_ROUTES = [
  "/guide/expertise_guide",
  "/guide/verification",
  "/guide/verification_status",
] as const;

export type GuideOnboardingRoute = (typeof GUIDE_ONBOARDING_ROUTES)[number];

export function isGuideOnboardingRoute(pathname: string): boolean {
  return GUIDE_ONBOARDING_ROUTES.some(
    (route) => pathname === route || pathname.endsWith(route)
  );
}

/** Clear navigation history and land on a single onboarding screen. */
export function resetToGuideOnboarding(
  router: Router,
  pathname: GuideOnboardingRoute,
  params?: Record<string, string>
) {
  if (router.canDismiss?.()) {
    router.dismissAll();
  }
  if (params && Object.keys(params).length > 0) {
    router.replace({ pathname, params });
  } else {
    router.replace(pathname);
  }
}

/** Finish onboarding and open the guide home with a clean stack. */
export function resetToGuideHome(router: Router) {
  if (router.canDismiss?.()) {
    router.dismissAll();
  }
  router.replace("/guide/home_guide");
}
