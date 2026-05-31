import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { registerPushToken } from "../api/notifications";
import { API_URL } from "../constants/api";
import {
  persistAuthSession,
  pickStoredUserId,
  replaceWithRoleHome,
  useRedirectIfAuthenticated,
} from "../utils/authSession";
import {
  markGuideAccountDisabled,
  replaceWithAccountDisabled,
  clearGuideAccountDisabled,
} from "../utils/guideAccountGuard";
import {
  resetToGuideOnboarding,
} from "../utils/onboardingNav";
import {
  normalizeEmail,
  validateLoginForm,
} from "../utils/authValidation";
import { ensurePlatformTermsAccepted } from "../utils/platformTerms";
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

export default function Login() {
  const router = useRouter();
  useRedirectIfAuthenticated(router);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    const validationError = validateLoginForm(email, password);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.msg || "Invalid credentials");
        return;
      }

      const { user, token } = data;

      if (!token || !user) {
        Alert.alert("Error", "Invalid server response");
        return;
      }

      await persistAuthSession(token, user);

      if (user.role === "tourist" || user.role === "guide" || user.role === "admin") {
        registerPushToken(token);
      }

      const userId = pickStoredUserId(user);

      if (user.role === "tourist") {
        if (
          userId &&
          !(await ensurePlatformTermsAccepted(router, userId, user.role))
        ) {
          return;
        }
        replaceWithRoleHome(router, user.role);
        return;
      }

      if (user.role === "admin") {
        replaceWithRoleHome(router, user.role);
        return;
      }

      if (user.role !== "guide") {
        Alert.alert("Error", "Unknown role");
        return;
      }

      if (data.accountDisabled === true || user.accountStatus === "disabled") {
        await markGuideAccountDisabled();
        replaceWithAccountDisabled(router);
        return;
      }

      await clearGuideAccountDisabled();


      let hasLicenseFile = false;
      let licenseStatus: string | null = null;

      try {
        const licenseResponse = await fetch(`${API_URL}/api/license/status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (licenseResponse.ok) {
          const licenseData = await licenseResponse.json();

          if (licenseData.license?.file) {
            hasLicenseFile = true;
            licenseStatus = licenseData.license.status;
          }
        }
      } catch (error) {
        console.error("License check failed:", error);
      }

      if (!hasLicenseFile) {
        Alert.alert(
          "License Required",
          "You must upload and verify your license before accessing the app."
        );
        resetToGuideOnboarding(router, "/guide/verification");
        return;
      }

      if (licenseStatus !== "approved") {
        resetToGuideOnboarding(router, "/guide/verification_status");
        return;
      }

      if (
        userId &&
        !(await ensurePlatformTermsAccepted(router, userId, user.role))
      ) {
        return;
      }

      replaceWithRoleHome(router, user.role);

    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Welcome back</Text>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#777"
          keyboardType="email-address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (errorMessage) setErrorMessage(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          editable={!loading}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#777"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errorMessage) setErrorMessage(null);
            }}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#777"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotContainer}
          onPress={() => router.push("/forgot-password")}
        >
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/signup")}>
          <Text style={styles.linkText}>
            Don't have an account?{" "}
            <Text style={styles.linkHighlight}>Signup</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
    paddingVertical: 40,
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
    marginBottom: 40,
  },
  input: {
    backgroundColor: "#F2F6FA",
    borderRadius: 10,
    padding: 14,
    fontFamily: "Nunito_400Regular",
    marginBottom: 15,
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
  },
  eyeIcon: {
    padding: 14,
    paddingLeft: 0,
  },
  forgotContainer: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgot: {
    fontFamily: "Nunito_400Regular",
    color: "#007BFF",
    fontSize: 13,
  },
  button: {
    backgroundColor: "#007BFF",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 25,
  },
  buttonText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  linkText: {
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    color: "#000",
  },
  linkHighlight: {
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
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
