import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type LicenseStatus = "pending" | "viewed" | "approved" | "rejected";

export default function VerificationStatus() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [status, setStatus] = useState<LicenseStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch(
        `http://192.168.1.67:5000/api/license/status/${userId}`
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.msg || "Failed to fetch status");
        return;
      }

      // Handle different response structures
      // Backend may return: { status: "pending" } or { license: { status: "pending" } }
      const statusValue = data.status || data.license?.status;
      const rejectionReasonValue = data.rejectionReason || data.license?.rejectionReason;
      
      if (!statusValue) {
        Alert.alert("Error", "Invalid license status response");
        return;
      }

      setStatus(statusValue);
      setRejectionReason(rejectionReasonValue || null);
    } catch (error) {
      console.error("Status fetch error:", error);
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const isActive = (step: "submitted" | "viewed" | "verified") => {
    if (status === "pending") return step === "submitted";
    if (status === "viewed")
      return step === "submitted" || step === "viewed";
    if (status === "approved") return true;
    if (status === "rejected")
      return step === "submitted" || step === "viewed";
    return false;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>
          Checking verification status...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Verification Status</Text>

        <View style={styles.card}>
          <View style={styles.timelineContainer}>
            <View style={styles.timelineItem}>
              <View
                style={isActive("submitted") ? styles.dotActive : styles.dotInactive}
              />
              <View style={styles.textContainer}>
                <Text
                  style={
                    isActive("submitted")
                      ? styles.statusTitleActive
                      : styles.statusTitleInactive
                  }
                >
                  Submitted
                </Text>
                <Text style={styles.statusDesc}>
                  Your document has been submitted successfully
                </Text>
              </View>
            </View>

            <View style={styles.line} />

            <View style={styles.timelineItem}>
              <View
                style={isActive("viewed") ? styles.dotActive : styles.dotInactive}
              />
              <View style={styles.textContainer}>
                <Text
                  style={
                    isActive("viewed")
                      ? styles.statusTitleActive
                      : styles.statusTitleInactive
                  }
                >
                  Viewed
                </Text>
                <Text style={styles.statusDesc}>
                  Our team has started the review
                </Text>
              </View>
            </View>

            <View style={styles.line} />

            <View style={styles.timelineItem}>
              <View
                style={isActive("verified") ? styles.dotActive : styles.dotInactive}
              />
              <View style={styles.textContainer}>
                <Text
                  style={
                    isActive("verified")
                      ? styles.statusTitleActive
                      : styles.statusTitleInactive
                  }
                >
                  Verified
                </Text>
                <Text style={styles.statusDesc}>
                  Pending final approval
                </Text>
              </View>
            </View>
          </View>
        </View>

        {status === "approved" ? (
          <>
            <Text style={styles.approvedMessage}>
              Your license has been{"\n"}verified successfully!
            </Text>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.push("/guide/home_guide")}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        ) : status === "rejected" ? (
          <>
            <View style={styles.rejectionCard}>
              <Text style={styles.rejectionTitle}>License Rejected</Text>
              <Text style={styles.rejectionMessage}>
                Your license application has been rejected. Please review the reason below and upload a new license.
              </Text>
              {rejectionReason && (
                <View style={styles.reasonContainer}>
                  <Text style={styles.reasonLabel}>Rejection Reason:</Text>
                  <Text style={styles.reasonText}>{rejectionReason}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => router.push("/guide/verification")}
              activeOpacity={0.8}
            >
              <Text style={styles.uploadButtonText}>Upload New License</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.bottomMessage}>
            Your documents are being{"\n"}reviewed.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F2FF",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 20,
  },
  timelineContainer: {
    gap: 30,
  },
  timelineItem: {
    flexDirection: "row",
  },
  dotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#007BFF",
    marginRight: 20,
    marginTop: 4,
  },
  dotInactive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#BDBDBD",
    marginRight: 20,
    marginTop: 4,
  },
  line: {
    width: 2,
    height: 60,
    backgroundColor: "#BDBDBD",
    marginLeft: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusTitleActive: {
    fontSize: 18,
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
  },
  statusTitleInactive: {
    fontSize: 18,
    color: "#999",
    fontFamily: "Nunito_700Bold",
  },
  statusDesc: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontFamily: "Nunito_400Regular",
  },
  bottomMessage: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  approvedMessage: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#007BFF",
  },
  continueButton: {
    backgroundColor: "#007BFF",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 20,
    alignSelf: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontFamily: "Nunito_400Regular",
  },
  rejectionCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  rejectionTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#DC2626",
    marginBottom: 10,
    textAlign: "center",
  },
  rejectionMessage: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 20,
  },
  reasonContainer: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  reasonLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#333",
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#666",
    lineHeight: 18,
  },
  uploadButton: {
    backgroundColor: "#007BFF",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 20,
    alignSelf: "center",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
});
