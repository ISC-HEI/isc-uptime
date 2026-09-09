// CORS relay for the public uptimepage status JSON.
//
// The browser on GitHub Pages cannot call isc3.uptimepage.dev directly (no
// Access-Control-Allow-Origin header upstream). This Worker fetches the JSON
// on the visitor's behalf, adds the header, and caches the answer at the edge
// for 60 s so uptimepage sees at most one request per minute whatever the
// number of visitors. Only one path is relayed; everything else is 404.

const UPSTREAM = "https://isc3.uptimepage.dev";
const PATH = "/api/public/v1/status";
const TTL = 60;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-max-age": "86400",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: CORS });

    const url = new URL(request.url);
    if (url.pathname !== PATH) return new Response("Not found", { status: 404, headers: CORS });

    const upstream = await fetch(UPSTREAM + PATH, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: TTL, cacheEverything: true },
    });

    const headers = new Headers(CORS);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", `public, max-age=${TTL}`);
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
