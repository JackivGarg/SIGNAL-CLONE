"use client";

import { ArrowLeft, AtSign, Camera, Check, Hash, LoaderCircle, Search, UsersRound, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { api, type Contact, type ConversationPreview } from "@/lib/api";

type NewConversationDialogProps = { onClose: () => void; onCreated: (conversation: ConversationPreview) => void; };
type Step = "new-chat" | "choose-members" | "name-group";

export function NewConversationDialog({ onClose, onCreated }: NewConversationDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [step, setStep] = useState<Step>("new-chat");
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [showIdentifier, setShowIdentifier] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.getContacts().then(setContacts).catch(() => setError("Could not load contacts.")); }, []);
  const visibleContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery ? contacts.filter((contact) => `${contact.display_name} ${contact.identifier} ${contact.phone_number ?? ""}`.toLowerCase().includes(normalizedQuery)) : contacts;
  }, [contacts, query]);
  const selectedContacts = contacts.filter((contact) => selectedMemberIds.includes(contact.id));

  function goBack() {
    setError(null);
    if (step === "name-group") setStep("choose-members");
    else if (step === "choose-members") setStep("new-chat");
    else onClose();
  }

  async function createConversation(contact: Contact) {
    setBusy(contact.id); setError(null);
    try { onCreated(await api.createDirectConversation(contact.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start the conversation."); setBusy(null); }
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("add-contact"); setError(null);
    try {
      const contact = await api.addContact(identifier);
      setContacts((items) => [...items.filter((item) => item.id !== contact.id), contact]);
      setIdentifier(""); setShowIdentifier(false);
      await createConversation(contact);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not find a registered user with that username or phone number."); setBusy(null); }
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("create-group"); setError(null);
    try { onCreated(await api.createGroupConversation(groupTitle, selectedMemberIds)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the group."); setBusy(null); }
  }

  return <div aria-labelledby="new-message-title" aria-modal="true" className="signal-new-chat-layer" role="dialog">
    <section className="signal-new-chat-panel">
      <header className="signal-new-chat-header">
        <button aria-label="Go back" onClick={goBack} type="button"><ArrowLeft size={22} /></button>
        <h2 id="new-message-title">{step === "new-chat" ? "New chat" : step === "choose-members" ? "Choose members" : "Name this group"}</h2>
        <button aria-label="Close new chat" onClick={onClose} type="button"><X size={20} /></button>
      </header>

      {step === "new-chat" && <>
        <label className="signal-new-chat-search"><Search size={19} /><input autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="Name, username, or number" type="search" value={query} /></label>
        <div className="signal-new-chat-actions">
          <button onClick={() => setStep("choose-members")} type="button"><span><UsersRound size={24} /></span><b>New group</b></button>
          <button onClick={() => setShowIdentifier((value) => !value)} type="button"><span><AtSign size={24} /></span><b>Find by username</b></button>
          <button onClick={() => setShowIdentifier((value) => !value)} type="button"><span><Hash size={26} /></span><b>Find by phone number</b></button>
        </div>
        {showIdentifier && <form className="signal-find-contact" onSubmit={addContact}><input autoFocus onChange={(event) => setIdentifier(event.target.value)} placeholder="username or phone number" required value={identifier} /><button disabled={busy !== null} type="submit">{busy === "add-contact" ? <LoaderCircle className="animate-spin" size={18} /> : "Find"}</button></form>}
        <h3 className="signal-contact-heading">Contacts</h3>
        <div className="signal-contact-list">{visibleContacts.map((contact) => <button disabled={busy !== null} key={contact.id} onClick={() => createConversation(contact)} type="button"><Avatar avatarKey={contact.avatar_key} name={contact.display_name} size={40} /><span>{contact.display_name}</span>{busy === contact.id && <LoaderCircle className="ml-auto animate-spin" size={18} />}</button>)}</div>
      </>}

      {step === "choose-members" && <>
        <label className="signal-new-chat-search"><Search size={19} /><input autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="Name, username, or number" type="search" value={query} /></label>
        {selectedContacts.length > 0 && <div className="signal-member-chips">{selectedContacts.map((contact) => <button key={contact.id} onClick={() => setSelectedMemberIds((ids) => ids.filter((id) => id !== contact.id))} type="button"><Avatar avatarKey={contact.avatar_key} name={contact.display_name} size={24} />{contact.display_name}<X size={15} /></button>)}</div>}
        <h3 className="signal-contact-heading">Contacts</h3>
        <div className="signal-contact-list signal-contact-list--select">{visibleContacts.map((contact) => {
          const selected = selectedMemberIds.includes(contact.id);
          return <button className={selected ? "signal-contact-row--selected" : ""} key={contact.id} onClick={() => setSelectedMemberIds((ids) => selected ? ids.filter((id) => id !== contact.id) : [...ids, contact.id])} type="button"><Avatar avatarKey={contact.avatar_key} name={contact.display_name} size={40} /><span>{contact.display_name}</span><i className={selected ? "signal-selected-circle" : "signal-empty-circle"}>{selected && <Check size={16} />}</i></button>;
        })}</div>
        <button className="signal-flow-next" disabled={!selectedMemberIds.length} onClick={() => setStep("name-group")} type="button">Next</button>
      </>}

      {step === "name-group" && <form className="signal-name-group" onSubmit={createGroup}>
        <div className="signal-group-avatar"><UsersRound size={63} /><span><Camera size={20} /></span></div>
        <input autoFocus onChange={(event) => setGroupTitle(event.target.value)} placeholder="Group name (required)" required value={groupTitle} />
        <button className="signal-disappearing-button" onClick={() => setError("Disappearing messages are shown as a UI placeholder for this assignment.")} type="button"><b>Disappearing messages</b><span>Off⌄</span></button>
        <h3 className="signal-contact-heading">Members</h3>
        <div className="signal-selected-members">{selectedContacts.map((contact) => <div key={contact.id}><Avatar avatarKey={contact.avatar_key} name={contact.display_name} size={40} /><span>{contact.display_name}</span></div>)}</div>
        <button className="signal-create-group" disabled={!groupTitle.trim() || busy !== null} type="submit">{busy === "create-group" ? "Creating…" : "Create"}</button>
      </form>}
      {error && <p className="signal-new-chat-error">{error}</p>}
    </section>
  </div>;
}
