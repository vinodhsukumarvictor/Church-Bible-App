# Bible Reader PWA

## Overview
Bible Reader is a PWA for tracking Bible reading with offline support, Supabase-backed kids uploads, optional web push, and YouTube sermon pulls.

## Features
- Reading tracker: chapter progress, canonical/chronological plans, import/export JSON.
- Kids gallery: uploads stored in Supabase `kids-zone` (private), admin approve/delete, signed URLs for viewing.
- Push notifications: Netlify functions (`subscribe`, `sendPush`) using VAPID keys and Supabase `push_subscriptions` table.
- YouTube sermons: fetch latest from `@FCMLiverpool` when `YOUTUBE_API_KEY` is set; fallback data otherwise.
- PWA: offline cache via `service-worker.js`, installable manifest.

## Project Structure
```
.
├── index.html
├── script.js                # UI logic, Supabase client, push subscription, plans
├── service-worker.js        # Cache + push handlers
├── style.css
├── data/                    # Reading plan JSON, verses
├── netlify/functions/       # subscribe.js, sendPush.js
├── scripts/write-env.js     # Writes public-env.js from env vars
├── docs/                    # Architecture, setup, roadmaps (moved here)
├── netlify.toml             # Build/publish config (esbuild for functions)
└── README.md
```

## Environment Variables
Configure in Netlify (Build & deploy → Environment) and locally before builds:
- `SUPABASE_URL` (client + functions)
- `SUPABASE_ANON_KEY` (client)
- `SUPABASE_SERVICE_ROLE_KEY` (functions only; keep secret)
- `VAPID_PUBLIC_KEY` (client + functions)
- `VAPID_PRIVATE_KEY` (functions only; keep secret)
- `YOUTUBE_API_KEY` (client; optional, enables live sermons)

## Install & Run
```
npm install
npm run build    # generates public-env.js from env vars
npm start        # serves the app (http-server) on localhost
```
Ensure env vars are set in your shell before `npm run build` so `public-env.js` is populated.

## Deploy (Netlify)
- `netlify.toml`: build `npm run build`, publish `.`; functions bundled from `netlify/functions` with esbuild.
- Add the env vars above in Site settings → Build & deploy → Environment.
- Trigger a deploy; confirm `/.netlify/functions/subscribe` and `/.netlify/functions/sendPush` return 200.

## Push Test
After deploy and with subscriptions saved, run:
```
$body='{"title":"Test push","body":"Hello","url":"/"}'
Invoke-RestMethod -Method Post -Uri "https://<site>.netlify.app/.netlify/functions/sendPush" -ContentType "application/json" -Body $body
```
Expected: `{ "sent": N, "failed": 0 }` (failed > 0 means stale endpoints removed).

## Docs
Supporting docs live in `docs/`:
- `docs/TECHNICAL_ARCHITECTURE.md`, `docs/ARCHITECTURE_DIAGRAMS.md`
- `docs/IMPLEMENTATION_CHECKLIST.md`, `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/NOTIFICATIONS_SETUP.md`, `docs/SUPABASE_SETUP.md`, `docs/QUICK_START_GUIDE.md`, `docs/FEATURE_COMPARISON.md`, `docs/ENTERPRISE_DEVELOPMENT_PLAN.md`

## Contributing
PRs welcome. Do not commit secrets; use env vars and `public-env.js` for safe public values.

## License
MIT
