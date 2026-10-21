import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

export type Club = { organization_id: string; organization_name: string; access_role: "owner" | "admin" };

/** Loads the current user's club memberships. Database policies enforce access. */
export function useClubs(userId: string) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    setClubs([]);

    async function load() {
      try {
        const client = getSupabase();
        const { data: memberships, error: membershipError } = await client
          .from("organization_users")
          .select("organization_id, access_role")
          .eq("user_id", userId);
        if (membershipError) throw membershipError;
        const ids = [...new Set((memberships ?? []).map(row => row.organization_id as string))];
        if (!active) return;
        if (ids.length === 0) {
          setClubs([]);
          return;
        }
        const { data, error: clubError } = await client
          .from("organizations")
          .select("organization_id, organization_name")
          .in("organization_id", ids)
          .order("organization_name");
        if (clubError) throw clubError;
        if (!active) return;
        if (!data || data.length !== ids.length) {
          throw new Error("Some club details could not be loaded.");
        }
        setClubs(data.map(club => {
          const membership = memberships?.find(row => row.organization_id === club.organization_id);
          if (membership?.access_role !== "owner" && membership?.access_role !== "admin") throw new Error("Unexpected club access role.");
          return { ...club, access_role: membership.access_role };
        }));
      } catch {
        if (active) setError("We couldn't load your clubs. Please try again.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [userId, attempt]);

  return { clubs, isLoading, error, retry: () => setAttempt(value => value + 1) };
}
