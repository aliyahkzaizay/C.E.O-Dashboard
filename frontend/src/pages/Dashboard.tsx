import DashboardLayout from "../components/DashboardLayout";
import "./Dashboard.css";

type DashboardProps = {
  email: string;
  onSignOut: () => Promise<void>;
  isSigningOut: boolean;
  error: string;
};

/**
 * Displays Home inside the shared dashboard layout.
 * @param props - The signed-in user's account controls and any authentication error.
 * @returns Home's welcome content within the sidebar and header layout.
 */
export default function Dashboard({
  email, onSignOut, isSigningOut, error,
}: DashboardProps) {
  return (
    <DashboardLayout
      title="Home"
      email={email}
      onSignOut={onSignOut}
      isSigningOut={isSigningOut}
    >
      <section className="dashboard-welcome">
        <h2>Welcome to C.E.O.</h2>
        <p>Your club workspace starts here.</p>
        {error && <p role="alert">{error}</p>}
      </section>
    </DashboardLayout>
  );
}
