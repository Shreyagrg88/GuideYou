import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export type ChatApiMessage = {
  id: string;
  senderId: string;
  senderRole: "tourist" | "guide";
  text: string;
  createdAt: string;
  seen?: boolean;
  seenAt?: string | null;
};

export type ChatConversation = {
  id: string;
  counterpartId: string;
  counterpartName: string;
  avatar: string | null;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  hasUnread?: boolean;
};

export async function fetchConversations() {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(`${API_URL}/api/chat/conversations`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Failed to fetch conversations");
  }

  return data as {
    count: number;
    conversations: ChatConversation[];
  };
}

export async function fetchMessagesWithCounterpart(counterpartId: string) {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(`${API_URL}/api/chat/with/${counterpartId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Failed to fetch messages");
  }

  return data as {
    counterpartId: string;
    guideId: string;
    touristId: string;
    messages: ChatApiMessage[];
  };
}

export async function markConversationRead(counterpartId: string) {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(`${API_URL}/api/chat/with/${counterpartId}/read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Failed to mark as read");
  }

  return data as { msg: string; lastReadAt: string };
}

export async function sendMessageToCounterpart(counterpartId: string, text: string) {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(`${API_URL}/api/chat/with/${counterpartId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Failed to send message");
  }

  return data.message as ChatApiMessage;
}
