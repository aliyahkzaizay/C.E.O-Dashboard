import { useState } from "react";
import CreateClubForm from "../components/CreateClubForm";
import JoinClubForm from "../components/JoinClubForm";
import ClubInvitations from "../components/ClubInvitations";
import { useClubs } from "../hooks/useClubs";
import DashboardLayout from "../components/DashboardLayout";
import "./Dashboard.css";

type DashboardProps = {
  userId: string; email: string; onSignOut: () => Promise<void>;
  isSigningOut: boolean; error: string;
  pendingInvitation: string;
  onClearInvitation: () => void;
};

/** Displays Home, club creation, invitation acceptance, or owner settings in the shared layout. */
export default function Dashboard({ userId, email, onSignOut, isSigningOut, error, pendingInvitation, onClearInvitation }: DashboardProps) {
  const { clubs, isLoading, error: clubsError, retry } = useClubs(userId);
  const [view, setView] = useState<"home" | "create" | "join" | "settings">("home");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedClub = clubs.find(club => club.organization_id === selectedId) ?? clubs[0];
  const activeView = pendingInvitation ? "join" : view;

  function show(next: typeof view) { onClearInvitation(); setView(next); setMessage(""); }
  function joined(id: string) {
    onClearInvitation(); setSelectedId(id); setView("home");
    setMessage("Invitation accepted. Your club is now available."); retry();
  }

  return (
    <DashboardLayout
      title={activeView === "settings" ? "Club settings" : activeView === "join" ? "Join a club" : activeView === "create" ? "Create a club" : "Home"}
      clubSelector={{
        clubs, selectedClubId: selectedClub?.organization_id ?? null,
        onSelectClub: id => { setSelectedId(id); show("home"); },
        clubsLoading: isLoading, clubsError, onRetryClubs: retry,
        onCreateClub: () => show("create"), onJoinClub: () => show("join"),
        onHome: () => show("home"), onSettings: () => show("settings"), activeView,
      }}
      email={email} onSignOut={onSignOut} isSigningOut={isSigningOut}
    >
      {error && <p role="alert">{error}</p>}
      {activeView === "create" ? (
        <CreateClubForm onCancel={() => show("home")} onCreated={id => {
          setSelectedId(id); setView("home"); setMessage("Club created. You are its owner."); retry();
        }} />
      ) : activeView === "join" ? (
        <JoinClubForm key={pendingInvitation || "manual"} initialToken={pendingInvitation} email={email} onJoined={joined} onCancel={() => show("home")} />
      ) : activeView === "settings" && !isLoading && !clubsError && selectedClub?.access_role === "owner" ? (
        <ClubInvitations key={selectedClub.organization_id} organizationId={selectedClub.organization_id} organizationName={selectedClub.organization_name} />
      ) : (
        <section className="dashboard-welcome">
          {message && <p role="status">{message}</p>}
          {isLoading ? <p role="status">Loading your clubs…</p> : clubsError ? (
            <><h2>Unable to load your clubs</h2><p role="alert">{clubsError}</p><button className="club-retry" type="button" onClick={retry}>Retry</button></>
          ) : activeView === "settings" ? (
            <><h2>Club settings</h2><p>Only the club owner can manage invitations.</p></>
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
