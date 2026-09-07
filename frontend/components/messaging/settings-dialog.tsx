"use client";

import { Laptop, LoaderCircle, LogOut, Phone, Settings, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { api, type User } from "@/lib/api";

type SettingsDialogProps = {
  onClose: () => void;
  onLogout: () => void;
  user: User;
};

const optionalFeatures = [
  { icon: Phone, label: "Voice and video calls", detail: "Interface placeholder" },
  { icon: Laptop, label: "Linked devices", detail: "Interface placeholder" },
  { icon: ShieldCheck, label: "Privacy and stories", detail: "Interface placeholder" },
];

export function SettingsDialog({ onClose, onLogout, user }: SettingsDialogProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setIsLoggingOut(true);
    setError(null);
    try {
      await api.logout();
      onLogout();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not log out.");
      setIsLoggingOut(false);
    }
  }

  return (
    <div
      aria-labelledby="settings-title"
      aria-modal="true"
      className="fixed inset-0 z-40 grid place-items-center bg-slate-900/35 p-4"
      role="dialog"
    >
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="text-slate-500" size={19} />
            <h2 className="font-semibold" id="settings-title">Settings</h2>
          </div>
          <button
            aria-label="Close settings"
            className="grid size-9 place-items-center rounded-full hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </header>

        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
          <Avatar avatarKey={user.avatar_key} name={user.display_name} size={52} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.display_name}</p>
            <p className="truncate text-sm text-slate-500">@{user.identifier}</p>
            {user.bio && <p className="mt-1 truncate text-xs text-slate-400">{user.bio}</p>}
          </div>
        </div>

        <div className="mt-4 space-y-1">
          {optionalFeatures.map(({ icon: Icon, label, detail }) => (
            <div className="flex items-center gap-3 rounded-xl px-3 py-3" key={label}>
              <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-slate-400">{detail}</span>
              </span>
            </div>
          ))}
        </div>

        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          disabled={isLoggingOut}
          onClick={logout}
          type="button"
        >
          {isLoggingOut ? <LoaderCircle className="animate-spin" size={17} /> : <LogOut size={17} />}
          {isLoggingOut ? "Logging out…" : "Log out"}
        </button>
        {error && <p className="mt-3 text-center text-sm text-rose-600">{error}</p>}
      </section>
    </div>
  );
}
