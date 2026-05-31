import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../../constants/api";
import {
  ITINERARY_DAY_MAX_CHARS,
  normalizeItineraryDaysFromApi,
} from "../../utils/itineraryDays";
import {
  isActivityRejectedStatus,
  parseActivityFromResponse,
  pickRejectionReason,
  pickRouteParam,
} from "../../utils/activityRejection";

import LocationAutocomplete from "@/components/locationAutocomplete";

const ACCENT_BLUE = "#007BFF";

/** Section title with theme blue bullet (matches app primary actions). */
function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.sectionLabelRow, style]}>
      <View style={styles.sectionLabelBullet} />
      <Text style={styles.sectionLabelText}>{children}</Text>
    </View>
  );
}

const CATEGORY_OPTIONS = [
  "Adventure",
  "Culture",
  "Food",
  "Night Life",
  "Photography",
  "Shopping",
  "Music",
  "Sports",
  "Art",
  "History",
  "Nature",
  "Local Experiences",
  "Hiking",
  "Festivals",
  "Architecture",
] as const;

export default function AddNewActivity() {
  const params = useLocalSearchParams<{ activityId?: string | string[] }>();
  const editingId = pickRouteParam(params.activityId);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [equipment, setEquipment] = useState("");

  const [category, setCategory] = useState<string | null>(null);

  const [duration, setDuration] = useState(3);
  /** One free-text plan per day; length always matches `duration`. */
  const [itineraryDays, setItineraryDays] = useState<string[]>(() =>
    Array.from({ length: 3 }, () => "")
  );
  const [difficulty, setDifficulty] = useState("Moderate");
  /** New local images only (edit mode keeps server paths separately). */
  const [photos, setPhotos] = useState<string[]>([]);
  const [existingServerPhotos, setExistingServerPhotos] = useState<string[]>([]);
  const [formReady, setFormReady] = useState(!editingId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activityStatus, setActivityStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const isRejectedEdit = isActivityRejectedStatus(activityStatus);

  const loadActivityForEdit = useCallback(async () => {
    if (!editingId) {
      setFormReady(true);
      setLoadError(null);
      return;
    }

    setFormReady(false);
    setLoadError(null);

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setLoadError("Please sign in again to edit this activity.");
        return;
      }

      const res = await fetch(`${API_URL}/api/activities/${editingId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json().catch(() => ({}));
      const a = parseActivityFromResponse(data);

      if (!res.ok || !a) {
        setLoadError(
          (typeof data.msg === "string" && data.msg) ||
            "Could not load this activity."
        );
        return;
      }

      const dur =
        typeof a.duration === "number"
          ? a.duration
          : parseInt(String(a.duration), 10) || 3;
      setName(String(a.name ?? ""));
      setLocation(String(a.location ?? ""));
      setDescription(String(a.description ?? ""));
      setEquipment(a.equipment != null ? String(a.equipment) : "");
      setCategory(a.category != null ? String(a.category) : null);
      setDuration(dur);
      setItineraryDays(
        normalizeItineraryDaysFromApi(
          a.itineraryDays ?? a.itinerary ?? a.dayPlans,
          dur
        )
      );
      setDifficulty(String(a.difficulty ?? "Moderate"));
      setExistingServerPhotos(Array.isArray(a.photos) ? (a.photos as string[]) : []);
      setPhotos([]);
      setActivityStatus(a.status != null ? String(a.status) : null);
      setRejectionReason(pickRejectionReason(a));
      setFormReady(true);
    } catch {
      setLoadError("Failed to load activity. Check your connection and try again.");
    }
  }, [editingId]);

  useEffect(() => {
    void loadActivityForEdit();
  }, [loadActivityForEdit]);

  useEffect(() => {
    setItineraryDays((prev) => {
      if (duration === prev.length) return prev;
      if (duration > prev.length) {
        return [
          ...prev,
          ...Array.from({ length: duration - prev.length }, () => ""),
        ];
      }
      return prev.slice(0, duration);
    });
  }, [duration]);

  const updateItineraryDay = (index: number, text: string) => {
    setItineraryDays((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) next[index] = text;
      return next;
    });
  };

  const totalPhotoCount = existingServerPhotos.length + photos.length;

  const pickImage = async () => {
    if (totalPhotoCount >= 10) {
      Alert.alert(
        "Photo Limit Reached",
        "You can upload a maximum of 10 photos."
      );
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to photos."
      );
      return;
    }

    const remainingSlots = 10 - totalPhotoCount;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map((img) => img.uri);
      setPhotos((prev) => [...prev, ...newImages].slice(0, remainingSlots));
    }
  };

  const publishActivity = async () => {
    if (!formReady) return;

    if (!name.trim() || !location.trim() || !description.trim() || !category) {
      Alert.alert(
        "Missing Fields",
        "Please fill in activity name, location, description, and category."
      );
      return;
    }

    if (description.trim().length < 20) {
      Alert.alert(
        "Description Too Short",
        "Please provide a detailed description (20+ characters)."
      );
      return;
    }

    const itineraryPayload = itineraryDays.slice(0, duration);
    if (itineraryPayload.length !== duration) {
      Alert.alert(
        "Itinerary mismatch",
        `Add plans for all ${duration} days (internal error: expected ${duration} entries).`
      );
      return;
    }
    for (let i = 0; i < itineraryPayload.length; i++) {
      const t = itineraryPayload[i].trim();
      if (!t) {
        Alert.alert(
          "Incomplete itinerary",
          `Day ${i + 1} cannot be empty. Describe what happens that day.`
        );
        return;
      }
      if (itineraryPayload[i].length > ITINERARY_DAY_MAX_CHARS) {
        Alert.alert(
          "Itinerary too long",
          `Day ${i + 1} must be at most ${ITINERARY_DAY_MAX_CHARS.toLocaleString()} characters.`
        );
        return;
      }
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert(
          "Authentication Error",
          "Please login again to continue."
        );
        setLoading(false);
        return;
      }

      const formData = new FormData();
      const isEdit = Boolean(editingId);

      formData.append("name", name.trim());
      formData.append("location", location.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("duration", duration.toString());
      formData.append("difficulty", difficulty);

      if (equipment.trim()) {
        formData.append("equipment", equipment.trim());
      }

      formData.append(
        "itineraryDays",
        JSON.stringify(itineraryPayload)
      );

      if (editingId && existingServerPhotos.length > 0) {
        formData.append("existingPhotoPaths", JSON.stringify(existingServerPhotos));
      }

      if (isEdit && isRejectedEdit) {
        formData.append("status", "pending_approval");
      }

      photos.slice(0, 10).forEach((uri, index) => {
        formData.append("photos", {
          uri,
          name: `photo_${index}.jpg`,
          type: "image/jpeg",
        } as any);
      });

      const url = isEdit
        ? `${API_URL}/api/activities/${editingId}`
        : `${API_URL}/api/activities`;
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      let data: any;

      try {
        data = await response.json();
      } catch {
        Alert.alert(
          "Server Error",
          `Server returned ${response.status}.`
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        Alert.alert(
          isEdit ? "Update failed" : "Publish Failed",
          data.msg || data.message || "Something went wrong."
        );
        setLoading(false);
        return;
      }

      const successTitle = isEdit
        ? isRejectedEdit
          ? "Resubmitted for review"
          : "Activity updated"
        : "Submitted for review";
      const successMsg = isEdit
        ? isRejectedEdit
          ? "Your activity has been sent back to admin for review. You'll be notified once it's approved."
          : "Your changes have been saved. If the activity is under admin review, updates may need re-approval depending on your server rules."
        : "Your activity has been sent for admin review. Once approved, it will be published and visible to tourists. If it's not approved, you'll see the reason in My Activities and can edit and resubmit.";

      Alert.alert(successTitle, successMsg, [
        {
          text: "OK",
          onPress: () => {
            if (!isEdit) {
              setName("");
              setLocation("");
              setDescription("");
              setEquipment("");
              setCategory(null);
              setDuration(3);
              setItineraryDays(Array.from({ length: 3 }, () => ""));
              setDifficulty("Moderate");
              setPhotos([]);
            }
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Error",
        "Failed to upload activity. Check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!formReady) {
    if (loadError) {
      return (
        <SafeAreaView style={styles.loadingSafe}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" style={{ marginTop: 40 }} />
          <Text style={styles.loadErrorTitle}>Could not load activity</Text>
          <Text style={styles.loadErrorText}>{loadError}</Text>
          <TouchableOpacity style={styles.loadErrorRetryBtn} onPress={() => void loadActivityForEdit()}>
            <Text style={styles.loadErrorRetryText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.loadErrorBackBtn} onPress={() => router.back()}>
            <Text style={styles.loadErrorBackText}>Go back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.loadingSafe}>
        <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 40 }} />
        <Text style={styles.loadingLabel}>Loading activity…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F7FF" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header — title centered, back on the left */}
          <View style={styles.titleRow}>
            <TouchableOpacity
              style={styles.titleBackBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={26} color="#000" />
            </TouchableOpacity>
            <View style={styles.titleCenter}>
              <Text style={styles.title} numberOfLines={1}>
                {editingId
                  ? isRejectedEdit
                    ? "Edit and resubmit"
                    : "Edit Activity"
                  : "New Activity"}
              </Text>
            </View>
            <View style={styles.titleRightSpacer} />
          </View>

          {isRejectedEdit ? (
            <View style={styles.rejectionBanner}>
              <View style={styles.rejectionBannerHeader}>
                <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                <Text style={styles.rejectionBannerTitle}>Admin feedback</Text>
              </View>
              <Text style={styles.rejectionBannerText}>
                {rejectionReason ||
                  "No specific reason was provided. Review your listing and resubmit when ready."}
              </Text>
              <Text style={styles.rejectionBannerHint}>
                Update the fields below, then save to send the activity for review again.
              </Text>
            </View>
          ) : null}

          {/* Activity Name */}
          <SectionLabel>Activity Name</SectionLabel>
          <TextInput
            style={styles.input}
            placeholder="Enter activity name"
            value={name}
            onChangeText={setName}
          />

          {/* Location */}
          <SectionLabel>Location</SectionLabel>
          <LocationAutocomplete
            value={location}
            onChangeText={setLocation}
            onSelect={(data) => setLocation(data.name)}
          />

          {/* Description */}
          <SectionLabel>Detailed Description</SectionLabel>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            multiline
            placeholder="Describe the activity in detail. Include what tourists can expect, highlights, and any important information..."
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />

          {/* Category — inline chips (no modal) */}
          <SectionLabel>Category</SectionLabel>
          <Text style={styles.categoryHint}>
            Tap one option below
          </Text>
          <View style={styles.categoryChipsWrap}>
            {CATEGORY_OPTIONS.map((cat) => {
              const selected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.85}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Photos */}
          <SectionLabel>Photo Gallery</SectionLabel>
          <Text style={styles.subText}>
            {existingServerPhotos.length > 0
              ? "Existing photos are kept unless your server replaces them. Add more below (max 10 total)."
              : "Upload high-quality images (max 10)."}
          </Text>

          <View style={styles.photoContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {existingServerPhotos.map((path, index) => (
                <Image
                  key={`ex-${index}`}
                  source={{
                    uri: path.startsWith("http") ? path : `${API_URL}${path}`,
                  }}
                  style={styles.photoPreview}
                />
              ))}
              {photos.map((uri, index) => (
                <Image
                  key={`new-${index}`}
                  source={{ uri }}
                  style={styles.photoPreview}
                />
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickImage}
            >
              <Ionicons
                name="image-outline"
                size={30}
                color="#007BFF"
              />
              <Text style={styles.photoButtonText}>Add photos</Text>
            </TouchableOpacity>
          </View>

          {/* Duration & Difficulty */}
          <View style={styles.durationBox}>
            <SectionLabel style={styles.sectionLabelInCard}>Duration</SectionLabel>

            <View style={styles.durationRow}>
              <TouchableOpacity
                style={styles.circleButton}
                onPress={() => duration > 1 && setDuration(duration - 1)}
              >
                <Text style={styles.circleButtonText}>–</Text>
              </TouchableOpacity>

              <Text style={styles.durationNumber}>{duration}</Text>

              <TouchableOpacity
                style={styles.circleButton}
                onPress={() => setDuration(duration + 1)}
              >
                <Text style={styles.circleButtonText}>+</Text>
              </TouchableOpacity>

              <Text style={styles.daysLabel}>Days</Text>
            </View>

            <SectionLabel style={styles.sectionLabelInCardSpacing}>
              Difficulty Level
            </SectionLabel>

            <View style={styles.diffRow}>
              {["Easy", "Moderate", "Hard"].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.diffButton,
                    difficulty === level && styles.diffActive,
                  ]}
                  onPress={() => setDifficulty(level)}
                >
                  <Text
                    style={[
                      styles.diffText,
                      difficulty === level && styles.diffTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <SectionLabel style={styles.sectionLabelInCardSpacing}>
              Equipment Needed
            </SectionLabel>
            <Text style={styles.subText}>
              Write each item on a new line (list format)
            </Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              placeholder={`• Hiking boots
• Water bottle
• Backpack
• Camera`}
              value={equipment}
              onChangeText={setEquipment}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.itineraryHeadingRow}>
            <View style={styles.sectionLabelBullet} />
            <Text style={styles.itineraryHeading}>
              Itinerary for {duration} {duration === 1 ? "day" : "days"}
            </Text>
          </View>
          <View style={styles.itineraryCard}>
            {itineraryDays.map((dayText, index) => (
              <View key={`day-${index}`} style={styles.itineraryDayBlock}>
                <View style={styles.itineraryDayLabelRow}>
                  <View style={styles.itineraryDayBullet} />
                  <Text style={styles.itineraryDayLabel}>Day {index + 1}</Text>
                </View>
                <TextInput
                  style={styles.itineraryDayField}
                  multiline
                  maxLength={ITINERARY_DAY_MAX_CHARS}
                  placeholder="Outline schedule, stops, and highlights for this day…"
                  value={dayText}
                  onChangeText={(t) => updateItineraryDay(index, t)}
                  textAlignVertical="top"
                />
              </View>
            ))}
          </View>

          {/* Publish */}
          <TouchableOpacity
            style={[
              styles.publishButton,
              loading && styles.publishButtonDisabled,
            ]}
            onPress={publishActivity}
            disabled={loading}
          >
            <Text style={styles.publishText}>
              {loading
                ? editingId
                  ? "Saving..."
                  : "Publishing..."
                : editingId
                  ? isRejectedEdit
                    ? "Resubmit for review"
                    : "Save changes"
                  : "Publish Activity"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingSafe: { flex: 1, backgroundColor: "#F3F7FF", alignItems: "center", paddingHorizontal: 24 },
  loadingLabel: { marginTop: 12, fontFamily: "Nunito_400Regular", color: "#666" },
  loadErrorTitle: {
    marginTop: 16,
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#333",
    textAlign: "center",
  },
  loadErrorText: {
    marginTop: 8,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  loadErrorRetryBtn: {
    marginTop: 24,
    backgroundColor: "#007BFF",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loadErrorRetryText: { color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 16 },
  loadErrorBackBtn: { marginTop: 12, paddingHorizontal: 28, paddingVertical: 12 },
  loadErrorBackText: { color: "#007BFF", fontFamily: "Nunito_700Bold", fontSize: 16 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 25,
  },
  titleBackBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  titleCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRightSpacer: {
    width: 44,
  },
  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    marginTop: 15,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    gap: 10,
  },
  sectionLabelBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT_BLUE,
  },
  sectionLabelText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#11181C",
  },
  sectionLabelInCard: {
    marginTop: 0,
  },
  sectionLabelInCardSpacing: {
    marginTop: 18,
  },
  subText: { fontSize: 12, color: "#777" },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#fff",
    color: "#777",
  },
  multilineInput: { height: 100 },
  categoryHint: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
  },
  categoryChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D0D6E0",
    backgroundColor: "#fff",
  },
  categoryChipSelected: {
    backgroundColor: ACCENT_BLUE,
    borderColor: ACCENT_BLUE,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#555",
  },
  categoryChipTextSelected: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  photoContainer: { marginTop: 10 },
  photoButton: {
    height: 90,
    width: 110,
    borderWidth: 1,
    borderColor: "#007BFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E6F2FF",
    marginBottom: 15,
  },
  photoButtonText: { fontSize: 12, marginTop: 5, color: "#007BFF" },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 10,
  },
  durationBox: {
    marginTop: 20,
    backgroundColor: "#E6F2FF",
    padding: 15,
    borderRadius: 14,
  },
  durationLabel: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  circleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    borderColor: "#007BFF",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  circleButtonText: { fontSize: 22, color: "#007BFF" },
  durationNumber: {
    marginHorizontal: 18,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },
  daysLabel: { marginLeft: 10 },
  diffLabel: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
  },
  diffRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  diffButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#A0A0A0",
    backgroundColor: "#fff",
  },
  diffActive: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  diffText: { color: "#555" },
  diffTextActive: { color: "#fff", fontFamily: "Nunito_700Bold" },
  itineraryHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 12,
    gap: 10,
  },
  itineraryHeading: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    color: "#11181C",
  },
  itineraryCard: {
    backgroundColor: "#E6F2FF",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 14,
    gap: 22,
  },
  itineraryDayBlock: {
    width: "100%",
  },
  itineraryDayLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  itineraryDayBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT_BLUE,
  },
  itineraryDayLabel: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#11181C",
  },
  /** Do not reuse `styles.input` here — its fixed height breaks multiline layout. */
  itineraryDayField: {
    width: "100%",
    minHeight: 92,
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  publishButton: {
    marginTop: 25,
    backgroundColor: "#007BFF",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  publishText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  publishButtonDisabled: { opacity: 0.6 },
  rejectionBanner: {
    backgroundColor: "#FFF5F5",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  rejectionBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  rejectionBannerTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#DC2626",
  },
  rejectionBannerText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  rejectionBannerHint: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#777",
    marginTop: 10,
    lineHeight: 18,
  },
});
