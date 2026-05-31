import AsyncStorage from "@react-native-async-storage/async-storage";
import { Router } from "expo-router";
import { PLATFORM_TERMS_VERSION } from "../constants/platformTerms";

const TERMS_ACCEPTANCE_PREFIX = "platformTermsAccepted:";

export type StoredTermsAcceptance = {
  version: string;
  acceptedAt: string;
};

function termsStorageKey(userId: string): string {
  return `${TERMS_ACCEPTANCE_PREFIX}${userId.trim()}`;
}

export async function getStoredTermsAcceptance(
  userId: string
): Promise<StoredTermsAcceptance | null> {
  if (!userId.trim()) return null;
  try {
    const raw = await AsyncStorage.getItem(termsStorageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredTermsAcceptance;
  } catch {
    return null;
  }
}

export async function hasAcceptedCurrentPlatformTerms(
  userId: string
): Promise<boolean> {
  const stored = await getStoredTermsAcceptance(userId);
  return stored?.version === PLATFORM_TERMS_VERSION;
}

export async function persistPlatformTermsAcceptance(userId: string) {
  if (!userId.trim()) return;
  const payload: StoredTermsAcceptance = {
    version: PLATFORM_TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(termsStorageKey(userId), JSON.stringify(payload));
}

/** Send tourist/guide users to the agreement screen when they have not accepted yet. */
export async function ensurePlatformTermsAccepted(
  router: Router,
  userId: string,
  role: string,
  flow: "signup" | "resume" = "resume"
): Promise<boolean> {
  if (role !== "tourist" && role !== "guide") return true;
  if (!userId.trim()) return true;

  const accepted = await hasAcceptedCurrentPlatformTerms(userId);
  if (accepted) return true;

  if (router.canDismiss?.()) router.dismissAll();
  router.replace({
    pathname: "/platform-agreement",
    params: { userId, role, flow },
  });
  return false;
}
