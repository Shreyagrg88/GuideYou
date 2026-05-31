import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, ImageStyle, StyleSheet, View, ViewStyle } from "react-native";
import { resolveMediaUri } from "../utils/avatar";

type ActivityThumbnailProps = {
  uri?: string | null;
  style?: ViewStyle | ImageStyle;
  iconSize?: number;
};

export default function ActivityThumbnail({
  uri,
  style,
  iconSize = 28,
}: ActivityThumbnailProps) {
  const resolved = resolveMediaUri(uri);

  if (resolved) {
    return <Image source={{ uri: resolved }} style={style as ImageStyle} />;
  }

  return (
    <View style={[styles.placeholder, style as ViewStyle]}>
      <Ionicons name="image-outline" size={iconSize} color="#bbb" />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#EEF2F6",
    alignItems: "center",
    justifyContent: "center",
  },
});
