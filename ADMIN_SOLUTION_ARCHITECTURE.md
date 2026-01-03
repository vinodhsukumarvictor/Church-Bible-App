# Admin Experience: Solution Architecture

## Scope
- Single admin user: `gpgvictor@gmail.com` (can promote/demote others to `admin`/`super_admin`/`member`).
- Capabilities: user analytics, bible reading summaries, quiz analytics, content moderation (posts/kids images), announcements CRUD, targeted notifications, audit logging.

## Access Control
- DB function `is_app_admin()` returns true only for `gpgvictor@gmail.com`.
- RLS: admin-allow policies on admin actions; `profiles_admin_manage` allows role changes.
- Frontend guard: on load, fetch Supabase user; block admin UI unless `is_app_admin()` is true.
- Netlify functions: verify Supabase JWT and admin before executing privileged actions.

## Data Model & Views
- Tables: `profiles`, `bible_reading`, `reading_progress`, `quiz_questions`, `quiz_scores`, `announcements`, `kids_uploads`, `posts`, `push_subscriptions`, `admin_audit_log`.
- Views (admin-only):
  - `admin_reading_summary`: per-user totals, streaks, last activity.
  - `admin_quiz_summary`: per-user totals, averages, last quiz; question correctness.
  - `admin_pending_uploads`: unapproved kids uploads.
  - `admin_pending_posts`: posts with status draft/pending.
- Indexes: ensure GIN on `reading_progress.completed_chapters`; btree on `quiz_scores(user_id)`, `kids_uploads(approved, created_at)`, `posts(status, created_at)`.

## Admin UI (single page)
- Tabs: Users/Reading, Quizzes, Announcements, Posts Moderation, Kids Uploads, Notifications, Audit.
- Actions:
  - Promote/demote roles via `profiles.role` (admin only).
  - Approve/decline posts and kids uploads; view previews.
  - CRUD announcements; publish/unpublish.
  - Send push to all/role/emails/user_ids.
  - Export tables (CSV); pagination and filters.
- UX: confirm destructive actions; toasts for success/error.

## Backend/API
- Prefer direct Supabase RPC/views with RLS using the admin JWT.
- Netlify `sendPush`: requires bearer Supabase JWT, supports target filters, logs to `admin_audit_log`.
- Netlify `fetchYouTube`: uses env `YOUTUBE_API_KEY`.

## Audit & Observability
- Table `admin_audit_log(id, actor_id, actor_email, action, target_table, target_id, metadata jsonb, created_at)`.
- Log all admin actions (role changes, approvals, announcements, pushes).

## Security
- No service keys client-side; only anon key on frontend.
- RLS enforced on all tables; admin gating in DB via `is_app_admin()`.
- Validate payloads in functions; rate-limit push sends.

## Implementation Steps (Developer)
1) DB: add `is_app_admin()`, admin RLS policies, views, `admin_audit_log`.
2) Frontend: add admin route; guard by `is_app_admin()`; wire tabs and actions; role change UI.
3) Functions: tighten auth on `sendPush`; rely on Supabase JWT; log actions.
4) CI/Build: expose `SUPABASE_URL` and `SUPABASE_ANON_KEY` via `write-env.js`; set `YOUTUBE_API_KEY` and VAPID keys in environment.

## Test Plan (QA)
- Access: only `gpgvictor@gmail.com` can reach admin UI/APIs; non-admin blocked by RLS.
- Role changes: promote/demote updates `profiles.role`; non-admin cannot.
- Analytics accuracy: reading totals, streaks, quiz averages match source data.
- Moderation: approve/decline updates rows and audit log; pending queues shrink.
- Notifications: push sends to selected targets; non-admin fails.
- Regression: normal user flows unchanged; RLS still enforced.
