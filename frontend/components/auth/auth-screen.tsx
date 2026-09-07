"use client";

import { ArrowRight, LockKeyhole, MessageCircle, Smartphone } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { ApiError, api, type User } from "@/lib/api";

type AuthScreenProps = { initialDemoUsers?: User[]; onAuthenticated: (user: User) => void; };

export function AuthScreen({ initialDemoUsers = [], onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"demo" | "signup">("demo");
  const [demoUsers, setDemoUsers] = useState<User[]>(initialDemoUsers);
  const [identifier, setIdentifier] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demoUsers.length) return;
    api.getDemoUsers().then(setDemoUsers).catch(() => setError("Unable to load demo accounts. Please refresh."));
  }, [demoUsers.length]);

  async function loginDemo(user: User) {
    setBusy(user.id); setError(null);
    try { onAuthenticated(await api.loginAsDemoUser(user.identifier)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Demo login failed."); }
    finally { setBusy(null); }
  }

  async function submitIdentifier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("otp"); setError(null);
    try {
      const challenge = await api.requestOtp(identifier);
      setChallengeId(challenge.challenge_id); setDemoCode(challenge.demo_code); setCode(challenge.demo_code ?? "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start verification."); }
    finally { setBusy(null); }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!challengeId) return;
    setBusy("verify"); setError(null);
    try { onAuthenticated(await api.verifyOtp(challengeId, code)); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Verification failed."); }
    finally { setBusy(null); }
  }

  return <main className="signal-auth-screen">
    <section className="signal-auth-card">
      <aside className="signal-auth-brand">
        <div className="signal-auth-brand-heading">
          <span className="signal-auth-logo"><MessageCircle size={27} /></span>
          <div><b>Signal Clone</b><small>Secure messaging demo</small></div>
        </div>
        <p>Scaler full-stack assignment</p>
        <h1>Start a conversation that feels alive.</h1>
        <span className="signal-auth-description">Review direct chats, group controls, delivery receipts, and live presence in one polished demo.</span>
        <div className="signal-auth-preview" aria-hidden="true">
          <div><span className="signal-auth-preview-avatar">SC</span><b>Signal Clone</b><i /></div>
          <p>Welcome! Try a demo account to explore the chat experience.</p>
          <span>Delivered <i>● ●</i></span>
        </div>
        <span className="signal-auth-brand-note"><LockKeyhole size={17} />Live chats, groups, and delivery states</span>
      </aside>
      <div className="signal-auth-content">
        <div className="signal-auth-tabs" role="tablist">
          <button aria-selected={mode === "demo"} className={mode === "demo" ? "signal-auth-tab--active" : ""} onClick={() => { setMode("demo"); setChallengeId(null); setError(null); }} role="tab" type="button">Try demo</button>
          <button aria-selected={mode === "signup"} className={mode === "signup" ? "signal-auth-tab--active" : ""} onClick={() => { setMode("signup"); setError(null); }} role="tab" type="button">Create account</button>
        </div>
        {mode === "demo" ? <div className="signal-auth-body">
          <h2>Choose a demo person</h2><p>Each account has contacts, direct chats, and a shared group ready for review.</p>
          <div className="signal-demo-grid">{demoUsers.map((user) => <button disabled={busy !== null} key={user.id} onClick={() => loginDemo(user)} type="button"><Avatar avatarKey={user.avatar_key} name={user.display_name} size={46} /><span><b>{user.display_name}</b><small>@{user.identifier}</small></span><ArrowRight size={18} /></button>)}</div>
        </div> : challengeId ? <form className="signal-auth-body" onSubmit={submitCode}>
          <span className="signal-auth-form-icon"><Smartphone size={23} /></span><h2>Confirm your code</h2><p>Enter the six-digit code for <strong>{identifier}</strong>.</p>
          {demoCode && <div className="signal-auth-code-note">Demo code: <b>{demoCode}</b></div>}
          <input autoComplete="one-time-code" autoFocus className="signal-auth-code-input" inputMode="numeric" maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="123456" value={code} />
          <button className="signal-auth-primary" disabled={busy !== null || code.length !== 6} type="submit">{busy === "verify" ? "Verifying…" : "Verify and continue"}<ArrowRight size={18} /></button>
        </form> : <form className="signal-auth-body" onSubmit={submitIdentifier}>
          <span className="signal-auth-form-icon"><Smartphone size={23} /></span><h2>Create your account</h2><p>Use a username or phone number. The verification code is shown securely in this demo.</p>
          <label htmlFor="identifier">Username or phone number</label><input autoFocus id="identifier" minLength={3} onChange={(event) => setIdentifier(event.target.value)} placeholder="your-name or +919876543210" required value={identifier} />
          <button className="signal-auth-primary" disabled={busy !== null} type="submit">{busy === "otp" ? "Preparing verification…" : "Continue"}<ArrowRight size={18} /></button>
        </form>}
        {error && <p className="signal-auth-error">{error}</p>}
      </div>
    </section>
  </main>;
}
