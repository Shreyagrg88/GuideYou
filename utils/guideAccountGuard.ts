import AsyncStorage from "@react-native-async-storage/async-storage";
import { Router } from "expo-router";
import { StoredAuthUser } from "./authSession";

export const GUIDE_ACCOUNT_STATUS_KEY = "guideAccountStatus";

export type DisabledGuidePayload = {
  accountStatus?: string;
  disableReason?: string;
  disabledAt?: string;
  canSubmitAppeal?: boolean;
  openAppealId?: string | null;
  openAppealStatus?: string | null;
};

export function isDisabledGuidePayload(
  body: Record<string, unknown> | null | undefined
): boolean {
  return body?.accountStatus === "disabled";
}

export function isGuideLoginDisabled(
  data: Record<string, unknown> | null | undefined
): boolean {
  if (!data) return false;
  if (data.accountDisabled === true) return true;
  const user = data.user as StoredAuthUser | undefined;
  return user?.accountStatus === "disabled";
}

export async function markGuideAccountDisabled(): Promise<void> {
  await AsyncStorage.setItem(GUIDE_ACCOUNT_STATUS_KEY, "disabled");
}

export async function clearGuideAccountDisabled(): Promise<void> {
  await AsyncStorage.removeItem(GUIDE_ACCOUNT_STATUS_KEY);
}

export async function isGuideAccountDisabledStored(): Promise<boolean> {
  const v = await AsyncStorage.getItem(GUIDE_ACCOUNT_STATUS_KEY);
  return v === "disabled";
}

export function replaceWithAccountDisabled(router: Router): void {
  if (router.canDismiss?.()) {
    router.dismissAll();
  }
  router.replace("/guide/account-disabled" as never);
}

/** Returns true when the caller should stop processing (redirected). */
export async function handleGuideForbiddenIfDisabled(
  router: Router,
  res: Response,
  body: Record<string, unknown>
): Promise<boolean> {
  if (res.status === 403 && isDisabledGuidePayload(body)) {
    await markGuideAccountDisabled();
    replaceWithAccountDisabled(router);
    return true;
  }
  return false;
}

export async function parseJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { msg: text.trim() };
  }
}

/** Fetch wrapper for guide routes — redirects on 403 disabled. */
export async function guideFetch(
  router: Router,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 403) {
    const body = await parseJsonOrEmpty(res.clone());
    if (await handleGuideForbiddenIfDisabled(router, res, body)) {
      throw new Error("Guide account disabled");
    }
  }
  return res;
}
