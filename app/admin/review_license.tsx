import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

const BASE_URL = "http://192.168.1.77:5000";

type LicenseData = {
  user: {
    id: string;
    username: string;
    email: string;
    expertise: string[];
  };
  license: {
    status: string;
    fileUrl: string;
    submittedAt: string;
  };
};

export default function ReviewLicense() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [data, setData] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    fetchLicense();
  }, []);

  const fetchLicense = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch(
        `${BASE_URL}/api/license/${userId}/view`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.msg);

      setData(json);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load license");
    } finally {
      setLoading(false);
    }
  };

  const approveLicense = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(
        `${BASE_URL}/api/license/${userId}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.msg);

      Alert.alert("Success", "License approved");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Approval failed");
    }
  };

  const rejectLicense = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Reason required", "Please enter a rejection reason");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(
        `${BASE_URL}/api/license/${userId}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rejectionReason: rejectReason }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.msg);

      Alert.alert("Rejected", "License rejected successfully");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Rejection failed");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>License Review</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Personal Detail */}
        <Text style={styles.sectionTitle}>Personal Detail</Text>

        <View style={styles.card}>
          <Detail label="Name" value={data.user.username} />
          <Detail label="Email" value={data.user.email} />
          <Detail
            label="Expertise"
            value={data.user.expertise.join(", ")}
          />
        </View>

        {/* Document */}
        <Text style={styles.sectionTitle}>Documents</Text>

        <TouchableOpacity onPress={() => setPreviewVisible(true)}>
          <Image
            source={{ uri: data.license.fileUrl }}
            style={styles.document}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 6 }}
          onPress={() =>
            WebBrowser.openBrowserAsync(data.license.fileUrl)
          }
        >
          <Text style={{ color: "#007BFF", fontSize: 12 }}>
            Open / Download Document
          </Text>
        </TouchableOpacity>

        <Text style={styles.docTitle}>Tour Guide License</Text>
        <Text style={styles.docSub}>
          Uploaded {new Date(data.license.submittedAt).toDateString()}
        </Text>

        {/* Reject Reason */}
        <TextInput
          placeholder="Rejection reason (required if rejecting)"
          style={styles.input}
          value={rejectReason}
          onChangeText={setRejectReason}
          multiline
        />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={rejectLicense}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={approveLicense}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Full Screen Preview */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewContainer}>
          <Pressable
            style={styles.previewClose}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>

          <Image
            source={{ uri: data.license.fileUrl }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    marginTop: 20,
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#EEF6FF",
    borderRadius: 12,
    padding: 14,
  },

  row: {
    flexDirection: "row",
    marginBottom: 10,
  },

  label: {
    width: 90,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },

  value: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#444",
    flexShrink: 1,
  },

  document: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#EEE",
  },

  docTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    marginTop: 8,
  },

  docSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#777",
  },

  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 10,
    minHeight: 70,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
  },

  actions: {
    flexDirection: "row",
    marginTop: 24,
  },

  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#FF4D4F",
    borderRadius: 25,
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 10,
  },

  rejectText: {
    color: "#FF4D4F",
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },

  acceptBtn: {
    flex: 1,
    backgroundColor: "#007BFF",
    borderRadius: 25,
    paddingVertical: 10,
    alignItems: "center",
    marginLeft: 10,
  },

  acceptText: {
    color: "#FFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },

  previewContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },

  previewImage: {
    width: "100%",
    height: "85%",
  },

  previewClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
});
