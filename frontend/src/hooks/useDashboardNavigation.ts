import { useEffect, useState } from "react";

export type DashboardView = "home" | "members" | "settings" | "create" | "join";
const views: DashboardView[] = ["home", "members", "settings", "create", "join"];

/** Read only supported pages. A club ID is a selection, never permission to access it. */
function readNavigation(): { view: DashboardView; clubId: string | null } {
  const params = new URLSearchParams(window.location.search);
  const candidate = params.get("view") as DashboardView | null;
  return { view: candidate && views.includes(candidate) ? candidate : "home", clubId: params.get("club") || null };
}

/** Preserve navigation in the URL while leaving invitation/auth fragments untouched. */
export function useDashboardNavigation() {
  const [navigation, setNavigation] = useState(readNavigation);
  useEffect(() => {
    const restore = () => setNavigation(readNavigation());
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  function navigate(view: DashboardView, clubId: string | null) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    if (clubId) url.searchParams.set("club", clubId);
    else url.searchParams.delete("club");
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    setNavigation({ view, clubId });
  }
  return { ...navigation, navigate };
}
