import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PLATFORM_TERMS_INTRO,
  PLATFORM_TERMS_SECTIONS,
} from "../constants/platformTerms";
import { clearAuthSession, replaceWithRoleHome } from "../utils/authSession";
import { resetToGuideOnboarding } from "../utils/onboardingNav";
import { persistPlatformTermsAcceptance } from "../utils/platformTerms";

export default function PlatformAgreementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    userId?: string;
    role?: string;
    flow?: string;
  }>();
  const userId = String(params.userId ?? "").trim();
  const role = String(params.role ?? "").trim();
  const flow = String(params.flow ?? "signup").trim();

  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const continueAfterAgreement = () => {
    if (flow === "resume") {
      replaceWithRoleHome(router, role);
      return;
    }

    if (role === "tourist") {
      if (router.canDismiss?.()) router.dismissAll();
      router.replace({
        pathname: "/tourist/interest_tourist",
        params: { userId },
      });
      return;
    }

    if (role === "guide") {
      resetToGuideOnboarding(router, "/guide/expertise_guide", { userId });
      return;
    }

    Alert.alert("Error", "Unable to continue. Please sign up again.");
    router.replace("/signup");
  };

  const handleAgree = async () => {
    if (!agreed || submitting) return;

    if (!userId || (role !== "tourist" && role !== "guide")) {
      Alert.alert("Error", "Missing account details. Please sign up again.");
      router.replace("/signup");
      return;
    }

    try {
      setSubmitting(true);
      await persistPlatformTermsAcceptance(userId);
      continueAfterAgreement();
    } catch {
      Alert.alert("Error", "Could not save your agreement. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline terms?",
      "You need to accept the platform terms to use GuideYou.",
      [
        { text: "Go back", style: "cancel" },
        {
          text: "I do not agree",
          style: "destructive",
          onPress: async () => {
            await clearAuthSession();
            if (router.canDismiss?.()) router.dismissAll();
            router.replace("/signup");
          },
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 12) + 12,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <Text style={styles.title}>Terms & Agreement</Text>
      <Text style={styles.subtitle}>{PLATFORM_TERMS_INTRO}</Text>

      <ScrollView
        style={styles.termsBox}
        contentContainerStyle={styles.termsContent}
        showsVerticalScrollIndicator
      >
        {PLATFORM_TERMS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setAgreed((prev) => !prev)}
        activeOpacity={0.8}
        disabled={submitting}
      >
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the terms above
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, (!agreed || submitting) && styles.buttonDisabled]}
        onPress={handleAgree}
        disabled={!agreed || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleDecline} disabled={submitting}>
        <Text style={styles.declineText}>I do not agree</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 30,
  },
  title: {
    fontFamily: "Nunito_700Bold",
    fontSize: 28,
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#444",
    lineHeight: 22,
    marginBottom: 20,
  },
  termsBox: {
    flex: 1,
    backgroundColor: "#F2F6FA",
    borderRadius: 10,
    marginBottom: 20,
  },
  termsContent: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#000",
    marginBottom: 4,
  },
  sectionBody: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#007BFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#007BFF",
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#000",
  },
  button: {
    backgroundColor: "#007BFF",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#fff",
  },
  declineText: {
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    color: "#777",
    fontSize: 14,
  },
});
