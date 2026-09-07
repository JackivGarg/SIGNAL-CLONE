"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { ProfileSetup } from "@/components/auth/profile-setup";
import { MessagingWorkspace } from "@/components/messaging/messaging-workspace";
import { ApiError, api, type User } from "@/lib/api";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<"loading" | "authenticated" | "unauthenticated" | "error">(
    "loading",
  );

  useEffect(() => {
    api
      .getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setState("authenticated");
      })
      .catch((reason) => setState(reason instanceof ApiError && reason.status === 401 ? "unauthenticated" : "error"));
  }, []);

  if (state === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500">
        <RefreshCw className="animate-spin" size={22} />
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Couldn’t reach Signal Clone</h1>
          <p className="mt-2 text-sm text-slate-500">
            Start the backend API, then refresh this page to continue.
          </p>
          <button
            className="mt-5 rounded-xl bg-[var(--signal-blue)] px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => window.location.reload()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </main>
    );
  }

  if (state === "unauthenticated" || user === null) {
    return <AuthScreen onAuthenticated={(currentUser) => { setUser(currentUser); setState("authenticated"); }} />;
  }

  if (!user.is_profile_complete) {
    return <ProfileSetup onComplete={setUser} user={user} />;
  }

  return (
    <MessagingWorkspace
      onLogout={() => {
        setUser(null);
        setState("unauthenticated");
      }}
      user={user}
    />
  );
}
