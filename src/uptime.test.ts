// Unit tests for src/uptime.ts. Run them with `bun test` (or `bun test --watch`).
//
// A test file sits next to the file it tests and ends in `.test.ts`.
// `describe` groups the tests of one function, `test` states one expected
// behaviour in plain words, `expect(...)` compares a result with what we want.
import { describe, expect, test } from "bun:test";
import type { Component, Incident } from "./types";
import { componentUptime, formatPct, pctTone } from "./uptime";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

// A fixed "now": tests must give the same result whenever they run.
const NOW = new Date("2026-11-20T12:00:00Z");

/** A component observed for `days` days, with no data before that. */
function component(days: number): Component {
  return {
    id: "web",
    name: "Website",
    description: null,
    current_status: "operational",
    history: [...Array(90 - days).fill("no_data"), ...Array(days).fill("operational")],
  };
}

/** An incident on the test component, from `startHoursAgo` to `endHoursAgo` before NOW (null = still open). */
function incident(startHoursAgo: number, endHoursAgo: number | null, componentId = "web"): Incident {
  return {
    id: `inc-${startHoursAgo}`,
    component_id: componentId,
    component_name: null,
    title: "Test incident",
    started_at: new Date(NOW.getTime() - startHoursAgo * HOUR_MS).toISOString(),
    ended_at: endHoursAgo === null ? null : new Date(NOW.getTime() - endHoursAgo * HOUR_MS).toISOString(),
    severity: "major",
    status_phase: "resolved",
    updates: [],
    postmortem: null,
  };
}

describe("componentUptime", () => {
  test("is 100 % without any incident", () => {
    const u = componentUptime(component(90), [], NOW);
    expect(u).toEqual({ pct: 100, days: 90 });
  });

  test("returns null when the component has no monitoring data yet", () => {
    expect(componentUptime(component(0), [], NOW)).toBeNull();
  });

  test("counts an incident for its real duration", () => {
    // 24 h of downtime over a 10-day window: 90 % available.
    const u = componentUptime(component(10), [incident(48, 24)], NOW);
    expect(u?.days).toBe(10);
    expect(u?.pct).toBeCloseTo(90, 6);
  });

  test("counts an open incident until the snapshot time", () => {
    // Started 12 h ago, not ended: 12 h of downtime over 10 days.
    const u = componentUptime(component(10), [incident(12, null)], NOW);
    expect(u?.pct).toBeCloseTo(100 * (1 - (12 * HOUR_MS) / (10 * DAY_MS)), 6);
  });

  test("ignores the incidents of other components", () => {
    const u = componentUptime(component(10), [incident(48, 24, "another-service")], NOW);
    expect(u?.pct).toBe(100);
  });
});

describe("formatPct", () => {
  // The decimal separator of fr-CH depends on the runtime's ICU data ("," or "."),
  // so the tests accept both instead of pinning one.
  test("rounds down, so that 99.9996 is never shown as 100 %", () => {
    expect(formatPct(99.9996)).toMatch(/^99[.,]999\u00a0%$/);
  });

  test("drops trailing zeros", () => {
    expect(formatPct(100)).toBe("100\u00a0%");
    expect(formatPct(99.5)).toMatch(/^99[.,]5\u00a0%$/);
  });
});

describe("pctTone", () => {
  test("turns to degraded below 99 % and to outage below 95 %", () => {
    expect(pctTone(99)).toBe("ok");
    expect(pctTone(98.9)).toBe("degraded");
    expect(pctTone(95)).toBe("degraded");
    expect(pctTone(94.9)).toBe("outage");
  });
});
