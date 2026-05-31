import { API_URL } from "../constants/api";

export class AuthApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { msg: text.trim() };
  }
}

export type ForgotPasswordResponse = {
  msg: string;
  expiresInMinutes?: number;
};

export type ResetPasswordResponse = {
  msg: string;
};

/** Maps AuthApiError to user-facing copy (404 / 429 use backend msg when present). */
export function getAuthErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) {
    if (err.status === 429) {
      return (
        err.message ||
        "Please wait a minute before requesting another reset code."
      );
    }
    if (err.status === 404) {
      return (
        err.message ||
        "No account found with this email. Please sign up or try another email."
      );
    }
    return err.message || fallback;
  }
  return fallback;
}

/** POST /api/auth/forgot-password — request a 6-digit reset code (15 min validity). */
export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  } catch {
    throw new AuthApiError("Network error. Check your connection and try again.");
  }

  const data = await readJson(res);
  const msg = String(data.msg || "Something went wrong");

  if (!res.ok) {
    throw new AuthApiError(msg, res.status);
  }

  return {
    msg,
    expiresInMinutes:
      typeof data.expiresInMinutes === "number" ? data.expiresInMinutes : undefined,
  };
}

/** POST /api/auth/reset-password — set a new password using email + OTP. */
export async function resetPasswordWithOtp(params: {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
}): Promise<ResetPasswordResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        otp: params.otp.trim(),
        password: params.password,
        confirmPassword: params.confirmPassword,
      }),
    });
  } catch {
    throw new AuthApiError("Network error. Check your connection and try again.");
  }

  const data = await readJson(res);
  const msg = String(data.msg || "Something went wrong");

  if (!res.ok) {
    throw new AuthApiError(msg, res.status);
  }

  return { msg };
}
