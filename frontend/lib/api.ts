export type User = {
  id: string;
  identifier: string;
  display_name: string;
  avatar_key: string;
  bio: string | null;
  last_seen_at: string | null;
  is_demo_user: boolean;
  is_profile_complete: boolean;
};

export type ConversationPreview = {
  id: string;
  kind: "direct" | "group";
  title: string;
  avatar_key: string;
  last_message: {
    body: string;
    sender_id: string;
    sent_at: string;
    receipt_status: "sent" | "delivered" | "read" | null;
  } | null;
  last_message_at: string | null;
  unread_count: number;
  peer_user_id: string | null;
};

export type Contact = {
  id: string;
  identifier: string;
  display_name: string;
  avatar_key: string;
  nickname: string | null;
  last_seen_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  client_message_id: string;
  reply_to_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  pending?: boolean;
};

export type ReceiptUpdate = {
  type: "receipt.updated";
  message_id: string;
  recipient_id: string;
  status: "delivered" | "read";
  occurred_at: string | null;
};

export type GroupMember = {
  user_id: string;
  display_name: string;
  avatar_key: string;
  role: "admin" | "member";
  joined_at: string;
};

export type RealtimeEvent =
  | { type: "connection.ready"; user_id: string; online_contact_ids: string[] }
  | { type: "conversation.created"; conversation: ConversationPreview }
  | { type: "message.created"; message: Message }
  | ReceiptUpdate
  | { type: "typing.started" | "typing.stopped"; conversation_id: string; user_id: string }
  | { type: "presence.updated"; user_id: string; is_online: boolean }
  | { type: "pong" };

type OtpChallenge = {
  challenge_id: string;
  expires_at: string;
  demo_code: string | null;
};

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:8000/api";
  }

  return "/api";
}

export function getWebSocketUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === "undefined") return "";
  if (window.location.hostname === "localhost") return "ws://localhost:8000/ws";
  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...init } = options;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(errorBody?.detail ?? "Something went wrong. Please try again.", response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  getCurrentUser: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  getDemoUsers: () => request<User[]>("/auth/demo-users"),
  loginAsDemoUser: (identifier: string) =>
    request<User>(`/auth/demo-login/${encodeURIComponent(identifier)}`, { method: "POST" }),
  requestOtp: (identifier: string) =>
    request<OtpChallenge>("/auth/request-otp", { method: "POST", body: { identifier } }),
  verifyOtp: (challengeId: string, code: string) =>
    request<User>("/auth/verify-otp", {
      method: "POST",
      body: { challenge_id: challengeId, code },
    }),
  updateProfile: (payload: { displayName: string; avatarKey: string; bio: string }) =>
    request<User>("/auth/profile", {
      method: "PATCH",
      body: {
        display_name: payload.displayName,
        avatar_key: payload.avatarKey,
        bio: payload.bio || null,
      },
    }),
  getConversations: () => request<ConversationPreview[]>("/conversations"),
  getContacts: (query = "") => request<Contact[]>(`/contacts?query=${encodeURIComponent(query)}`),
  addContact: (identifier: string) =>
    request<Contact>("/contacts", { method: "POST", body: { identifier } }),
  createDirectConversation: (userId: string) =>
    request<ConversationPreview>("/conversations/direct", {
      method: "POST",
      body: { user_id: userId },
    }),
  createGroupConversation: (title: string, memberIds: string[]) =>
    request<ConversationPreview>("/conversations/groups", {
      method: "POST",
      body: { title, member_ids: memberIds },
    }),
  getGroupMembers: (conversationId: string) =>
    request<GroupMember[]>(`/conversations/${encodeURIComponent(conversationId)}/members`),
  addGroupMember: (conversationId: string, userId: string) =>
    request<GroupMember>(`/conversations/${encodeURIComponent(conversationId)}/members`, {
      method: "POST",
      body: { user_id: userId },
    }),
  removeGroupMember: (conversationId: string, userId: string) =>
    request<void>(`/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  updateGroupMemberRole: (conversationId: string, userId: string, role: "admin" | "member") =>
    request<GroupMember>(
      `/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(userId)}`,
      { method: "PATCH", body: { role } },
    ),
  getMessages: (conversationId: string) =>
    request<Message[]>(`/conversations/${encodeURIComponent(conversationId)}/messages`),
  sendMessage: (conversationId: string, body: string, clientMessageId: string) =>
    request<Message>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      body: { body, client_message_id: clientMessageId },
    }),
  markConversationRead: (conversationId: string) =>
    request<{ marked_read: number }>(
      `/conversations/${encodeURIComponent(conversationId)}/read`,
      { method: "POST" },
    ),
};
