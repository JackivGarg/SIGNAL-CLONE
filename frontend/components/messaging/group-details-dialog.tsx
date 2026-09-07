"use client";

import { LoaderCircle, ShieldCheck, ShieldMinus, UserMinus, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { api, type Contact, type ConversationPreview, type GroupMember, type User } from "@/lib/api";

type GroupDetailsDialogProps = { conversation: ConversationPreview; currentUser: User; onClose: () => void };

export function GroupDetailsDialog({ conversation, currentUser, onClose }: GroupDetailsDialogProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getGroupMembers(conversation.id).then(setMembers).catch(() => setError("Could not load group members."));
    api.getContacts().then(setContacts).catch(() => undefined);
  }, [conversation.id]);

  const isAdmin = members.find((member) => member.user_id === currentUser.id)?.role === "admin";
  const availableContacts = useMemo(() => contacts.filter((contact) => !members.some((member) => member.user_id === contact.id)), [contacts, members]);

  async function addMember() {
    if (!selectedContactId) return;
    setBusy("add"); setError(null);
    try {
      const member = await api.addGroupMember(conversation.id, selectedContactId);
      setMembers((items) => [...items, member]);
      setSelectedContactId("");
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add member."); }
    finally { setBusy(null); }
  }

  async function removeMember(userId: string) {
    setBusy(userId); setError(null);
    try { await api.removeGroupMember(conversation.id, userId); setMembers((items) => items.filter((member) => member.user_id !== userId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove member."); }
    finally { setBusy(null); }
  }

  async function changeRole(member: GroupMember) {
    setBusy(`role-${member.user_id}`);
    setError(null);
    try {
      const updatedMember = await api.updateGroupMemberRole(
        conversation.id,
        member.user_id,
        member.role === "admin" ? "member" : "admin",
      );
      setMembers((items) =>
        items.map((item) => item.user_id === updatedMember.user_id ? updatedMember : item),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the member role.");
    } finally {
      setBusy(null);
    }
  }

  return <div aria-modal="true" className="fixed inset-0 z-30 grid place-items-center bg-slate-900/35 p-4" role="dialog">
    <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
      <header className="flex items-center justify-between"><div><h2 className="font-semibold">{conversation.title}</h2><p className="mt-1 text-sm text-slate-500">{members.length} members</p></div><button aria-label="Close group details" className="grid size-9 place-items-center rounded-full hover:bg-slate-100" onClick={onClose} type="button"><X size={19} /></button></header>
      <div className="mt-5 max-h-72 space-y-2 overflow-y-auto">{members.map((member) => <div className="flex items-center gap-3 rounded-xl px-2 py-2" key={member.user_id}><Avatar avatarKey={member.avatar_key} name={member.display_name} size={38} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{member.display_name}{member.user_id === currentUser.id ? " (You)" : ""}</span><span className="text-xs text-slate-500">{member.role === "admin" ? "Admin" : "Member"}</span></span>{isAdmin && member.user_id !== currentUser.id && <div className="flex items-center gap-1"><button aria-label={`${member.role === "admin" ? "Remove admin from" : "Make admin"} ${member.display_name}`} className="grid size-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50" disabled={busy !== null} onClick={() => changeRole(member)} title={member.role === "admin" ? "Remove admin" : "Make admin"} type="button">{busy === `role-${member.user_id}` ? <LoaderCircle className="animate-spin" size={16} /> : member.role === "admin" ? <ShieldMinus size={16} /> : <ShieldCheck size={16} />}</button><button aria-label={`Remove ${member.display_name}`} className="grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50" disabled={busy !== null} onClick={() => removeMember(member.user_id)} type="button">{busy === member.user_id ? <LoaderCircle className="animate-spin" size={16} /> : <UserMinus size={16} />}</button></div>}</div>)}</div>
      {isAdmin && <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add member</p><div className="mt-2 flex gap-2"><select className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setSelectedContactId(event.target.value)} value={selectedContactId}><option value="">Choose a contact</option>{availableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.display_name}</option>)}</select><button aria-label="Add selected member" className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-60" disabled={!selectedContactId || busy !== null} onClick={addMember} type="button">{busy === "add" ? <LoaderCircle className="animate-spin" size={16} /> : <UserPlus size={17} />}</button></div></div>}
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </section>
  </div>;
}
