-- Unit C (CTRL-004), Phase A — v1 core schema: profiles, captures, transcripts.
-- Entity scope is owner-ruled and enumerated in the Unit C dispatch; nothing
-- beyond it. Application to staging is owner-executed (ruling 10); this file
-- is authored in-repo and never applied by a builder.

-- Shared updated_at maintenance. SECURITY INVOKER (default); search_path
-- pinned empty so only pg_catalog resolves. Direct invocation is impossible
-- by construction: Postgres rejects calling trigger-returning functions
-- outside trigger context.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- One row per auth user; provisioned by trigger (see the provisioning
-- migration). PK doubles as the FK to auth.users, so a profile cannot
-- outlive or predate its user.
create table public.profiles (
  id uuid primary key
    constraint profiles_id_fkey references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'en'
    constraint profiles_locale_check check (locale in ('en', 'ar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A recorded voice capture. status is a text state machine, v1 values only.
-- The UNIQUE (id, user_id) constraint exists solely as the referenced key
-- for transcripts' composite FK (see below); id alone remains the PK.
create table public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    constraint captures_user_id_fkey references auth.users (id) on delete cascade,
  status text not null default 'recorded'
    constraint captures_status_check
      check (status in ('recorded', 'transcribing', 'ready', 'failed')),
  audio_path text,
  duration_ms integer
    constraint captures_duration_ms_check check (duration_ms >= 0),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint captures_id_user_id_key unique (id, user_id)
);

-- One transcript row per transcription result. user_id is provably
-- consistent with the parent capture's user_id by construction: the
-- composite FK (capture_id, user_id) -> captures (id, user_id) makes a
-- transcripts row with a user_id different from its capture's user_id
-- unrepresentable, enforced by the database at all times with no trigger
-- logic. The direct FK to auth.users is kept as dispatched; both cascade.
create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null,
  user_id uuid not null
    constraint transcripts_user_id_fkey references auth.users (id) on delete cascade,
  text text not null,
  -- language/provider stay free-form text: the transcription provider is
  -- undecided (open question 1), so no enum is ruled yet.
  language text,
  provider text,
  created_at timestamptz not null default now(),
  constraint transcripts_capture_id_user_id_fkey
    foreign key (capture_id, user_id)
    references public.captures (id, user_id) on delete cascade
);

-- FK-supporting indexes: Postgres does not index referencing columns.
-- captures_id_user_id_key above already indexes the composite FK's
-- referenced side; profiles.id is the PK.
create index captures_user_id_idx on public.captures (user_id);
create index transcripts_capture_id_user_id_idx
  on public.transcripts (capture_id, user_id);
create index transcripts_user_id_idx on public.transcripts (user_id);

-- updated_at maintenance where the column exists (transcripts has none).
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger captures_set_updated_at
  before update on public.captures
  for each row execute function public.set_updated_at();
