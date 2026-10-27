import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { createMember, updateMember } from "../lib/members";
import type { ClassYear, Member, MemberInput } from "../lib/members";

type Props = { organizationId: string; identifierLabel: string; member?: Member; onSaved: () => void; onCancel: () => void };

/** Collect optional identifiers without blocking members whose details are incomplete. */
export default function MemberForm({ organizationId, identifierLabel, member, onSaved, onCancel }: Props) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  function readValues(form: HTMLFormElement): MemberInput {
    const fields = new FormData(form);
    const value = (key: string) => String(fields.get(key) ?? "").trim() || null;
    return { name: value("name") ?? "", email: value("email"), external_member_id: value("external_member_id"), date_joined: value("date_joined"), class_year: value("class_year") as ClassYear | null };
  }
  function changedFields(values: MemberInput): Partial<MemberInput> {
    return Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== member?.[key as keyof MemberInput]));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const values = readValues(event.currentTarget);
    const changes = changedFields(values);
    if (member && Object.keys(changes).length === 0) return;
    submitting.current = true; setSaving(true); setError("");
    try {
      if (member) await updateMember(organizationId, member.member_id, changes);
      else await createMember(organizationId, values);
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save member.");
    } finally { submitting.current = false; setSaving(false); }
  }
  return <form className="member-form" onSubmit={submit} onChange={event => setDirty(Object.keys(changedFields(readValues(event.currentTarget))).length > 0)} aria-labelledby="member-form-heading">
    <h3 id="member-form-heading">{member ? "Edit member" : "Add a member"}</h3>
    <p>Only the name is required. Missing check-in details can be added later.</p>
    <fieldset disabled={saving}>
      <label>Full name <span aria-hidden="true">*</span><input defaultValue={member?.name ?? ""} name="name" required autoFocus autoComplete="off" /></label>
      <label>Email <span>(optional)</span><input defaultValue={member?.email ?? ""} name="email" type="email" maxLength={254} /></label>
      <label>{identifierLabel} <span>(optional)</span><input defaultValue={member?.external_member_id ?? ""} name="external_member_id" type="text" /></label>
      <label>Date joined <span>(optional)</span><input defaultValue={member?.date_joined ?? ""} name="date_joined" type="date" /></label>
      <label>Class year <span>(optional)</span><select name="class_year" defaultValue={member?.class_year ?? ""}><option value="">Not specified</option><option value="first_year">Freshman</option><option value="sophomore">Sophomore</option><option value="junior">Junior</option><option value="senior">Senior</option><option value="graduate">Graduate</option><option value="other">Other</option></select></label>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="member-actions"><button className="member-primary" type="submit" disabled={saving || (!!member && !dirty)}>{saving ? "Saving…" : member ? "Save changes" : "Save member"}</button><button type="button" disabled={saving} onClick={onCancel}>Cancel</button></div>
  </form>;
}
