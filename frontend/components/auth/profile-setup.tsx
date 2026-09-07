"use client";

import { ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";

import { api, type User } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";

const avatarKeys = ["ocean", "sunset", "violet", "forest", "coral", "sky", "amber", "rose"];

type ProfileSetupProps = {
  user: User;
  onComplete: (user: User) => void;
};

export function ProfileSetup({ user, onComplete }: ProfileSetupProps) {
  const [displayName, setDisplayName] = useState(user.display_name === user.identifier ? "" : user.display_name);
  const [avatarKey, setAvatarKey] = useState(user.avatar_key);
  const [bio, setBio] = useState(user.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onComplete(await api.updateProfile({ displayName, avatarKey, bio }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-5">
      <form
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 md:p-10"
        onSubmit={submitProfile}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">One last step</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Set up your profile</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          This is what your contacts will see in direct and group conversations.
        </p>
        <div className="mt-7 flex flex-wrap gap-3" role="radiogroup" aria-label="Avatar colour">
          {avatarKeys.map((key) => (
            <button
              aria-checked={avatarKey === key}
              className={`rounded-full p-1 transition ${avatarKey === key ? "ring-2 ring-blue-600 ring-offset-2" : "hover:bg-slate-100"}`}
              key={key}
              onClick={() => setAvatarKey(key)}
              role="radio"
              type="button"
            >
              <Avatar avatarKey={key} name={displayName || "You"} size={42} />
            </button>
          ))}
        </div>
        <label className="mt-7 block text-sm font-medium" htmlFor="display-name">
          Display name
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          id="display-name"
          maxLength={80}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          value={displayName}
        />
        <label className="mt-5 block text-sm font-medium" htmlFor="bio">
          About <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          id="bio"
          maxLength={140}
          onChange={(event) => setBio(event.target.value)}
          placeholder="A short note about you"
          value={bio}
        />
        <button
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--signal-blue)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--signal-blue-dark)] disabled:opacity-60"
          disabled={busy || !displayName.trim()}
          type="submit"
        >
          {busy ? "Saving profile…" : "Open Signal"}
          <ArrowRight size={17} />
        </button>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      </form>
    </main>
  );
}
