// Fetches the public status JSON and stores it as the build-time snapshot.
// The public API sends no CORS headers, so the browser cannot call it from
// GitHub Pages; CI runs this on a schedule and redeploys instead.
import { mkdir, writeFile } from "node:fs/promises";

const base = (process.env.STATUS_BASE ?? process.env.VITE_STATUS_BASE ?? "").replace(/\/$/, "");
if (!base) {
  console.error("STATUS_BASE is not set");
  process.exit(1);
}

const res = await fetch(`${base}/api/public/v1/status`, {
  headers: { accept: "application/json" },
  signal: AbortSignal.timeout(15_000),
});
if (!res.ok) {
  console.error(`${res.status} ${res.statusText} from ${base}`);
  process.exit(1);
}
const json = await res.json();
if (!json?.overall?.state || !Array.isArray(json?.groups)) {
  console.error("unexpected payload shape, refusing to overwrite snapshot");
  process.exit(1);
}

await mkdir("src/data", { recursive: true });
await writeFile("src/data/status.json", JSON.stringify(json), "utf8");
console.log(`snapshot: ${json.overall.state}, ${json.groups.length} group(s), generated_at ${json.generated_at}`);
