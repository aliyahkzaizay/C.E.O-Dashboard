import type { Club } from "../hooks/useClubs";

type AccountSettingsProps = {
  fullName: string;
  email: string;
  accountCreatedAt: string;
  clubs: Club[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
};

/** Read-only account details and club access; club positions are separate from access roles. */
export default function AccountSettings({ fullName, email, accountCreatedAt, clubs, isLoading, error, onRetry }: AccountSettingsProps) {
  const createdAt = new Date(accountCreatedAt);
  const validDate = !Number.isNaN(createdAt.getTime());

  return (
    <section className="dashboard-welcome account-settings" aria-labelledby="account-heading">
      <h2 id="account-heading">Your account</h2>
      <dl className="account-details">
        <div><dt>Name</dt><dd>{fullName.trim() || "Not provided"}</dd></div>
        <div><dt>Email</dt><dd>{email || "Not available"}</dd></div>
        <div><dt>Account created</dt><dd>{validDate ? <time dateTime={accountCreatedAt}>{createdAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time> : "Not available"}</dd></div>
        <div><dt>Clubs you belong to</dt><dd>{isLoading ? "Loading…" : error ? "Unavailable" : clubs.length}</dd></div>
      </dl>
      <h3>Your clubs</h3>
      {isLoading ? <p role="status">Loading your clubs…</p> : error ? (
        <div><p role="alert">{error}</p><button className="club-retry" type="button" onClick={onRetry}>Retry</button></div>
      ) : clubs.length === 0 ? <p>You haven't joined or created a club yet.</p> : (
        <>
          <p className="account-role-help">Your access role is separate from your club position, such as President or Treasurer.</p>
          <ul className="account-clubs">
            {clubs.map(club => (
              <li key={club.organization_id}>
                <span>{club.organization_name}</span>
                <span className="account-role-badge">{club.access_role === "owner" ? "Owner" : "Admin"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
