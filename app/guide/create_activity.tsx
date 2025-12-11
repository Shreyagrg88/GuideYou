import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";

export default function AddNewActivity() {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [category, setCategory] = useState(null);

  const categories = [
    "Adventure", "Culture", "Food", "Night Life", "Photography", "Shopping",
    "Music", "Sports", "Art", "History", "Nature", "Local Experiences",
    "Hiking", "Festivals", "Architecture"
  ].map((item) => ({ label: item, value: item }));

  const [duration, setDuration] = useState(3);

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <View style={styles.headerRow}>
        <Ionicons name="arrow-back" size={22} color="#000" />
        <Text style={styles.headerTitle}>Add New Activity</Text>
        <View style={{ width: 22 }} /> 
      </View>

      <Text style={styles.label}>Activity Name</Text>
      <TextInput style={styles.input} />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} />

      <Text style={styles.label}>Detailed Description</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        multiline
        textAlignVertical="top"
        placeholder="Describe the activity and what to expect"
      />

      <Text style={styles.label}>Category</Text>

      <DropDownPicker
        open={categoryOpen}
        value={category}
        items={categories}
        setOpen={setCategoryOpen}
        setValue={setCategory}
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        placeholder="Select Category"
        placeholderStyle={{ fontFamily: "Nunito_400" }}
        labelStyle={{ fontFamily: "Nunito_400" }}
        listItemLabelStyle={{ fontFamily: "Nunito_400" }}
      />

      <Text style={styles.label}>Photo Gallery</Text>
      <Text style={styles.subText}>Showcase the experience by uploading high quality images.</Text>

      <TouchableOpacity style={styles.photoButton}>
        <Ionicons name="image-outline" size={30} color="#007BFF" />
        <Text style={styles.photoButtonText}>Add photos</Text>
      </TouchableOpacity>

      <View style={styles.durationBox}>
        <Text style={styles.durationLabel}>Duration</Text>

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

        <Text style={styles.diffLabel}>Difficulty Level</Text>

        <View style={styles.diffRow}>
          <TouchableOpacity style={styles.diffButton}>
            <Text style={styles.diffText}>Easy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.diffButton, styles.diffActive]}>
            <Text style={[styles.diffText, styles.diffTextActive]}>Moderate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.diffButton}>
            <Text style={styles.diffText}>Hard</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Equipment Needed</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="List any required or recommended equipment"
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity style={styles.publishButton}>
        <Text style={styles.publishText}>Publish Activity</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: "#F9F9F9",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  label: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    marginTop: 15,
  },

  subText: {
    fontSize: 12,
    color: "#777",
    fontFamily: "Nunito_400Regular",
    marginBottom: 10,
  },

  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: "Nunito_400Regular",
    marginTop: 8,
    backgroundColor: "#fff",
  },

  multilineInput: {
    height: 90,
  },

  dropdown: {
    borderRadius: 8,
    borderColor: "#E0E0E0",
    marginTop: 8,
  },

  dropdownContainer: {
    borderColor: "#E0E0E0",
  },

  photoButton: {
    height: 80,
    width: 100,
    borderWidth: 1,
    borderColor: "#007BFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#F0F6FF",
  },

  photoButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_400",
    marginTop: 5,
    color: "#007BFF",
  },

  durationBox: {
    marginTop: 20,
    backgroundColor: "#EEF5FF",
    padding: 15,
    borderRadius: 12,
  },

  durationLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
  },

  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  circleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#007BFF",
    borderWidth: 1,
  },

  circleButtonText: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: "#007BFF",
  },

  durationNumber: {
    marginHorizontal: 20,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  daysLabel: {
    marginLeft: 10,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },

  diffLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
  },

  diffRow: {
    flexDirection: "row",
    gap: 10,
  },

  diffButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
  },

  diffActive: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },

  diffText: {
    fontFamily: "Nunito_400Regular",
    color: "#555",
  },

  diffTextActive: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
  },

  publishButton: {
    marginTop: 20,
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },

  publishText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
});
