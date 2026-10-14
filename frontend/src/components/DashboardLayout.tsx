import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import "./DashboardLayout.css";

type DashboardLayoutProps = {
  title: string;
  email: string;
  onSignOut: () => Promise<void>;
  isSigningOut: boolean;
  children: ReactNode;
};

/**
 * Shares the sidebar, clock, and account controls across dashboard pages.
 * @param props - Page title, account controls, and page content supplied as children.
 * @returns The shared layout surrounding the current page's content.
 */
export default function DashboardLayout({
  title, email, onSignOut, isSigningOut, children,
}: DashboardLayoutProps) {
    const [now, setNow] = useState(() => new Date());

    /** Keeps the local clock current and clears its timer when leaving the page. */
    useEffect(() => {
      const timer = window.setInterval(() => setNow(new Date()), 1000);
      return () => window.clearInterval(timer);
    }, []);

    const day = now.toLocaleDateString("en-US", { weekday: "short" });
    const month = now.toLocaleDateString("en-US", { month: "short" });
    const time = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).replace(/\s/g, "");
    const dateLabel = `${day} ${month} ${now.getDate()} ${time}`;
  
  return (
    <main className="dashboard-page">
      <Sidebar />
      <div className="dashboard-content">
<header>
            <div className="dashboard-heading">
              <h1>{title}</h1>
              <time className="dashboard-clock" dateTime={now.toISOString()}>
                {dateLabel}
              </time>
            </div>
  
            <div>
              <p>{email}</p>
              <button
                type="button"
                onClick={onSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </header>
        {children}
      </div>
    </main>
  );
}
