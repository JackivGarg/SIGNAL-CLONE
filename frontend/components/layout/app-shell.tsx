import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  showConversationOnMobile: boolean;
  sidebar: ReactNode;
};

export function AppShell({ children, showConversationOnMobile, sidebar }: AppShellProps) {
  return (
    <div className={`signal-shell ${showConversationOnMobile ? "signal-shell--conversation" : ""}`}>
      <aside aria-label="Conversations" className="signal-sidebar">
        {sidebar}
      </aside>
      <main className="signal-main">{children}</main>
    </div>
  );
}
