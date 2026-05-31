/**
 * Index
 * Route: /
 *
 * Splash screen (route: /). Shows logo for 2s, then checks AsyncStorage for JWT and sends user to their role home or /getstarted.
 */

import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { redirectIfAuthenticated } from "../utils/authSession";

export default function SplashScreen() {
  const router = useRouter();

  // --- Effects (load data, listeners) ---
  useEffect(() => {
    let cancelled = false; // prevents navigation if user leaves splash early

    const boot = async () => {
      // If token exists, redirectIfAuthenticated sends user to tourist/guide/admin home
      if (await redirectIfAuthenticated(router)) {
        return;
      }
      if (cancelled) return;
      // No session — show marketing entry screen
      router.replace("/getstarted");
    };

    // Wait 2 seconds so branding is visible before routing
    const timer = setTimeout(() => {
      void boot();
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  // --- Render --- (logo + app name only; no buttons on splash)
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets//images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.appName}>
        Guide<Text style={{ color: "#007BFF" }}>You</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 125,
    height: 125,
    marginBottom: 50,
  },
  appName: {
    fontFamily: "Nunito_400Regular",
    fontSize: 26,
    color: "#000",
  },
});
