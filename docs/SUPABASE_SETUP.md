# Supabase Setup Guide

Follow these steps to adopt the Supabase + Next.js architecture proposed in the technical docs.

## 1) Create a Supabase project
- Sign in at https://supabase.com and create a new project.
- Note your Project URL and anon key.

## 2) Apply the schema
- Open the SQL editor in Supabase.
- Copy and run `supabase/schema.sql` from this repo.
- This creates tables for profiles, reading progress, plans, announcements, kids uploads, quizzes, and a `kids-zone` storage bucket with RLS policies.

## 3) Configure storage
- After running the SQL, confirm the `kids-zone` bucket exists under Storage.
- If you want private reads, set the bucket to private and fetch signed URLs in the app; current policy is public read, authenticated write.

## 4) Environment variables (Next.js / Vercel)
Create `.env.local` in your Next.js app with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
Use the service role key only in server actions or API routes.

## 5) Client/server helpers (Next.js App Router)
- Install client: `npm i @supabase/supabase-js @supabase/ssr`
- Example client helper:
```ts
// lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```
- Server helper:
```ts
// lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const createSupabaseServer = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name),
        set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
        remove: (name: string, options: any) => cookieStore.set(name, '', { ...options, maxAge: -1 }),
      },
    }
  );
};
```

## 6) Feature wiring (minimal paths)
- **Auth**: use Supabase Auth UI or email/password flows; store roles in `profiles.role`.
- **Reading tracker**: upsert into `bible_reading` per date; query `missed_days` view for gaps.
- **Plans**: seed `reading_plans` and `reading_plan_days` from your JSON plans.
- **Announcements**: admins insert into `announcements`; subscribe to Postgres changes for realtime.
- **Kids uploads**: upload to `kids-zone` bucket, store `file_path` in `kids_uploads`.
- **Quizzes**: seed `quiz_questions`; insert scores into `quiz_scores`.

## 7) Deployment
- Deploy the Next.js app on Vercel with the env vars above.
- Supabase hosts the database, auth, and storage—no servers to manage.

## 8) Next steps
- Port the current static UI into Next.js components.
- Add route protection with middleware and session checks.
- Add tests for auth and data access policies.
