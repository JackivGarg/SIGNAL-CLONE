import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

export function AppShell({ children, sidebar }: AppShellProps) {
  return (
    <div className="signal-shell">
      <aside aria-label="Conversations" className="signal-sidebar">
        {sidebar}
      </aside>
      <main className="signal-main">{children}</main>
    </div>
  );
}
