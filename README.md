# Bible Reader PWA

## Overview
Bible Reader is a Progressive Web App for Bible reading with multilingual support, reading plan tracking, and offline functionality. Features authenticated Bible verses in English and Tamil (TAOVBSI translation).

## Features
- **Bible Verses**: 75 curated verses with authentic TAOVBSI Tamil translations, sourced from bible.com
- **Bilingual Support**: English and Tamil side-by-side verse display
- **Reading Plans**: Canonical and chronological Bible reading plans with progress tracking
- **Offline First**: Full offline support via service-worker.js for cached content
- **PWA**: Installable web app with offline cache and responsive design
- **Import/Export**: Save and restore reading progress as JSON

## Project Structure
```
.
├── index.html              # Main UI
├── script.js               # Logic: plans, progress tracking, language switching
├── service-worker.js       # Offline cache strategy
├── style.css               # Responsive styling
├── manifest.webmanifest    # PWA metadata
├── data/
│   ├── verses.json         # 75 English verses
│   ├── verses-ta.json      # 75 Tamil (TAOVBSI) verses
│   ├── reading-plan-canonical.json
│   ├── reading-plan-chronological.json
│   └── embedded-plans.js   # Embedded plan data
├── icons/                  # App icons for PWA
├── scripts/
│   ├── generate-plans.js   # Generate reading plans
│   └── generate-chronological.js
├── netlify.toml            # Build config
└── README.md
```

## Getting Started

### Install & Run Locally
```bash
npm install
npm start
```
Opens the app on `http://localhost` with live reload.

### Build
```bash
npm run build
```
Prepares assets for deployment.

## Features in Detail

### Reading Tracker
- Track progress through canonical or chronological reading plans
- Visual progress bars show completion status
- Save progress to browser localStorage
- Import/export reading history as JSON

### Bilingual Verses
- Switch between English and Tamil translations
- View verses side-by-side or in single language
- 75 carefully selected verses for reflection
- Tamil verses authenticated from bible.com TAOVBSI version 339

### Offline Support
- Entire app works without internet connection
- Service worker caches all essential assets
- Reading plans and verses available offline
- Progress syncs when connection returns

## Data Sources
- **Verses**: English (KJV/standard translations), Tamil (O.V. BSI - TAOVBSI from bible.com v339)
- **Plans**: Generated from complete Bible canon (66 books)
- **Icons**: Optimized for all device sizes

## Deployment

### Netlify
```
npm install
npm run build
```
Deploy the root directory. Static hosting works for this PWA.

### Environment
No secrets required. The app works entirely with static JSON data.

## Next.js / Supabase Deployment (Vercel or similar)

If you migrated the project to Next.js with Supabase (current repository), follow these steps to deploy and configure environment variables.

1. Install dependencies and build locally:

```powershell
npm install
npm run build
```

2. Required environment variables
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL (exposed to client)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (exposed to client)
- `SUPABASE_URL` — same as `NEXT_PUBLIC_SUPABASE_URL` (used server-side)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, **do not expose on client**)
- `VAPID_PRIVATE_KEY` — (optional) for web-push if you use push notifications
- `YOUTUBE_API_KEY` — (optional) for YouTube integrations
- `SENTRY_DSN` — (optional) Sentry DSN to enable server error reporting

3. Vercel deployment notes
- On Vercel, add the environment variables above in the Project Settings → Environment Variables. Mark `SUPABASE_SERVICE_ROLE_KEY` as `Encrypted` (Vercel hides them automatically).
- Build command: `node scripts/write-env.js && next build` (this writes `public/public-env.js` with safe public vars then builds)
- Start command: `next start` (Vercel handles this automatically when using the Next.js builder)

4. Healthcheck & verification
- After deployment, the health endpoint is available at: `/api/health` (returns basic uptime and timestamp).
- Admin APIs are protected and require a valid Supabase access token — use the client to call them.

5. Applying the Supabase schema
- The repository contains `supabase/schema.sql`. To apply schema changes:
	- Open your Supabase project → SQL Editor → New query
	- Paste the contents of `supabase/schema.sql` and run the script. The schema is written to be create-only (DROP guards are included where appropriate).
	- Verify tables: `profiles`, `reading_progress`, `admin_audit_log`, and functions like `is_app_admin()` exist.

6. Local development
- Create a `.env.local` file in the project root with the variables listed above (do not commit this file):

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
VAPID_PRIVATE_KEY=your-vapid-key
YOUTUBE_API_KEY=your-youtube-key
SENTRY_DSN=your-sentry-dsn
```

- Run the dev server:
```powershell
npm run dev
```

7. Security notes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Only use it in server-side code (Next API routes).
- For production scale, replace the in-memory rate limiter (`lib/rateLimiter.js`) with a distributed limiter (Redis, Cloudflare Workers KV, or your hosting provider's rate-limiting middleware).

If you want, I can add a short example `vercel.json` or CI/CD instructions for GitHub Actions to automatically deploy on push to `main`.

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with PWA support

## Contributing
Pull requests welcome. Maintain consistent JSON formatting for verse data.

## License
MIT License - Copyright (c) 2026 Faith Church Ministries / Vinodh Sukumar Victor

See [LICENSE](LICENSE) for full text.
