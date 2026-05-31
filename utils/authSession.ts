import AsyncStorage from "@react-native-async-storage/async-storage";
import { Router } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import { API_URL } from "../constants/api";
import {
  GUIDE_ACCOUNT_STATUS_KEY,
  isGuideAccountDisabledStored,
  replaceWithAccountDisabled,
} from "./guideAccountGuard";

export const ROLE_HOME_ROUTES = {
  tourist: "/tourist/home_tourist",
  guide: "/guide/home_guide",
  admin: "/admin/home_admin",
} as const;

export const AUTH_STORAGE_KEYS = [
  "token",
  "user",
  "role",
  "userRole",
  "userId",
  "guideAccountStatus",
] as const;

export type StoredAuthUser = {
  id?: string;
  username?: string;
  email?: string;
  fullName?: string;
  name?: string;
  role?: string;
  avatar?: string;
  accountStatus?: string;
};

export function pickStoredUserId(
  user: StoredAuthUser | Record<string, unknown> | null | undefined
): string {
  if (!user || typeof user !== "object") return "";
  const raw = user as Record<string, unknown>;
  for (const key of ["id", "_id", "userId"]) {
    const v = raw[key];
    if (v == null) continue;
    if (typeof v === "object" && v !== null && "$oid" in v) {
      const oid = (v as { $oid?: string }).$oid;
      if (oid && String(oid).trim()) return String(oid).trim();
    }
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

export async function persistAuthSession(token: string, user: StoredAuthUser) {
  const userId = pickStoredUserId(user);
  await AsyncStorage.multiSet([
    ["token", token],
    ["user", JSON.stringify(user)],
    ["userRole", user.role ?? ""],
    ["userId", userId],
    ["role", user.role ?? ""],
  ]);
}

/** JWT from login/signup payloads (supports common backend field names). */
export function pickAuthToken(
  data: Record<string, unknown> | null | undefined
): string {
  if (!data || typeof data !== "object") return "";
  for (const key of ["token", "accessToken", "access_token", "jwt"]) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<{ token: string; user: StoredAuthUser } | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;

    const token = pickAuthToken(data as Record<string, unknown>);
    const user = (data as { user?: StoredAuthUser }).user;
    if (!token || !user) return null;

    return { token, user };
  } catch {
    return null;
  }
}

/**
 * After signup, ensure token + user are stored. Uses signup token when present,
 * otherwise signs in with the same email/password (many backends omit JWT on signup).
 */
export async function establishSessionAfterSignup(
  signupData: Record<string, unknown>,
  email: string,
  password: string,
  fallbackRole?: string
): Promise<{ userId: string; user: StoredAuthUser; token: string } | null> {
  const signupUser = signupData.user as StoredAuthUser | undefined;
  const userIdFromSignup = pickStoredUserId(signupUser);
  if (!userIdFromSignup && !signupUser) {
    return null;
  }

  let token = pickAuthToken(signupData);
  let user: StoredAuthUser | undefined = signupUser;

  if (!token || !user) {
    const login = await loginWithCredentials(email, password);
    if (!login) return null;
    token = login.token;
    user = login.user;
  }

  const mergedUser: StoredAuthUser = {
    ...user,
    role: user.role || fallbackRole || "",
  };

  await persistAuthSession(token, mergedUser);

  const userId = pickStoredUserId(mergedUser) || userIdFromSignup;
  if (!userId) return null;

  return { userId, user: mergedUser, token };
}

export async function getStoredAuthUser(): Promise<StoredAuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

export async function clearAuthSession() {
  await AsyncStorage.multiRemove([...AUTH_STORAGE_KEYS]);
}

export function getHomeRouteForRole(
  role: string | null | undefined
): string | null {
  if (role === "tourist") return ROLE_HOME_ROUTES.tourist;
  if (role === "guide") return ROLE_HOME_ROUTES.guide;
  if (role === "admin") return ROLE_HOME_ROUTES.admin;
  return null;
}

/** Replace the navigation stack with the user's home screen after login. */
export function replaceWithRoleHome(router: Router, role: string) {
  const home = getHomeRouteForRole(role);
  if (!home) return;
  if (router.canDismiss?.()) {
    router.dismissAll();
  }
  router.replace(home as never);
}

/** Send logged-in users to their home screen (login, get started, splash). */
export async function redirectIfAuthenticated(router: Router): Promise<boolean> {
  const token = await AsyncStorage.getItem("token");
  if (!token) return false;

  const role = await AsyncStorage.getItem("userRole");
  if (role === "guide" && (await isGuideAccountDisabledStored())) {
    replaceWithAccountDisabled(router);
    return true;
  }

  const home = getHomeRouteForRole(role);
  if (!home) return false;

  if (router.canDismiss?.()) {
    router.dismissAll();
  }
  router.replace(home as never);
  return true;
}

export function useRedirectIfAuthenticated(router: Router) {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await redirectIfAuthenticated(router);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
}

export function confirmLogout(router: Router) {
  Alert.alert("Logout", "Are you sure you want to logout?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Logout",
      style: "destructive",
      onPress: async () => {
        await clearAuthSession();
        if (router.canDismiss?.()) {
          router.dismissAll();
        }
        router.replace("/login");
      },
    },
  ]);
}
