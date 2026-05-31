/**
 * API Configuration
 *
 * Backend default port: 5001. Set EXPO_PUBLIC_API_URL in `.env` for physical devices
 * or iOS simulator (e.g. http://192.168.1.5:5001). Defaults to Android emulator host.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || "http://10.0.2.2:5001";

