"use client";

import { Check, Edit3, ListFilter, MoreHorizontal, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import type { ConversationPreview, User } from "@/lib/api";
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
  const [filter, setFilter] = useState<"all" | "unread" | "groups">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (filter === "unread" && conversation.unread_count === 0) return false;
      if (filter === "groups" && conversation.kind !== "group") return false;
      return !normalizedQuery || `${conversation.title} ${conversation.last_message?.body ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [conversations, filter, query]);

  const filterLabel = filter === "all" ? "All chats" : filter === "unread" ? "Unread chats" : "Groups";

  return (
    <div className="signal-conversation-sidebar">
      <header className="signal-conversation-sidebar__header">
        <div>
          <h1>Chats</h1>
          <p className="signal-connection-state">
            <span className={isRealtimeConnected ? "signal-presence signal-presence--online" : "signal-presence"} />
            {isRealtimeConnected ? "Connected" : "Reconnecting"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="New message" onClick={onNewMessage}>
            <Edit3 size={19} />
          </IconButton>
          <IconButton label="Settings" onClick={onOpenSettings}>
            <MoreHorizontal size={21} />
          </IconButton>
        </div>
      </header>
      <div className="signal-search-row">
      <label className="relative block min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <input
          aria-label="Search conversations"
          className="signal-search-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          type="search"
          value={query}
        />
      </label>
      <IconButton
        active={filter !== "all" || isFilterOpen}
        aria-expanded={isFilterOpen}
        label={`Filter conversations: ${filterLabel}`}
        onClick={() => setIsFilterOpen((open) => !open)}
      >
        <ListFilter size={20} />
      </IconButton>
      {isFilterOpen && (
        <div className="signal-filter-menu" role="menu">
          {(["all", "unread", "groups"] as const).map((option) => {
            const label = option === "all" ? "All chats" : option === "unread" ? "Unread" : "Groups";
            return (
              <button
                key={option}
                onClick={() => { setFilter(option); setIsFilterOpen(false); }}
                role="menuitemradio"
                aria-checked={filter === option}
                type="button"
              >
                <span>{label}</span>
                {filter === option && <Check size={17} />}
              </button>
            );
          })}
        </div>
      )}
      </div>
      <div className="signal-conversation-list">
        {isLoading ? (
          <div className="px-3 py-8 text-center text-sm text-slate-400">Loading conversations…</div>
        ) : visibleConversations.length ? (
          visibleConversations.map((conversation) => (
            <button
              aria-current={selectedConversationId === conversation.id ? "page" : undefined}
              className={`signal-conversation-row ${
                selectedConversationId === conversation.id
                  ? "signal-conversation-row--selected"
                  : ""
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
                  <span className="signal-group-badge">
                    <UsersRound size={11} />
                  </span>
                )}
                {conversation.peer_user_id && onlineUserIds.has(conversation.peer_user_id) && (
                  <span
                    aria-label="Online"
                    className="signal-online-badge"
                  />
                )}
              </div>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-[16px] font-semibold text-[var(--signal-text)]">{conversation.title}</span>
                  <span className="signal-conversation-time">
                    <span>{formatConversationTime(conversation.last_message_at)}</span>
                    {conversation.last_message?.sender_id === user.id && conversation.last_message.receipt_status && (
                      <span
                        aria-label={conversation.last_message.receipt_status}
                        className={`signal-list-receipt signal-receipt signal-receipt--${conversation.last_message.receipt_status}`}
                      >
                        <i /><i />
                      </span>
                    )}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="truncate text-[15px] text-[var(--signal-muted)]">
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
            <p className="text-sm leading-6 text-[var(--signal-muted)]">
              {filter === "all"
                ? query ? "No matching conversations." : "No conversations yet."
                : `No ${filterLabel.toLowerCase()} match.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
