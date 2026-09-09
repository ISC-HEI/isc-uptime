import type { Component, Group, Incident, Maintenance, StatusPayload } from "./types";
import {
  PHASE_LABEL,
  SEVERITY_LABEL,
  STATE_LABEL,
  day,
  dayAt,
  dayOfMonth,
  dayShort,
  dayTime,
  duration,
  monthShort,
  overallHeadline,
  snapshotStamp,
  time,
  visualState,
} from "./format";
import { componentUptime, formatPct, overallUptime, pctTone, type Uptime } from "./uptime";
import { THEME_TOOLTIP, currentMode } from "./theme";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const BASE_URL = import.meta.env.BASE_URL;
const HUB = "https://isc.hevs.ch/";
const REPO = "https://github.com/ISC-HEI/isc-uptime";

/* Petal accent for a cross-audience / admin tool (see isc-website skill table). */
const ACCENT_LIGHT = "#e2abba";
const ACCENT_DARK = "#b1718d";

export interface RenderOptions {
  /** Origin of the uptimepage page, used for incident permalinks and the RSS feed. */
  base: string;
  /** Whether the data on screen came from the build snapshot (true) or a live fetch (false). */
  fromSnapshot: boolean;
}

export function renderPage(data: StatusPayload, opts: RenderOptions): string {
  const state = visualState(data.overall.state);
  const generated = new Date(data.generated_at);
  const incidents = dedupe([...data.active_incidents, ...data.recent_incidents]);
  const uptimes = new Map<string, Uptime | null>();
  for (const g of data.groups) for (const c of g.components) uptimes.set(c.id, componentUptime(c, incidents, generated));
  const overall = overallUptime([...uptimes.values()]);

  return `
    ${renderHeader(opts.base)}
    <main class="content">
      <section class="hero state-${state}">
        <h1><span class="hero-dot ${state}" aria-hidden="true"></span>${esc(overallHeadline(data.overall.state, data.active_incidents.length))}</h1>
        <p class="stamp">
          Relevé ${esc(snapshotStamp(data.generated_at))}${opts.fromSnapshot ? ", mis à jour toutes les cinq minutes" : ", en direct"}.
        </p>
      </section>

      ${data.active_incidents.length ? renderActive(data.active_incidents, opts.base) : ""}
      ${data.active_maintenance.length ? renderMaintenanceBlock("Maintenance en cours", data.active_maintenance) : ""}

      <section class="services" aria-labelledby="services-h">
        <div class="section-head">
          <h2 id="services-h">Services, 90 derniers jours</h2>
          ${overall ? renderOverallUptime(overall) : ""}
        </div>
        ${renderAxis(generated)}
        ${data.groups.map((g) => renderGroup(g, generated, uptimes)).join("")}
        <p class="legend" aria-hidden="true">
          ${(["ok", "degraded", "outage", "maintenance", "nodata"] as const)
            .map((k) => `<span class="key"><span class="sw ${k}"></span>${STATE_LABEL[k]}</span>`)
            .join("")}
        </p>
      </section>

      ${data.upcoming_maintenance.length ? renderMaintenanceBlock("Maintenances planifiées", data.upcoming_maintenance) : ""}

      <section class="incidents" aria-labelledby="incidents-h">
        <h2 id="incidents-h">Incidents récents</h2>
        ${
          data.recent_incidents.length
            ? `<ol class="incident-list">${data.recent_incidents.map((i) => renderIncident(i, opts.base)).join("")}</ol>`
            : `<p class="empty">Aucun incident sur la période.</p>`
        }
        ${data.recent_incidents_has_more ? `<p class="more"><a href="${esc(opts.base)}/status">Incidents plus anciens</a></p>` : ""}
      </section>
    </main>

    ${renderFooter(opts.base)}
  `;
}

/* ---------- header (ISCHeader port) & footer (Footer port) ---------- */

function renderHeader(base: string): string {
  const mode = currentMode();
  return `
    <header class="isc-header">
      <div class="isc-header__main">
        <div class="isc-header__bar" style="background:${ACCENT_LIGHT}"></div>
        <div class="isc-header__inner">
          <a href="${HUB}" class="isc-header__brand" data-tooltip="ISC Hub">
            <img src="${BASE_URL}isc-logo-black.svg" class="isc-header__full-logo isc-header__full-logo--light" alt="ISC">
            <img src="${BASE_URL}isc-logo-white.svg" class="isc-header__full-logo isc-header__full-logo--dark" alt="ISC">
          </a>
          <div class="isc-header__divider"></div>
          <div class="isc-header__titles">
            <div class="isc-header__surtitle isc-mono-label" style="color:${ACCENT_DARK}">
              <a href="${HUB}">ISC Hub</a><span class="isc-header__surtitle-sep" aria-hidden="true">/</span>Statut
            </div>
            <div class="isc-header__title">État des services</div>
          </div>
          <div class="isc-header__meta">
            <a class="isc-fab topbar__meta-fab" href="${esc(base)}/api/public/v1/incidents.rss"
               data-tooltip="Flux RSS des incidents" data-tooltip-pos="bottom" aria-label="Flux RSS des incidents">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1" fill="currentColor"/>
              </svg>
            </a>
            <button type="button" class="isc-fab topbar__meta-fab topbar__theme-fab" data-action="theme"
              data-tooltip="${esc(THEME_TOOLTIP[mode])}" data-tooltip-pos="bottom" aria-label="${esc(THEME_TOOLTIP[mode])}">
              <svg class="icon-sun" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
              <svg class="icon-moon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>`;
}

function renderFooter(base: string): string {
  const year = new Date().getFullYear();
  return `
    <footer class="isc-footer">
      <span class="isc-footer__note">
        Filière ISC, HES-SO Valais-Wallis · surveillance par <a href="${esc(base)}/status">uptimepage</a> · heures suisses
      </span>
      <span class="isc-footer__credit">
        Made with <span class="isc-footer__heart" aria-hidden="true"><svg class="isc-footer__heart-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.33-8.07C.9 10.27 1.4 6.6 4.2 5.07c2.06-1.12 4.5-.45 5.92 1.2L12 8.05l1.88-1.78c1.42-1.65 3.86-2.32 5.92-1.2 2.8 1.53 3.3 5.2 1.53 7.86C18.7 16.65 12 21 12 21z"/></svg></span> — mui ${year}
      </span>
      <a class="isc-footer__gh" href="${REPO}" target="_blank" rel="noopener noreferrer" aria-label="Code source sur GitHub">
        <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
        <span>github.com/ISC-HEI/isc-uptime</span>
      </a>
    </footer>`;
}

/* ---------- services ---------- */

function renderOverallUptime(u: Uptime): string {
  return `<p class="uptime-overall ${pctTone(u.pct)}"
    data-tooltip="Moyenne des services, ${u.days} jour${u.days > 1 ? "s" : ""} observé${u.days > 1 ? "s" : ""}"
    data-tooltip-pos="bottom"><span class="pct">${esc(formatPct(u.pct))}</span> de disponibilité</p>`;
}

function renderAxis(generated: Date): string {
  const n = 90;
  const ticks: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = dayAt(generated, n - 1 - i);
    if (dayOfMonth(d) === 1) {
      ticks.push(`<span class="tick" style="left:${((i + 0.5) / n) * 100}%">${esc(monthShort(d))}</span>`);
    }
  }
  return `<div class="row axis" aria-hidden="true"><div class="axis-track">${ticks.join("")}</div><span class="axis-pct">uptime</span></div>`;
}

function renderGroup(g: Group, generated: Date, uptimes: Map<string, Uptime | null>): string {
  const head = g.name ? `<h3 class="group">${esc(g.name)}</h3>` : "";
  return head + g.components.map((c) => renderComponent(c, generated, uptimes.get(c.id) ?? null)).join("");
}

function renderComponent(c: Component, generated: Date, u: Uptime | null): string {
  const cur = visualState(c.current_status);
  const pct = u
    ? `<span class="uptime ${pctTone(u.pct)}" data-tooltip="Disponibilité sur ${u.days} jour${u.days > 1 ? "s" : ""} observé${u.days > 1 ? "s" : ""}" data-tooltip-pos="top">${esc(formatPct(u.pct))}</span>`
    : `<span class="uptime nodata" data-tooltip="Pas encore de donnée" data-tooltip-pos="top">—</span>`;
  return `
    <div class="row component">
      <div class="who">
        <span class="dot ${cur}" aria-hidden="true"></span>
        <span class="name">${esc(c.name)}</span>
        <span class="now sr-only">, ${STATE_LABEL[cur]}</span>
        ${c.description ? `<span class="desc">${esc(c.description)}</span>` : ""}
      </div>
      ${renderStrip(c, generated)}
      ${pct}
    </div>`;
}

function renderStrip(c: Component, generated: Date): string {
  const n = 90;
  const hist = c.history.slice(-n);
  while (hist.length < n) hist.unshift("no_data");
  const cells = hist
    .map((s, i) => {
      const v = visualState(s);
      const d = dayAt(generated, n - 1 - i);
      return `<rect class="${v}" x="${i * 4}" y="0" width="3" height="12" data-tip="${esc(day(d))} : ${STATE_LABEL[v]}"></rect>`;
    })
    .join("");
  return `<svg class="strip" viewBox="0 0 ${n * 4 - 1} 12" preserveAspectRatio="none" role="img"
    aria-label="Historique 90 jours de ${esc(c.name)}">${cells}</svg>`;
}

/* ---------- incidents ---------- */

function dedupe(list: Incident[]): Incident[] {
  const seen = new Set<string>();
  return list.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

function renderActive(list: Incident[], base: string): string {
  return `
    <section class="active" aria-labelledby="active-h">
      <h2 id="active-h">En cours</h2>
      <ol class="incident-list">${list.map((i) => renderIncident(i, base, true)).join("")}</ol>
    </section>`;
}

function renderIncident(i: Incident, base: string, open = false): string {
  const updates = [...i.updates].sort((a, b) => Date.parse(a.posted_at) - Date.parse(b.posted_at));
  const last = updates.at(-1);
  const sev = i.severity === "minor" ? "degraded" : "outage";
  const phase = i.ended_at && !open ? "resolved" : i.status_phase;
  const end = i.ended_at ? (sameDayIso(i.started_at, i.ended_at) ? time(i.ended_at) : dayTime(i.ended_at)) : null;
  return `
    <li class="incident ${open ? "open" : ""} sev-${sev}">
      <div class="incident-head">
        <a class="title" href="${esc(base)}/status/incidents/${esc(i.id)}">${esc(i.title)}</a>
        <span class="pill pill-sev sev-${esc(i.severity)}">${esc(SEVERITY_LABEL[i.severity] ?? i.severity)}</span>
        <span class="pill pill-phase phase-${esc(phase)}">${esc(PHASE_LABEL[phase] ?? phase)}</span>
      </div>
      <p class="incident-meta">
        ${i.component_name ? `<span>${esc(i.component_name)}</span><span class="sep">·</span>` : ""}
        <span class="range">${esc(dayTime(i.started_at))}${end ? ` → ${esc(end)}` : ""}</span>
        <span class="sep">·</span>
        <span class="dur">${esc(duration(i.started_at, i.ended_at))}${i.ended_at ? " (résolu)" : ", en cours"}</span>
      </p>
      ${last ? `<p class="incident-msg">${esc(last.message)}</p>` : ""}
    </li>`;
}

const sameDayIso = (a: string, b: string) => day(a) === day(b);

/* ---------- maintenance ---------- */

function renderMaintenanceBlock(title: string, list: Maintenance[]): string {
  const id = `maint-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return `
    <section class="maintenance" aria-labelledby="${id}">
      <h2 id="${id}">${esc(title)}</h2>
      <ol class="incident-list">
        ${list
          .map(
            (m) => `
          <li class="incident sev-maintenance">
            <div class="incident-head">
              <span class="title">${esc(m.title)}</span>
              <span class="pill pill-phase phase-maintenance">Maintenance</span>
            </div>
            <p class="incident-meta">
              ${m.component_names?.length ? `<span>${esc(m.component_names.join(", "))}</span><span class="sep">·</span>` : ""}
              <span class="range">${esc(dayTime(m.starts_at))} → ${esc(sameDay(m) ? time(m.ends_at) : dayTime(m.ends_at))}</span>
              <span class="sep">·</span>
              <span class="dur">${esc(duration(m.starts_at, m.ends_at))}</span>
            </p>
            ${m.description ? `<p class="incident-msg">${esc(m.description)}</p>` : ""}
          </li>`,
          )
          .join("")}
      </ol>
    </section>`;
}

const sameDay = (m: Maintenance) => day(m.starts_at) === day(m.ends_at);
