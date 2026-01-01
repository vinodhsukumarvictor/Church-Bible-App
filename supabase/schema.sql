-- Supabase initial schema for Bible Reader
-- Run in Supabase SQL editor. Creates tables, RLS, and storage bucket.

-- Profiles (Auth-managed users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'member',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
do $$ begin
  create policy "profiles_select_own" on public.profiles
    for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles_upsert_own" on public.profiles
    for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles_update_own" on public.profiles
    for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- Bible reading completion by date
create table if not exists public.bible_reading (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  reading_date date not null,
  completed boolean default true,
  created_at timestamptz default now(),
  unique(user_id, reading_date)
);

create index if not exists idx_bible_reading_user_date on public.bible_reading(user_id, reading_date);

alter table public.bible_reading enable row level security;
do $$ begin
  create policy "bible_reading_own" on public.bible_reading
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Reading plans (optional seeding from JSON)
create table if not exists public.reading_plans (
  id bigint generated always as identity primary key,
  slug text unique not null,
  title text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.reading_plan_days (
  id bigint generated always as identity primary key,
  plan_id bigint references public.reading_plans(id) on delete cascade,
  day_number int not null,
  passages text[] not null
);

create index if not exists idx_reading_plan_days_plan_day on public.reading_plan_days(plan_id, day_number);

create table if not exists public.user_reading_plans (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  plan_id bigint references public.reading_plans(id) on delete cascade,
  started_at timestamptz default now(),
  unique(user_id, plan_id)
);

create index if not exists idx_user_reading_plans_user on public.user_reading_plans(user_id);

alter table public.reading_plans enable row level security;
alter table public.reading_plan_days enable row level security;
alter table public.user_reading_plans enable row level security;

do $$ begin
  create policy "reading_plans_public" on public.reading_plans
    for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "reading_plan_days_public" on public.reading_plan_days
    for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "user_reading_plans_own" on public.user_reading_plans
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Announcements
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null,
  priority text default 'normal',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_announcements_created_at on public.announcements(created_at desc);

alter table public.announcements enable row level security;
do $$ begin
  create policy "announcements_read_all" on public.announcements
    for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "announcements_insert_admin" on public.announcements
    for insert with check (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','super_admin')
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "announcements_update_admin" on public.announcements
    for update using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','super_admin')
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "announcements_delete_admin" on public.announcements
    for delete using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','super_admin')
      )
    );
exception when duplicate_object then null; end $$;

-- Kids uploads metadata (files stored in storage bucket)
create table if not exists public.kids_uploads (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  file_path text not null,
  kind text,
  approved boolean default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Ensure columns exist if table was created earlier
alter table public.kids_uploads
  add column if not exists approved boolean default false,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

create index if not exists idx_kids_uploads_user on public.kids_uploads(user_id, created_at desc);
create index if not exists idx_kids_uploads_approved on public.kids_uploads(approved, created_at desc);

alter table public.kids_uploads enable row level security;
do $$ begin
  create policy "kids_uploads_own_read" on public.kids_uploads
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "kids_uploads_own_write" on public.kids_uploads
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "kids_uploads_admin_update" on public.kids_uploads
    for update using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','super_admin')
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "kids_uploads_admin_delete" on public.kids_uploads
    for delete using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','super_admin')
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "kids_uploads_public_read_approved" on public.kids_uploads
    for select using (approved = true);
exception when duplicate_object then null; end $$;

-- Quizzes
create table if not exists public.quiz_questions (
  id bigint generated always as identity primary key,
  question text not null,
  answers jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.quiz_scores (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  quiz_id bigint references public.quiz_questions(id) on delete cascade,
  score int not null,
  created_at timestamptz default now()
);

create index if not exists idx_quiz_scores_user_quiz on public.quiz_scores(user_id, quiz_id);

alter table public.quiz_questions enable row level security;
alter table public.quiz_scores enable row level security;
do $$ begin
  create policy "quiz_questions_public" on public.quiz_questions
    for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "quiz_scores_own" on public.quiz_scores
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Web push subscriptions (for browser notifications)
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
do $$ begin
  create policy "push_subscriptions_own" on public.push_subscriptions
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Storage bucket for kids zone
insert into storage.buckets (id, name, public)
  values ('kids-zone','kids-zone', false)
  on conflict (id) do nothing;

-- Ensure bucket is private
do $$ begin
  update storage.buckets set public = false where id = 'kids-zone';
exception when insufficient_privilege then null; end $$;

-- Only allow select on approved files or own uploads; admins can read all
do $$ begin
  create policy "kids_zone_read_approved_or_own" on storage.objects
    for select using (
      bucket_id = 'kids-zone'
      and (
        owner = auth.uid()
        or coalesce(metadata->>'approved','false') = 'true'
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('admin','super_admin')
        )
      )
    );
exception
  when duplicate_object then null;
  when insufficient_privilege then null;
end $$;

-- Authenticated users can upload; default metadata should mark approved=false
do $$ begin
  create policy "kids_zone_user_write" on storage.objects
    for insert with check (
      bucket_id = 'kids-zone' and auth.role() = 'authenticated'
      and coalesce(metadata->>'approved','false') = 'false'
    );
exception
  when duplicate_object then null;
  when insufficient_privilege then null;
end $$;

-- Only admins can delete objects
do $$ begin
  create policy "kids_zone_admin_delete" on storage.objects
    for delete using (
      bucket_id = 'kids-zone'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','super_admin')
      )
    );
exception
  when duplicate_object then null;
  when insufficient_privilege then null;
end $$;

-- Admins can update metadata (used when marking uploads approved)
do $$ begin
  create policy "kids_zone_admin_update" on storage.objects
    for update using (
      bucket_id = 'kids-zone'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','super_admin')
      )
    ) with check (
      bucket_id = 'kids-zone'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','super_admin')
      )
    );
exception
  when duplicate_object then null;
  when insufficient_privilege then null;
end $$;

-- Helpful view: missed days for current year
create or replace view public.missed_days as
select u.id as user_id,
       d::date as reading_date
from auth.users u
cross join generate_series(date_trunc('year', now())::date, now()::date, '1 day') d
where not exists (
  select 1 from public.bible_reading br
  where br.user_id = u.id and br.reading_date = d and br.completed
);

comment on view public.missed_days is 'Derived list of dates each user has not completed for the current year.';
