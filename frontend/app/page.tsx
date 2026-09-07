"use client";

import { LockKeyhole, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { ProfileSetup } from "@/components/auth/profile-setup";
import { AppShell } from "@/components/layout/app-shell";
import { SidebarPreview } from "@/components/layout/sidebar-preview";
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
    <AppShell
      sidebar={<SidebarPreview />}
      user={{ avatarKey: user.avatar_key, displayName: user.display_name }}
    >
      <section className="grid place-items-center p-8 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-blue-100 text-blue-600">
            <LockKeyhole size={28} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome, {user.display_name}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Select a conversation to start messaging securely.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
