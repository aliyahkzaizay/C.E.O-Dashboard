import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getSupabase } from "../lib/supabase";
import { requestError } from "../lib/invitations";

type Invitation = {
  invitation_id: string;
  invited_email: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

type ClubInvitationsProps = { organizationId: string; organizationName: string };

function status(invitation: Invitation) {
  if (invitation.accepted_at) return "Accepted";
  if (invitation.revoked_at) return "Cancelled";
  return Date.parse(invitation.expires_at) <= Date.now() ? "Expired" : "Pending";
}

/** Owner controls for creating, copying, listing, and cancelling invitations. */
export default function ClubInvitations({ organizationId, organizationName }: ClubInvitationsProps) {
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [generated, setGenerated] = useState<{ id: string; link: string; email: string; expires: string } | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error: rpcError } = await getSupabase().rpc("list_organization_invitations", { p_organization_id: organizationId });
        if (rpcError) throw rpcError;
        if (active) setInvitations((data ?? []).filter((invitation: Invitation) => !invitation.revoked_at));
      } catch (err) { if (active) setListError(requestError(err)); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [organizationId, version]);

  function refresh() { setLoading(true); setListError(""); setVersion(value => value + 1); }

  /** Creates an owner-authorized invitation and attempts email; always retains its link. */
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(""); setNotice(""); setGenerated(null);
    try {
      const recipient = email.trim().toLowerCase();
      const { data: sessionData, error: sessionError } = await getSupabase().auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error("Sign in to create an invitation.");
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ organization_id: organizationId, email: recipient }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof result?.detail === "string" ? result.detail : "Couldn't create the invitation. Check that the backend is running.");
      if (!result?.invitation_id || typeof result.link !== "string" || typeof result.email_sent !== "boolean") throw new Error("The invitation response was incomplete. Refresh the invitation list before trying again.");
      setGenerated({ id: result.invitation_id, link: result.link, email: result.email, expires: result.expires_at });
      setEmail("");
      setNotice(result.email_sent ? "Invitation sent." : "Invitation created. Copy the invite link to share.");
      refresh();
    } catch (err) { setError(requestError(err)); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function cancel(id: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: rpcError } = await getSupabase().rpc("revoke_organization_invitation", { p_invitation_id: id });
      if (rpcError) throw rpcError;
      if (generated?.id === id) setGenerated(null);
      setInvitations(current => current.filter(invitation => invitation.invitation_id !== id));
      setNotice("Invitation cancelled.");
      refresh();
    } catch (err) { setError(requestError(err)); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function copy() {
    if (!generated) return;
    try { await navigator.clipboard.writeText(generated.link); setNotice("Invitation link copied."); }
    catch { setNotice("Select the link below and copy it manually."); }
  }

  return (
    <section className="dashboard-welcome invitations-panel">
      <h2>Officers &amp; invitations</h2>
      <p>{organizationName}</p>
      <p>Invite an officer by email. They receive admin access with finance editing off.</p>
      <form className="create-club-form" onSubmit={create} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label htmlFor="invite-email">Officer’s email</label>
          <input id="invite-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} autoComplete="off" />
          <div className="create-club-actions"><button type="submit">{busy ? "Please wait…" : "Create invitation"}</button></div>
        </fieldset>
      </form>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {generated && (
        <div className="invitation-link-box">
          <label htmlFor="generated-invite">Invitation for {generated.email}</label>
          <input id="generated-invite" readOnly value={generated.link} onFocus={event => event.target.select()} />
          <button type="button" onClick={copy}>Copy invite link</button>
          <p>Expires {new Date(generated.expires).toLocaleString()}. Copy this link before leaving this screen.</p>
        </div>
      )}
      <div className="invitation-list-heading">
        <h3>Recent invitations</h3>
        <button type="button" onClick={refresh} disabled={loading || busy}>Refresh</button>
      </div>
      {loading ? <p role="status">Loading invitations…</p> : listError ? (
        <div><p role="alert">{listError}</p><button type="button" onClick={refresh}>Retry</button></div>
      ) : invitations.length === 0 ? <p>No invitations yet.</p> : (
        <ul className="invitation-list">
          {invitations.map(invitation => (
            <li key={invitation.invitation_id}>
              <div><strong>{invitation.invited_email}</strong><p className="invitation-status-line"><span className={`invitation-status invitation-status-${status(invitation).toLowerCase()}`}>{status(invitation)}</span><span>{invitation.accepted_at ? `Accepted ${new Date(invitation.accepted_at).toLocaleDateString()}` : `Expires ${new Date(invitation.expires_at).toLocaleDateString()}`}</span></p></div>
              {status(invitation) === "Pending" && <button type="button" disabled={busy} onClick={() => cancel(invitation.invitation_id)} aria-label={`Cancel invitation for ${invitation.invited_email}`}>Cancel invitation</button>}
            </li>
          ))}
        </ul>
      )}
      <p className="invitation-footnote">Showing non-cancelled invitations from the latest 100. Cancelling a link does not remove an officer who already joined.</p>
    </section>
  );
}
