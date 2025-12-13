import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function Signup() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const roles = [
    { id: "guide", label: "Guide" },
    { id: "tourist", label: "Tourist" },
  ];

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    // Validate all fields are filled
    if (!role || !username || !email || !password || !confirmPassword) {
      Alert.alert("Validation Error", "Please fill in all fields!");
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      Alert.alert("Validation Error", "Please enter a valid email address!");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters long!");
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match!");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://192.168.1.77:5000/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            username,
            email,
            password,
            confirmPassword
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
        if (errorLower.includes("email") && (errorLower.includes("exist") || errorLower.includes("already") || errorLower.includes("use"))) {
          errorMessage = "This email is already in use. Please use a different email or try logging in.";
        } else if (errorLower.includes("password") && (errorLower.includes("short") || errorLower.includes("length") || errorLower.includes("minimum"))) {
          errorMessage = "Password is too short. Please use at least 6 characters.";
        } else if (errorLower.includes("username") && (errorLower.includes("exist") || errorLower.includes("already") || errorLower.includes("taken"))) {
          errorMessage = "This username is already taken. Please choose a different username.";
        }

        Alert.alert("Signup Failed", errorMessage);
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        Alert.alert("Error", "Signup successful but user ID not found. Please try again.");
        return;
      }

      Alert.alert("Success", "Signup Successful!");

      if (role === "tourist") {
        router.replace({
          pathname: "/tourist/interest_tourist",
          params: { userId: userId },
        });
      } else {
        router.replace({
          pathname: "/guide/expertise_guide",
          params: { userId: userId },
        });
      }
    } catch (err) {
      console.error("Signup error:", err);
      Alert.alert("Network Error", "Unable to connect to the server. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup</Text>
      <Text style={styles.subtitle}>Make account</Text>

      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.8}
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
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#777"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#777"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#777"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

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
});
