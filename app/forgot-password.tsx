import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
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
} from "../api/auth";
import { isValidEmail, normalizeEmail } from "../utils/authValidation";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSubmit = async () => {
    const trimmed = normalizeEmail(email);
    if (!trimmed) {
      setErrorMessage("Please enter your email");
      return;
    }

    if (!isValidEmail(trimmed)) {
      setErrorMessage("Please enter a valid email");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setNotFound(false);
      const data = await requestPasswordReset(trimmed);
      const expires = data.expiresInMinutes ?? 15;
      router.push({
        pathname: "/reset-password",
        params: {
          email: trimmed,
          expiresInMinutes: String(expires),
          sentMsg: `${data.msg} The code is valid for ${expires} minutes.`,
        },
      });
    } catch (err) {
      const is404 = err instanceof AuthApiError && err.status === 404;
      const is429 = err instanceof AuthApiError && err.status === 429;
      const message = getAuthErrorMessage(err, "Unable to send reset code");
      setErrorMessage(message);
      setNotFound(is404);
      if (!is404 && !is429) {
        Alert.alert("Error", message);
      }
    } finally {
      setLoading(false);
    }
  };

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

          <Text style={styles.title}>Forgot password</Text>
          <Text style={styles.subtitle}>
            Enter the email linked to your account. We will send a
            6-digit reset code valid for 15 minutes.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (errorMessage) {
                setErrorMessage(null);
                setNotFound(false);
              }
            }}
            editable={!loading}
          />

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
              <View style={styles.errorContent}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                {notFound ? (
                  <Link href="/signup" asChild>
                    <TouchableOpacity style={styles.signupLink} disabled={loading}>
                      <Text style={styles.signupLinkText}>Create an account</Text>
                    </TouchableOpacity>
                  </Link>
                ) : null}
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending..." : "Send reset code"}
            </Text>
          </TouchableOpacity>

          <Link href="/login" replace asChild>
            <TouchableOpacity disabled={loading}>
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
    marginBottom: 40,
    lineHeight: 22,
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
  button: {
    backgroundColor: "#007BFF",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 25,
  },
  buttonDisabled: { opacity: 0.6 },
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
  errorContent: {
    flex: 1,
  },
  errorText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#b91c1c",
    lineHeight: 20,
  },
  signupLink: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  signupLinkText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#007BFF",
  },
});
