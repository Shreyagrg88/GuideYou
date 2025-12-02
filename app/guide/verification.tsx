import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

export default function LicenseVerification() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  
  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to gallery.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>License Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <Ionicons
        name="shield-checkmark-outline"
        size={60}
        color="#007BFF"
        style={{ alignSelf: "center", marginBottom: 15 }}
      />

      <Text style={styles.title}>Verify Your License</Text>
      <Text style={styles.subtitle}>
        Build trust with tourists by verifying your official tour guide license.
      </Text>

      <View style={styles.uploadBox}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons
                name="cloud-upload-outline"
                size={40}
                color="#007BFF"
              />
              <Text style={styles.placeholderText}>
                Tap to upload photo or scan
              </Text>

              <TouchableOpacity
                style={styles.chooseFileBtn}
                onPress={pickImage}
              >
                <Text style={styles.chooseFileText}>Choose File</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.privacyText}>
        Your data is handled securely.
      </Text>

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={() => {
          if (Platform.OS === "web") {
            alert("Your license is submitted.");
          } else {
            Alert.alert("Submitted", "Your license is submitted.");
          }
        }}
      >
        <Text style={styles.submitText}>Submit for Verification</Text>
      </TouchableOpacity>

      <Text style={styles.reviewText}>
        Your submission will be reviewed within 48 hours.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F7FF",
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Nunito_400Regular",
  },
  title: {
    fontSize: 24,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    color: "#000",
  },
  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
    fontFamily: "Nunito_400Regular",
  },
  uploadBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8e2f1",
    alignItems: "center",
    marginBottom: 10,
  },
  placeholder: {
    alignItems: "center",
    paddingVertical: 25,
  },
  placeholderText: {
    marginTop: 10,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  chooseFileBtn: {
    backgroundColor: "#e5efff",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chooseFileText: {
    color: "#007BFF",
    fontFamily: "Nunito_400Regular",
  },
  previewImage: {
    width: 250,
    height: 150,
    borderRadius: 10,
    resizeMode: "cover",
  },
  submitButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 20,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
  },
  privacyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 10,
    fontSize: 12,
  },
  reviewText: {
    textAlign: "center",
    marginTop: 15,
    color: "#777",
    fontSize: 13,
  },
});
