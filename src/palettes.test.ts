// Unit tests for src/palettes.ts. Run them with `bun test`.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { DEFAULT_PALETTE, PALETTES, isPaletteId, paletteFromLegacyAccent, resolvePalette } from "./palettes";

describe("PALETTES", () => {
  test("ids are unique", () => {
    const ids = PALETTES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the default palette is in the list", () => {
    expect(isPaletteId(DEFAULT_PALETTE)).toBe(true);
  });

  // A palette listed in the menu but missing from the stylesheet would
  // silently look like the default one. The default itself has no block of
  // its own: it is the base tokens.
  test("every palette but the default has its block in themes.css", () => {
    const css = readFileSync(new URL("./themes.css", import.meta.url), "utf8");
    for (const p of PALETTES) {
      if (p.id === DEFAULT_PALETTE) continue;
      expect(css).toContain(`[data-palette="${p.id}"]`);
    }
  });
});

describe("isPaletteId", () => {
  test("accepts a known id", () => {
    expect(isPaletteId("terminal")).toBe(true);
  });

  test("rejects anything else", () => {
    expect(isPaletteId("fuchsia")).toBe(false);
    expect(isPaletteId(null)).toBe(false);
    expect(isPaletteId(42)).toBe(false);
  });
});

describe("paletteFromLegacyAccent", () => {
  test("maps a petal colour to the theme of its orientation", () => {
    expect(paletteFromLegacyAccent("rgb(168, 144, 192)")).toBe("reseaux");
    expect(paletteFromLegacyAccent("rgb(247, 241, 159)")).toBe("donnees");
  });

  test("ignores how the colour is spaced", () => {
    expect(paletteFromLegacyAccent("rgb(140,198,230)")).toBe("logiciel");
  });

  test("maps the former default rose to the default theme", () => {
    expect(paletteFromLegacyAccent("rgb(226, 171, 186)")).toBe("isc");
  });

  test("returns null for an unknown or missing colour", () => {
    expect(paletteFromLegacyAccent("rgb(1, 2, 3)")).toBeNull();
    expect(paletteFromLegacyAccent(null)).toBeNull();
  });
});

describe("resolvePalette", () => {
  test("prefers the stored palette", () => {
    expect(resolvePalette("contraste", "rgb(168, 144, 192)")).toBe("contraste");
  });

  test("falls back to the legacy accent", () => {
    expect(resolvePalette(null, "rgb(152, 199, 191)")).toBe("embarque");
  });

  test("falls back to the default when nothing usable is stored", () => {
    expect(resolvePalette("fuchsia", null)).toBe(DEFAULT_PALETTE);
  });
});
