import type { DayState } from "./types";

export const TZ = "Europe/Zurich";
const LOCALE = "fr-CH";

/** Normalise the many spellings uptimepage may use into one of our five visual states. */
export type VisualState = "ok" | "degraded" | "outage" | "maintenance" | "nodata";

export function visualState(s: DayState | string): VisualState {
  const k = s.toLowerCase();
  if (k === "operational" || k === "up" || k === "ok") return "ok";
  if (k.includes("maint")) return "maintenance";
  if (k.includes("outage") || k === "down" || k === "major" || k === "critical") return "outage";
  if (k.includes("degrad") || k.includes("minor") || k.includes("partial")) return "degraded";
  return "nodata";
}

export const STATE_LABEL: Record<VisualState, string> = {
  ok: "opérationnel",
  degraded: "dégradé",
  outage: "en panne",
  maintenance: "en maintenance",
  nodata: "pas de donnée",
};

/** Headline copy, driven by the overall state rather than the English label upstream sends. */
export function overallHeadline(state: string, activeIncidents: number): string {
  switch (visualState(state)) {
    case "ok":
      return "Tout fonctionne.";
    case "maintenance":
      return "Maintenance en cours.";
    case "degraded":
      return activeIncidents > 1 ? "Certains services sont perturbés." : "Un service est perturbé.";
    case "outage":
      return activeIncidents > 1 ? "Plusieurs services sont indisponibles." : "Un service est indisponible.";
    default:
      return "État inconnu.";
  }
}

export const PHASE_LABEL: Record<string, string> = {
  investigating: "Analyse en cours",
  identified: "Cause identifiée",
  monitoring: "Sous surveillance",
  resolved: "Résolu",
  postmortem: "Post-mortem",
};

const fmtTime = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fmtDay = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: "numeric", month: "long" });
const fmtDayShort = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: "numeric", month: "short" });
const fmtDayTime = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtMonth = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, month: "short" });

export const time = (iso: string) => fmtTime.format(new Date(iso));
export const day = (iso: string | Date) => fmtDay.format(typeof iso === "string" ? new Date(iso) : iso);
export const dayShort = (iso: string | Date) => fmtDayShort.format(typeof iso === "string" ? new Date(iso) : iso);
export const dayTime = (iso: string) => fmtDayTime.format(new Date(iso));
export const monthShort = (d: Date) => fmtMonth.format(d).replace(".", "");

/** "21:16 → 21:18 (2 min)" or "depuis 21:16" for an open incident. */
export function span(start: string, end: string | null): string {
  if (!end) return `depuis ${time(start)}`;
  const mins = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60_000));
  const dur = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")}`;
  const sameDay = day(start) === day(end);
  return sameDay ? `${time(start)} → ${time(end)} (${dur})` : `${dayTime(start)} → ${dayTime(end)} (${dur})`;
}

/** "à 23:54" or "le 4 sept. à 23:54" when the snapshot is not from today. */
export function snapshotStamp(generatedAt: string, now = new Date()): string {
  const g = new Date(generatedAt);
  return day(g) === day(now) ? `à ${time(generatedAt)}` : `le ${dayShort(g)} à ${time(generatedAt)}`;
}

/** Midnight (Zurich) of the day `daysAgo` days before `ref`, as a Date. */
export function dayAt(ref: Date, daysAgo: number): Date {
  const d = new Date(ref);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

/** Day-of-month in Zurich, used to spot month boundaries on the axis. */
export function dayOfMonth(d: Date): number {
  return Number(new Intl.DateTimeFormat("en", { timeZone: TZ, day: "numeric" }).format(d));
}

/** "2 min", "1 h 08", "2 j 03 h" — human duration between two instants. */
export function duration(start: string, end: string | null, now = new Date()): string {
  const ms = (end ? Date.parse(end) : now.getTime()) - Date.parse(start);
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 48) return `${h} h ${String(mins % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)} j ${String(h % 24).padStart(2, "0")} h`;
}

export const SEVERITY_LABEL: Record<string, string> = {
  minor: "Mineur",
  major: "Majeur",
  critical: "Critique",
};
