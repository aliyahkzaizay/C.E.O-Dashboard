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
  onSettings: () => void;
  activeView: "home" | "create" | "join" | "settings";
};

/** Shared club selector and navigation. Home and Settings are available to every signed-in user. */
export default function Sidebar({
  clubs, selectedClubId, onSelectClub, clubsLoading, clubsError, onRetryClubs, onCreateClub, onJoinClub, onHome, onSettings, activeView,
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
              Home
            </button>
            <button className="nav-item" type="button" disabled>
              Members <span>Coming soon</span>
            </button>
            <button className="nav-item" type="button" disabled>
              Events <span>Coming soon</span>
            </button>
            <button className="nav-item" type="button" disabled>
              Finance <span>Coming soon</span>
            </button>
          </nav>
            <button className={`nav-item club-settings-button ${activeView === "settings" ? "nav-item-active" : ""}`} type="button" onClick={onSettings} aria-current={activeView === "settings" ? "page" : undefined}>
              Settings
            </button>
        </aside>
  );
}
