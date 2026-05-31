import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SkeletonBlock } from "@/components/Skeleton";

export interface LocationData {
  name: string;
  lat: string;
  lon: string;
}

interface Props {
  value: string;
  onChangeText?: (text: string) => void;
  onSelect: (location: LocationData) => void;
}

type PhotonProperties = {
  name?: string;
  street?: string;
  city?: string;
  district?: string;
  county?: string;
  state?: string;
  country?: string;
  countrycode?: string;
};

type LocationResult = {
  id: string;
  lat: string;
  lon: string;
  label: string;
};

/** Nepal bounding box: west, south, east, north */
const NEPAL_BBOX = "80.0,26.3,88.2,30.4";

function uniqueParts(parts: string[]): string[] {
  const out: string[] = [];
  for (const part of parts) {
    const value = part.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (!out.some((existing) => existing.toLowerCase() === key)) {
      out.push(value);
    }
  }
  return out;
}

function formatPhotonLabel(props: PhotonProperties): string {
  const primary = props.name || props.street || "";
  const locality = props.city || props.district || props.county || "";
  const region = props.state || "";

  const parts = uniqueParts(
    [primary, locality, region, props.country || "Nepal"].filter(Boolean)
  );

  if (parts.length === 0) return "Nepal";

  const withoutCountry = parts.filter((p) => p.toLowerCase() !== "nepal");
  if (withoutCountry.length === 1) {
    return `${withoutCountry[0]}, Nepal`;
  }

  return parts.join(", ");
}

function mapPhotonFeatures(features: unknown[]): LocationResult[] {
  const out: LocationResult[] = [];

  for (const raw of features) {
    if (!raw || typeof raw !== "object") continue;
    const feature = raw as {
      properties?: PhotonProperties;
      geometry?: { coordinates?: number[] };
    };

    const props = feature.properties ?? {};
    if (props.countrycode && props.countrycode.toUpperCase() !== "NP") continue;

    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const [lon, lat] = coords;
    if (typeof lat !== "number" || typeof lon !== "number") continue;

    const label = formatPhotonLabel(props);
    const id = `${lat},${lon},${label}`;

    if (!out.some((item) => item.id === id)) {
      out.push({
        id,
        lat: String(lat),
        lon: String(lon),
        label,
      });
    }

    if (out.length >= 5) break;
  }

  return out;
}

export default function LocationAutocomplete({
  value,
  onChangeText,
  onSelect,
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
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
      void searchLocation(query);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const searchLocation = async (text: string) => {
    try {
      abortController.current?.abort();
      abortController.current = new AbortController();

      setLoading(true);
      setShowDropdown(true);

      const params = new URLSearchParams({
        q: text,
        limit: "8",
        lang: "en",
        bbox: NEPAL_BBOX,
      });

      const res = await fetch(
        `https://photon.komoot.io/api/?${params.toString()}`,
        {
          signal: abortController.current.signal,
          headers: { Accept: "application/json" },
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      setResults(mapPhotonFeatures(features));
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Location error:", err.message);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: LocationResult) => {
    setQuery(item.label);
    setResults([]);
    setShowDropdown(false);
    Keyboard.dismiss();

    onChangeText?.(item.label);
    onSelect({
      name: item.label,
      lat: item.lat,
      lon: item.lon,
    });
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        placeholder="Enter location (e.g. Pokhara, Kathmandu)"
        placeholderTextColor="#999"
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          onChangeText?.(text);
          setShowDropdown(true);
        }}
        onFocus={() => {
          if (results.length > 0) setShowDropdown(true);
        }}
      />

      {loading && (
        <SkeletonBlock width={22} height={22} borderRadius={11} style={styles.loading} />
      )}

      {showDropdown && results.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            {results.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.item}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.itemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    zIndex: 100,
  },

  input: {
    height: 45,
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    color: "#333",
  },

  loading: {
    position: "absolute",
    right: 12,
    top: 12,
  },

  dropdown: {
    marginTop: 4,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 10,
    maxHeight: 200,
    overflow: "hidden",
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
