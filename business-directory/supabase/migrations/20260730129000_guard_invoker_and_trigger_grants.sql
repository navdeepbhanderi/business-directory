-- ===========================================================================
-- Two corrections to the previous migration.
--
-- 1. The column guards were SECURITY DEFINER *and* inspected `current_user`.
--    Inside a SECURITY DEFINER function `current_user` is always the owner, so
--    the check matched every caller and the guards exempted everyone — briefly
--    letting a user set their own role and an owner verify their own listing.
--
--    They must be SECURITY INVOKER. Then `current_user` is the role that issued
--    the statement: `authenticated` for a client, the owner when the statement
--    comes from one of our own SECURITY DEFINER routines such as
--    refresh_business_rating(). That is exactly the distinction the guard needs,
--    and the guards need no elevated privilege of their own — they only compare
--    OLD and NEW and raise.
--
-- 2. Every trigger function still carried Postgres's default PUBLIC execute
--    grant. Triggers fire regardless of grants, so none of them needs one, and a
--    directly callable trigger function is its own hazard — handle_new_user()
--    with a crafted argument being the obvious example.
-- ===========================================================================

create or replace function public.guard_business_owner_columns()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.verified     is distinct from old.verified
  or new.status       is distinct from old.status
  or new.owner_id     is distinct from old.owner_id
  or new.rating       is distinct from old.rating
  or new.review_count is distinct from old.review_count
  or new.market_code  is distinct from old.market_code
  or new.slug         is distinct from old.slug then
    raise exception 'not authorized to change privileged business columns'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
begin
  if current_user not in ('anon', 'authenticated') then
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

-- Trigger functions: no client ever calls these directly.
revoke execute on function public.guard_business_owner_columns() from public;
revoke execute on function public.guard_profile_privileges() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.refresh_business_rating() from public;
revoke execute on function public.review_replies_check_target() from public;
revoke execute on function public.reviews_enforce_rate_limit() from public;
revoke execute on function public.reviews_reject_self_review() from public;
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.businesses_refresh_search_vector() from public;
revoke execute on function public.business_categories_touch_parent() from public;
