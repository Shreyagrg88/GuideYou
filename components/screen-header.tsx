import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  HEADER_MARGIN_BOTTOM,
  HEADER_SIDE_WIDTH,
  HEADER_TITLE_FONT_SIZE,
  PAGE_PADDING_HORIZONTAL,
} from "../constants/layout";

export type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  backIcon?: "chevron-back" | "arrow-back";
  backColor?: string;
  right?: ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  /** Add safe-area top inset above the header row */
  includeTopInset?: boolean;
  marginBottom?: number;
};

function ScreenHeader({
  title,
  onBack,
  showBack = true,
  backIcon = "chevron-back",
  backColor = "#000",
  right,
  style,
  titleStyle,
  includeTopInset = false,
  marginBottom = HEADER_MARGIN_BOTTOM,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      style={[
        screenHeaderStyles.row,
        includeTopInset && { paddingTop: Math.max(insets.top, 12) },
        marginBottom !== undefined && { marginBottom },
        style,
      ]}
    >
      {showBack ? (
        <TouchableOpacity
          style={[screenHeaderStyles.side, screenHeaderStyles.sideLeft]}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Ionicons name={backIcon} size={26} color={backColor} />
        </TouchableOpacity>
      ) : (
        <View style={[screenHeaderStyles.side, screenHeaderStyles.sideLeft]} />
      )}
      <View style={screenHeaderStyles.center}>
        <Text style={[screenHeaderStyles.title, titleStyle]} numberOfLines={2}>
          {title}
        </Text>
      </View>
      <View style={[screenHeaderStyles.side, screenHeaderStyles.sideRight]}>
        {right ?? null}
      </View>
    </View>
  );
}

export type ScreenHeaderBarProps = ScreenHeaderProps & {
  barStyle?: ViewStyle;
};

/** Fixed top bar (e.g. notifications) with centered title. */
function ScreenHeaderBar({
  title,
  onBack,
  showBack = true,
  backIcon = "chevron-back",
  backColor = "#000",
  right,
  barStyle,
  titleStyle,
}: ScreenHeaderBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      style={[
        screenHeaderStyles.bar,
        { paddingTop: Math.max(insets.top, 12) + 4 },
        barStyle,
      ]}
    >
      <View style={screenHeaderStyles.barRow}>
        {showBack ? (
          <TouchableOpacity
            style={[screenHeaderStyles.side, screenHeaderStyles.sideLeft]}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Ionicons name={backIcon} size={26} color={backColor} />
          </TouchableOpacity>
        ) : (
          <View style={[screenHeaderStyles.side, screenHeaderStyles.sideLeft]} />
        )}
        <View style={screenHeaderStyles.center}>
          <Text style={[screenHeaderStyles.title, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={[screenHeaderStyles.side, screenHeaderStyles.sideRight]}>
          {right ?? null}
        </View>
      </View>
    </View>
  );
}

export const screenHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: HEADER_SIDE_WIDTH,
  },
  side: {
    width: HEADER_SIDE_WIDTH,
    height: HEADER_SIDE_WIDTH,
    justifyContent: "center",
  },
  sideLeft: {
    alignItems: "flex-start",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  title: {
    fontSize: HEADER_TITLE_FONT_SIZE,
    fontFamily: "Nunito_700Bold",
    color: "#000",
    textAlign: "center",
  },
  bar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
    paddingBottom: 14,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: HEADER_SIDE_WIDTH,
  },
});

export { ScreenHeader, ScreenHeaderBar };
export default ScreenHeader;
