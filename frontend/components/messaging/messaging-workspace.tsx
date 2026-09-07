"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ConversationSidebar } from "@/components/messaging/conversation-sidebar";
import { MessagePanel } from "@/components/messaging/message-panel";
import { NewConversationDialog } from "@/components/messaging/new-conversation-dialog";
import { api, type ConversationPreview, type Message, type User } from "@/lib/api";

type MessagingWorkspaceProps = {
  user: User;
};

export function MessagingWorkspace({ user }: MessagingWorkspaceProps) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);

  useEffect(() => {
    api
      .getConversations()
      .then((items) => {
        setConversations(items);
        setSelectedConversationId((selectedId) => selectedId ?? items[0]?.id ?? null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  function selectCreatedConversation(conversation: ConversationPreview) {
    setConversations((currentConversations) => [
      conversation,
      ...currentConversations.filter((currentConversation) => currentConversation.id !== conversation.id),
    ]);
    setSelectedConversationId(conversation.id);
    setIsNewConversationOpen(false);
  }

  function updateConversationFromMessage(message: Message) {
    setConversations((currentConversations) =>
      currentConversations
        .map((conversation) =>
          conversation.id === message.conversation_id
            ? {
                ...conversation,
                last_message: {
                  body: message.body,
                  sender_id: message.sender_id,
                  sent_at: message.sent_at,
                },
                last_message_at: message.sent_at,
              }
            : conversation,
        )
        .sort((first, second) =>
          (second.last_message_at ?? "").localeCompare(first.last_message_at ?? ""),
        ),
    );
  }

  const clearSelectedUnreadCount = useCallback(() => {
    if (!selectedConversationId) return;
    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === selectedConversationId ? { ...conversation, unread_count: 0 } : conversation,
      ),
    );
  }, [selectedConversationId]);

  return (
    <AppShell
      sidebar={
        <ConversationSidebar
          conversations={conversations}
          isLoading={isLoading}
          onNewMessage={() => setIsNewConversationOpen(true)}
          onSelect={setSelectedConversationId}
          selectedConversationId={selectedConversationId}
          user={user}
        />
      }
    >
      {isLoading ? (
        <section className="grid place-items-center p-8 text-slate-500">
          <RefreshCw className="animate-spin" size={22} />
        </section>
      ) : selectedConversation ? (
        <MessagePanel
          conversation={selectedConversation}
          currentUser={user}
          key={selectedConversation.id}
          onMessageSent={updateConversationFromMessage}
          onMessagesRead={clearSelectedUnreadCount}
        />
      ) : (
        <section className="grid place-items-center p-8 text-center">
          <div className="max-w-sm">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome to Signal</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Start a new conversation to begin messaging.
            </p>
          </div>
        </section>
      )}
      {isNewConversationOpen && (
        <NewConversationDialog
          onClose={() => setIsNewConversationOpen(false)}
          onCreated={selectCreatedConversation}
        />
      )}
    </AppShell>
  );
}
