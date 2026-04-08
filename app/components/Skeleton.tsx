import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BONE = "#E2E8F0";
const PAGE_BG = "#fff";

function Bone({
  width,
  height,
  borderRadius = 8,
  style,
  marginBottom = 10,
}: {
  width: number | `${number}%` | "auto";
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
  marginBottom?: number;
}) {
  return (
    <View
      style={[
        {
          width: width === "auto" ? "100%" : width,
          height,
          borderRadius,
          backgroundColor: BONE,
          marginBottom,
        },
        style,
      ]}
    />
  );
}

function PulseWrap({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.52)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.88, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.52, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[{ width: "100%" }, style, { opacity }]}>{children}</Animated.View>;
}

const winW = Dimensions.get("window").width;
const pad = 20;
const contentW = winW - pad * 2;

/** Single block with its own pulse (for inline rows e.g. horizontal cards). */
export function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  return (
    <PulseWrap style={style}>
      <Bone width={width} height={height} borderRadius={borderRadius} marginBottom={0} />
    </PulseWrap>
  );
}

export function SkeletonRootScreen({
  children,
  backgroundColor = PAGE_BG,
}: {
  children: React.ReactNode;
  backgroundColor?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor, paddingTop: insets.top }]}>
      <PulseWrap>{children}</PulseWrap>
    </View>
  );
}

/** Tour / activity detail: hero image + title + text blocks */
export function SkeletonTourDetailScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F3F7FF" }}
      contentContainerStyle={{ padding: pad, paddingTop: insets.top + 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <PulseWrap>
        <Bone width={32} height={32} borderRadius={16} marginBottom={16} />
        <Bone width="70%" height={22} borderRadius={6} marginBottom={16} />
        <Bone width={contentW} height={220} borderRadius={12} marginBottom={16} />
        <Bone width="100%" height={72} borderRadius={12} marginBottom={12} />
        <Bone width="100%" height={14} borderRadius={4} marginBottom={8} />
        <Bone width="92%" height={14} borderRadius={4} marginBottom={8} />
        <Bone width="85%" height={14} borderRadius={4} marginBottom={20} />
        <Bone width={120} height={18} borderRadius={4} marginBottom={12} />
        <Bone width="100%" height={100} borderRadius={12} marginBottom={12} />
        <Bone width="100%" height={100} borderRadius={12} />
      </PulseWrap>
    </ScrollView>
  );
}

/** Profile bones only (use inside existing ScrollView). */
export function SkeletonProfileBlock({
  showFormFields = true,
}: {
  showFormFields?: boolean;
}) {
  return (
    <PulseWrap>
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <Bone width={100} height={100} borderRadius={50} marginBottom={0} />
      </View>
      <Bone width="55%" height={20} borderRadius={6} marginBottom={8} style={{ alignSelf: "center" }} />
      <Bone width="40%" height={14} borderRadius={4} marginBottom={24} style={{ alignSelf: "center" }} />
      {showFormFields && (
        <>
          {[1, 2, 3, 4].map((i) => (
            <Bone key={i} width="100%" height={48} borderRadius={10} marginBottom={14} />
          ))}
        </>
      )}
    </PulseWrap>
  );
}

/** Profile / edit profile */
export function SkeletonProfileScreen({ showFormFields = true }: { showFormFields?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: PAGE_BG }}
      contentContainerStyle={{ padding: pad, paddingTop: insets.top + 24, paddingBottom: 40 }}
    >
      <SkeletonProfileBlock showFormFields={showFormFields} />
    </ScrollView>
  );
}

/** Booking list tab (upcoming / past / pending rows) */
export function SkeletonBookingTab({ rows = 6 }: { rows?: number }) {
  return (
    <View style={{ paddingHorizontal: pad, paddingTop: 16, paddingBottom: 24 }}>
      <PulseWrap>
        {Array.from({ length: rows }).map((_, i) => (
          <Bone key={i} width="100%" height={92} borderRadius={14} marginBottom={12} />
        ))}
      </PulseWrap>
    </View>
  );
}

/** Vertical list with optional avatar circle */
export function SkeletonListScreen({ rows = 8 }: { rows?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: PAGE_BG, paddingTop: insets.top }]}>
      <PulseWrap>
        <View style={{ paddingHorizontal: pad, paddingTop: 16, paddingBottom: 12 }}>
          <Bone width="45%" height={24} borderRadius={6} marginBottom={16} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 100 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <Bone width={52} height={52} borderRadius={26} marginBottom={0} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Bone width="65%" height={16} borderRadius={4} marginBottom={8} />
                <Bone width="40%" height={12} borderRadius={4} marginBottom={0} />
              </View>
            </View>
          ))}
        </ScrollView>
      </PulseWrap>
    </View>
  );
}

/** Guide home dashboard */
export function SkeletonGuideHomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: PAGE_BG }}
      contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingHorizontal: pad }}
    >
      <PulseWrap>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: insets.top + 8, marginBottom: 20 }}>
          <Bone width={120} height={28} borderRadius={6} marginBottom={0} />
          <Bone width={28} height={28} borderRadius={14} marginBottom={0} />
        </View>
        <Bone width="70%" height={22} borderRadius={6} marginBottom={20} />
        <Bone width="100%" height={120} borderRadius={14} marginBottom={16} />
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <Bone width={(contentW - 12) / 2} height={88} borderRadius={12} marginBottom={0} />
          <Bone width={(contentW - 12) / 2} height={88} borderRadius={12} marginBottom={0} />
        </View>
        <Bone width="50%" height={18} borderRadius={4} marginBottom={12} />
        {[1, 2, 3].map((i) => (
          <Bone key={i} width="100%" height={72} borderRadius={12} marginBottom={12} />
        ))}
      </PulseWrap>
    </ScrollView>
  );
}

/** Admin dashboard */
export function SkeletonAdminHomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F8FAFC" }} contentContainerStyle={{ paddingBottom: 100 }}>
      <PulseWrap>
        <View style={{ paddingHorizontal: pad, paddingTop: insets.top + 16 }}>
          <Bone width={140} height={28} borderRadius={6} marginBottom={12} />
          <Bone width="75%" height={18} borderRadius={4} marginBottom={20} />
          <Bone width="100%" height={88} borderRadius={14} marginBottom={20} />
          <View style={{ flexDirection: "row", marginBottom: 20, gap: 10 }}>
            <Bone width={(contentW - 10) / 2} height={40} borderRadius={10} marginBottom={0} />
            <Bone width={(contentW - 10) / 2} height={40} borderRadius={10} marginBottom={0} />
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            <Bone width={(contentW - 12) / 2} height={80} borderRadius={12} marginBottom={0} />
            <Bone width={(contentW - 12) / 2} height={80} borderRadius={12} marginBottom={0} />
          </View>
          {[1, 2, 3, 4, 5].map((i) => (
            <Bone key={i} width="100%" height={56} borderRadius={10} marginBottom={10} />
          ))}
        </View>
      </PulseWrap>
    </ScrollView>
  );
}

/** Booking / payment detail */
export function SkeletonBookingDetailScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F3F7FF" }}
      contentContainerStyle={{ padding: pad, paddingTop: insets.top + 16, paddingBottom: 40 }}
    >
      <PulseWrap>
        <Bone width="50%" height={22} borderRadius={6} marginBottom={20} />
        <Bone width="100%" height={160} borderRadius={14} marginBottom={16} />
        {[1, 2, 3, 4, 5].map((i) => (
          <Bone key={i} width={i % 2 === 0 ? "90%" : "100%"} height={16} borderRadius={4} marginBottom={10} />
        ))}
        <Bone width="100%" height={48} borderRadius={24} marginBottom={12} />
      </PulseWrap>
    </ScrollView>
  );
}

/** Weather + itinerary */
export function SkeletonWeatherItineraryScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#E6F2FF" }}
      contentContainerStyle={{ paddingHorizontal: pad, paddingTop: insets.top + 16, paddingBottom: 40 }}
    >
      <PulseWrap>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Bone width={32} height={32} borderRadius={16} marginBottom={0} />
          <Bone width="70%" height={22} borderRadius={6} marginBottom={0} style={{ marginLeft: 12, flex: 1 }} />
        </View>
        <Bone width="100%" height={140} borderRadius={16} marginBottom={24} />
        <Bone width={140} height={18} borderRadius={4} marginBottom={12} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ marginRight: 12 }}>
              <Bone width={72} height={96} borderRadius={12} marginBottom={0} />
            </View>
          ))}
        </ScrollView>
        <Bone width="100%" height={120} borderRadius={16} marginBottom={16} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
          <Bone width={120} height={18} borderRadius={4} marginBottom={0} />
          <Bone width={100} height={36} borderRadius={18} marginBottom={0} />
        </View>
        <Bone width="100%" height={44} borderRadius={22} marginBottom={16} />
        <Bone width={100} height={18} borderRadius={4} marginBottom={12} />
        <Bone width="100%" height={100} borderRadius={12} marginBottom={10} />
        <Bone width="100%" height={100} borderRadius={12} />
      </PulseWrap>
    </ScrollView>
  );
}

/** Horizontal activity cards (tourist home “For you”) */
export function SkeletonActivityCarousel() {
  return (
    <View style={{ flexDirection: "row", paddingVertical: 8 }}>
      {[0, 1, 2].map((i) => (
        <SkeletonBlock
          key={i}
          width={280}
          height={200}
          borderRadius={15}
          style={{ marginRight: 15 }}
        />
      ))}
    </View>
  );
}

/** AI recommendations row */
export function SkeletonAiRecommendationRow() {
  return (
    <View style={{ flexDirection: "row", paddingVertical: 8 }}>
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} width={230} height={180} borderRadius={12} style={{ marginRight: 12 }} />
      ))}
    </View>
  );
}

/** Chat messages loading overlay */
export function SkeletonChatLoading() {
  return (
    <View style={styles.chatOverlay}>
      <PulseWrap>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={{
              alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
              maxWidth: "78%",
              marginBottom: 12,
            }}
          >
            <Bone width={i % 2 === 0 ? 220 : 180} height={44} borderRadius={16} marginBottom={0} />
          </View>
        ))}
      </PulseWrap>
    </View>
  );
}

/** Chat thread body (non-overlay; use while messages load) */
export function SkeletonChatMessagesBody() {
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      <PulseWrap>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            style={{
              alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
              maxWidth: "78%",
              marginBottom: 12,
            }}
          >
            <Bone width={i % 2 === 0 ? 200 : 160} height={40} borderRadius={16} marginBottom={0} />
          </View>
        ))}
      </PulseWrap>
    </View>
  );
}

/** Conversation list rows (messages inbox) */
export function SkeletonConversationRows({ rows = 8 }: { rows?: number }) {
  return (
    <PulseWrap>
      <View style={{ flex: 1 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 14,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <Bone width={52} height={52} borderRadius={26} marginBottom={0} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Bone width="55%" height={16} borderRadius={4} marginBottom={8} />
              <Bone width="85%" height={12} borderRadius={4} marginBottom={0} />
            </View>
            <Bone width={40} height={12} borderRadius={4} marginBottom={0} />
          </View>
        ))}
      </View>
    </PulseWrap>
  );
}

/** Calendar area while availability is loading */
export function SkeletonCalendarPlaceholder() {
  const gap = 6;
  return (
    <PulseWrap>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Bone width={28} height={28} borderRadius={14} marginBottom={0} />
        <Bone width={160} height={22} borderRadius={6} marginBottom={0} />
        <Bone width={28} height={28} borderRadius={14} marginBottom={0} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10, paddingHorizontal: 4 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Bone key={i} width={22} height={12} borderRadius={4} marginBottom={0} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -gap / 2 }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <View key={i} style={{ width: `${100 / 7}%`, padding: gap / 2, alignItems: "center" }}>
            <Bone width={34} height={34} borderRadius={17} marginBottom={0} />
          </View>
        ))}
      </View>
    </PulseWrap>
  );
}

/** Review cards placeholder (tour detail, etc.) */
export function SkeletonReviewCards({ count = 3 }: { count?: number }) {
  return (
    <PulseWrap>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: "#F8FAFC" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Bone width="40%" height={16} borderRadius={4} marginBottom={0} />
            <Bone width={72} height={14} borderRadius={4} marginBottom={0} />
          </View>
          <Bone width="100%" height={12} borderRadius={4} marginBottom={6} />
          <Bone width="92%" height={12} borderRadius={4} marginBottom={0} />
        </View>
      ))}
    </PulseWrap>
  );
}

/** Small “checking eligibility” strip */
export function SkeletonEligibilityRow() {
  return (
    <PulseWrap>
      <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}>
        <Bone width={22} height={22} borderRadius={11} marginBottom={0} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Bone width="72%" height={16} borderRadius={4} marginBottom={0} />
        </View>
      </View>
    </PulseWrap>
  );
}

/** Review / license document screen */
export function SkeletonReviewDocumentScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: PAGE_BG }}
      contentContainerStyle={{ padding: pad, paddingTop: insets.top + 16, paddingBottom: 40 }}
    >
      <PulseWrap>
        <Bone width="60%" height={22} borderRadius={6} marginBottom={20} />
        <Bone width="100%" height={280} borderRadius={12} marginBottom={16} />
        <Bone width="100%" height={48} borderRadius={10} marginBottom={12} />
        <Bone width="100%" height={48} borderRadius={10} marginBottom={12} />
        <Bone width="100%" height={52} borderRadius={26} marginBottom={0} />
      </PulseWrap>
    </ScrollView>
  );
}

/** App boot (fonts) */
export function SkeletonAppBoot() {
  return (
    <View style={[styles.root, { backgroundColor: PAGE_BG, justifyContent: "center", alignItems: "center" }]}>
      <PulseWrap style={{ alignItems: "center", width: 200 }}>
        <Bone width={100} height={100} borderRadius={20} marginBottom={20} />
        <Bone width={160} height={20} borderRadius={6} marginBottom={10} />
        <Bone width={120} height={14} borderRadius={4} marginBottom={0} />
      </PulseWrap>
    </View>
  );
}

/** Generic centered (legacy ActivityIndicator replacement) */
export function SkeletonCentered() {
  return (
    <SkeletonRootScreen>
      <View style={{ paddingHorizontal: pad, paddingTop: 40 }}>
        <Bone width="50%" height={24} borderRadius={6} marginBottom={24} />
        <Bone width="100%" height={200} borderRadius={14} marginBottom={16} />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Bone key={i} width={i % 3 === 0 ? "70%" : "100%"} height={14} borderRadius={4} marginBottom={12} />
        ))}
      </View>
    </SkeletonRootScreen>
  );
}

/** E‑sewa / webview overlay */
export function SkeletonWebviewOverlay() {
  return (
    <View style={styles.webOverlay}>
      <PulseWrap>
        <Bone width="85%" height={36} borderRadius={8} marginBottom={16} />
        <Bone width="100%" height={420} borderRadius={12} marginBottom={0} />
      </PulseWrap>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chatOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    paddingHorizontal: pad,
  },
  webOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: pad,
  },
});
