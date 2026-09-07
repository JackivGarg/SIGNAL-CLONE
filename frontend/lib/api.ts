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
};
