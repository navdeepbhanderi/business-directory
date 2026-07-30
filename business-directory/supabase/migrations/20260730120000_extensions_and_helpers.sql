-- ===========================================================================
-- Extensions, enums, and the helpers every later migration depends on.
-- ===========================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- `guest` is NOT a stored role. Unauthenticated visitors are Postgres `anon`,
-- and their capabilities are anon RLS policies. It exists only as the return
-- value of auth_role() for callers with no session, so policy expressions do
-- not have to special-case null.
create type public.user_role as enum ('guest', 'user', 'owner', 'admin');

create type public.business_status as enum (
  'draft', 'pending', 'published', 'rejected', 'suspended'
);

create type public.review_status as enum ('published', 'flagged', 'removed');

create type public.claim_status as enum (
  'pending', 'approved', 'rejected', 'withdrawn'
);

create type public.report_status as enum ('pending', 'dismissed', 'actioned');

create type public.list_visibility as enum ('private', 'unlisted', 'public');

create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled'
);

create type public.business_event_type as enum (
  'view', 'phone_click', 'website_click', 'direction_click', 'save', 'share'
);

-- ---------------------------------------------------------------------------
-- Identity helpers
--
-- The recursion trap: a policy on `businesses` that reads `profiles` to check
-- the caller's role will re-enter `profiles`' own policies, which may in turn
-- read `profiles`. Postgres detects this and errors.
--
-- The fix is to read the role from a JWT claim, populated by the custom access
-- token hook in the profiles migration. auth_role() falls back to a
-- SECURITY DEFINER lookup for sessions whose token predates the hook — and
-- because SECURITY DEFINER runs as the owner, that lookup bypasses RLS and so
-- cannot recurse either.
-- ---------------------------------------------------------------------------

create or replace function public.auth_role()
returns public.user_role
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  raw_claims text;
  claimed    text;
  found      public.user_role;
begin
  raw_claims := nullif(current_setting('request.jwt.claims', true), '');

  if raw_claims is not null then
    claimed := raw_claims::jsonb ->> 'user_role';
    if claimed is not null and claimed <> '' then
      return claimed::public.user_role;
    end if;
  end if;

  if auth.uid() is null then
    return 'guest'::public.user_role;
  end if;

  select p.role into found from public.profiles p where p.id = auth.uid();
  return coalesce(found, 'user'::public.user_role);
exception
  when invalid_text_representation or undefined_table then
    -- Unknown role string, or profiles not yet created during migration.
    return case when auth.uid() is null then 'guest' else 'user' end::public.user_role;
end;
$$;

comment on function public.auth_role() is
  'Role of the current caller. Reads the user_role JWT claim, falling back to a '
  'SECURITY DEFINER profile lookup. Never recurses into RLS.';

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$ select public.auth_role() = 'admin'::public.user_role $$;

-- ---------------------------------------------------------------------------
-- Shared triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Slugs are part of the public URL surface, so they must be stable, unique,
-- and ASCII. Non-Latin names transliterate poorly in Postgres, so callers pass
-- an explicit slug; this only normalises what they pass.
create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = extensions, pg_temp
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  )
$$;
