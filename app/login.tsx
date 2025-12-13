import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://192.168.1.77:5000/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Login Failed", data.msg || "Invalid credentials");
        return;
      }

      const { user, token } = data;

      if (!token || !user) {
        Alert.alert("Error", "Invalid server response");
        return;
      }

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("userRole", user.role);
      await AsyncStorage.setItem("userId", user.id);


      if (user.role === "tourist") {
        router.push("/tourist/home_tourist");
        return;
      }

      if (user.role === "admin") {
        router.push("/admin/home_admin");
        return;
      }

      if (user.role !== "guide") {
        Alert.alert("Error", "Unknown role");
        return;
      }


      let hasLicenseFile = false;
      let licenseStatus: string | null = null;
      let submittedAt: string | null = null;

      try {
        const licenseResponse = await fetch(
          `http://192.168.1.77:5000/api/license/status/${user.id}`
        );

        if (licenseResponse.ok) {
          const licenseData = await licenseResponse.json();

          if (licenseData.license?.file) {
            hasLicenseFile = true;
            licenseStatus = licenseData.license.status;
            submittedAt = licenseData.license.submittedAt;
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
        router.push({
          pathname: "/guide/verification",
          params: { userId: user.id },
        });
        return;
      }

      // 2️⃣ License pending / rejected
      if (licenseStatus !== "approved") {
        router.push({
          pathname: "/guide/verification_status",
          params: {
            userId: user.id,
            licenseStatus,
            submittedAt,
          },
        });
        return;
      }

      // 3️⃣ License approved
      router.push("/guide/home_guide");

    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Network Error", "Please try again later");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Welcome back</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#777"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#777"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.forgotContainer}>
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
          Don’t have an account?{" "}
          <Text style={styles.linkHighlight}>Signup</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 30,
    justifyContent: "center",
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
});
