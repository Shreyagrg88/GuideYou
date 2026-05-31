/**
 * Reset-Password
 * Route: /reset-password
 *
 * Enter OTP + new password. POST /api/auth/reset-password.
 */

import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AuthApiError,
  getAuthErrorMessage,
  requestPasswordReset,
  resetPasswordWithOtp,
} from "../api/auth";
import {
  isValidEmail,
  normalizeEmail,
  validatePassword,
  validatePasswordMatch,
} from "../utils/authValidation";

const RESEND_COOLDOWN_SEC = 60;

function paramOne(v: string | string[] | undefined): string {
  if (v == null) return "";
  return String(Array.isArray(v) ? v[0] : v).trim();
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    email?: string | string[];
    expiresInMinutes?: string | string[];
    sentMsg?: string | string[];
  }>();

  const initialEmail = paramOne(params.email);
  const initialSentMsg = paramOne(params.sentMsg);

  // --- Local state ---
  const [expiresMinutes, setExpiresMinutes] = useState(() =>
    Math.max(1, Number(paramOne(params.expiresInMinutes) || "15") || 15)
  );

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(
    initialEmail ? RESEND_COOLDOWN_SEC : 0
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    initialSentMsg || null
  );

  // --- Effects (load data, listeners) ---
  useEffect(() => {
    if (!initialEmail) {
      router.replace("/forgot-password");
    }
  }, [initialEmail, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const onOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
  }, []);

  // --- Handlers ---
  const handleReset = async () => {
    const trimmedEmail = normalizeEmail(email);
    const trimmedOtp = otp.trim();

    if (!trimmedEmail || !trimmedOtp || !password || !confirmPassword) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage("Please enter a valid email");
      return;
    }

    if (trimmedOtp.length !== 6) {
      setErrorMessage("Enter the 6-digit code from your email");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    const matchError = validatePasswordMatch(password, confirmPassword);
    if (matchError) {
      setErrorMessage(matchError);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await resetPasswordWithOtp({
        email: trimmedEmail,
        otp: trimmedOtp,
        password,
        confirmPassword,
      });
      Alert.alert("Success", data.msg, [
        { text: "Login", onPress: () => router.replace("/login") },
      ]);
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err, "Unable to reset password"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    const trimmedEmail = normalizeEmail(email);
    if (!trimmedEmail) {
      Alert.alert("Error", "Enter your email first");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    try {
      setResending(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const data = await requestPasswordReset(trimmedEmail);
      const expires = data.expiresInMinutes ?? expiresMinutes;
      setExpiresMinutes(expires);
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setOtp("");
      setSuccessMessage(
        `${data.msg} Your new code is valid for ${expires} minutes.`
      );
    } catch (err) {
      const message = getAuthErrorMessage(err, "Unable to resend code");
      setErrorMessage(message);
      if (err instanceof AuthApiError && err.status === 429) {
        setResendCooldown(RESEND_COOLDOWN_SEC);
      }
    } finally {
      setResending(false);
    }
  };

  const resendLabel =
    resendCooldown > 0
      ? `Resend code in ${resendCooldown}s`
      : resending
        ? "Sending..."
        : "Resend code";

  if (!initialEmail) {
    return null;
  }

  // --- Render ---
  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>

          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code from your email and choose a new password (at least 8
            characters).
          </Text>

          <View style={styles.infoBanner}>
            <Ionicons name="time-outline" size={18} color="#007BFF" />
            <Text style={styles.infoText}>
              Codes expire after {expiresMinutes} minutes. You can request a new code every
              60 seconds.
            </Text>
          </View>

          {successMessage ? (
            <View style={styles.successBanner}>
              <Ionicons name="mail-outline" size={18} color="#15803d" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, styles.emailReadOnly]}
            placeholder="Email"
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            editable={false}
          />

          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="6-digit code"
            placeholderTextColor="#777"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            value={otp}
            onChangeText={(value) => {
              onOtpChange(value);
              if (errorMessage) setErrorMessage(null);
              if (successMessage) setSuccessMessage(null);
            }}
            editable={!loading}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="New password"
              placeholderTextColor="#777"
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errorMessage) setErrorMessage(null);
              }}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeIcon}
              hitSlop={8}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#777" />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm new password"
              placeholderTextColor="#777"
              secureTextEntry={!showConfirmPassword}
              textContentType="newPassword"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (errorMessage) setErrorMessage(null);
              }}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((v) => !v)}
              style={styles.eyeIcon}
              hitSlop={8}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={20}
                color="#777"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Updating..." : "Update password"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending || resendCooldown > 0 || loading}
            style={styles.resendButton}
          >
            <Text
              style={[
                styles.linkHighlight,
                (resending || resendCooldown > 0) && styles.linkMuted,
              ]}
            >
              {resendLabel}
            </Text>
          </TouchableOpacity>

          <Link href="/login" replace asChild>
            <TouchableOpacity style={styles.loginLink} disabled={loading}>
              <Text style={styles.linkText}>
                Back to <Text style={styles.linkHighlight}>Login</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
  },
  backButton: {
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  title: {
    fontFamily: "Nunito_700Bold",
    fontSize: 28,
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#444",
    marginBottom: 16,
    lineHeight: 22,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E8F1FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  successText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#15803d",
    lineHeight: 20,
  },
  input: {
    backgroundColor: "#F2F6FA",
    borderRadius: 10,
    padding: 14,
    fontFamily: "Nunito_400Regular",
    marginBottom: 15,
    fontSize: 16,
    color: "#000",
  },
  otpInput: {
    letterSpacing: 4,
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
  },
  emailReadOnly: {
    opacity: 0.85,
    color: "#334155",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F6FA",
    borderRadius: 10,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#000",
  },
  eyeIcon: {
    padding: 14,
    paddingLeft: 0,
  },
  button: {
    backgroundColor: "#007BFF",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  resendButton: {
    alignItems: "center",
    marginBottom: 20,
  },
  loginLink: {
    alignItems: "center",
  },
  linkText: {
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    color: "#000",
  },
  linkHighlight: {
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },
  linkMuted: {
    color: "#94a3b8",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  errorText: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#b91c1c",
    lineHeight: 20,
  },
});
