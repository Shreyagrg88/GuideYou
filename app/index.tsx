import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { redirectIfAuthenticated } from "../utils/authSession";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (await redirectIfAuthenticated(router)) {
        return;
      }
      if (cancelled) return;
      router.replace("/getstarted");
    };

    const timer = setTimeout(() => {
      void boot();
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

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
