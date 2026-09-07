"use client";

import { ArrowLeft, Check, CheckCheck, Info, LockKeyhole, SendHorizontal } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import type { ConversationPreview, Message, User } from "@/lib/api";
import { api } from "@/lib/api";

type MessagePanelProps = {
  conversation: ConversationPreview;
  currentUser: User;
  incomingMessage: Message | null;
  onMessageSent: (message: Message) => void;
  onMessagesRead: () => void;
  onTypingChange: (isTyping: boolean) => void;
  onDetails: () => void;
  onBack: () => void;
  receiptUpdates: Record<string, "delivered" | "read">;
  typing: boolean;
  isPeerOnline: boolean;
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function MessagePanel({
  conversation,
  currentUser,
  incomingMessage,
  onMessageSent,
  onMessagesRead,
  onTypingChange,
  onDetails,
  onBack,
  receiptUpdates,
  typing,
  isPeerOnline,
}: MessagePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const isTypingRef = useRef(false);
  const onTypingChangeRef = useRef(onTypingChange);

  useEffect(() => {
    onTypingChangeRef.current = onTypingChange;
  }, [onTypingChange]);

  useEffect(() => {
    let isCurrent = true;
    if (incomingMessage && incomingMessage.conversation_id !== conversation.id) {
      return () => {
        isCurrent = false;
      };
    }
    api
      .getMessages(conversation.id)
      .then((items) => {
        if (!isCurrent) return;
        setMessages(items);
        void api.markConversationRead(conversation.id).then(onMessagesRead).catch(() => undefined);
      })
      .catch((reason) => isCurrent && setError(reason instanceof Error ? reason.message : "Could not load messages."))
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [conversation.id, incomingMessage, onMessagesRead]);

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) onTypingChangeRef.current(false);
    },
    [],
  );

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;

    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingChange(false);
    }

    const clientMessageId = crypto.randomUUID();
    const optimisticMessage: Message = {
      id: `pending-${clientMessageId}`,
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      sender_name: currentUser.display_name,
      body,
      client_message_id: clientMessageId,
      reply_to_id: null,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      pending: true,
    };
    setMessages((items) => [...items, optimisticMessage]);
    setDraft("");
    setIsSending(true);
    setError(null);

    try {
      const confirmedMessage = await api.sendMessage(conversation.id, body, clientMessageId);
      setMessages((items) =>
        items.map((item) => (item.client_message_id === clientMessageId ? confirmedMessage : item)),
      );
      onMessageSent(confirmedMessage);
    } catch (reason) {
      setMessages((items) => items.filter((item) => item.client_message_id !== clientMessageId));
      setDraft(body);
      setError(reason instanceof Error ? reason.message : "Your message could not be sent.");
    } finally {
      setIsSending(false);
    }
  }

  function updateDraft(value: string) {
    setDraft(value);
    if (!value.trim()) {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingChange(false);
      }
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingChange(true);
    }
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
      onTypingChangeRef.current(false);
    }, 1_200);
  }

  return (
    <section className="grid min-h-0 grid-rows-[auto_1fr_auto]">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Back to conversations"
            className="-ml-2 grid size-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 min-[761px]:hidden"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <Avatar avatarKey={conversation.avatar_key} name={conversation.title} size={40} />
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{conversation.title}</h2>
            <p className="truncate text-xs text-slate-500">
              {typing
                ? "Typing…"
                : conversation.kind === "group"
                  ? "Group conversation"
                  : isPeerOnline
                    ? "Online"
                    : "Offline"}
            </p>
          </div>
        </div>
        <button
          aria-label="Conversation details"
          className="grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
          onClick={onDetails}
          type="button"
        >
          <Info size={20} />
        </button>
      </header>
      <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-7">
        <div className="mx-auto mb-6 flex max-w-lg items-center justify-center gap-2 text-center text-xs text-slate-500">
          <LockKeyhole size={13} /> Messages are stored for this assignment demo.
        </div>
        {isLoading ? (
          <p className="pt-10 text-center text-sm text-slate-500">Loading messages…</p>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUser.id;
              return (
                <div
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      isOwnMessage
                        ? "rounded-br-md bg-[var(--signal-blue)] text-white"
                        : "rounded-bl-md bg-white text-slate-800"
                    }`}
                  >
                    {!isOwnMessage && conversation.kind === "group" && (
                      <p className="mb-1 text-xs font-semibold text-blue-700">{message.sender_name}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.body}</p>
                    <span
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        isOwnMessage ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {formatMessageTime(message.sent_at)}
                      {isOwnMessage &&
                        (message.pending ? (
                          <span>Sending…</span>
                        ) : receiptUpdates[message.id] === "read" || message.read_at ? (
                          <CheckCheck size={13} />
                        ) : receiptUpdates[message.id] === "delivered" ? (
                          <CheckCheck size={13} />
                        ) : (
                          <Check size={13} />
                        ))}
                    </span>
                  </div>
                </div>
              );
            })}
            {!messages.length && (
              <p className="py-12 text-center text-sm text-slate-500">Say hello to start this conversation.</p>
            )}
            <div ref={endOfMessagesRef} />
          </div>
        )}
      </div>
      <form className="border-t border-slate-200 bg-white p-3 sm:px-5" onSubmit={sendMessage}>
        <div className="flex items-end gap-2 rounded-2xl bg-slate-100 p-2 pl-4 focus-within:ring-2 focus-within:ring-blue-200">
          <textarea
            aria-label="Message"
            className="max-h-32 min-h-6 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
            maxLength={2000}
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={`Message ${conversation.title}`}
            rows={1}
            value={draft}
          />
          <button
            aria-label="Send message"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--signal-blue)] text-white transition hover:bg-[var(--signal-blue-dark)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!draft.trim() || isSending}
            type="submit"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
        {error && <p className="px-2 pt-2 text-xs text-rose-600">{error}</p>}
      </form>
    </section>
  );
}
