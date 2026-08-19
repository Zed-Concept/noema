-- Unit C (CTRL-004), Phase A — storage: private bucket captures-audio with
-- owner-only object policies scoped to a {user_id}/ leading path segment.

-- Plain insert, deliberately not idempotent: if a bucket with this id
-- already exists (it should not — none has been created on staging), the
-- apply fails loudly instead of silently keeping whatever configuration
-- the existing bucket has. public = false is the point of this row.
insert into storage.buckets (id, name, public)
values ('captures-audio', 'captures-audio', false);

-- storage.objects is platform-managed: RLS is already enabled on it by
-- Supabase, so this migration adds policies only. Object keys must look
-- like {user_id}/... — storage.foldername(name) returns the path segments
-- above the filename, so [1] is the leading segment; for a key with no
-- folder it is null and every predicate below fails closed. auth.uid() is
-- wrapped for per-statement evaluation, then cast to text to compare with
-- the path segment.

create policy captures_audio_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'captures-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy captures_audio_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'captures-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy captures_audio_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'captures-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'captures-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy captures_audio_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'captures-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
