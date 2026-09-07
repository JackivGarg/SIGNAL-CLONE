"use client";

import { ArrowRight, LockKeyhole, Smartphone } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { ApiError, api, type User } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";

type AuthScreenProps = {
  onAuthenticated: (user: User) => void;
};

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"demo" | "signup">("demo");
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDemoUsers()
      .then(setDemoUsers)
      .catch(() => setError("Unable to load the demo accounts. Is the API running?"));
  }, []);

  async function loginDemo(user: User) {
    setBusy(user.id);
    setError(null);
    try {
      onAuthenticated(await api.loginAsDemoUser(user.identifier));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Demo login failed.");
    } finally {
      setBusy(null);
    }
  }

  async function submitIdentifier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("otp");
    setError(null);
    try {
      const challenge = await api.requestOtp(identifier);
      setChallengeId(challenge.challenge_id);
      setDemoCode(challenge.demo_code);
      setCode(challenge.demo_code ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start verification.");
    } finally {
      setBusy(null);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challengeId) return;
    setBusy("verify");
    setError(null);
    try {
      onAuthenticated(await api.verifyOtp(challengeId, code));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Verification failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#e4efff,_#f7f8fa_46%,_#eef1f5)] p-5">
      <section className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_24px_80px_rgba(31,41,55,0.12)] md:grid md:grid-cols-[0.92fr_1.08fr]">
        <div className="bg-[#24487b] p-8 text-white md:p-11">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/15">
            <LockKeyhole size={23} />
          </div>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
            Signal Clone
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">A review-ready messaging demo.</h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-blue-100">
            Try the seeded conversations instantly, or create your own account with the transparent
            mock verification flow.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-blue-100">
            <Smartphone size={18} /> Real-time messages, groups, and delivery state
          </div>
        </div>

        <div className="p-7 md:p-10">
          <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
            <button
              className={`flex-1 rounded-lg px-3 py-2 transition ${mode === "demo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              onClick={() => setMode("demo")}
              type="button"
            >
              Try demo
            </button>
            <button
              className={`flex-1 rounded-lg px-3 py-2 transition ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              onClick={() => setMode("signup")}
              type="button"
            >
              Create account
            </button>
          </div>

          {mode === "demo" ? (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold tracking-tight">Choose a demo person</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Each account has contacts, existing chats, and a shared group ready to explore.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {demoUsers.map((user) => (
                  <button
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
                    disabled={busy !== null}
                    key={user.id}
                    onClick={() => loginDemo(user)}
                    type="button"
                  >
                    <Avatar avatarKey={user.avatar_key} name={user.display_name} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{user.display_name}</span>
                      <span className="block truncate text-xs text-slate-500">@{user.identifier}</span>
                    </span>
                    <ArrowRight className="text-slate-400" size={17} />
                  </button>
                ))}
              </div>
            </div>
          ) : challengeId ? (
            <form className="mt-8" onSubmit={submitCode}>
              <h2 className="text-2xl font-semibold tracking-tight">Confirm your code</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter the six-digit verification code for <strong>{identifier}</strong>.
              </p>
              {demoCode && (
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Demo verification code: <strong>{demoCode}</strong>
                </p>
              )}
              <input
                autoComplete="one-time-code"
                className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.45em] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                value={code}
              />
              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--signal-blue)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--signal-blue-dark)] disabled:opacity-60"
                disabled={busy !== null || code.length !== 6}
                type="submit"
              >
                {busy === "verify" ? "Verifying…" : "Verify and continue"}
                <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <form className="mt-8" onSubmit={submitIdentifier}>
              <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use a username or phone number. Verification is intentionally mocked for this
                assignment, so no external SMS provider is required.
              </p>
              <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="identifier">
                Username or phone number
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                id="identifier"
                minLength={3}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="your-name or +919876543210"
                required
                value={identifier}
              />
              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--signal-blue)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--signal-blue-dark)] disabled:opacity-60"
                disabled={busy !== null}
                type="submit"
              >
                {busy === "otp" ? "Preparing verification…" : "Continue"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        </div>
      </section>
    </main>
  );
}
