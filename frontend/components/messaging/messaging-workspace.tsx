"use client";

import { LockKeyhole, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ConversationSidebar } from "@/components/messaging/conversation-sidebar";
import { NewConversationDialog } from "@/components/messaging/new-conversation-dialog";
import { api, type ConversationPreview, type User } from "@/lib/api";

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

  return (
    <AppShell
      sidebar={
        <ConversationSidebar
          conversations={conversations}
          isLoading={isLoading}
          onNewMessage={() => setIsNewConversationOpen(true)}
          onSelect={setSelectedConversationId}
          selectedConversationId={selectedConversationId}
        />
      }
      user={{ avatarKey: user.avatar_key, displayName: user.display_name }}
    >
      {isLoading ? (
        <section className="grid place-items-center p-8 text-slate-500">
          <RefreshCw className="animate-spin" size={22} />
        </section>
      ) : selectedConversation ? (
        <section className="grid place-items-center p-8 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-blue-100 text-blue-600">
              <LockKeyhole size={28} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{selectedConversation.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Conversation history and the message composer are loading in the next workspace step.
            </p>
          </div>
        </section>
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
