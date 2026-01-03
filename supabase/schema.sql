-- Supabase schema for Church Bible App (from scratch)
-- Run in Supabase SQL editor. Creates tables, policies, functions, and storage config.

-- === Profiles (Auth-managed users) ===
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'member',
  created_at timestamptz default now()
);

-- Admin helper: only gpgvictor@gmail.com is app admin
do $$ begin
  create or replace function public.is_app_admin()
    returns boolean
    language sql
    security definer
  as $is_admin$
    select exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and lower(u.email) = 'gpgvictor@gmail.com'
    );
  $is_admin$;
exception when duplicate_function then null; end $$;
do $$ begin
  grant execute on function public.is_app_admin() to authenticated;
exception when undefined_object then null; end $$;

alter table public.profiles enable row level security;
do $$ begin
  create policy profiles_select_own on public.profiles
    for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy profiles_upsert_own on public.profiles
    for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy profiles_update_own on public.profiles
    for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy profiles_admin_manage on public.profiles
    for all using (public.is_app_admin()) with check (public.is_app_admin());
exception when duplicate_object then null; end $$;

-- === Bible reading completion by date ===
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
  create policy bible_reading_own on public.bible_reading
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- === Reading plans (metadata + per-day passages) ===
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
  create policy reading_plans_public on public.reading_plans for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy reading_plan_days_public on public.reading_plan_days for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy user_reading_plans_own on public.user_reading_plans
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- === Reading progress per user + plan (per-chapter) ===
drop view if exists public.reading_progress_summary;
drop function if exists public.mark_chapter_progress(text,text,int,boolean);
drop table if exists public.reading_progress cascade;

create table if not exists public.reading_progress (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  plan_name text not null,
  completed_days jsonb default '[]'::jsonb,
  completed_chapters jsonb default '{}'::jsonb,
  updated_at timestamptz default now(),
  unique(user_id, plan_name)
);
create index if not exists idx_reading_progress_user on public.reading_progress(user_id);
create index if not exists idx_reading_progress_completed_chapters on public.reading_progress using gin (completed_chapters);
alter table public.reading_progress enable row level security;
do $$ begin
  create policy reading_progress_user_own on public.reading_progress
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- View: per-user/per-plan chapter counts
create or replace view public.reading_progress_summary as
select
  rp.user_id,
  rp.plan_name,
  coalesce((select count(*) from jsonb_each_text(rp.completed_chapters)), 0) as chapters_read,
  1189 as total_chapters,
  rp.updated_at
from public.reading_progress rp;

-- Function: mark_chapter_progress(plan_name, book, chapter, completed)
do $$ begin
  create or replace function public.mark_chapter_progress(
    p_plan_name text,
    p_book text,
    p_chapter int,
    p_completed boolean
  ) returns void language plpgsql security definer as $mark$
  declare
    p_key text := concat(p_book, ':', p_chapter::text);
  begin
    insert into public.reading_progress (user_id, plan_name, completed_chapters, updated_at)
    values (auth.uid(), p_plan_name, jsonb_build_object(p_key, to_jsonb(now())), now())
    on conflict (user_id, plan_name) do update
    set completed_chapters = (
      case when p_completed then
        public.reading_progress.completed_chapters || jsonb_build_object(p_key, to_jsonb(now()))
      else
        public.reading_progress.completed_chapters - p_key
      end
    ),
    updated_at = now();
  end;
  $mark$;
exception when duplicate_object then null; end $$;
do $$ begin
  grant execute on function public.mark_chapter_progress(text,text,int,boolean) to authenticated;
exception when undefined_object then null; end $$;

-- === Announcements ===
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
  create policy announcements_read_all on public.announcements for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy announcements_insert_admin on public.announcements for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy announcements_update_admin on public.announcements for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy announcements_delete_admin on public.announcements for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  );
exception when duplicate_object then null; end $$;

-- === Kids uploads metadata ===
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
create index if not exists idx_kids_uploads_user on public.kids_uploads(user_id, created_at desc);
create index if not exists idx_kids_uploads_approved on public.kids_uploads(approved, created_at desc);
alter table public.kids_uploads enable row level security;
do $$ begin
  create policy kids_uploads_own_read on public.kids_uploads for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy kids_uploads_own_write on public.kids_uploads for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy kids_uploads_admin_update on public.kids_uploads for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy kids_uploads_admin_delete on public.kids_uploads for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy kids_uploads_public_read_approved on public.kids_uploads for select using (approved = true);
exception when duplicate_object then null; end $$;

-- === Quizzes ===
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
  create policy quiz_questions_public on public.quiz_questions for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy quiz_scores_own on public.quiz_scores using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- === Web push subscriptions ===
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
do $$ begin
  create policy push_subscriptions_own on public.push_subscriptions
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- === Verse likes ===
create table if not exists public.verse_likes (
  id text primary key,
  likes bigint default 0,
  updated_at timestamptz default now()
);
do $$ begin
  create or replace function public.increment_verse_like(p_id text)
    returns bigint language plpgsql security definer as $vlike$
  declare
    new_count bigint;
  begin
    insert into public.verse_likes (id, likes, updated_at)
    values (p_id, 1, now())
    on conflict (id) do update set likes = public.verse_likes.likes + 1, updated_at = now()
    returning likes into new_count;
    return new_count;
  end;
  $vlike$;
exception when duplicate_object then null; end $$;
do $$ begin
  grant execute on function public.increment_verse_like(text) to authenticated;
exception when undefined_object then null; end $$;
do $$ begin
  create or replace function public.get_verse_likes(p_id text)
    returns table(id text, likes bigint) language sql security definer as $vlike2$
    select id, coalesce(likes,0) from public.verse_likes where id = $1;
  $vlike2$;
exception when duplicate_object then null; end $$;
do $$ begin
  grant execute on function public.get_verse_likes(text) to authenticated;
exception when undefined_object then null; end $$;

-- === Storage: kids-zone bucket (policies configured in Supabase dashboard) ===
insert into storage.buckets (id, name, public)
  values ('kids-zone','kids-zone', false)
  on conflict (id) do nothing;

-- === Helpful view: missed days for current year ===
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
