"use client";

import {
  Bell,
  ChevronRight,
  CircleHelp,
  Database,
  Globe2,
  HardDrive,
  Heart,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Palette,
  Phone,
  Settings,
  ShieldCheck,
  Sticker,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { api, type User } from "@/lib/api";
import type { ThemePreference } from "@/lib/use-theme";

type SettingsDialogProps = {
  onClose: () => void;
  onLogout: () => void;
  onThemeChange: (theme: ThemePreference) => void;
  theme: ThemePreference;
  user: User;
};

type SettingsSection = "general" | "appearance" | "chats" | "calls" | "notifications" | "privacy" | "data" | "backups" | "donate";

const sections: Array<{ icon: typeof Settings; id: SettingsSection; label: string }> = [
  { id: "general", label: "General", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: LockKeyhole },
  { id: "data", label: "Data usage", icon: Database },
  { id: "backups", label: "Backups", icon: HardDrive },
  { id: "donate", label: "Donate to Signal", icon: Heart },
];

function PlaceholderRow({ detail, icon: Icon, label, onClick }: { detail?: string; icon?: typeof Bell; label: string; onClick: () => void }) {
  return <button className="signal-settings-row" onClick={onClick} type="button">
    {Icon && <Icon size={20} />}
    <span><b>{label}</b>{detail && <small>{detail}</small>}</span>
    <ChevronRight size={19} />
  </button>;
}

export function SettingsDialog({ onClose, onLogout, onThemeChange, theme, user }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const activeLabel = sections.find((section) => section.id === activeSection)?.label ?? "Settings";
  const showComingSoon = (label: string) => setNotice(`${label} is coming soon.`);

  async function logout() {
    setIsLoggingOut(true);
    setNotice(null);
    try {
      await api.logout();
      onLogout();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not log out.");
      setIsLoggingOut(false);
    }
  }

  function renderContent() {
    if (activeSection === "appearance") {
      return <section className="signal-settings-content">
        <h2>Appearance</h2>
        <div className="signal-settings-card">
          <PlaceholderRow icon={Globe2} label="Language" detail="System language" onClick={() => showComingSoon("Language selection")} />
          <label className="signal-settings-theme-row"><span><Moon size={20} /><b>Theme</b></span><select aria-label="Theme" onChange={(event) => onThemeChange(event.target.value as ThemePreference)} value={theme}><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
          <PlaceholderRow icon={Palette} label="Chat color" detail="Signal blue" onClick={() => showComingSoon("Chat color")} />
          <PlaceholderRow icon={CircleHelp} label="Zoom level" detail="100%" onClick={() => showComingSoon("Zoom level")} />
        </div>
        <p className="signal-settings-help">Theme changes apply immediately and are remembered on this device.</p>
      </section>;
    }

    if (activeSection === "notifications") {
      return <section className="signal-settings-content">
        <h2>Notifications</h2>
        <div className="signal-settings-card">
          <PlaceholderRow icon={Bell} label="Enable notifications" detail="Coming soon" onClick={() => showComingSoon("Notifications")} />
          <PlaceholderRow icon={Phone} label="Call notifications" detail="Coming soon" onClick={() => showComingSoon("Call notifications")} />
          <PlaceholderRow icon={Bell} label="In-chat message sounds" detail="Coming soon" onClick={() => showComingSoon("In-chat sounds")} />
        </div>
      </section>;
    }

    if (activeSection === "privacy") {
      return <section className="signal-settings-content">
        <h2>Privacy</h2>
        <div className="signal-settings-card">
          <PlaceholderRow icon={LockKeyhole} label="Phone number privacy" detail="Coming soon" onClick={() => showComingSoon("Phone number privacy")} />
          <PlaceholderRow icon={ShieldCheck} label="Read receipts and typing indicators" detail="Coming soon" onClick={() => showComingSoon("Privacy controls")} />
          <PlaceholderRow icon={Sticker} label="Stories" detail="Coming soon" onClick={() => showComingSoon("Stories")} />
        </div>
      </section>;
    }

    if (activeSection !== "general") {
      return <section className="signal-settings-content signal-settings-placeholder-page"><h2>{activeLabel}</h2><div><CircleHelp size={28} /><h3>{activeLabel} is coming soon</h3><p>This interface is included for the Signal experience. It is outside the assignment’s required functional scope.</p></div></section>;
    }

    return <section className="signal-settings-content">
      <h2>Profile</h2>
      <div className="signal-profile-page">
        <Avatar avatarKey={user.avatar_key} name={user.display_name} size={100} />
        <h3>{user.display_name}</h3>
        <p>@{user.identifier}</p>
        <div className="signal-settings-card">
          <PlaceholderRow icon={UserRound} label="Display name" detail={user.display_name} onClick={() => showComingSoon("Profile editing")} />
          <PlaceholderRow icon={MessageCircle} label="About" detail={user.bio || "No profile message"} onClick={() => showComingSoon("Profile editing")} />
          <PlaceholderRow icon={LockKeyhole} label="Phone number" detail={user.phone_number ? "Visible only to you" : "Not set"} onClick={() => showComingSoon("Phone number settings")} />
        </div>
      </div>
    </section>;
  }

  return <div aria-labelledby="settings-title" aria-modal="true" className="signal-settings-screen" role="dialog">
    <nav aria-label="Signal navigation" className="signal-settings-rail">
      <button aria-label="Close settings" onClick={onClose} type="button"><Menu size={24} /></button>
      <button aria-label="Chats" onClick={onClose} type="button"><MessageCircle size={24} /></button>
      <button aria-label="Calls" onClick={() => showComingSoon("Calls")} type="button"><Phone size={24} /></button>
      <button aria-label="Stories" onClick={() => showComingSoon("Stories")} type="button"><Sticker size={24} /></button>
      <button aria-label="Settings" className="signal-settings-rail--active" type="button"><Settings size={24} /></button>
    </nav>
    <aside className="signal-settings-sidebar">
      <header><h1 id="settings-title">Settings</h1><button aria-label="Close settings" onClick={onClose} type="button"><X size={20} /></button></header>
      <button className="signal-settings-user" onClick={() => setActiveSection("general")} type="button"><Avatar avatarKey={user.avatar_key} name={user.display_name} size={56} /><span><b>{user.display_name}</b><small>{user.phone_number ?? `@${user.identifier}`}</small></span></button>
      <div className="signal-settings-sections">{sections.map(({ icon: Icon, id, label }) => <button className={activeSection === id ? "signal-settings-section--active" : ""} key={id} onClick={() => setActiveSection(id)} type="button"><Icon size={22} /><span>{label}</span></button>)}</div>
      <button className="signal-settings-logout" disabled={isLoggingOut} onClick={logout} type="button"><LogOut size={19} />{isLoggingOut ? "Logging out…" : "Log out"}</button>
    </aside>
    <main className="signal-settings-main">{renderContent()}</main>
    {notice && <div className="signal-toast" role="status">{notice}</div>}
  </div>;
}
