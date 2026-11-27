// Colour themes ("palettes") of the status page. A palette is independent of
// the light/dark mode: every palette has a light and a dark rendering, both
// defined in src/themes.css under [data-palette="<id>"].
//
// This file holds no DOM code on purpose, so it can be unit-tested with
// `bun test` (see palettes.test.ts). The DOM side lives in theme.ts.

export interface Palette {
  /** Value of data-palette on <html> and of the stored preference. */
  id: string;
  /** Name shown in the theme menu. */
  label: string;
  /** One short line under the name. */
  hint: string;
  /** Section of the theme menu the palette is listed under. */
  group: PaletteGroup;
}

export type PaletteGroup = "filiere" | "ecrans" | "improbables";

/** Sections of the theme menu, in display order. */
export const PALETTE_GROUPS: { id: PaletteGroup; label: string }[] = [
  { id: "filiere", label: "Filière et orientations" },
  { id: "ecrans", label: "Écrans et accessibilité" },
  { id: "improbables", label: "Improbables" },
];

/* The five orientation themes wear the official petal colour of their
   orientation; the names are the official ones. */
export const PALETTES = [
  { id: "isc", label: "ISC", hint: "Thème par défaut", group: "filiere" },
  { id: "securite", label: "Sécurité informatique", hint: "Rose", group: "filiere" },
  { id: "embarque", label: "Systèmes informatiques embarqués", hint: "Menthe", group: "filiere" },
  { id: "reseaux", label: "Réseaux et systèmes", hint: "Lavande", group: "filiere" },
  { id: "logiciel", label: "Informatique logicielle", hint: "Bleu", group: "filiere" },
  { id: "donnees", label: "Ingénierie des données", hint: "Jaune", group: "filiere" },
  { id: "contraste", label: "Contraste élevé", hint: "Lisibilité maximale", group: "ecrans" },
  { id: "epaper", label: "Papier électronique", hint: "Noir et blanc, sans animation", group: "ecrans" },
  { id: "terminal", label: "Terminal", hint: "Monospace, angles droits", group: "improbables" },
  { id: "console", label: "Console 8 bits", hint: "Quatre nuances d’olive", group: "improbables" },
  { id: "videotex", label: "Vidéotex", hint: "Huit couleurs, années 80", group: "improbables" },
  { id: "plan", label: "Plan", hint: "Calque le jour, cyanotype la nuit", group: "improbables" },
  { id: "tableau", label: "Tableau", hint: "Feutre le jour, craie la nuit", group: "improbables" },
  { id: "neon", label: "Néon", hint: "Pastel le jour, tubes la nuit", group: "improbables" },
] as const satisfies readonly Palette[];

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "isc";

/** localStorage key of the chosen palette. */
export const PALETTE_KEY = "isc.palette";

/** Key of the first version of the menu, which stored one rgb() accent colour. */
export const LEGACY_ACCENT_KEY = "secretAccent";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

/* The accent colours the first version could store, and the palette that
   replaces each one. Its rose was the default accent, so it maps to "isc". */
const LEGACY_ACCENTS: Record<string, PaletteId> = {
  "226,171,186": "isc",
  "152,199,191": "embarque",
  "168,144,192": "reseaux",
  "140,198,230": "logiciel",
  "247,241,159": "donnees",
};

/** Palette matching an accent stored by the first version, or null if unknown. */
export function paletteFromLegacyAccent(accent: string | null): PaletteId | null {
  if (!accent) return null;
  const channels = accent.match(/\d+/g)?.join(",") ?? "";
  return LEGACY_ACCENTS[channels] ?? null;
}

/** The palette to use at startup: the stored one, else the migrated legacy accent, else the default. */
export function resolvePalette(stored: string | null, legacyAccent: string | null): PaletteId {
  if (isPaletteId(stored)) return stored;
  return paletteFromLegacyAccent(legacyAccent) ?? DEFAULT_PALETTE;
}
