"use client";

import { Edit3, MoreVertical, Search, Settings, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import type { ConversationPreview } from "@/lib/api";
import type { User } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";

type ConversationSidebarProps = {
  conversations: ConversationPreview[];
  isLoading: boolean;
  onNewMessage: () => void;
  onOpenSettings: () => void;
  onSelect: (conversationId: string) => void;
  selectedConversationId: string | null;
  user: User;
  isRealtimeConnected: boolean;
  onlineUserIds: Set<string>;
};

function formatConversationTime(value: string | null) {
  if (!value) return "";
  const timestamp = new Date(value);
  const today = new Date();
  if (timestamp.toDateString() === today.toDateString()) {
    return timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return timestamp.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationSidebar({
  conversations,
  isLoading,
  onNewMessage,
  onOpenSettings,
  onSelect,
  selectedConversationId,
  user,
  isRealtimeConnected,
  onlineUserIds,
}: ConversationSidebarProps) {
  const [query, setQuery] = useState("");
  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.title} ${conversation.last_message?.body ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [conversations, query]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="flex items-center gap-3">
          <Avatar avatarKey={user.avatar_key} name={user.display_name} size={36} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Signal</h1>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <span
                className={`size-1.5 rounded-full ${isRealtimeConnected ? "bg-emerald-500" : "bg-slate-300"}`}
              />
              {isRealtimeConnected ? "Connected" : "Reconnecting"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="New message" onClick={onNewMessage}>
            <Edit3 size={19} />
          </IconButton>
          <IconButton label="Settings" onClick={onOpenSettings}>
            <Settings className="hidden sm:block" size={19} />
            <MoreVertical className="sm:hidden" size={19} />
          </IconButton>
        </div>
      </header>
      <label className="relative mx-4 block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <input
          aria-label="Search conversations"
          className="w-full rounded-xl border border-transparent bg-slate-100 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations"
          type="search"
          value={query}
        />
      </label>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          <div className="px-3 py-8 text-center text-sm text-slate-500">Loading conversations…</div>
        ) : visibleConversations.length ? (
          visibleConversations.map((conversation) => (
            <button
              aria-current={selectedConversationId === conversation.id ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                selectedConversationId === conversation.id
                  ? "bg-blue-50"
                  : "hover:bg-slate-50"
              }`}
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              type="button"
            >
              <div className="relative">
                <Avatar
                  avatarKey={conversation.avatar_key}
                  name={conversation.title}
                  size={46}
                />
                {conversation.kind === "group" && (
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-white bg-slate-700 text-white">
                    <UsersRound size={11} />
                  </span>
                )}
                {conversation.peer_user_id && onlineUserIds.has(conversation.peer_user_id) && (
                  <span
                    aria-label="Online"
                    className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-500"
                  />
                )}
              </div>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{conversation.title}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                    {formatConversationTime(conversation.last_message_at)}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="truncate text-sm text-slate-500">
                    {conversation.last_message?.body ?? "No messages yet"}
                  </span>
                  {conversation.unread_count > 0 && (
                    <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-[var(--signal-blue)] text-[11px] font-bold text-white">
                      {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <p className="text-sm leading-6 text-slate-500">
              {query ? "No matching conversations." : "No conversations yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
