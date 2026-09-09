# Status relay (Cloudflare Worker)

Adds CORS to `https://isc3.uptimepage.dev/api/public/v1/status` and caches it 60 s at the edge,
so the page can refresh live in the browser. Free tier is more than enough.

```bash
bunx wrangler login                 # once, opens the browser
cd relay && bunx wrangler deploy    # prints the *.workers.dev URL
```

Then set `VITE_STATUS_API` in the root `.env` to that URL and push.
