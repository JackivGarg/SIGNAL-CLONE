"use client";

import { ArrowLeft, Camera, ChevronRight, Clock3, Ellipsis, LockKeyhole, Mic, Phone, Pin, Plus, Search, SendHorizontal, Smile, UsersRound, Video } from "lucide-react";
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
  onPlaceholder: (feature: string) => void;
  receiptUpdates: Record<string, "delivered" | "read">;
  typing: boolean;
  isPeerOnline: boolean;
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ReceiptIndicator({ message, status }: { message: Message; status?: "delivered" | "read" }) {
  if (message.pending) return <span className="signal-receipt signal-receipt--pending">Sending</span>;
  const receipt = status === "read" || message.read_at ? "read" : status === "delivered" || message.delivered_at ? "delivered" : "sent";
  const label = receipt === "read" ? "Read" : receipt === "delivered" ? "Delivered" : "Sent";
  return <span aria-label={label} className={`signal-receipt signal-receipt--${receipt}`} title={label}><i /><i /></span>;
}

export function MessagePanel({ conversation, currentUser, incomingMessage, onMessageSent, onMessagesRead, onTypingChange, onDetails, onBack, onPlaceholder, receiptUpdates, typing, isPeerOnline }: MessagePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const isTypingRef = useRef(false);
  const onTypingChangeRef = useRef(onTypingChange);

  useEffect(() => { onTypingChangeRef.current = onTypingChange; }, [onTypingChange]);

  useEffect(() => {
    let isCurrent = true;
    if (incomingMessage && incomingMessage.conversation_id !== conversation.id) return () => { isCurrent = false; };
    api.getMessages(conversation.id)
      .then((items) => { if (!isCurrent) return; setMessages(items); void api.markConversationRead(conversation.id).then(onMessagesRead).catch(() => undefined); })
      .catch((reason) => isCurrent && setError(reason instanceof Error ? reason.message : "Could not load messages."))
      .finally(() => isCurrent && setIsLoading(false));
    return () => { isCurrent = false; };
  }, [conversation.id, incomingMessage, onMessagesRead]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) onTypingChangeRef.current(false);
  }, []);
  useEffect(() => { endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) { isTypingRef.current = false; onTypingChange(false); }
    const clientMessageId = crypto.randomUUID();
    const optimisticMessage: Message = { id: `pending-${clientMessageId}`, conversation_id: conversation.id, sender_id: currentUser.id, sender_name: currentUser.display_name, body, client_message_id: clientMessageId, reply_to_id: null, sent_at: new Date().toISOString(), delivered_at: null, read_at: null, pending: true };
    setMessages((items) => [...items, optimisticMessage]); setDraft(""); setIsSending(true); setError(null);
    try {
      const confirmedMessage = await api.sendMessage(conversation.id, body, clientMessageId);
      setMessages((items) => items.map((item) => item.client_message_id === clientMessageId ? confirmedMessage : item));
      onMessageSent(confirmedMessage);
    } catch (reason) {
      setMessages((items) => items.filter((item) => item.client_message_id !== clientMessageId)); setDraft(body);
      setError(reason instanceof Error ? reason.message : "Your message could not be sent.");
    } finally { setIsSending(false); }
  }

  function updateDraft(value: string) {
    setDraft(value);
    if (!value.trim()) {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) { isTypingRef.current = false; onTypingChange(false); }
      return;
    }
    if (!isTypingRef.current) { isTypingRef.current = true; onTypingChange(true); }
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => { isTypingRef.current = false; onTypingChangeRef.current(false); }, 1_200);
  }

  const isGroup = conversation.kind === "group";
  const menuItems = isGroup
    ? [[Clock3, "Disappearing messages"], [Pin, "Mute notifications"], [UsersRound, "Group settings"], [Camera, "All media"], [Pin, "Select messages"], [Pin, "Mark as unread"], [Pin, "Pin chat"], [Pin, "Archive"], [Pin, "Block"], [Pin, "Delete"], [Pin, "Leave group"]] as const
    : [[Clock3, "Disappearing messages"], [Pin, "Mute notifications"], [Pin, "All media"], [Pin, "Block"], [Pin, "Delete"]] as const;

  return <section className="signal-message-panel">
    <header className="signal-chat-header">
      <div className="flex min-w-0 items-center gap-3">
        <button aria-label="Back to conversations" className="signal-mobile-back" onClick={onBack} type="button"><ArrowLeft size={21} /></button>
        <Avatar avatarKey={conversation.avatar_key} name={conversation.title} size={40} />
        <div className="min-w-0"><h2>{conversation.title}</h2><p>{typing ? "Typing…" : isGroup ? "Group conversation" : isPeerOnline ? "Online" : "Offline"}</p></div>
      </div>
      <div className="signal-chat-header__actions">
        <button aria-label="Start video call" onClick={() => onPlaceholder("Video calls")} type="button"><Video size={21} /></button>
        {!isGroup && <button aria-label="Start voice call" onClick={() => onPlaceholder("Voice calls")} type="button"><Phone size={20} /></button>}
        <button aria-label="Search messages" onClick={() => onPlaceholder("Message search")} type="button"><Search size={21} /></button>
        <button aria-expanded={showMenu} aria-label="Conversation menu" className={showMenu ? "signal-header-menu-trigger signal-header-menu-trigger--open" : "signal-header-menu-trigger"} onClick={() => setShowMenu((value) => !value)} type="button"><Ellipsis size={22} /></button>
      </div>
      {showMenu && <div className="signal-overflow-menu" role="menu">{menuItems.map(([Icon, label], index) => <button key={label} onClick={() => { setShowMenu(false); if (label === "Group settings") onDetails(); else onPlaceholder(label); }} role="menuitem" type="button"><Icon size={18} /><span>{label}</span>{index < 4 && <ChevronRight className="ml-auto" size={16} />}</button>)}</div>}
    </header>
    <div className="signal-message-scroll"><div className="signal-thread">
      {!messages.length && !isLoading && <div className="signal-conversation-intro"><Avatar avatarKey={conversation.avatar_key} name={conversation.title} size={90} /><h3>{conversation.title}</h3><p><UsersRound size={17} />{isGroup ? "No other group members yet" : "No groups in common"}</p>{isGroup && <span>(+1 invited)</span>}</div>}
      <div className="signal-date-divider">Today</div>
      {isLoading ? <p className="signal-thread-state">Loading messages…</p> : <div className="signal-message-list">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === currentUser.id;
          return <div className={`signal-message-row ${isOwnMessage ? "signal-message-row--own" : ""}`} key={message.id}><div className={`signal-bubble ${isOwnMessage ? "signal-bubble--own" : ""}`}>{!isOwnMessage && isGroup && <p className="signal-message-sender">{message.sender_name}</p>}<p>{message.body}</p><span className="signal-message-meta">{formatMessageTime(message.sent_at)}{isOwnMessage && <ReceiptIndicator message={message} status={receiptUpdates[message.id]} />}</span></div></div>;
        })}
        {!messages.length && <p className="signal-thread-state"><LockKeyhole size={14} />Messages are stored securely for this assignment demo.</p>}
      </div>}
      <div ref={endOfMessagesRef} />
    </div></div>
    <form className="signal-composer" onSubmit={sendMessage}>
      <button aria-label="Add emoji" onClick={() => onPlaceholder("Emoji picker")} type="button"><Smile size={23} /></button>
      <div className="signal-composer__input"><textarea aria-label="Message" maxLength={2000} onChange={(event) => updateDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message" rows={1} value={draft} /></div>
      {draft.trim() ? <button aria-label="Send message" className="signal-send-button" disabled={isSending} type="submit"><SendHorizontal size={20} /></button> : <button aria-label="Record voice message" onClick={() => onPlaceholder("Voice messages")} type="button"><Mic size={22} /></button>}
      <button aria-label="Add attachment" onClick={() => onPlaceholder("Attachments")} type="button"><Plus size={25} /></button>
    </form>
    {error && <p className="signal-message-error">{error}</p>}
  </section>;
}
