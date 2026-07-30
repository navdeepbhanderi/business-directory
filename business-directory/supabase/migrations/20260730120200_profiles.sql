-- ===========================================================================
-- Profiles, role custody, and the access-token hook.
--
-- The single most important rule in the schema: a user cannot change their own
-- role. Everything else in the authorization model rests on that.
-- ===========================================================================

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  avatar_url   text,
  role         public.user_role not null default 'user',
  locale       text not null default 'en',
  phone        text,
  banned_at    timestamptz,
  ban_reason   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profiles_role_not_guest check (role <> 'guest'),
  constraint profiles_ban_reason_present check (
    (banned_at is null) = (ban_reason is null)
  )
);

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Role escalation guard
--
-- RLS can decide *which rows* a caller may update, but not *which columns*.
-- A policy allowing a user to update their own profile would also let them set
-- role = 'admin'. This trigger closes that: privileged columns can only change
-- when the caller is an admin, or when the change comes from a SECURITY DEFINER
-- routine running as the table owner (claim approval, admin actions).
-- ---------------------------------------------------------------------------

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  -- Trusted server-side paths run as the owner with no JWT present.
  if current_setting('request.jwt.claims', true) is null
     or current_setting('request.jwt.claims', true) = '' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'not authorized to change role'
      using errcode = '42501';
  end if;

  if new.banned_at is distinct from old.banned_at
     or new.ban_reason is distinct from old.ban_reason then
    raise exception 'not authorized to change ban status'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- Provision a profile for every new auth user.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Custom access token hook — mirrors `role` into the JWT as `user_role`.
--
-- This is what lets policies read the caller's role without touching the
-- profiles table, which is what makes the whole policy set non-recursive.
-- Registered in supabase/config.toml under [auth.hook.custom_access_token].
-- ---------------------------------------------------------------------------

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  claims    jsonb;
  user_role public.user_role;
begin
  select role into user_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(
    claims,
    '{user_role}',
    to_jsonb(coalesce(user_role, 'user'::public.user_role)::text)
  );

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on public.profiles to supabase_auth_admin;

-- ===========================================================================
-- RLS
-- ===========================================================================

alter table public.profiles enable row level security;

-- Reviews and lists show their author, so profiles are publicly readable.
-- Nothing sensitive lives here: email and auth data stay in auth.users.
create policy profiles_select_all on public.profiles
  for select using (true);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- The auth hook runs as supabase_auth_admin and must read roles.
create policy profiles_auth_admin_read on public.profiles
  for select to supabase_auth_admin using (true);
