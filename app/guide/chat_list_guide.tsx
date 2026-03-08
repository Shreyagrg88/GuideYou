import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatConversation, fetchConversations } from "../../api/chat";
import { API_URL } from "../../constants/api";
import GuideNavbar from "../components/guide_navbar";

export default function ChatListGuide() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchConversations();
      setConversations(data.conversations || []);
    } catch (e: any) {
      setError(e.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const filtered = conversations.filter((c) =>
    c.counterpartName.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: ChatConversation }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        router.push({
          pathname: "/guide/chat_guide",
          params: {
            counterpartId: item.counterpartId,
            touristName: item.counterpartName,
            touristAvatar: item.avatar ?? undefined,
          } as any,
        })
      }
    >
      <View style={styles.avatarWrap}>
        {(() => {
          if (!item.avatar) {
            return (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={20} color="#9CA3AF" />
              </View>
            );
          }
          const full =
            item.avatar.startsWith("http")
              ? item.avatar
              : `${API_URL}${item.avatar}`;
          if (full.includes("photo-1544005313-94ddf0286df2")) {
            return (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>
                  {item.counterpartName.charAt(0).toUpperCase()}
                </Text>
              </View>
            );
          }
          return <Image source={{ uri: full }} style={styles.avatar} />;
        })()}
      </View>
      <View style={styles.rowMiddle}>
        <Text style={styles.name} numberOfLines={1}>
          {item.counterpartName}
        </Text>
        <Text
          style={[
            styles.lastMessage,
            (item.hasUnread ?? item.unreadCount > 0) && styles.lastMessageBold,
          ]}
          numberOfLines={1}
        >
          {item.lastMessage || "No messages yet"}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.timeText}>
          {item.lastTime ? new Date(item.lastTime).toLocaleDateString() : ""}
        </Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#9CA3AF"
            style={{ marginHorizontal: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* List / states */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : error ? (
          <View style={{ paddingVertical: 16 }}>
            <Text style={{ color: "#DC2626", fontFamily: "Nunito_400Regular" }}>
              {error}
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ paddingVertical: 16 }}>
            <Text style={{ color: "#6B7280", fontFamily: "Nunito_400Regular" }}>
              No conversations yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      <GuideNavbar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F7FF" },
  content: { flex: 1, paddingHorizontal: 16 },
  header: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 22,
    color: "#000",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    paddingVertical: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    paddingVertical: 4,
    paddingRight: 12,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  avatarWrap: { marginRight: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: "#111827",
  },
  rowMiddle: { flex: 1 },
  name: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#111827",
  },
  lastMessage: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  lastMessageBold: {
    fontFamily: "Nunito_700Bold",
    color: "#111827",
  },
  rowRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  timeText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  unreadText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
    color: "#FFF",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
});

