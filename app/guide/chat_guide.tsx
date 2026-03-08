import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    fetchMessagesWithCounterpart,
    markConversationRead,
    sendMessageToCounterpart,
} from "../../api/chat";
import { API_URL } from "../../constants/api";

type ChatMessage = {
  id: string;
  text: string;
  sender: "guide" | "tourist";
  createdAt: string;
  seen?: boolean;
  seenAt?: string | null;
};

export default function ChatGuide() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    counterpartId?: string;
    touristName?: string;
    touristAvatar?: string;
    bookingId?: string;
  }>();
  const counterpartId = params.counterpartId as string | undefined;
  const touristName = params.touristName ?? "";
  const touristAvatar = params.touristAvatar;
  const bookingId = params.bookingId;

  const getAvatarUri = () => {
    if (!touristAvatar) return null;
    return touristAvatar.startsWith("http") ? touristAvatar : `${API_URL}${touristAvatar}`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  useEffect(() => {
    if (!counterpartId) {
      setError("Missing counterpart for chat.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchMessagesWithCounterpart(counterpartId);
        if (cancelled) return;

        const mapped: ChatMessage[] = (data.messages || [])
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          .map((m) => ({
            id: m.id,
            text: m.text,
            sender: m.senderRole,
            createdAt: m.createdAt,
            seen: m.seen,
            seenAt: m.seenAt,
          }));

        setMessages(mapped);

        markConversationRead(counterpartId).catch(() => {});
      } catch (e: any) {
        if (!cancelled) {
          console.error("fetchMessagesWithCounterpart error:", e);
          setError(e.message || "Failed to load chat");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [counterpartId]);

  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToEnd({ animated: false });
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !counterpartId) return;

    try {
      setSending(true);
      const apiMsg = await sendMessageToCounterpart(counterpartId, trimmed);

      const newMessage: ChatMessage = {
        id: apiMsg.id,
        text: apiMsg.text,
        sender: apiMsg.senderRole,
        createdAt: apiMsg.createdAt,
        seen: apiMsg.seen ?? false,
        seenAt: apiMsg.seenAt ?? null,
      };

      setMessages((prev) => [...prev, newMessage]);
      setInput("");
    } catch (e: any) {
      console.error("sendBookingMessage error:", e);
      Alert.alert(
        "Error",
        e.message ||
          "Failed to send message. Chat is only available after you accept the booking."
      );
    } finally {
      setSending(false);
    }
  };

  const formatSeenTime = (seenAt: string) => {
    const d = new Date(seenAt);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    return sameDay
      ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString();
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender === "guide";
    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMine : styles.messageRowTheirs,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
          ]}
        >
          <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
            {item.text}
          </Text>
          {isMine && (
            <View style={styles.statusRow}>
              <Ionicons
                name={item.seen ? "checkmark-done" : "checkmark"}
                size={12}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.statusText}>
                {item.seen
                  ? item.seenAt
                    ? `Seen ${formatSeenTime(item.seenAt)}`
                    : "Seen"
                  : "Delivered"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerProfileWrap}
          onPress={() => {
            if (!counterpartId) return;
            router.push({
              pathname: "/guide/tourist_profileview",
              params: {
                touristId: counterpartId,
                touristName,
                touristAvatar: touristAvatar ?? undefined,
              },
            });
          }}
          activeOpacity={0.7}
        >
          {getAvatarUri() ? (
            <Image source={{ uri: getAvatarUri()! }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <Ionicons name="person" size={20} color="#9CA3AF" />
            </View>
          )}
          <Text style={styles.headerName} numberOfLines={1}>
            {touristName || "Tourist"}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerBtn} />
      </View>

      {/* Messages */}
      {loading && (
        <View style={{ paddingTop: 16, alignItems: "center" }}>
          <ActivityIndicator size="small" color="#007BFF" />
        </View>
      )}
      {!loading && error && (
        <Text
          style={{
            textAlign: "center",
            color: "#DC2626",
            marginTop: 8,
            paddingHorizontal: 16,
          }}
        >
          {error}
        </Text>
      )}
      {!loading && !error && messages.length === 0 && (
        <Text
          style={{
            textAlign: "center",
            color: "#6B7280",
            marginTop: 8,
            paddingHorizontal: 16,
          }}
        >
          No messages yet. You can start chatting with the tourist.
        </Text>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.messagesContainer,
          { paddingBottom: 16 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Input bar */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F7FF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  headerProfileWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarPlaceholder: {
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  headerName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#000",
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: "#007BFF",
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: "#E5E7EB",
    borderBottomLeftRadius: 4,
  },
  bubbleTextMine: {
    color: "#FFF",
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
  },
  bubbleTextTheirs: {
    color: "#111827",
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  statusText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
  },
  sendBtn: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
