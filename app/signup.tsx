/**
 * Signup
 * Route: /signup
 *
 * Registration. POST /api/auth/signup for tourist or guide role, then platform agreement and onboarding.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { registerPushToken } from "../api/notifications";
import { API_URL } from "../constants/api";
import {
  establishSessionAfterSignup,
  pickStoredUserId,
} from "../utils/authSession";
import {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  trimUsername,
  validateSignupForm,
} from "../utils/authValidation";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function Signup() {
  const router = useRouter();

  // --- Local state ---
  const [role, setRole] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roles = [
    { id: "guide", label: "Guide" },
    { id: "tourist", label: "Tourist" },
  ];

  const clearError = () => {
    if (errorMessage) setErrorMessage(null);
  };

  // --- Handlers ---
  const handleSignup = async () => {
    const validationError = validateSignupForm({
      role,
      username,
      email,
      password,
      confirmPassword,
    });
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const trimmedUsername = trimUsername(username);

    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await fetch(
        `${API_URL}/api/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            username: trimmedUsername,
            email: normalizedEmail,
            password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = "Signup failed! Please try again.";

        if (data.msg) {
          errorMessage = data.msg;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (typeof data === "string") {
          errorMessage = data;
        }

        const errorLower = errorMessage.toLowerCase();
        if (
          errorLower.includes("email") &&
          (errorLower.includes("exist") ||
            errorLower.includes("already") ||
            errorLower.includes("use"))
        ) {
          errorMessage =
            "This email is already in use. Please use a different email or try logging in.";
        } else if (
          errorLower.includes("password") &&
          (errorLower.includes("short") ||
            errorLower.includes("length") ||
            errorLower.includes("minimum"))
        ) {
          errorMessage = `Password is too short. Please use at least ${MIN_PASSWORD_LENGTH} characters.`;
        } else if (
          errorLower.includes("username") &&
          (errorLower.includes("exist") ||
            errorLower.includes("already") ||
            errorLower.includes("taken"))
        ) {
          errorMessage =
            "This username is already taken. Please choose a different username.";
        }

        setErrorMessage(errorMessage);
        return;
      }

      const user = data.user;
      const userId = pickStoredUserId(user);

      if (!userId) {
        Alert.alert("Error", "Signup successful but user ID not found. Please try again.");
        return;
      }

      const session = await establishSessionAfterSignup(
        data as Record<string, unknown>,
        normalizedEmail,
        password,
        role
      );

      if (!session) {
        Alert.alert(
          "Account created",
          "Your account was created but automatic sign-in failed. Please log in with your email and password.",
          [{ text: "OK", onPress: () => router.replace("/login") }]
        );
        return;
      }

      if (
        session.user.role === "tourist" ||
        session.user.role === "guide" ||
        session.user.role === "admin"
      ) {
        registerPushToken(session.token);
      }

      if (router.canDismiss?.()) router.dismissAll();
      router.replace({
        pathname: "/platform-agreement",
        params: { userId: session.userId, role, flow: "signup" },
      });
    } catch (err) {
      console.error("Signup error:", err);
      setErrorMessage(
        "Network error. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
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
        <Text style={styles.title}>Signup</Text>
        <Text style={styles.subtitle}>Make account</Text>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.8}
        disabled={loading}
      >
        <Text style={[styles.dropdownText, { color: role ? "#000" : "#777" }]}>
          {role ? role.charAt(0).toUpperCase() + role.slice(1) : "Select Role"}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#007BFF" />
      </TouchableOpacity>

      <Modal visible={showDropdown} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View style={styles.overlay}>
            <View style={styles.dropdownList}>
              <FlatList
                data={roles}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      item.id === role && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setRole(item.id);
                      setShowDropdown(false);
                      clearError();
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        item.id === role && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#777"
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          clearError();
        }}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#777"
        keyboardType="email-address"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearError();
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
          textContentType="newPassword"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearError();
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

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirm Password"
          placeholderTextColor="#777"
          secureTextEntry={!showConfirmPassword}
          textContentType="newPassword"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            clearError();
          }}
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-off" : "eye"}
            size={20}
            color="#777"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Signing up..." : "Signup"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.linkText}>
          Already have an account?{" "}
          <Text style={styles.linkHighlight}>Login</Text>
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
    marginBottom: 30,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F2F6FA",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 15,
  },
  dropdownText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 40,
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  dropdownItemSelected: {
    backgroundColor: "#E8F1FF",
  },
  dropdownItemText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#000",
  },
  dropdownItemTextSelected: {
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
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
  button: {
    backgroundColor: "#007BFF",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25,
  },
  buttonText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#fff",
  },
  linkText: {
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    color: "#000",
    fontSize: 14,
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
