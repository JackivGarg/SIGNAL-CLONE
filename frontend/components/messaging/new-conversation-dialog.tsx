"use client";

import { LoaderCircle, Search, UserPlus, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { api, type Contact, type ConversationPreview } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";

type NewConversationDialogProps = {
  onClose: () => void;
  onCreated: (conversation: ConversationPreview) => void;
};

export function NewConversationDialog({ onClose, onCreated }: NewConversationDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getContacts().then(setContacts).catch(() => setError("Could not load contacts."));
  }, []);

  const visibleContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return contacts;
    return contacts.filter((contact) =>
      `${contact.display_name} ${contact.identifier}`.toLowerCase().includes(normalizedQuery),
    );
  }, [contacts, query]);

  async function createConversation(contact: Contact) {
    setBusy(contact.id);
    setError(null);
    try {
      onCreated(await api.createDirectConversation(contact.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start the conversation.");
      setBusy(null);
    }
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("add-contact");
    setError(null);
    try {
      const contact = await api.addContact(identifier);
      setContacts((currentContacts) => [
        ...currentContacts.filter((currentContact) => currentContact.id !== contact.id),
        contact,
      ]);
      setIdentifier("");
      await createConversation(contact);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add that contact.");
      setBusy(null);
    }
  }

  return (
    <div
      aria-labelledby="new-message-title"
      aria-modal="true"
      className="fixed inset-0 z-20 grid place-items-center bg-slate-900/35 p-4"
      role="dialog"
    >
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id="new-message-title">New message</h2>
            <p className="mt-1 text-sm text-slate-500">Start a secure direct conversation.</p>
          </div>
          <button
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </header>
        <label className="relative mt-5 block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            autoFocus
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your contacts"
            type="search"
            value={query}
          />
        </label>
        <div className="mt-3 max-h-64 overflow-y-auto">
          {visibleContacts.map((contact) => (
            <button
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-50 disabled:opacity-60"
              disabled={busy !== null}
              key={contact.id}
              onClick={() => createConversation(contact)}
              type="button"
            >
              <Avatar avatarKey={contact.avatar_key} name={contact.display_name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{contact.display_name}</span>
                <span className="block truncate text-xs text-slate-500">@{contact.identifier}</span>
              </span>
              {busy === contact.id && <LoaderCircle className="animate-spin text-blue-600" size={17} />}
            </button>
          ))}
        </div>
        <form className="mt-4 border-t border-slate-100 pt-4" onSubmit={addContact}>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="new-contact">
            Add a registered user
          </label>
          <div className="mt-2 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              id="new-contact"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="username or phone"
              required
              value={identifier}
            />
            <button
              aria-label="Add contact"
              className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-60"
              disabled={busy !== null}
              type="submit"
            >
              {busy === "add-contact" ? <LoaderCircle className="animate-spin" size={17} /> : <UserPlus size={17} />}
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </section>
    </div>
  );
}
