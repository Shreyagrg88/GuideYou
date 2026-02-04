import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../../constants/api";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

export default function LicenseUpload() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
      });

      if (!result.canceled && result.assets?.length > 0) {
        const pdf = result.assets[0];
        setSelectedFile({
          uri: pdf.uri,
          name: pdf.name,
          type: "application/pdf",
        });
      }
    } catch (error) {
      console.error("PDF pick error:", error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const img = result.assets[0];
        setSelectedFile({
          uri: img.uri,
          name: "license.jpg",
          type: "image/jpeg",
        });
      }
    } catch (error) {
      console.error("Image pick error:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Alert.alert("Error", "Please upload a license file");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("license", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
      } as any);

      const response = await fetch(
        `${API_URL}/api/license/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.msg || "Failed to upload license");
        return;
      }

      Alert.alert(
        "Success",
        "License submitted for verification. Review within 48 hours."
      );

      router.replace({
        pathname: "/guide/verification_status",
        params: { userId: userId },
      });

    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your License</Text>

      <Text style={styles.subtitle}>
        Build trust with tourists by verifying your official tour guide license.
      </Text>

      <View style={styles.uploadCard}>
        <Text style={styles.uploadText}>Upload License (Image or PDF)</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadButtonText}>Upload Image</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadButton} onPress={pickPDF}>
            <Text style={styles.uploadButtonText}>Upload PDF</Text>
          </TouchableOpacity>
        </View>

        {selectedFile && (
          <Text style={styles.selectedFile}>
            Selected: {selectedFile.name}
          </Text>
        )}
      </View>

      <Text style={styles.securityText}>Your data is handled securely.</Text>

      <TouchableOpacity
        style={[styles.submitButton, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? "Submitting..." : "Submit for Verification"}
        </Text>
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
    backgroundColor: "#fff",
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 30,
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
    fontFamily: "Nunito_400Regular",
  },

  uploadCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  uploadText: {
    fontSize: 16,
    marginBottom: 20,
    color: "#333",
    fontFamily: "Nunito_700Bold",
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },

  uploadButton: {
    backgroundColor: "#E8F1FF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  uploadButtonText: {
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
  },

  selectedFile: {
    marginTop: 15,
    fontSize: 14,
    color: "#007BFF",
    fontFamily: "Nunito_400Regular",
  },

  securityText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Nunito_400Regular",
  },

  submitButton: {
    backgroundColor: "#007BFF",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 15,
  },

  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },

  reviewText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontFamily: "Nunito_400Regular",
  },
});
