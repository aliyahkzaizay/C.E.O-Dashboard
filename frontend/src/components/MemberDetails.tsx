import { useEffect, useId, useRef, useState } from "react";
import { getMember } from "../lib/members";
import type { ClassYear, Member } from "../lib/members";
import "./MemberDetails.css";

const years: Record<ClassYear, string> = { first_year: "First year", sophomore: "Sophomore", junior: "Junior", senior: "Senior", graduate: "Graduate", other: "Other" };
type Props = { organizationId: string; memberId: string; identifierLabel: string; onClose: () => void; onEdit: (member: Member) => void };

function AttendanceIcon({ chart = false }: { chart?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{chart ? <><path d="M4 4v16h16" /><path d="M8 15v-4m5 4V7m5 8v-6" /></> : <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4m8-4v4M4 10h16m-11 5h2" /></>}</svg>;
}

/** A modal drawer keeps roster context while native dialog handles focus and Escape. */
export default function MemberDetails({ organizationId, memberId, identifierLabel, onClose, onEdit }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; member?: Member; error?: string } | null>(null);
  const current = result?.attempt === attempt ? result : null;
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void getMember(organizationId, memberId, controller.signal).then(member => {
      if (active) setResult({ attempt, member });
    }).catch(error => {
      if (active) setResult({ attempt, error: error instanceof Error ? error.message : "Unable to load member details." });
    });
    return () => { active = false; controller.abort(); };
  }, [organizationId, memberId, attempt]);
  const member = current?.member;
  return <dialog ref={dialog} className="member-details" aria-labelledby={title} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="member-details-content">
      <header><div><h2 id={title}>{member?.name ?? "Member profile"}</h2>{member && <span className="member-badge engagement-pending">Not enough data</span>}</div><button type="button" autoFocus aria-label="Close member details" onClick={onClose}>×</button></header>
      {!current && <p role="status">Loading member details…</p>}
      {current?.error && <div><p role="alert">{current.error}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Retry</button></div>}
      {member && <>
        <div className="member-details-toolbar"><button className="member-primary" type="button" onClick={() => onEdit(member)}>Edit</button></div>
        <section aria-label="Member information"><dl>
          <div><dt>Email</dt><dd>{member.email ?? "Not provided"}</dd></div>
          <div><dt>{identifierLabel}</dt><dd>{member.external_member_id ?? "Not provided"}</dd></div>
          <div><dt>Date joined</dt><dd>{member.date_joined ? new Date(`${member.date_joined}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not provided"}</dd></div>
          <div><dt>Class year</dt><dd>{member.class_year ? years[member.class_year] : "Not provided"}</dd></div>
        </dl></section>
        <section className="member-details-attendance" aria-label="Attendance summary">
          <div className="member-attendance-summary">
            <div className="member-attendance-stat"><span className="member-stat-icon"><AttendanceIcon /></span><span>Events attended</span><strong aria-label="Not available">—</strong></div>
            <div className="member-attendance-stat"><span className="member-stat-icon"><AttendanceIcon chart /></span><span>Attendance rate</span><strong aria-label="Not available">—</strong></div>
          </div>
        </section>
        <section className="member-details-history" aria-label="Attendance history">
          <h3>Attendance</h3>
          <table><thead><tr><th scope="col">Event name</th><th scope="col">Event date</th></tr></thead>
            <tbody><tr><td colSpan={2} className="member-history-empty"><AttendanceIcon /><span>Not available yet.</span></td></tr></tbody>
          </table>
        </section>
      </>}
    </div>
  </dialog>;
}
