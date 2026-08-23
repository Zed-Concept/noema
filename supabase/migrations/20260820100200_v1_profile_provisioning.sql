-- Unit C (CTRL-004), Phase A — profiles provisioning: every new auth user
-- gets a profiles row, created by trigger at signup. Part of the reviewed
-- auth surface (RED lane, approved for this unit's scope).

-- SECURITY DEFINER with an empty pinned search_path: the function runs as
-- its owner (postgres, the migration role) with every reference
-- schema-qualified, so a compromised search_path cannot redirect the
-- insert. Direct invocation is impossible by construction (trigger-typed
-- return); no EXECUTE management is needed. display_name and locale take
-- their column defaults (null / 'en').
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

-- Because profiles has FORCE row level security, the definer insert above
-- is policy-checked as postgres — a role the owner-only authenticated
-- policies never match (and at signup time auth.uid() is null anyway).
-- This insert-only policy exists solely to admit that provisioning path.
-- It widens nothing client-facing: postgres is not a Data API role, is not
-- reachable through PostgREST, and already administers this table.
create policy profiles_provisioning_insert on public.profiles
  for insert to postgres
  with check (true);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
