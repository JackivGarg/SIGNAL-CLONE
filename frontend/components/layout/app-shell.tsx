import type { ReactNode } from "react";
import { MessageCircleMore, Settings } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";

type AppShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

export function AppShell({ children, sidebar }: AppShellProps) {
  return (
    <div className="signal-shell">
      <aside aria-label="Primary navigation" className="signal-rail">
        <IconButton active label="Chats">
          <MessageCircleMore size={21} strokeWidth={2.1} />
        </IconButton>
        <div className="signal-rail__spacer" />
        <IconButton label="Settings">
          <Settings size={20} />
        </IconButton>
        <Avatar avatarKey="ocean" name="Jack" size={36} />
      </aside>
      <aside aria-label="Conversations" className="signal-sidebar">
        {sidebar}
      </aside>
      <main className="signal-main">{children}</main>
    </div>
  );
}
