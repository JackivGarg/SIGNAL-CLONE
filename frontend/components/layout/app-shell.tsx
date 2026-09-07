import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  rail: ReactNode;
  showRail: boolean;
  showConversationOnMobile: boolean;
  sidebar: ReactNode;
};

export function AppShell({ children, rail, showRail, showConversationOnMobile, sidebar }: AppShellProps) {
  return (
    <div
      className={`signal-shell ${showRail ? "signal-shell--rail" : ""} ${
        showConversationOnMobile ? "signal-shell--conversation" : ""
      }`}
    >
      <aside className="signal-rail-wrap">{rail}</aside>
      <aside aria-label="Conversations" className="signal-sidebar">
        {sidebar}
      </aside>
      <main className="signal-main">{children}</main>
    </div>
  );
}
