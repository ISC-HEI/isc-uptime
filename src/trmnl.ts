// Fixed-size, content-only rendering of the status for an e-paper panel
// (TRMNL X: 1872 × 1404 px, 16 grey levels). scripts/trmnl.ts turns it into
// dist/trmnl.html at build time.
//
// Constraints that shape everything below:
// - no script and no external file: a panel service that screenshots the page
//   may copy the HTML into its own browser, where relative URLs are lost.
//   Fonts and logo are therefore passed in and inlined;
// - no colour: a state is told by a SHAPE (icon, height of the bar) first and
//   by a grey level second, so it survives a 1-bit panel too;
// - nothing moves, nothing is interactive.
//
// This file has no DOM code: it only builds a string, so `bun test` covers it.
import type { Component, Incident, Maintenance, StatusPayload } from "./types";
import {
  STATE_LABEL,
  dayAt,
  dayOfMonth,
  dayShort,
  dayTime,
  duration,
  monthShort,
  overallHeadline,
  time,
  visualState,
  type VisualState,
} from "./format";
import { componentUptime, formatPct, overallUptime } from "./uptime";

export interface TrmnlOptions {
  /** Panel size in pixels. Every length in the page scales with the width. */
  width: number;
  height: number;
  /** Contents of the black ISC logo SVG, inlined in the header. */
  logoSvg?: string;
  /** @font-face rules with the fonts embedded as data URIs. */
  fontCss?: string;
}

/** TRMNL X, landscape. */
export const TRMNL_X = { width: 1872, height: 1404 } as const;

/* Upper bounds, so the page never overflows its fixed frame. */
const MAX_NOTICES = 2;
const MAX_RECENT = 3;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/* Same order as the web page: what people use first, the plumbing last. */
const GROUP_ORDER = ["Web and services", "Infrastructure"];

/* ---------- state → shape ---------- */

/** Icon of a state, drawn in a 24 × 24 box. The shape alone tells the state. */
function icon(state: VisualState, cls = "ico"): string {
  const body: Record<VisualState, string> = {
    ok: `<circle cx="12" cy="12" r="10" fill="none" stroke="#000" stroke-width="2.4"/><path d="M7 12.5l3.4 3.4L17 9" fill="none" stroke="#000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    degraded: `<path d="M12 2.5L22.5 21h-21z" fill="none" stroke="#000" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 9.5v5.5" stroke="#000" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="18" r="1.4"/>`,
    outage: `<circle cx="12" cy="12" r="11"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>`,
    maintenance: `<rect x="2" y="2" width="20" height="20" fill="none" stroke="#000" stroke-width="2.4"/><path d="M7 12h10M7 7.5h10M7 16.5h10" stroke="#000" stroke-width="2"/>`,
    nodata: `<circle cx="12" cy="12" r="10" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="3.2 3.2"/>`,
  };
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${body[state]}</svg>`;
}

/* Bar of one day: height (out of 12) and fill. The worse the day, the taller
   and darker the bar; a day without data is a tick on the baseline. */
const BAR: Record<VisualState, { h: number; fill: string }> = {
  nodata: { h: 0.8, fill: "#bbb" },
  ok: { h: 5, fill: "#bbb" },
  maintenance: { h: 8, fill: "url(#hatch)" },
  degraded: { h: 10, fill: "#555" },
  outage: { h: 12, fill: "#000" },
};

function strip(c: Component): string {
  const hist = c.history.slice(-90);
  const cells = hist
    .map((s, i) => {
      const b = BAR[visualState(s)];
      return `<rect x="${i * 4}" y="${12 - b.h}" width="3" height="${b.h}" fill="${b.fill}"/>`;
    })
    .join("");
  return `<svg class="strip" viewBox="0 0 ${Math.max(1, hist.length * 4 - 1)} 12" preserveAspectRatio="none" aria-hidden="true">${cells}</svg>`;
}

/* ---------- blocks ---------- */

function axis(generated: Date): string {
  const n = 90;
  const ticks: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = dayAt(generated, n - 1 - i);
    if (dayOfMonth(d) === 1) ticks.push(`<span style="left:${(((i + 0.5) / n) * 100).toFixed(2)}%">${esc(monthShort(d))}</span>`);
  }
  return `<div class="row axis"><span></span><div class="ticks">${ticks.join("")}</div><span class="pct">90 jours</span></div>`;
}

function notice(kind: string, state: VisualState, title: string, meta: string): string {
  return `
      <div class="notice">
        ${icon(state, "ico ico-notice")}
        <div><p class="notice-title"><span class="kind">${esc(kind)}</span>${esc(title)}</p><p class="notice-meta">${esc(meta)}</p></div>
      </div>`;
}

function notices(data: StatusPayload, now: Date): string {
  const items: string[] = [];
  for (const i of data.active_incidents) {
    const state = i.severity === "minor" ? "degraded" : "outage";
    const who = i.component_name ? `${i.component_name} · ` : "";
    items.push(notice("Incident", state, i.title, `${who}depuis le ${dayTime(i.started_at)} (${duration(i.started_at, null, now)})`));
  }
  for (const m of data.active_maintenance) items.push(notice("Maintenance", "maintenance", m.title, maintenanceSpan(m)));
  for (const m of data.upcoming_maintenance) items.push(notice("Maintenance planifiée", "maintenance", m.title, maintenanceSpan(m)));
  if (!items.length) return "";
  const hidden = items.length - MAX_NOTICES;
  return `
    <section class="notices">${items.slice(0, MAX_NOTICES).join("")}
      ${hidden > 0 ? `<p class="notice-more">et ${plural(hidden, "autre")} avis sur status.isc-vs.ch</p>` : ""}
    </section>`;
}

function maintenanceSpan(m: Maintenance): string {
  const names = m.component_names?.length ? `${m.component_names.join(", ")} · ` : "";
  return `${names}${dayTime(m.starts_at)} → ${dayTime(m.ends_at)}`;
}

function recent(list: Incident[]): string {
  if (!list.length) return `<p class="recent-empty">Aucun incident sur la période.</p>`;
  const rows = list
    .slice(0, MAX_RECENT)
    .map(
      (i) => `
        <li><span class="when">${esc(dayShort(i.started_at))} ${esc(time(i.started_at))}</span><span class="what">${esc(i.title)}</span><span class="dur">${esc(i.ended_at ? duration(i.started_at, i.ended_at) : "en cours")}</span></li>`,
    )
    .join("");
  return `<ol class="recent">${rows}</ol>`;
}

/* ---------- page ---------- */

export function renderTrmnl(data: StatusPayload, opts: TrmnlOptions, now = new Date()): string {
  const { width, height } = opts;
  const generated = new Date(data.generated_at);
  const state = visualState(data.overall.state);
  const seen = new Set<string>();
  const incidents = [...data.active_incidents, ...data.recent_incidents].filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  const rank = (name: string | null) => {
    const i = name ? GROUP_ORDER.indexOf(name) : -1;
    return i < 0 ? GROUP_ORDER.length : i;
  };
  const groups = [...data.groups].sort((a, b) => rank(a.name) - rank(b.name));
  const uptimes = groups.flatMap((g) => g.components.map((c) => componentUptime(c, incidents, generated)));
  const overall = overallUptime(uptimes);
  const bound = data.recent_incidents_has_more ? "≤ " : "";

  const services = groups
    .map((g) => {
      const head = g.name ? `<h2>${esc(g.name)}</h2>` : "";
      const rows = g.components
        .map((c) => {
          const cur = visualState(c.current_status);
          const u = componentUptime(c, incidents, generated);
          return `
        <div class="row">
          <span class="who">${icon(cur)}<span class="name">${esc(c.name)}</span></span>
          ${strip(c)}
          <span class="pct">${u ? bound + esc(formatPct(u.pct)) : "—"}</span>
        </div>`;
        })
        .join("");
      return head + rows;
    })
    .join("");

  const legend = (["ok", "maintenance", "degraded", "outage", "nodata"] as const)
    .map((k) => `<span>${icon(k, "ico ico-legend")}${STATE_LABEL[k]}</span>`)
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${width}">
<meta name="robots" content="noindex">
<title>État des services ISC, panneau e-paper</title>
<style>
${opts.fontCss ?? ""}
/* 1rem = 1/117 of the panel width: 16 px on a 1872 px TRMNL X. */
html { font-size: ${(width / 117).toFixed(3)}px; }
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: #fff; color: #000; }
body { display: flex; flex-direction: column; padding: 3.25rem 4rem 2.75rem; font: 500 2.1rem/1.25 "DM Sans Variable", "DM Sans", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
p, h1, h2, ol { margin: 0; padding: 0; }
.mono { font-family: "Fira Code Variable", "Fira Code", ui-monospace, monospace; }
.defs { position: absolute; width: 0; height: 0; }
.ico { flex: none; width: 2.1rem; height: 2.1rem; }

header { display: flex; align-items: center; gap: 2rem; padding-bottom: 2rem; border-bottom: 0.25rem solid #000; }
header .logo svg { display: block; height: 6rem; width: auto; }
header .rule { width: 0.125rem; height: 5.5rem; background: #000; }
header .sur { font-size: 1.35rem; letter-spacing: 0.1em; text-transform: uppercase; }
header .title { font-size: 2.9rem; font-weight: 650; letter-spacing: -0.01em; line-height: 1.15; }
header .stamp { margin-left: auto; text-align: right; font-size: 1.6rem; line-height: 1.4; }
header .stamp b { display: block; font-size: 2.1rem; font-weight: 600; }

.hero { display: flex; align-items: center; gap: 2rem; padding: 2.5rem 0 2.25rem; }
.hero .ico-hero { width: 6.5rem; height: 6.5rem; }
.hero h1 { font-size: 5.6rem; font-weight: 650; letter-spacing: -0.025em; line-height: 1.05; }
.hero .overall { margin-left: auto; text-align: right; white-space: nowrap; font-size: 1.6rem; }
.hero .overall b { display: block; font-size: 4rem; font-weight: 600; line-height: 1.1; }

.notices { display: flex; flex-direction: column; gap: 0.9rem; padding-bottom: 2rem; }
.notice { display: flex; align-items: center; gap: 1.5rem; padding: 1.1rem 1.5rem; border: 0.25rem solid #000; }
.notice .ico-notice { width: 3.2rem; height: 3.2rem; }
.notice-title { font-size: 2.3rem; font-weight: 650; }
.notice-title .kind { margin-right: 1rem; padding: 0.1rem 0.7rem; background: #000; color: #fff; font-size: 1.5rem; font-weight: 600; vertical-align: 0.2rem; }
.notice-meta, .notice-more { font-size: 1.7rem; }

.services { flex: 1; min-height: 0; display: flex; flex-direction: column; padding-top: 0.5rem; border-top: 0.125rem solid #000; }
.services h2 { padding: 1rem 0 0.2rem; font-size: 1.45rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
.row { display: grid; grid-template-columns: 30rem 1fr 13rem; gap: 0 2rem; align-items: center; }
.services > .row:not(.axis) { flex: 1 1 0; min-height: 0; max-height: 5.75rem; }
.who { display: flex; align-items: center; gap: 1rem; min-width: 0; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 2.3rem; font-weight: 550; }
.strip { display: block; width: 100%; height: 72%; max-height: 3.6rem; }
.pct { text-align: right; white-space: nowrap; font-family: "Fira Code Variable", "Fira Code", ui-monospace, monospace; font-size: 2rem; font-variant-numeric: tabular-nums; }
.axis { padding-top: 1rem; font-size: 1.45rem; }
.axis .ticks { position: relative; height: 2.2rem; border-bottom: 0.125rem solid #000; }
.axis .ticks span { position: absolute; bottom: 0.3rem; transform: translateX(-50%); }
.axis .pct { font-size: 1.45rem; letter-spacing: 0.1em; text-transform: uppercase; }

footer { padding-top: 1.5rem; border-top: 0.125rem solid #000; }
footer h2 { padding-bottom: 0.6rem; font-size: 1.45rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
.recent { list-style: none; }
.recent li { display: flex; gap: 2rem; align-items: baseline; font-size: 1.9rem; line-height: 1.5; }
.recent .when { flex: none; width: 15rem; font-size: 1.7rem; }
.recent .what { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent .dur { flex: none; font-size: 1.7rem; }
.recent-empty { font-size: 1.9rem; }
.legend { display: flex; align-items: center; gap: 2.5rem; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 0.125rem solid #000; font-size: 1.6rem; }
.legend span { display: inline-flex; align-items: center; gap: 0.6rem; white-space: nowrap; }
.legend .ico-legend { width: 1.7rem; height: 1.7rem; }
.legend .url { margin-left: auto; font-weight: 600; }
</style>
</head>
<body>
<svg class="defs" aria-hidden="true"><defs>
  <pattern id="hatch" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#fff"/><rect width="2" height="1" fill="#000"/></pattern>
</defs></svg>

<header>
  ${opts.logoSvg ? `<span class="logo">${opts.logoSvg}</span><span class="rule"></span>` : ""}
  <div>
    <p class="sur mono">ISC Hub / Statut</p>
    <p class="title">État des services</p>
  </div>
  <p class="stamp">Relevé du<b>${esc(dayShort(generated))} à ${esc(time(data.generated_at))}</b></p>
</header>

<section class="hero">
  ${icon(state, "ico ico-hero")}
  <h1>${esc(overallHeadline(data.overall.state, data.active_incidents.length))}</h1>
  ${overall ? `<p class="overall"><b class="mono">${bound}${esc(formatPct(overall.pct))}</b>de disponibilité sur ${plural(overall.days, "jour")}</p>` : ""}
</section>
${notices(data, now)}
<section class="services">
  ${axis(generated)}
  ${services}
</section>

<footer>
  <h2 class="mono">Incidents récents</h2>
  ${recent(data.recent_incidents)}
  <p class="legend">${legend}<span class="url mono">status.isc-vs.ch</span></p>
</footer>
</body>
</html>
`;
}
