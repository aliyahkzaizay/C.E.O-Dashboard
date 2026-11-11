import { useEffect, useState } from "react";
import type { Club } from "../hooks/useClubs";
import { listMembers } from "../lib/members";
import { listEvents, type CeoEvent } from "../lib/events";
import "./Home.css";

type Props = { club: Club; onMembers: () => void; onEvents: () => void; onEditEvent: (event: CeoEvent) => void };

function MetricIcon({ kind }: { kind: "members" | "calendar" | "active" | "inactive" }) {
  return <span className={`home-dot ${kind}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {kind === "members" ? <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-2-4" /></> : kind === "calendar" ? <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 11h16m-11 5 2 2 4-4" /></> : <><circle cx="12" cy="12" r="9" />{kind === "active" ? <path d="m8 12 3 3 5-6" /> : <path d="M9 9v6m6-6v6" />}</>}
  </svg></span>;
}

/** Load each event panel independently and discard responses after club changes. */
function HomeEvents({ clubId, upcoming, onEvents, onEditEvent }: { clubId: string; upcoming: boolean; onEvents: () => void; onEditEvent: (event: CeoEvent) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ clubId: string; attempt: number; items?: CeoEvent[]; error?: string } | null>(null);
  const current = result?.clubId === clubId && result.attempt === attempt ? result : null;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void listEvents(clubId, 0, controller.signal, false, upcoming ? 3 : 5, upcoming).then(page => {
      if (active) setResult({ clubId, attempt, items: page.items });
    }).catch(error => {
      if (active) setResult({ clubId, attempt, error: error instanceof Error ? error.message : "Unable to load events." });
    });
    return () => { active = false; controller.abort(); };
  }, [clubId, upcoming, attempt]);
  return <section className={`home-card ${upcoming ? "home-upcoming" : "home-events"}`}>
    <div className="home-panel-heading"><h2>{upcoming ? "Upcoming Events" : "Club Events"}</h2>
      <button className="home-events-link" type="button" onClick={onEvents}>View all events <span aria-hidden="true">↗</span></button></div>
    {!current ? <div className="home-empty" role="status">Loading events…</div>
      : current.error ? <div className="home-empty"><p role="alert">{current.error}</p><button className="home-events-link" type="button" onClick={() => setAttempt(n => n + 1)}>Retry events</button></div>
      : !current.items?.length ? <div className="home-empty"><h3>{upcoming ? "No upcoming events" : "No events yet"}</h3><p>{upcoming ? "Your next scheduled events will appear here." : "Create your first event on the Events page."}</p></div>
      : <ul className="home-event-list">{current.items.map(event => {
        const date = new Date(event.starts_at);
        return <li key={event.event_id}>
          <div className="home-event-date" aria-hidden="true"><span>{date.toLocaleDateString(undefined, { month: "short" })}</span><strong>{date.getDate()}</strong></div>
          <div className="home-event-info"><h3>{event.event_name}</h3>
            <time dateTime={event.starts_at}>{date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</time>
            {event.event_type && <p>{event.event_type}</p>}</div>
          {!upcoming && <span className={`home-event-status ${event.status}`}>{event.status === "cancelled" ? "Cancelled" : "Scheduled"}</span>}
          <button className="home-edit-event" type="button" title={`Edit ${event.event_name}`} aria-label={`Edit ${event.event_name}`} onClick={() => onEditEvent(event)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" /><path d="m13 6 5 5" /></svg>
          </button>
        </li>;
      })}</ul>}
  </section>;
}

/** Show current roster totals and reserve unfinished reporting areas without sample data. */
export default function Home({ club, onMembers, onEvents, onEditEvent }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; total?: number; error?: string } | null>(null);
  const current = result?.attempt === attempt ? result : null;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void listMembers(club.organization_id, 0, controller.signal).then(page => {
      if (active) setResult({ attempt, total: page.total });
    }).catch(error => {
      if (active) setResult({ attempt, error: error instanceof Error ? error.message : "Unable to load member count." });
    });
    return () => { active = false; controller.abort(); };
  }, [club.organization_id, attempt]);

  return <div className="home-overview">
    <div className="home-context"><p>{club.organization_name}</p><span>Club overview</span></div>
    <div className="home-metrics">
      <button className="home-card home-metric home-member-link" type="button" onClick={onMembers} aria-label="Total Members — open roster">
        <MetricIcon kind="members" /><span><span className="home-metric-label">Total Members</span><strong>{current?.total ?? "—"}</strong><small>{!current ? "Loading…" : current.error ? "Count unavailable" : "View roster"}</small></span><span className="home-arrow" aria-hidden="true">↗</span>
      </button>
      {["Monthly Attendance", "Active Members", "Inactive Members"].map((label, index) => <section className="home-card home-metric" key={label}><MetricIcon kind={index === 0 ? "calendar" : index === 1 ? "active" : "inactive"} /><div><h2 className="home-metric-label">{label}</h2><strong>—</strong><small>Not available yet</small></div></section>)}
    </div>
    {current?.error && <div className="home-load-error"><p role="alert">{current.error}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Retry member count</button></div>}

    <div className="home-panels">
      <section className="home-card home-report"><div className="home-panel-heading"><h2>Your Attendance Report</h2><label className="home-period">Period<select disabled defaultValue="6"><option value="6">Last 6 months</option></select></label></div><div className="home-chart-placeholder"><svg className="home-chart-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v17h17M8 15l4-5 4 3 5-7" /><path d="M17 6h4v4" /></svg><h3>Attendance trends are on the way</h3><p>Reports will appear here when attendance analytics are connected.</p></div></section>
      <section className="home-card home-finance"><h2>Finance Summary</h2><p className="home-unavailable">Not available yet</p><div className="home-balance"><span>Current Balance</span><strong>—</strong></div><div className="home-money"><div><span>Income</span><strong>—</strong></div><div><span>Expenses</span><strong>—</strong></div></div><p>Balances will appear when finance records are connected.</p></section>
      <HomeEvents clubId={club.organization_id} upcoming={false} onEvents={onEvents} onEditEvent={onEditEvent} />
      <HomeEvents clubId={club.organization_id} upcoming onEvents={onEvents} onEditEvent={onEditEvent} />
    </div>
  </div>;
}
