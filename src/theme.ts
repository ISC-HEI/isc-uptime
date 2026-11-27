// Two independent settings, both carried by attributes on <html>:
//
// - the light/dark mode, identical to useTheme() in @isc-hei/design:
//   data-theme, persisted under localStorage "isc.theme", system preference
//   only as the first-visit default;
// - the palette (colour theme), specific to this page: data-palette,
//   persisted under "isc.palette". See palettes.ts and themes.css.
//
// index.html sets both attributes before the first paint; keep it in sync.
import { DEFAULT_PALETTE, LEGACY_ACCENT_KEY, PALETTE_KEY, resolvePalette, type PaletteId } from "./palettes";

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

/* ---------- palette ---------- */

function initialPalette(): PaletteId {
  try {
    return resolvePalette(localStorage.getItem(PALETTE_KEY), localStorage.getItem(LEGACY_ACCENT_KEY));
  } catch {
    return DEFAULT_PALETTE;
  }
}

let palette: PaletteId = initialPalette();

export function currentPalette(): PaletteId {
  return palette;
}

export function applyPalette(next: PaletteId = palette) {
  palette = next;
  document.documentElement.setAttribute("data-palette", palette);
  try {
    // The default is stored as "no preference", so it follows a future change of default.
    if (palette === DEFAULT_PALETTE) localStorage.removeItem(PALETTE_KEY);
    else localStorage.setItem(PALETTE_KEY, palette);
    localStorage.removeItem(LEGACY_ACCENT_KEY);
  } catch {
    /* storage blocked */
  }
}
