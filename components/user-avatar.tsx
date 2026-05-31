import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  ImageStyle,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { resolveAvatarUri } from "../utils/avatar";

type UserAvatarProps = {
  uri?: string | null;
  size?: number;
  /** Shown as initial letter when no real photo is set. */
  name?: string;
  style?: ViewStyle | ImageStyle;
  iconColor?: string;
};

export default function UserAvatar({
  uri,
  size = 48,
  name,
  style,
  iconColor = "#9aa5b5",
}: UserAvatarProps) {
  const resolved = resolveAvatarUri(uri);
  const rounded = { width: size, height: size, borderRadius: size / 2 };

  if (resolved) {
    return (
      <Image
        source={{ uri: resolved }}
        style={[rounded, style as ImageStyle]}
      />
    );
  }

  const initial = name?.trim()?.charAt(0)?.toUpperCase();

  return (
    <View style={[styles.placeholder, rounded, style as ViewStyle]}>
      {initial ? (
        <Text style={[styles.initial, { fontSize: Math.round(size * 0.38) }]}>
          {initial}
        </Text>
      ) : (
        <Ionicons
          name="person"
          size={Math.round(size * 0.44)}
          color={iconColor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#E8EDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: "#5c6b7a",
    fontFamily: "Nunito_700Bold",
  },
});
