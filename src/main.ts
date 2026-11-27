import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fira-code";
import "./isc-design.css";
import "./themes.css";
import "./style.css";
import snapshot from "./data/status.json";
import outageDemo from "./data/fixtures/outage.json";
import maintenanceDemo from "./data/fixtures/maintenance.json";
import manyIncidentsDemo from "./data/fixtures/manyincidents.json";
import hasMoreTrueDemo from "./data/fixtures/hasmoretrue.json";
import withoutDataDemo from "./data/fixtures/withoutdata.json";
import { DEFAULT_PALETTE, isPaletteId } from "./palettes";
import { openDetails, renderPage, renderThemeDialog } from "./render";
import { THEME_TOOLTIP, applyPalette, applyTheme, currentPalette, cycleTheme } from "./theme";
import type { StatusPayload } from "./types";

applyTheme();
applyPalette();

const base = (import.meta.env.VITE_STATUS_BASE as string | undefined)?.replace(/\/$/, "") ?? "";
// Live fetches go through the CORS relay when configured (relay/), else straight upstream.
const api = ((import.meta.env.VITE_STATUS_API as string | undefined) || base).replace(/\/$/, "");
const root = document.getElementById("app")!;
const demoName = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("demo") : null;
const demos: Record<string, StatusPayload> = {
  outage: outageDemo as StatusPayload,
  maintenance: maintenanceDemo as StatusPayload,
  manyincidents: manyIncidentsDemo as StatusPayload,
  hasmoretrue: hasMoreTrueDemo as StatusPayload,
  nodata: withoutDataDemo as StatusPayload,
};
const demoData = demoName ? demos[demoName] : undefined;

function paint(data: StatusPayload, fromSnapshot: boolean) {
  root.innerHTML = renderPage(data, { base, fromSnapshot });
  // The dot is a fresh element on every paint; phase its animation to the page
  // clock so a refresh does not make it jump.
  root.querySelector<HTMLElement>(".hero-dot")?.style.setProperty("--t", `${-Math.round(performance.now())}ms`);
  document.title = `${data.overall.label === "All Systems Operational" ? "Tout fonctionne" : "État des services"} – ISC`;
}

paint(demoData ?? (snapshot as StatusPayload), true);

/* Theme FAB (delegated: the page is re-rendered on every refresh). */
root.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="theme"]');
  if (!btn) return;
  const mode = cycleTheme();
  btn.dataset.tooltip = THEME_TOOLTIP[mode];
  btn.setAttribute("aria-label", THEME_TOOLTIP[mode]);
});

/* Incident accordions: remember what is open across re-renders. `toggle` does
   not bubble, hence the capture. */
root.addEventListener(
  "toggle",
  (e) => {
    const d = e.target as HTMLDetailsElement;
    const id = d.dataset?.id;
    if (!id) return;
    if (d.open) openDetails.add(id);
    else openDetails.delete(id);
  },
  true,
);

/* Custom popover for the 90 day cells. SVG <rect> cannot carry a CSS ::after,
   so one floating element follows the hovered cell instead of a native title. */
const tip = document.createElement("div");
tip.className = "strip-tip";
tip.hidden = true;
document.body.append(tip);

function showTip(cell: SVGRectElement) {
  const r = cell.getBoundingClientRect();
  tip.textContent = cell.dataset.tip ?? "";
  tip.hidden = false;
  const w = tip.offsetWidth;
  const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
  tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(r.bottom + 6)}px)`;
}

function hideTip() {
  tip.hidden = true;
}

root.addEventListener("pointerover", (e) => {
  const cell = (e.target as Element).closest<SVGRectElement>("rect[data-tip]");
  if (!cell) return;
  showTip(cell);
});

root.addEventListener("pointerout", (e) => {
  if ((e.target as Element).closest("rect[data-tip]")) {
    hideTip();
  }
});

root.addEventListener("focusin", (e) => {
  const cell = (e.target as Element).closest<SVGRectElement>("rect[data-tip]");
  if (!cell) return;
  showTip(cell);
});

root.addEventListener("focusout", (e) => {
  if ((e.target as Element).closest("rect[data-tip]")) {
    hideTip();
  }
});

// A keyboard navigation for the 90-day history bars
root.addEventListener("keydown", (e) => {
  // get the element currently focused by user 
  const current = document.activeElement as SVGRectElement | null;

  if (!current || !current.matches("svg.strip rect")) {
    return;
  }

  const strip = current.closest("svg.strip");
  if (!strip) {
    return;
  }

  // get all the rectangles in this row and find my position
  const rects = Array.from(strip.querySelectorAll<SVGRectElement>("rect"));
  const index = rects.indexOf(current);
  let nextIndex = -1;

  // calculate the next position based on which key i pressed
  if (e.key === "ArrowLeft") {
    nextIndex = Math.max(0, index - 1);
  } else if (e.key === "ArrowRight") {
    nextIndex = Math.min(rects.length - 1, index + 1);
  } else if (e.key === "Home") {
    nextIndex = 0;
  } else if (e.key === "End") {
    nextIndex = rects.length - 1;
  } else {
    return;
  }

  // arrête de faire scroller la page quand on utilise le clavier
  e.preventDefault();

  // move to the new rectangle
  if (nextIndex !== -1 && nextIndex !== index) {
    current.setAttribute("tabindex", "-1");
    const nextRect = rects[nextIndex];
    nextRect?.setAttribute("tabindex", "0");
    nextRect?.focus();
  }
});

/* Theme menu: three quick clicks on the footer heart open it. The dialog is
   appended to <body>, outside #app, because #app is re-rendered on every
   refresh and would close it under the reader's hands. */
document.body.insertAdjacentHTML("beforeend", renderThemeDialog(currentPalette()));
const themeMenu = document.getElementById("theme-menu") as HTMLDialogElement;

const HEART_CLICKS = 3;
const HEART_WINDOW_MS = 800; // longest pause allowed between two clicks
let heartClicks = 0;
let heartTimer = 0;

root.addEventListener("click", (e) => {
  if (!(e.target as Element).closest('[data-action="secret-heart"]')) return;
  window.clearTimeout(heartTimer);
  heartClicks++;
  if (heartClicks < HEART_CLICKS) {
    heartTimer = window.setTimeout(() => (heartClicks = 0), HEART_WINDOW_MS);
    return;
  }
  heartClicks = 0;
  themeMenu.showModal();
});

/* A palette applies as soon as its card is picked: the page behind the menu
   is the real preview. */
themeMenu.addEventListener("change", (e) => {
  const input = e.target as HTMLInputElement;
  if (input.name === "palette" && isPaletteId(input.value)) applyPalette(input.value);
});

themeMenu.addEventListener("click", (e) => {
  const target = e.target as Element;
  // The form covers the whole dialog box, so a click that lands on the
  // <dialog> itself can only be on the backdrop.
  if (target === themeMenu) themeMenu.close();
  if (target.closest('[data-action="palette-reset"]')) {
    applyPalette(DEFAULT_PALETTE);
    const radio = themeMenu.querySelector<HTMLInputElement>(`input[name="palette"][value="${DEFAULT_PALETTE}"]`);
    if (radio) radio.checked = true;
  }
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

if (!demoData) {
  refresh();
  setInterval(refresh, 30_000);
}
