import { useEffect, useState } from "react";
import "./WelcomeScreen.css";

type WelcomeScreenProps = {
  mode: "signup" | "signin";
  fullName: string;
  onComplete: () => void;
};

/** Plays a one-time brand introduction after authentication, then reveals the app. */
export default function WelcomeScreen({ mode, fullName, onComplete }: WelcomeScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const firstName = fullName.trim().split(/\s+/)[0];
  const greeting = mode === "signup" ? "Welcome" : "Welcome back";

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fade = window.setTimeout(() => setLeaving(true), reducedMotion ? 700 : 3400);
    const finish = window.setTimeout(onComplete, reducedMotion ? 700 : 3900);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(finish);
    };
  }, [onComplete]);

  return (
    <section className={`welcome-screen${leaving ? " welcome-screen--leaving" : ""}`} aria-label="Welcome to C.E.O.">
      <div className="welcome-screen__content">
        <h1 className="welcome-screen__brand">C.E.O. <span>Dashboard</span></h1>
        <p className="welcome-screen__subtitle">Club Engagement Operations</p>
        <div className="welcome-screen__accent" aria-hidden="true" />
        <p className="welcome-screen__greeting" role="status">{greeting}{firstName ? `, ${firstName}` : ""}.</p>
      </div>
    </section>
  );
}
