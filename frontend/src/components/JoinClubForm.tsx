import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { getSupabase } from "../lib/supabase";
import { invitationToken, requestError } from "../lib/invitations";

type JoinClubFormProps = {
  initialToken: string;
  email: string;
  onJoined: (id: string) => void;
  onCancel: () => void;
};

/** Accepts an invitation explicitly; database checks enforce email and single use. */
export default function JoinClubForm({ initialToken, email, onJoined, onCancel }: JoinClubFormProps) {
  const [value, setValue] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    const token = invitationToken(value);
    if (!token) { setError("Paste a valid C.E.O. invitation link."); return; }
    inFlight.current = true;
    setBusy(true);
    try {
      const { data, error: joinError } = await getSupabase().rpc("accept_organization_invitation", { p_token: token });
      if (joinError) throw joinError;
      if (typeof data !== "string" || !data) throw new Error("Could not confirm acceptance. Refresh your club list before trying again.");
      onJoined(data);
    } catch (err) { setError(requestError(err)); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return (
    <section className="dashboard-welcome">
      <h2>Join a club</h2>
      <p>Accept an owner’s invitation using the same verified email it was sent to.</p>
      <p>Signed in as {email}</p>
      <form className="create-club-form" onSubmit={handleJoin} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label htmlFor="join-link">Invitation link</label>
          <input id="join-link" value={value} onChange={event => setValue(event.target.value)} required autoComplete="off" spellCheck={false} />
          <p>New officers receive admin access. Finance editing requires separate owner permission.</p>
          {error && <p role="alert">{error}</p>}
          <div className="create-club-actions">
            <button type="submit">{busy ? "Joining…" : "Accept invitation"}</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
