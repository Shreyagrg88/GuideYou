import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router"; // 👈 import router hook

export default function GetStarted() {
  const router = useRouter(); // 👈 initialize router

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Get Started</Text>

      <Image
        source={require("../assets/images/suitcase.png")}
        style={styles.image}
        resizeMode="contain"
      />

      <Text style={styles.subtitle}>
        Complete your travel journey with{" "}
        <Text>
              Guide<Text style={{ color: "#007BFF" }}>You</Text>
              </Text>
      </Text>

      {/* 👇 Navigate to Login page */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      {/* 👇 Navigate to Signup page */}
      <TouchableOpacity onPress={() => router.push("/signup")}>
        <Text style={styles.link}>Create an Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  title: {
    fontFamily: "Nunito_700Bold",
    fontSize: 24,
    marginBottom: 20,
    color: "#000",
  },
  image: {
    width: 300,
    height: 300,
  },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
    color: "#000",
  },
  button: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    width: "100%",
    borderRadius: 25,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    fontSize: 16,
  },
  link: {
    fontFamily: "Nunito_400Regular",
    marginTop: 15,
    color: "#007BFF",
    fontSize: 16,
  },
});
