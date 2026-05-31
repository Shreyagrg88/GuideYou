export const MIN_PASSWORD_LENGTH = 8;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function trimUsername(value: string): string {
  return value.trim();
}

export function isValidEmail(value: string): boolean {
  const normalized = normalizeEmail(value);
  return normalized.length > 0 && EMAIL_REGEX.test(normalized);
}

export function validateUsername(value: string): string | null {
  const trimmed = trimUsername(value);
  if (!trimmed) return "Please enter a username";
  if (/\s/.test(value)) return "Username cannot contain spaces";
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return `Username must be at most ${MAX_USERNAME_LENGTH} characters`;
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Username can only contain letters, numbers, and underscores";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Please enter a password";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): string | null {
  if (password !== confirmPassword) return "Passwords do not match";
  return null;
}

export function validateLoginForm(email: string, password: string): string | null {
  if (!email.trim() || !password) return "Please fill in all fields";
  if (!isValidEmail(email)) return "Please enter a valid email";
  return null;
}

export function validateSignupForm(params: {
  role: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): string | null {
  if (
    !params.role ||
    !params.username.trim() ||
    !params.email.trim() ||
    !params.password ||
    !params.confirmPassword
  ) {
    return "Please fill in all fields";
  }

  const usernameError = validateUsername(params.username);
  if (usernameError) return usernameError;

  if (!isValidEmail(params.email)) {
    return "Please enter a valid email address";
  }

  const passwordError = validatePassword(params.password);
  if (passwordError) return passwordError;

  const matchError = validatePasswordMatch(params.password, params.confirmPassword);
  if (matchError) return matchError;

  return null;
}
