-- ===========================================================================
-- Avatar storage.
--
-- One public bucket, but write access is scoped by path: a user may only touch
-- objects under a folder named after their own uid. That means the policy is
-- enforced by Postgres on every upload rather than by whatever the client
-- happens to send as a filename.
--
-- Public read is deliberate — avatars appear beside reviews, which are public.
-- Nothing private is ever stored here.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true,
  2 * 1024 * 1024,                     -- 2 MB is generous for an avatar
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

-- `storage.foldername(name)[1]` is the first path segment. Requiring it to equal
-- the caller's uid is what stops one user overwriting another's avatar.
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===========================================================================
-- Account deletion.
--
-- Deleting the auth user cascades to profiles, and from there to favourites,
-- lists, and reviews. Exposed as a SECURITY DEFINER function so a user can
-- close their own account without the client ever holding admin credentials.
-- ===========================================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Owned listings are not deleted: other people's reviews are attached to them
  -- and a business is not personal data. They are unclaimed instead, which
  -- returns them to the moderation queue.
  update public.businesses
     set owner_id = null, verified = false
   where owner_id = uid;

  perform public.record_audit('account.delete', 'profile', uid::text, null, null);

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
