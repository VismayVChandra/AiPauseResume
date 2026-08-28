-- PauseResume — schema (optional auth: guests work with no login; anyone
-- can choose to sign in later to save resumes across sessions/devices)
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "uuid-ossp";

-- Raw, un-tailored profile extracted from a LinkedIn PDF (or pasted text / manual entry).
-- One profile can later be used to generate resumes for multiple target roles.
create table if not exists career_profiles (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,                 -- anonymous per-browser identifier (always set)
  user_id uuid references auth.users(id),   -- set only if/when the person chooses to sign in — nullable
  source text not null default 'pdf',        -- 'pdf' | 'pasted_text' | 'manual' | 'demo'
  raw_text text,                             -- original extracted text, for re-processing/debugging
  profile_json jsonb not null,               -- structured neutral profile (see types/resume.ts: RawProfile)
  created_at timestamptz not null default now()
);

-- A tailored resume generated from a career_profile + a target role.
create table if not exists resumes (
  id uuid primary key default uuid_generate_v4(),
  career_profile_id uuid references career_profiles(id) on delete cascade,
  session_id text not null,                 -- carried alongside career_profile_id so claiming doesn't need a join
  user_id uuid references auth.users(id),   -- set only once the person signs in and claims their guest resumes
  target_role text not null,                 -- what the user typed in step 1
  resume_json jsonb not null,                -- structured tailored resume (see types/resume.ts: TailoredResume)
  cover_letter_json jsonb,                   -- optional generated cover letter (see types/resume.ts: CoverLetter)
  is_public boolean not null default false,  -- opt-in flag for the read-only /r/[id] share page — off by default
  application_status text not null default 'not_applied', -- 'not_applied' | 'applied' | 'interviewing' | 'offer' | 'rejected'
  company_name text,                         -- optional, for the application tracker on My Resumes
  applied_at date,
  tracker_notes text,
  persona_label text,                        -- optional user-given name for this variant (e.g. "IC Engineer" vs "Eng Manager"), distinct from target_role
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Snapshots of resume_json taken at meaningful checkpoints (initial tailor,
-- right before an "Improve My Score" rewrite is applied) so a user can see
-- what changed and revert to an earlier version if a rewrite made things
-- worse rather than better. Deliberately not snapshotting every autosave
-- edit — that would be one row per keystroke pause, not a useful history.
create table if not exists resume_versions (
  id uuid primary key default uuid_generate_v4(),
  resume_id uuid not null references resumes(id) on delete cascade,
  label text not null,                       -- e.g. 'Initial tailor', 'Before AI improvement'
  resume_json jsonb not null,
  created_at timestamptz not null default now()
);

-- One row per score-resume run for a given resume, so the score screen can
-- chart whether edits are actually moving the needle over time instead of
-- only ever comparing the immediate before/after of a single "Improve My
-- Score" pass. Written on every successful score, not just improvements.
create table if not exists score_history (
  id uuid primary key default uuid_generate_v4(),
  resume_id uuid not null references resumes(id) on delete cascade,
  overall_score int not null,
  ats_score int not null,
  role_match_score int not null,
  skills_match_score int not null,
  created_at timestamptz not null default now()
);

-- Reviewer/mentor comments on a resume, left from the read-only /r/[id]
-- share page. Commenting requires the resume to be public (see is_public
-- above); no login is required to leave one — a typed display name is
-- all the identity there is, so there's no verification that a name
-- actually belongs to whoever typed it. Only the resume's owner (via the
-- same session_id/user_id check as every other resume-scoped route) can
-- resolve or delete a comment; a commenter can't edit or remove their own
-- after posting, since there's no reliable way to prove it was them.
create table if not exists resume_comments (
  id uuid primary key default uuid_generate_v4(),
  resume_id uuid not null references resumes(id) on delete cascade,
  section text not null,               -- 'general' | 'summary' | 'experience' | 'education' | 'projects' | 'skills'
  commenter_name text not null,
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Backs a simple fixed-window rate limit on the AI-calling API routes
-- (see lib/rate-limit.ts) — keyed by caller IP, reset each window. Uses
-- Supabase rather than a separate service (Redis/Upstash) since this app
-- has no other infra and the traffic volume doesn't need anything fancier.
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null default 0
);

-- Atomic check-and-increment in one round trip: resets the counter if the
-- window has expired, otherwise increments it, and reports whether the
-- caller is still under the limit. Doing this in SQL (not read-then-write
-- from the API route) avoids a race between concurrent requests from the
-- same caller landing in the same window.
create or replace function increment_rate_limit(p_key text, p_window_seconds int, p_limit int)
returns boolean
language plpgsql
as $$
declare
  v_count int;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case
          when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
            then 1
          else rate_limits.count + 1
        end,
        window_start = case
          when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
            then now()
          else rate_limits.window_start
        end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

create index if not exists idx_career_profiles_session on career_profiles(session_id);
create index if not exists idx_career_profiles_user on career_profiles(user_id);
create index if not exists idx_resumes_profile on resumes(career_profile_id);
create index if not exists idx_resumes_session on resumes(session_id);
create index if not exists idx_resumes_user on resumes(user_id);
create index if not exists idx_resume_versions_resume on resume_versions(resume_id, created_at);
create index if not exists idx_score_history_resume on score_history(resume_id, created_at);
create index if not exists idx_resume_comments_resume on resume_comments(resume_id, created_at);

-- Auth is OPTIONAL by design — guests can build and download a resume with
-- no account at all. Signing in is offered (never forced) as a way to save
-- resumes for different roles and come back to them later. All writes and
-- reads go through the service-role API routes (see lib/supabase.ts /
-- app/api/*, and lib/resume-access.ts for per-resume ownership checks),
-- which are the real enforcement boundary — the service role bypasses RLS
-- entirely, so these policies are about the OTHER path in: anyone who
-- extracts NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY from
-- the shipped browser bundle can call Supabase's REST API directly with
-- them. RLS is the only thing standing between that and reading/writing
-- every row in these tables — no policy here means no anon/authenticated
-- access at all, which is correct: the app never legitimately needs the
-- anon key to touch these tables directly.
alter table career_profiles enable row level security;
alter table resumes enable row level security;
alter table resume_versions enable row level security;
alter table rate_limits enable row level security;
alter table score_history enable row level security;
alter table resume_comments enable row level security;

-- Migrating an existing deployment? Run just this block against your
-- existing tables (uuid-ossp/tables above are guarded with IF NOT EXISTS,
-- so re-running the whole file is also safe):
--
-- alter table career_profiles add column if not exists user_id uuid references auth.users(id);
-- alter table resumes add column if not exists user_id uuid references auth.users(id);
-- alter table resumes add column if not exists session_id text;
-- alter table resumes add column if not exists cover_letter_json jsonb;
-- alter table resumes add column if not exists is_public boolean not null default false;
-- alter table resumes add column if not exists application_status text not null default 'not_applied';
-- alter table resumes add column if not exists company_name text;
-- alter table resumes add column if not exists applied_at date;
-- alter table resumes add column if not exists tracker_notes text;
-- alter table resumes add column if not exists persona_label text;
-- update resumes r set session_id = cp.session_id
--   from career_profiles cp where cp.id = r.career_profile_id and r.session_id is null;
-- alter table resumes alter column session_id set not null;
-- create table if not exists resume_versions (
--   id uuid primary key default uuid_generate_v4(),
--   resume_id uuid not null references resumes(id) on delete cascade,
--   label text not null,
--   resume_json jsonb not null,
--   created_at timestamptz not null default now()
-- );
-- alter table resume_versions enable row level security;
-- create index if not exists idx_career_profiles_user on career_profiles(user_id);
-- create index if not exists idx_resumes_session on resumes(session_id);
-- create index if not exists idx_resumes_user on resumes(user_id);
-- create index if not exists idx_resume_versions_resume on resume_versions(resume_id, created_at);
--
-- Security hardening — run this if your project still has the old
-- permissive RLS policies (from before this app added per-resume
-- ownership checks in the API routes themselves). The anon key is public
-- (it's in the shipped browser bundle), so a "using (true)" policy means
-- anyone can read/write every row via Supabase's REST API directly,
-- bypassing the app entirely:
-- drop policy if exists "demo_mode_all_access_profiles" on career_profiles;
-- drop policy if exists "demo_mode_all_access_resumes" on resumes;
-- drop policy if exists "demo_mode_all_access_resume_versions" on resume_versions;
--
-- Rate limiting on the AI-calling routes (see lib/rate-limit.ts):
-- create table if not exists rate_limits (
--   key text primary key,
--   window_start timestamptz not null,
--   count int not null default 0
-- );
-- alter table rate_limits enable row level security;
-- create or replace function increment_rate_limit(p_key text, p_window_seconds int, p_limit int)
-- returns boolean
-- language plpgsql
-- as $$
-- declare
--   v_count int;
-- begin
--   insert into rate_limits (key, window_start, count)
--   values (p_key, now(), 1)
--   on conflict (key) do update
--     set count = case
--           when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
--             then 1
--           else rate_limits.count + 1
--         end,
--         window_start = case
--           when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
--             then now()
--           else rate_limits.window_start
--         end
--   returning count into v_count;
--   return v_count <= p_limit;
-- end;
-- $$;
-- grant select, insert, update on public.rate_limits to service_role;
--
-- Score history (see components/ScoreStep.tsx / app/api/resumes/[id]/score-history):
-- create table if not exists score_history (
--   id uuid primary key default uuid_generate_v4(),
--   resume_id uuid not null references resumes(id) on delete cascade,
--   overall_score int not null,
--   ats_score int not null,
--   role_match_score int not null,
--   skills_match_score int not null,
--   created_at timestamptz not null default now()
-- );
-- alter table score_history enable row level security;
-- create index if not exists idx_score_history_resume on score_history(resume_id, created_at);
-- grant select, insert on public.score_history to service_role;
--
-- Reviewer/mentor comments (see app/api/resumes/[id]/comments and
-- components/genforge/resume-comments.tsx):
-- create table if not exists resume_comments (
--   id uuid primary key default uuid_generate_v4(),
--   resume_id uuid not null references resumes(id) on delete cascade,
--   section text not null,
--   commenter_name text not null,
--   body text not null,
--   resolved boolean not null default false,
--   created_at timestamptz not null default now()
-- );
-- alter table resume_comments enable row level security;
-- create index if not exists idx_resume_comments_resume on resume_comments(resume_id, created_at);
-- grant select, insert, update, delete on public.resume_comments to service_role;
