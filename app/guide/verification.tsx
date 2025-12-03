import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";

export default function LicenseVerification() {
  const router = useRouter();

  const [file, setFile] = useState<{
    uri: string;
    type: "image" | "pdf";
    name?: string;
  } | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your gallery.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFile({
        uri: result.assets[0].uri,
        type: "image",
        name: result.assets[0].fileName || "image.jpg",
      });
    }
  };


  const pickPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });

    if (!result.canceled && result.assets?.length > 0) {
      const pdf = result.assets[0];
      setFile({
        uri: pdf.uri,
        type: "pdf",
        name: pdf.name || "document.pdf",
      });
    }
  };


  const handleSubmit = () => {
    if (!file) {
      Alert.alert("Upload needed", "Please upload your license first.");
      return;
    }

    Alert.alert("Submitted", "Your license has been submitted.");

    router.push("/guide/verification_status");
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
        {file ? (
          file.type === "image" ? (
            <Image
              source={{ uri: file.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={{ alignItems: "center" }}>
              <Ionicons name="document-text-outline" size={50} color="#007BFF" />
              <Text style={{ marginTop: 10 }}>{file.name}</Text>
            </View>
          )
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="cloud-upload-outline" size={40} color="#007BFF" />
            <Text style={styles.placeholderText}>
              Upload License (Image or PDF)
            </Text>
          </View>
        )}

        <View style={{ flexDirection: "row", marginTop: 15 }}>
          <TouchableOpacity style={styles.chooseFileBtn} onPress={pickImage}>
            <Text style={styles.chooseFileText}>Upload Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chooseFileBtn, { marginLeft: 10 }]}
            onPress={pickPDF}
          >
            <Text style={styles.chooseFileText}>Upload PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.privacyText}>Your data is handled securely.</Text>

      {/* Submit */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
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
    fontSize: 25,
    fontFamily: "Nunito_700Bold",
  },
  title: {
    fontSize: 24,
    fontFamily: "Nunito_700Bold",
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
    fontFamily: "Nunito_700Bold",

  },
  chooseFileBtn: {
    backgroundColor: "#e5efff",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    fontFamily: "Nunito_700Bold",
  },
  chooseFileText: {
    color: "#007BFF",
    fontFamily: "Nunito_400Regular",
  },
  previewImage: {
    width: 250,
    height: 150,
    borderRadius: 10,
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
    fontFamily: "Nunito_700Bold",
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
