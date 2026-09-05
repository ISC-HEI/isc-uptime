import type { Component, Incident } from "./types";
import { visualState } from "./format";

export interface Uptime {
  /** 0–100, availability over the observed window. */
  pct: number;
  /** Number of days in the window (days with monitoring data, max 90). */
  days: number;
}

const DAY_MS = 86_400_000;

/**
 * Availability of one component over its observed window.
 *
 * The public API exposes the 90-day history only as one coarse state per day,
 * so a two-minute incident would paint a whole day as "degraded". The
 * percentage is therefore computed from the incident timeline instead: every
 * incident attached to the component counts as downtime for its real duration
 * (open incidents count until the snapshot time). Planned maintenance is not
 * downtime. The window starts at the first day with monitoring data so a
 * freshly added monitor is not penalised for the days before it existed.
 */
export function componentUptime(c: Component, incidents: Incident[], generated: Date): Uptime | null {
  const hist = c.history.slice(-90);
  const first = hist.findIndex((s) => visualState(s) !== "nodata");
  if (first < 0) return null;

  const days = hist.length - first;
  const end = generated.getTime();
  const start = end - days * DAY_MS;

  let down = 0;
  for (const i of incidents) {
    if (!(i.component_id === c.id || (!i.component_id && i.component_name === c.name))) continue;
    const s = Math.max(Date.parse(i.started_at), start);
    const e = Math.min(i.ended_at ? Date.parse(i.ended_at) : end, end);
    if (e > s) down += e - s;
  }
  const pct = Math.max(0, Math.min(100, 100 * (1 - down / (end - start))));
  return { pct, days };
}

/** Mean of the component availabilities, or null when nothing is observed yet. */
export function overallUptime(list: Array<Uptime | null>): Uptime | null {
  const seen = list.filter((u): u is Uptime => u !== null);
  if (!seen.length) return null;
  return {
    pct: seen.reduce((a, u) => a + u.pct, 0) / seen.length,
    days: Math.max(...seen.map((u) => u.days)),
  };
}

const fmtPct = new Intl.NumberFormat("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** "100 %", "99,86 %" — two decimals at most, no trailing zeros. */
export function formatPct(pct: number): string {
  // Avoid showing "100 %" for 99.996: round down to the displayed precision.
  const floored = Math.floor(pct * 100) / 100;
  return `${fmtPct.format(floored)} %`;
}

/** Visual class for the percentage: quiet by default, tinted when it drops. */
export function pctTone(pct: number): "ok" | "degraded" | "outage" {
  if (pct < 95) return "outage";
  if (pct < 99) return "degraded";
  return "ok";
}
