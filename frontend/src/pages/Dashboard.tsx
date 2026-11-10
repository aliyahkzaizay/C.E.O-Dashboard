import { useEffect, useState } from "react";
import CreateClubForm from "../components/CreateClubForm";
import JoinClubForm from "../components/JoinClubForm";
import AccountSettings from "../components/AccountSettings";
import ClubInvitations from "../components/ClubInvitations";
import { useClubs } from "../hooks/useClubs";
import { useDashboardNavigation, type DashboardView as DashboardNavView } from "../hooks/useDashboardNavigation";
import DashboardLayout from "../components/DashboardLayout";
import "./Dashboard.css";
import Members from "./Members";
import Home from "./Home";
import Finance from "./Finance";
import Events from "./Events";
import type { CeoEvent } from "../lib/events";

type DashboardProps = {
  fullName: string; accountCreatedAt: string;
  userId: string; email: string; onSignOut: () => Promise<void>;
  isSigningOut: boolean; error: string;
  pendingInvitation: string;
  onClearInvitation: () => void;
};

type DashboardView = DashboardNavView | "events";

/** Displays Home, club creation, invitation acceptance, or account settings in the shared layout. */
export default function Dashboard({ userId, email, fullName, accountCreatedAt, onSignOut, isSigningOut, error, pendingInvitation, onClearInvitation }: DashboardProps) {
  const { clubs, isLoading, error: clubsError, retry } = useClubs(userId);
  const { view, clubId: selectedId, navigate } = useDashboardNavigation();
  const [eventToEdit, setEventToEdit] = useState<CeoEvent | null>(null);
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [focusInvitations, setFocusInvitations] = useState(false);
  const [message, setMessage] = useState("");
  const selectedClub = clubs.find(club => club.organization_id === selectedId) ?? clubs[0];
  const activeView: DashboardView = pendingInvitation ? "join" : (view as DashboardView);

  // Browser history restores pages, not unfinished forms or transient notices.
  useEffect(() => {
    function clearTransientState() {
      setMemberFormOpen(false); setEventToEdit(null); setFocusInvitations(false); setMessage("");
    }
    window.addEventListener("popstate", clearTransientState);
    return () => window.removeEventListener("popstate", clearTransientState);
  }, []);

  function show(next: DashboardView, clubId = selectedClub?.organization_id ?? null) { onClearInvitation(); navigate(next as DashboardNavView, clubId); setMessage(""); setMemberFormOpen(false); setEventToEdit(null); setFocusInvitations(false); }
  function joined(id: string) {
    show("home", id);
    setMessage("Invitation accepted. Your club is now available."); retry();
  }

  return (
    <DashboardLayout
      title={activeView === "finance" ? "Finance" : activeView === "members" ? "Members" : activeView === "events" ? "Events" : activeView === "settings" ? "Settings" : activeView === "join" ? "Join a club" : activeView === "create" ? "Create a club" : `Welcome${fullName.trim() ? `, ${fullName.trim().split(/\s+/)[0]}` : ""}`}
      clubSelector={{
        clubs, selectedClubId: selectedClub?.organization_id ?? null,
        onSelectClub: id => show(activeView === "members" || activeView === "settings" || activeView === "events" || activeView === "finance" ? activeView : "home", id),
        clubsLoading: isLoading, clubsError, onRetryClubs: retry,
        onCreateClub: () => show("create"), onJoinClub: () => show("join"),
        onHome: () => show("home"), onMembers: () => show("members"), onEvents: () => show("events"), onFinance: () => show("finance"), onSettings: () => show("settings"), activeView,
      }}
      headerActions={activeView === "home" && !isLoading && !clubsError && selectedClub ? <><button className="dashboard-add-member" type="button" onClick={() => { show("members"); setMemberFormOpen(true); }}>+ Add member</button>{selectedClub.access_role === "owner" && <button type="button" onClick={() => { show("settings"); setFocusInvitations(true); }}>Invite officer</button>}</> : undefined}
      email={email} onSignOut={onSignOut} isSigningOut={isSigningOut}
    >
      {error && <p role="alert">{error}</p>}
      {activeView === "finance" ? (
        isLoading ? <p role="status">Loading your clubs…</p> : clubsError ? <section className="dashboard-welcome"><p role="alert">{clubsError}</p><button type="button" onClick={retry}>Retry</button></section> : selectedClub ? <Finance key={selectedClub.organization_id} club={selectedClub} /> : <section className="dashboard-welcome"><h2>Select a club to view Finance</h2><p>Create a club or accept an invitation to get started.</p><button type="button" onClick={() => show("create")}>Create a club</button><button type="button" onClick={() => show("join")}>Join a club</button></section>
      ) : activeView === "members" ? (
        isLoading ? <p role="status">Loading your clubs…</p> : clubsError ? <section className="dashboard-welcome"><p role="alert">{clubsError}</p><button className="club-retry" onClick={retry}>Retry</button></section> : selectedClub ? <Members key={selectedClub.organization_id} club={selectedClub} initiallyAdding={memberFormOpen} /> : <section className="dashboard-welcome"><h2>Select a club to view members</h2><p>Create a club or accept an invitation to get started.</p><div className="welcome-club-actions"><button onClick={() => show("create")}>Create a club</button><button onClick={() => show("join")}>Join a club</button></div></section>
            ) : activeView === "events" ? (
        isLoading ? <p role="status">Loading your clubs…</p> : clubsError ? <section className="dashboard-welcome"><p role="alert">{clubsError}</p><button className="club-retry" onClick={retry}>Retry</button></section> : selectedClub ? <Events key={selectedClub.organization_id} club={selectedClub} initialEvent={eventToEdit} /> : <section className="dashboard-welcome"><h2>Select a club to view events</h2><p>Create a club or accept an invitation to get started.</p><div className="welcome-club-actions"><button onClick={() => show("create")}>Create a club</button><button onClick={() => show("join")}>Join a club</button></div></section>
      ) : activeView === "create" ? (
        <CreateClubForm onCancel={() => show("home")} onCreated={id => {
          show("home", id); setMessage("Club created. You are its owner."); retry();
        }} />
      ) : activeView === "join" ? (
        <JoinClubForm key={pendingInvitation || "manual"} initialToken={pendingInvitation} email={email} onJoined={joined} onCancel={() => show("home")} />
      ) : activeView === "settings" ? (
        <>
          <AccountSettings fullName={fullName} email={email} accountCreatedAt={accountCreatedAt} clubs={clubs} isLoading={isLoading} error={clubsError} onRetry={retry} />
          {!isLoading && !clubsError && selectedClub?.access_role === "owner" && (
            <div ref={node => { if (node && focusInvitations) { const input = node.querySelector<HTMLInputElement>("input[type=email]"); input?.focus({ preventScroll: true }); node.scrollIntoView({ block: "start", behavior: "instant" }); } }}><ClubInvitations key={selectedClub.organization_id} organizationId={selectedClub.organization_id} organizationName={selectedClub.organization_name} /></div>
          )}
        </>
      ) : !isLoading && !clubsError && selectedClub ? (
        <>
          {message && <p role="status">{message}</p>}
          <Home key={selectedClub.organization_id} club={selectedClub} onMembers={() => show("members")} onEvents={() => show("events")} onEditEvent={event => { show("events"); setEventToEdit(event); }} />
        </>
      ) : (
        <section className="dashboard-welcome">
          {message && <p role="status">{message}</p>}
          {isLoading ? <p role="status">Loading your clubs…</p> : clubsError ? (
            <><h2>Unable to load your clubs</h2><p role="alert">{clubsError}</p><button className="club-retry" type="button" onClick={retry}>Retry</button></>
          ) : selectedClub ? (
            <><h2>{selectedClub.organization_name}</h2><p>Your club workspace starts here.</p></>
          ) : (
            <><h2>Welcome to C.E.O.</h2><p>Create a club or accept an invitation to get started.</p>
              <div className="welcome-club-actions"><button type="button" onClick={() => show("create")}>Create a club</button><button type="button" onClick={() => show("join")}>Join a club</button></div>
            </>
          )}
        </section>
      )}
    </DashboardLayout>
  );
}
