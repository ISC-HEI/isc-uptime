// Shape of GET /api/public/v1/status on uptimepage.
// Unknown string values are tolerated everywhere: the page must degrade, not break,
// when upstream adds a state.

export type DayState =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "no_data"
  | (string & {});

export interface Component {
  id: string;
  name: string;
  description: string | null;
  current_status: DayState;
  /** 90 cells, oldest first, last cell is today. */
  history: DayState[];
  detail_url?: string | null;
}

export interface Group {
  name: string | null;
  components: Component[];
}

export interface IncidentUpdate {
  posted_at: string;
  phase: "investigating" | "identified" | "monitoring" | "resolved" | "postmortem" | (string & {});
  message: string;
}

export interface Incident {
  id: string;
  component_id: string | null;
  component_name: string | null;
  title: string;
  started_at: string;
  ended_at: string | null;
  severity: "minor" | "major" | "critical" | (string & {});
  status_phase: string;
  updates: IncidentUpdate[];
  postmortem: string | null;
}

export interface Maintenance {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  component_ids?: string[];
  component_names?: string[];
}

export interface StatusPayload {
  overall: { state: string; label: string };
  generated_at: string;
  site_name: string;
  groups: Group[];
  active_incidents: Incident[];
  recent_incidents: Incident[];
  recent_incidents_has_more: boolean;
  active_maintenance: Maintenance[];
  upcoming_maintenance: Maintenance[];
}
