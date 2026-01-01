# Notifications Setup (Web PWA + iOS/Android)

This guide explains how app owners can enable push notifications for web/PWA and for store-installed iOS/Android apps.

## Option A: Web Push for PWA (fastest)
Supported on Android browsers and iOS Safari when the PWA is installed to the home screen.

1) Generate VAPID keys
- Run: `npx web-push generate-vapid-keys`
- Keep the private key server-side; place the public key in the client.

2) Configure the client
- In `script.js`, set `VAPID_PUBLIC_KEY` and `PUSH_SUBSCRIBE_URL` to your API/edge-function endpoint that saves subscriptions.
- Ensure the service worker (`service-worker.js`) includes push handlers (already added).

3) Create a subscribe API
- Endpoint: `POST /subscribe` with `{ subscription }` from the client.
- Validate the authenticated user (once auth is added) and upsert into `push_subscriptions` (user_id, endpoint, keys).

4) Send notifications
- From a serverless function (Vercel or Supabase Edge Function), load subscriptions for the target users and send via `web-push` using your VAPID private key:
```js
const webpush = require('web-push');
webpush.setVapidDetails('mailto:you@example.com', PUBLIC_KEY, PRIVATE_KEY);
await webpush.sendNotification(subscription, JSON.stringify({
  title: 'New announcement',
  body: 'Tap to view',
  url: '/',
}));
```
- Clean up invalid subscriptions on send errors (410/404).

5) Netlify-specific endpoints (simplest path)
- Save subscriptions: `/.netlify/functions/subscribe` (already added). Env vars needed: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Send notifications: `/.netlify/functions/sendPush` (already added). Env vars needed: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, optional `VAPID_CONTACT_EMAIL`.
- Client config: `script.js` already points to `/.netlify/functions/subscribe`; just set `VAPID_PUBLIC_KEY`.

6) iOS/Android PWA notes
- iOS: users must install the PWA to the home screen for web push to work.
- Android: works in Chrome/Edge/Firefox without install.

Quick setup checklist (for non-technical admins)
1) In Netlify → Site settings → Environment variables, add:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
2) In the code, set `VAPID_PUBLIC_KEY` in `script.js` to match the env value.
3) Deploy. Then open the site, allow notifications when prompted.
4) To send a test: POST to `/.netlify/functions/sendPush` with `{ "title": "Test", "body": "Hello" }`.

One-line curl test for sendPush (replace SITE_URL):
```
curl -X POST https://<SITE_URL>/.netlify/functions/sendPush \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Hello"}'
```

5) UX notes
- Prompt permission once; store that you asked to avoid repeated prompts.
- iOS requires the PWA to be installed on the home screen for web push to work.

## Option B: Native Push via Capacitor (most reliable)
Wrap the app with Capacitor to ship store apps and use FCM/APNs.

1) Capacitor setup
- `npm install @capacitor/core @capacitor/cli` and initialize Capacitor in your Next.js output (or a dedicated mobile shell).
- Add platforms: `npx cap add ios`, `npx cap add android`.

2) Firebase Cloud Messaging (FCM)
- Create a Firebase project.
- For Android: add an Android app, download `google-services.json`, place in `android/app/`.
- For iOS: add an iOS app, download `GoogleService-Info.plist`, place in `ios/App/App/`.

3) Apple Push Notification service (APNs)
- In Apple Developer portal, create a Key (or certificates) for APNs.
- Upload the APNs key to Firebase project settings → Cloud Messaging.

4) App code
- Install Capacitor Push plugin: `npm i @capacitor/push-notifications`.
- Request permission, register, and send the FCM token to your backend (store alongside user_id in Supabase).

5) Sending
- Use Firebase Admin SDK (server-side) to send messages to stored FCM tokens. Firebase will route to APNs for iOS.
- Reuse the same triggers (new announcement, event reminder) and pick: Web Push for PWA users, FCM/APNs for native users.

## Event Triggers (examples)
- New announcement posted → notify all members or a segment.
- Event reminder → notify RSVPs 24h before.
- New kids upload approved → notify parent who uploaded.

## Security & Cleanup
- Never expose VAPID private key or FCM server key in the client.
- Remove subscriptions/tokens that fail with 404/410/`NotRegistered`.
- Keep `push_subscriptions` tied to authenticated user IDs for targeting.

## What to configure in this repo
- Set `VAPID_PUBLIC_KEY` and `PUSH_SUBSCRIBE_URL` in `script.js`.
- Deploy a `/subscribe` endpoint (Vercel or Supabase Edge Function) that upserts into `push_subscriptions`.
- Keep VAPID private key and any FCM server keys as server-side secrets.
