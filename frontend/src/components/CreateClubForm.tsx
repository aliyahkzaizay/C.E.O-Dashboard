import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { getSupabase } from "../lib/supabase";

type CreateClubFormProps = {
  onCreated: (organizationId: string) => void;
  onCancel: () => void;
};

/** Collects club settings and calls the database function that also assigns its owner. */
export default function CreateClubForm({ onCreated, onCancel }: CreateClubFormProps) {
  const [name, setName] = useState("");
  const [matchingMethod, setMatchingMethod] = useState("email");
  const [identifierLabel, setIdentifierLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  /**
   * Creates the club and its owner access in one database transaction.
   * @param event - The form submission event.
   * @returns A promise that finishes after the creation request is handled.
   */
  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    if (!name.trim() || (matchingMethod === "external_id" && !identifierLabel.trim())) {
      setError("Enter a club name and an identifier label.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const { data, error: createError } = await getSupabase().rpc("create_organization", {
        p_name: name.trim(),
        p_matching_method: matchingMethod,
        p_identifier_label: matchingMethod === "email" ? "Email" : identifierLabel.trim(),
      });
      if (createError) throw createError;
      if (typeof data !== "string" || !data) {
        throw new Error("The response did not include a club ID. Refresh your club list before trying again.");
      }
      onCreated(data);
    } catch (err) {
      const detail = err && typeof err === "object" && "message" in err ? String(err.message) : "Please try again.";
      setError(`Could not confirm club creation. ${detail}`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="dashboard-welcome">
      <h2>Create a club</h2>
      <p>You will become this club’s owner.</p>
      <form className="create-club-form" onSubmit={handleCreate} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label htmlFor="club-name">Club name</label>
          <input id="club-name" value={name} onChange={event => setName(event.target.value)} required autoFocus />

          <label htmlFor="club-matching">Match members using</label>
          <select id="club-matching" value={matchingMethod} onChange={event => setMatchingMethod(event.target.value)}>
            <option value="email">Email address</option>
            <option value="external_id">External ID (such as a member ID)</option>
          </select>

          {matchingMethod === "external_id" && (
            <>
              <label htmlFor="club-identifier">Identifier label</label>
              <input id="club-identifier" value={identifierLabel} onChange={event => setIdentifierLabel(event.target.value)} placeholder="Member ID" required aria-describedby="identifier-help" />
              <p id="identifier-help">Enter the label members recognize, not an individual member’s ID.</p>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="create-club-actions">
            <button type="submit">{busy ? "Creating…" : "Create club"}</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
