import { useLayoutEffect, useState } from "react";

export type Appearance = { theme: "light" | "dark" | "system"; accent: string };
const defaults: Appearance = { theme: "system", accent: "#2563eb" };

function read(userId: string): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(`ceo:appearance:${userId}`) || "null");
    return { theme: ["light", "dark", "system"].includes(saved?.theme) ? saved.theme : defaults.theme,
      accent: /^#[0-9a-f]{6}$/i.test(saved?.accent) ? saved.accent : defaults.accent };
  } catch { return defaults; }
}

/** Applies personal colors before paint; preferences are local to this account and browser. */
export function useAppearance(userId: string) {
  const [appearance, setAppearance] = useState<Appearance>(() => read(userId));
  const [storageError, setStorageError] = useState("");
  useLayoutEffect(() => {
    const root = document.documentElement;
    const media = matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      root.dataset.theme = appearance.theme === "system" ? (media.matches ? "dark" : "light") : appearance.theme;
      root.style.setProperty("--ceo-accent", appearance.accent);
      const linear = appearance.accent.slice(1).match(/../g)!.map(value => {
        const c = parseInt(value, 16) / 255;
        return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
      });
      const luminance = .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
      root.style.setProperty("--ceo-on-accent", luminance > .179 ? "#000000" : "#ffffff");
    }
    apply(); media.addEventListener("change", apply);
    return () => { media.removeEventListener("change", apply); delete root.dataset.theme;
      root.style.removeProperty("--ceo-accent"); root.style.removeProperty("--ceo-on-accent"); };
  }, [appearance]);
  function updateAppearance(next: Appearance) {
    setAppearance(next);
    try { localStorage.setItem(`ceo:appearance:${userId}`, JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("Applied for now. Your browser could not save this preference."); }
  }
  return { appearance, updateAppearance, storageError };
}
