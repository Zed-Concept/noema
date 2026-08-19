-- Unit C (CTRL-004), Phase A — RLS v1: owner-only access on all three
-- tables. ENABLE + FORCE per the dispatch; FORCE means even the table owner
-- (postgres) is policy-checked, so the provisioning migration carries its
-- own narrowly-scoped policy. No anon policies exist: with RLS enabled,
-- policy absence is denial. No sharing model in v1.

-- The staging project post-dates Supabase's auto-expose default change:
-- new public-schema entities carry no privileges for the Data API roles
-- until granted. These grants are therefore load-bearing, not decorative.
-- authenticated only — anon and service_role deliberately receive nothing
-- in v1 (service_role grants arrive with the first server-side unit that
-- needs them).
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.captures to authenticated;
grant select, insert, update, delete on table public.transcripts to authenticated;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.captures enable row level security;
alter table public.captures force row level security;
alter table public.transcripts enable row level security;
alter table public.transcripts force row level security;

-- auth.uid() is wrapped in a scalar subquery in every predicate so the
-- planner evaluates it once per statement (initplan), not per row.

-- profiles: keyed on id (the profile row IS the user's row).
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);

-- captures: keyed on user_id.
create policy captures_select_own on public.captures
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy captures_insert_own on public.captures
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy captures_update_own on public.captures
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy captures_delete_own on public.captures
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- transcripts: keyed on user_id. The composite FK in the core-schema
-- migration guarantees user_id matches the parent capture's user_id, so
-- owner-only on transcripts.user_id is owner-only on the capture too.
create policy transcripts_select_own on public.transcripts
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy transcripts_insert_own on public.transcripts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy transcripts_update_own on public.transcripts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy transcripts_delete_own on public.transcripts
  for delete to authenticated
  using ((select auth.uid()) = user_id);
