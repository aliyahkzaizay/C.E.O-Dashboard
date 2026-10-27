import { useEffect, useRef, useState } from "react";
import type { Club } from "../hooks/useClubs";
import { listMembers } from "../lib/members";
import type { MemberPage } from "../lib/members";
import AddMemberForm from "../components/AddMemberForm";
import "./Members.css";

/** Reserve row actions until member editing is connected. */
function MemberActions({ name }: { name: string }) {
  return <button className="member-row-actions" type="button" disabled aria-label={`Actions for ${name}`}>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
  </button>;
}

/** Display only the selected club's roster; parent keys this page by club ID. */
export default function Members({ club, initiallyAdding = false }: { club: Club; initiallyAdding?: boolean }) {
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: MemberPage; error?: string } | null>(null);
  const [adding, setAdding] = useState(initiallyAdding);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const addButton = useRef<HTMLButtonElement>(null);
  const key = `${offset}:${attempt}`;
  const current = result?.key === key ? result : null;
  const data = current?.data;
  const loading = !current;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void listMembers(club.organization_id, offset, controller.signal).then(data => {
      if (!active) return;
      if (offset > 0 && offset >= data.total) { setOffset(Math.max(0, Math.ceil(data.total / 40) - 1) * 40); return; }
      setResult({ key, data });
    }).catch(error => {
      if (active) setResult({ key, error: error instanceof Error ? error.message : "Unable to load members." });
    });
    return () => { active = false; controller.abort(); };
  }, [club.organization_id, offset, key]);
  function closeForm() { setAdding(false); addButton.current?.focus(); }
  const externalLabel = club.matching_method === "external_id" ? club.member_identifier_label : "External member ID";
  return <div className="members-page">
    <div className="member-metrics">
      <section className="member-card member-metric"><span className="metric-dot" aria-hidden="true" /><div><h2>Total Members</h2><strong>{data ? data.total : "—"}</strong><p>Current roster</p></div></section>
      {["Monthly Attendance", "Active Members"].map(title => <section className="member-card member-metric" key={title}><span className="metric-dot muted" aria-hidden="true" /><div><h2>{title}</h2><strong>—</strong><p>Not available yet</p></div></section>)}
    </div>
    <div className="members-grid">
      <section className="member-card member-roster" aria-labelledby="roster-heading">
        <div className="member-section-heading"><div><h2 id="roster-heading">Member Roster</h2><p>{club.organization_name}</p></div><div className="member-roster-actions"><button type="button" disabled>Import members <span className="member-coming-soon">Coming soon</span></button><button ref={addButton} className="member-primary" type="button" aria-expanded={adding} onClick={() => { setAdding(true); setNotice(""); }}>+ Add member</button></div></div>
        {adding && <AddMemberForm organizationId={club.organization_id} identifierLabel={externalLabel} onCancel={closeForm} onSaved={() => { closeForm(); setOffset(0); setAttempt(n => n + 1); setNotice("Member added successfully."); }} />}
        {notice && <p className="member-success" role="status">{notice}</p>}
        <div aria-busy={loading}>
          {loading ? <p className="member-empty" role="status">Loading members…</p> : current?.error ? <div className="member-empty"><p role="alert">{current.error}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Retry</button></div> : data && data.total === 0 ? <div className="member-empty"><h3>No members yet</h3><p>Add your first member to start building this club’s roster.</p></div> : data && <>
            <div className="member-table-scroll" tabIndex={0} role="region" aria-label="Member roster table"><table><thead><tr><th>Name</th><th>Email</th><th>{externalLabel}</th><th>Date joined</th><th>Status</th><th aria-label="Member actions" /></tr></thead><tbody>{data.items.map(member => {
              const missing = club.matching_method === "email" ? !member.email : !member.external_member_id;
              return <tr key={member.member_id}><td className="member-name">{member.name}{missing && <span className="member-identifier-notice">{club.member_identifier_label} not provided</span>}</td><td>{member.email ?? "—"}</td><td>{member.external_member_id ?? "—"}</td><td>{member.date_joined ? new Date(`${member.date_joined}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td><td><span className="member-badge engagement-pending">Not enough data</span></td><td><MemberActions name={member.name} /></td></tr>;
            })}</tbody></table></div>
            <div className="member-pagination"><p>{offset + 1}–{offset + data.items.length} of {data.total} members</p><div><button type="button" disabled={offset === 0} onClick={() => setOffset(n => Math.max(0, n - 40))}>Previous</button><span>Page {Math.floor(offset / 40) + 1} of {Math.ceil(data.total / 40)}</span><button type="button" disabled={offset + 40 >= data.total} onClick={() => setOffset(n => n + 40)}>Next</button></div></div>
          </>}
        </div>
      </section>
      <aside className="member-insights"><section className="member-card member-placeholder"><h2>Member Breakdown</h2><div className="placeholder-ring" aria-hidden="true" /><p>Not available yet</p><small>Engagement breakdown will appear when attendance analytics are connected.</small></section><section className="member-card member-placeholder"><h2>Top Engaged Members</h2><p>Not available yet</p></section></aside>
      <section className="member-card member-placeholder member-attendance"><h2>Attendance Trends</h2><p>Not available yet</p><small>Attendance history will appear here once event check-in is connected.</small></section>
    </div>
  </div>;
}
