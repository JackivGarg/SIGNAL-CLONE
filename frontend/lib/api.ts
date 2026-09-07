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
  } | null;
  last_message_at: string | null;
  unread_count: number;
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

  return response.json() as Promise<T>;
}

export const api = {
  getCurrentUser: () => request<User>("/auth/me"),
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
