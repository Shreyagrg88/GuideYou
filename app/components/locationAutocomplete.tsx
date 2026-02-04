import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from "react-native";

interface LocationData {
  name: string;
  lat: string;
  lon: string;
}

interface Props {
  value: string;
  onSelect: (location: LocationData) => void;
}

export default function LocationAutocomplete({ value, onSelect }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchLocation(query);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const searchLocation = async (text: string) => {
    try {
      abortController.current?.abort();
      abortController.current = new AbortController();

      setLoading(true);
      setShowDropdown(true);

      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        text
      )}&format=json&limit=5`;

      const res = await fetch(url, {
        signal: abortController.current.signal,
        headers: {
          // REQUIRED by Nominatim usage policy
          "User-Agent": "GuideYou (shreyagrg888@gmail.com)",
          Accept: "application/json",
        },
      });

      // Handle HTTP errors
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      // Ensure response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const errorText = await res.text();
        throw new Error(`Invalid response: ${errorText}`);
      }

      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Location error:", err.message || err);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    const selectedLocation: LocationData = {
      name: item.display_name,
      lat: item.lat,
      lon: item.lon,
    };

    setQuery(item.display_name);
    setResults([]);
    setShowDropdown(false);
    Keyboard.dismiss();

    onSelect(selectedLocation);
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        placeholder="Enter location"
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setShowDropdown(true);
        }}
      />

      {loading && (
        <ActivityIndicator size="small" style={styles.loading} />
      )}

      {showDropdown && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            data={results}
            keyExtractor={(item) => item.place_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.itemText}>{item.display_name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 100,
  },

  input: {
    height: 45,
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
  },

  loading: {
    position: "absolute",
    right: 12,
    top: 12,
  },

  dropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 10,
    maxHeight: 200,
    zIndex: 9999,
    elevation: 10,
  },

  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },

  itemText: {
    fontSize: 14,
    color: "#333",
  },
});
