import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fira-code";
import "./isc-design.css";
import "./style.css";
import snapshot from "./data/status.json";
import { renderPage } from "./render";
import { THEME_TOOLTIP, applyTheme, cycleTheme } from "./theme";
import type { StatusPayload } from "./types";

applyTheme();

const base = (import.meta.env.VITE_STATUS_BASE as string | undefined)?.replace(/\/$/, "") ?? "";
// Live fetches go through the CORS relay when configured (relay/), else straight upstream.
const api = ((import.meta.env.VITE_STATUS_API as string | undefined) || base).replace(/\/$/, "");
const root = document.getElementById("app")!;

function paint(data: StatusPayload, fromSnapshot: boolean) {
  root.innerHTML = renderPage(data, { base, fromSnapshot });
  document.title = `${data.overall.label === "All Systems Operational" ? "Tout fonctionne" : "État des services"} – ISC`;
}

paint(snapshot as StatusPayload, true);

/* Theme FAB (delegated: the page is re-rendered on every refresh). */
root.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="theme"]');
  if (!btn) return;
  const mode = cycleTheme();
  btn.dataset.tooltip = THEME_TOOLTIP[mode];
  btn.setAttribute("aria-label", THEME_TOOLTIP[mode]);
});

/* Custom popover for the 90 day cells. SVG <rect> cannot carry a CSS ::after,
   so one floating element follows the hovered cell instead of a native title. */
const tip = document.createElement("div");
tip.className = "strip-tip";
tip.hidden = true;
document.body.append(tip);
root.addEventListener("pointerover", (e) => {
  const cell = (e.target as Element).closest<SVGRectElement>("rect[data-tip]");
  if (!cell) return;
  const r = cell.getBoundingClientRect();
  tip.textContent = cell.dataset.tip ?? "";
  tip.hidden = false;
  const w = tip.offsetWidth;
  const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
  tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(r.bottom + 6)}px)`;
});
root.addEventListener("pointerout", (e) => {
  if ((e.target as Element).closest("rect[data-tip]")) tip.hidden = true;
});

// Without the relay the public API sends no CORS headers, so this fails
// silently on GitHub Pages and the snapshot stays.
async function refresh() {
  if (!api) return;
  try {
    const res = await fetch(`${api}/api/public/v1/status`, { mode: "cors", cache: "no-store" });
    if (!res.ok) return;
    const live = (await res.json()) as StatusPayload;
    if (live?.overall?.state) paint(live, false);
  } catch {
    /* CORS or network: keep the snapshot */
  }
}

refresh();
setInterval(refresh, 30_000);
