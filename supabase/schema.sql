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

create index if not exists idx_career_profiles_session on career_profiles(session_id);
create index if not exists idx_career_profiles_user on career_profiles(user_id);
create index if not exists idx_resumes_profile on resumes(career_profile_id);
create index if not exists idx_resumes_session on resumes(session_id);
create index if not exists idx_resumes_user on resumes(user_id);
create index if not exists idx_resume_versions_resume on resume_versions(resume_id, created_at);

-- Auth is OPTIONAL by design — guests can build and download a resume with
-- no account at all. Signing in is offered (never forced) as a way to save
-- resumes for different roles and come back to them later. All writes and
-- reads go through the service-role API routes (see lib/supabase.ts /
-- app/api/*), which is the real enforcement boundary: /api/my-resumes only
-- ever returns rows matching the authenticated user's own id. RLS below is
-- deliberately left permissive to match that (service role bypasses RLS
-- anyway) — tighten it if you ever query these tables directly from the
-- browser with the anon key instead of through the API routes.
alter table career_profiles enable row level security;
alter table resumes enable row level security;
alter table resume_versions enable row level security;

create policy "demo_mode_all_access_profiles" on career_profiles
  for all using (true) with check (true);

create policy "demo_mode_all_access_resumes" on resumes
  for all using (true) with check (true);

create policy "demo_mode_all_access_resume_versions" on resume_versions
  for all using (true) with check (true);

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
-- create policy "demo_mode_all_access_resume_versions" on resume_versions
--   for all using (true) with check (true);
-- create index if not exists idx_career_profiles_user on career_profiles(user_id);
-- create index if not exists idx_resumes_session on resumes(session_id);
-- create index if not exists idx_resumes_user on resumes(user_id);
-- create index if not exists idx_resume_versions_resume on resume_versions(resume_id, created_at);
