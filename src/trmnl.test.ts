// Unit tests for src/trmnl.ts, the fixed-size e-paper rendering.
import { describe, expect, test } from "bun:test";
import { TRMNL_X, renderTrmnl } from "./trmnl";
import type { StatusPayload } from "./types";
import outage from "./data/fixtures/outage.json";
import maintenance from "./data/fixtures/maintenance.json";
import manyIncidents from "./data/fixtures/manyincidents.json";

const NOW = new Date("2026-11-20T12:00:00Z");
const render = (data: unknown) => renderTrmnl(data as StatusPayload, TRMNL_X, NOW);

describe("renderTrmnl", () => {
  test("pins the page to the size of the panel", () => {
    const html = render(outage);
    expect(html).toContain("width: 1872px; height: 1404px; overflow: hidden");
  });

  test("scales every length with the width", () => {
    const html = renderTrmnl(outage as StatusPayload, { width: 800, height: 480 }, NOW);
    expect(html).toContain("width: 800px; height: 480px");
    expect(html).toContain("font-size: 6.838px");
  });

  // The panel service may copy the HTML into its own browser: a script or a
  // file fetched by URL would be lost there.
  test("is self-contained: no script, no external file", () => {
    const html = render(manyIncidents);
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/\b(?:src|href)=/);
    expect(html).not.toMatch(/url\((?!#|data:)/);
  });

  test("lists every component", () => {
    const data = outage as StatusPayload;
    const html = render(data);
    for (const g of data.groups) for (const c of g.components) expect(html).toContain(`<span class="name">${c.name}</span>`);
  });

  test("shows an active incident as a notice", () => {
    const data = outage as StatusPayload;
    expect(data.active_incidents.length).toBeGreaterThan(0);
    expect(render(data)).toContain('<span class="kind">Incident</span>');
  });

  test("shows a maintenance as a notice", () => {
    expect(render(maintenance)).toContain("Maintenance");
  });

  test("never lists more than three recent incidents", () => {
    const html = render(manyIncidents);
    expect(html.match(/<span class="when">/g)?.length).toBe(3);
  });

  test("escapes what comes from the API", () => {
    const data = structuredClone(outage) as StatusPayload;
    data.groups[0]!.components[0]!.name = "<b>x</b>";
    expect(render(data)).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
