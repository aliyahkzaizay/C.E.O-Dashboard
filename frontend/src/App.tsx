import { getSupabase } from "./lib/supabase";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import "./App.css";

/**
 * Displays the C.E.O. account screen with sign-up and sign-in views.
 * Keeps the selected view and entered form values in React state.
 *
 * @returns The account screen's JSX.
 */
function App() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<Session | null>(null);

  /**
   * Sends the form values to Supabase to create an account or sign in.
   * Updates loading, error, and success messages for the screen.
   *
   * @param event - The form submission event.
   * @returns A promise that finishes when the request is handled.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const supabase = getSupabase();

      if (isSignUp) {
        if (!fullName.trim()) {
          setError("Please enter your full name.");
          return;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (authError) throw authError;

        setMessage(
          data.session
            ? "You are signed in!"
            : "Check your email for a confirmation link. If you already have an account, sign in."
        );
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) throw authError;

        setMessage("You are signed in!");
      }

      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="brand-panel">

        <img

        className="dashboard-preview"
        src="/images/dashboard-preview.png"
        alt=""
        
        />
        <div>
          <h1>C.E.O</h1>
          <h2>Club Engagement Operations</h2>
          <p>Keep track of all your club stats, in one place.</p>
        </div>
      </section>

      <section className="form-panel">
        <div className="form-content">
          <h2>{isSignUp ? "Create an Account" : "Sign in"}</h2>
          <p className="form-description">
            {isSignUp
              ? "Create an account and get started managing your club smarter."
              : "Welcome back to C.E.O."}
          </p>

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <label>
                <span className="sr-only">Full Name</span>
                <input
                  name="fullName"
                  placeholder="Full Name"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
            )}

            <label>
              <span className="sr-only">Email</span>
              <input
                name="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              <span className="sr-only">Password</span>
              <input
                key={isSignUp ? "new-password" : "current-password"}
                name="password"
                type="password"
                placeholder="Password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && <p role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}

            <button
              className="submit-button"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Please wait…" : isSignUp ? "Sign up" : "Sign in"}
            </button>
          </form>

          <button
            className="switch-button"
            type="button"
            disabled={isLoading}
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "New to C.E.O.? Create an account"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
