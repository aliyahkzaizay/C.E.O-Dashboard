import { useEffect, useId, useRef, useState } from "react";
import type { Club } from "../hooks/useClubs";

export type ClubSelectorProps = {
  clubs: Club[];
  selectedClubId: string | null;
  onSelectClub: (id: string) => void;
  clubsLoading: boolean;
  clubsError: string;
  onRetryClubs: () => void;
  onCreateClub: () => void;
  onJoinClub: () => void;
  onHome: () => void;
  onMembers: () => void;
  onSettings: () => void;
  activeView: "home" | "create" | "join" | "settings" | "members";
};

/** Shared club selector and navigation. Home and Settings are available to every signed-in user. */
export default function Sidebar({
  clubs, selectedClubId, onSelectClub, clubsLoading, clubsError, onRetryClubs, onCreateClub, onJoinClub, onHome, onMembers, onSettings, activeView,
}: ClubSelectorProps) {
  const dropdown = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownId = useId();

  /** Close on outside clicks and remove the listener when it is no longer needed. */
  useEffect(() => {
    if (!isOpen) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !dropdown.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [isOpen]);
  const selectedClub = clubs.find(club => club.organization_id === selectedClubId);

  return (
<aside className="dashboard-sidebar">
          <p className="dashboard-logo">C.E.O. <span className="dashboard-version">v1</span></p>

          <div
            className="club-dropdown"
            data-open={isOpen}
            ref={dropdown}
            onKeyDown={event => {
              if (event.key === "Escape" && dropdown.current) {
                setIsOpen(false);
                trigger.current?.focus();
              }
            }}
            onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget) && dropdown.current) {
                setIsOpen(false);
              }
            }}
          >
            <button
              className="club-selector"
              type="button"
              ref={trigger}
              aria-expanded={isOpen}
              aria-controls={dropdownId}
              onClick={() => setIsOpen(value => !value)}
            >
              {clubsLoading ? "Loading clubs…" : clubsError ? "Clubs unavailable" : selectedClub?.organization_name ?? "Select a club"}
              <span className="club-selector-arrow" aria-hidden="true">⌄</span>
            </button>
            <div className="club-dropdown-list" id={dropdownId} inert={!isOpen}>
              {clubsLoading ? <p role="status">Loading your clubs…</p> : clubsError ? (
                <>
                  <p role="alert">{clubsError}</p>
                  <button type="button" onClick={onRetryClubs}>Retry</button>
                </>
              ) : clubs.map(club => (
                <button
                  key={club.organization_id}
                  type="button"
                  aria-pressed={club.organization_id === selectedClubId}
                  onClick={() => {
                    onSelectClub(club.organization_id);
                    if (dropdown.current) setIsOpen(false);
                    trigger.current?.focus();
                  }}
                >
                  {club.organization_name}
                </button>
              ))}
              <div className="club-dropdown-actions">
                <button type="button" onClick={() => {
                  if (dropdown.current) setIsOpen(false);
                  onCreateClub();
                }}>Create a club</button>
                <button type="button" onClick={() => {
                  if (dropdown.current) setIsOpen(false);
                  onJoinClub();
                }}>Join a club</button>
              </div>
            </div>
          </div>

          <nav aria-label="Main navigation">
            <button
              className={`nav-item ${activeView === "home" ? "nav-item-active" : ""}`}
              type="button"
              aria-current={activeView === "home" ? "page" : undefined}
              onClick={onHome}
            >
              <svg className="sidebar-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>Home
            </button>
            <button className={`nav-item ${activeView === "members" ? "nav-item-active" : ""}`} type="button" onClick={onMembers} aria-current={activeView === "members" ? "page" : undefined}>
              <svg className="sidebar-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-2-4" /></svg>Members
            </button>
            <button className="nav-item" type="button" disabled>
              <svg className="sidebar-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 11h16M8 15h2m4 0h2m-8 3h2" /></svg>Events <span>Coming soon</span>
            </button>
            <button className="nav-item" type="button" disabled>
              <svg className="sidebar-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v10H6a3 3 0 0 1-3-3V7" /><path d="M20 12h-5a2 2 0 0 0 0 4h5" /></svg>Finance <span>Coming soon</span>
            </button>
          </nav>
            <button className={`nav-item club-settings-button ${activeView === "settings" ? "nav-item-active" : ""}`} type="button" onClick={onSettings} aria-current={activeView === "settings" ? "page" : undefined}>
              <svg className="sidebar-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h3m6 0h7M4 17h9m6 0h1" /><circle cx="10" cy="7" r="3" /><circle cx="16" cy="17" r="3" /></svg>Settings
            </button>
        </aside>
  );
}
