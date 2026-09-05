// Two-way light/dark theme, identical to useTheme() in @isc-hei/design:
// data-theme on <html>, persisted under localStorage "isc.theme" (shared with
// the hub), system preference only as the first-visit default.
const KEY = "isc.theme";
export type Mode = "light" | "dark";

function initial(): Mode {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage blocked */
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let mode: Mode = initial();

export function currentMode(): Mode {
  return mode;
}

export function applyTheme(next: Mode = mode) {
  mode = next;
  document.documentElement.setAttribute("data-theme", mode);
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage blocked */
  }
}

export function cycleTheme(): Mode {
  applyTheme(mode === "light" ? "dark" : "light");
  return mode;
}

export const THEME_TOOLTIP: Record<Mode, string> = {
  light: "Passer en mode sombre",
  dark: "Passer en mode clair",
};
