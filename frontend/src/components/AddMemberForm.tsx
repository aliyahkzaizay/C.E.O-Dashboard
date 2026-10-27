import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { createMember } from "../lib/members";
import type { ClassYear } from "../lib/members";

type Props = { organizationId: string; identifierLabel: string; onSaved: () => void; onCancel: () => void };

/** Collect optional identifiers without blocking members whose details are incomplete. */
export default function AddMemberForm({ organizationId, identifierLabel, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? "").trim() || null;
    submitting.current = true; setSaving(true); setError("");
    try {
      await createMember(organizationId, { name: value("name") ?? "", email: value("email"), external_member_id: value("external_member_id"), date_joined: value("date_joined"), class_year: value("class_year") as ClassYear | null });
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save member.");
    } finally { submitting.current = false; setSaving(false); }
  }
  return <form className="member-form" onSubmit={submit} aria-labelledby="add-member-heading">
    <h3 id="add-member-heading">Add a member</h3>
    <p>Only the name is required. Missing check-in details can be added later.</p>
    <fieldset disabled={saving}>
      <label>Full name <span aria-hidden="true">*</span><input name="name" required autoFocus autoComplete="off" /></label>
      <label>Email <span>(optional)</span><input name="email" type="email" maxLength={254} /></label>
      <label>{identifierLabel} <span>(optional)</span><input name="external_member_id" type="text" /></label>
      <label>Date joined <span>(optional)</span><input name="date_joined" type="date" /></label>
      <label>Class year <span>(optional)</span><select name="class_year" defaultValue=""><option value="">Not specified</option><option value="first_year">Freshman</option><option value="sophomore">Sophomore</option><option value="junior">Junior</option><option value="senior">Senior</option><option value="graduate">Graduate</option><option value="other">Other</option></select></label>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="member-actions"><button className="member-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save member"}</button><button type="button" disabled={saving} onClick={onCancel}>Cancel</button></div>
  </form>;
}
