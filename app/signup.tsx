import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

  const handleSignup = async () => {
    if (!role || !username || !email || !password || !confirmPassword) {
      alert("Please fill in all fields!");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/signup",
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
        alert(data.message || "Signup failed!");
        return;
      }

      alert("Signup Successful!");

      if (role === "tourist") {
        router.push("/tourist/interest_tourist");
      } else {
        router.push("/guide/expertise_guide");
      }
    } catch (err) {
      alert("Network error. Please try again.");
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
