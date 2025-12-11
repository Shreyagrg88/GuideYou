import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function VerificationStatus() {
  const router = useRouter();

  const [status, setStatus] = useState<"submitted" | "viewed" | "verified">(
    "submitted"
  );

  const fetchStatus = async () => {
    try {
      console.log("API will be added later");
    } catch (error) {
      console.log("Status fetch error:", error);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const isActive = (step: string) => {
    if (status === "submitted" && step === "submitted") return true;
    if (status === "viewed" && (step === "submitted" || step === "viewed"))
      return true;
    if (status === "verified") return true;
    return false;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Verification Status</Text>
        <View style={{ width: 24, position: "absolute", right: 0 }} />
      </View>

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

          {/* Viewed */}
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

          {/* Verified */}
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
              <Text style={styles.statusDesc}>Pending final approval</Text>
            </View>
          </View>

        </View>
      </View>

      <Text style={styles.bottomMessage}>
        Your documents are being{"\n"}reviewed.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F2FF",
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    position: "relative",
    marginTop: 30,
  },

  headerTitle: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: "#000",
  },

  card: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 35,
    paddingHorizontal: 25,
    borderRadius: 20,
    alignSelf: "center",
    width: "100%",           
    minHeight: "60%",        
    justifyContent: "center",
  },

  timelineContainer: {
    flexDirection: "column",
    gap: 30,                 
  },

  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  dotActive: {
    width: 18,
    height: 18,
    borderRadius: 20,
    backgroundColor: "#007BFF",
    marginRight: 20,
    marginTop: 5,
  },

  dotInactive: {
    width: 18,
    height: 18,
    borderRadius: 20,
    backgroundColor: "#BDBDBD",
    marginRight: 20,
    marginTop: 5,
  },

  line: {
    width: 2,
    height: 60,
    backgroundColor: "#BDBDBD",
    alignSelf: "flex-start",
    marginLeft: 9,
  },

  textContainer: {
    flexShrink: 1,
  },

  statusTitleActive: {
    color: "#007BFF",
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  statusTitleInactive: {
    color: "#999",
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  statusDesc: {
    fontSize: 14,
    marginTop: 3,
    color: "#666",
    fontFamily: "Nunito_400Regular",
    width: "90%",            

  },

  bottomMessage: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    lineHeight: 22,
  },
});
