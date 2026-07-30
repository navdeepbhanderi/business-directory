-- ===========================================================================
-- Fix the column guards so trigger-maintained columns can be maintained.
--
-- THE BUG: posting a review as a signed-in user failed outright.
--
-- `refresh_business_rating()` updates businesses.rating and review_count, and
-- `guard_business_owner_columns()` rejects any change to those columns. The guard
-- exempted callers with no JWT, which covered seeding and admin tooling — but a
-- trigger firing inside a user's request still has that user's JWT in the
-- transaction, so the guard blocked its own maintenance trigger.
--
-- The seed never caught it (no JWT), and the Phase 1 policy tests never caught it
-- because every review-insert assertion there was a *rejection* test, so the
-- rating trigger never fired on a successful authenticated insert.
--
-- THE FIX: gate on `current_user` instead of on JWT presence.
--
-- A SECURITY DEFINER function executes as its owner, so inside
-- refresh_business_rating() `current_user` is the table owner. A user updating a
-- listing through PostgREST arrives as `authenticated` (or `anon`). That
-- distinction is exactly the one the guard needs, and unlike the JWT check it
-- cannot be confused by a trigger running inside a user's transaction.
-- ===========================================================================

create or replace function public.guard_business_owner_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Only client roles are guarded. Anything else is either a SECURITY DEFINER
  -- routine we wrote (rating maintenance, claim approval) or direct operator
  -- access, neither of which is the threat this guard exists for.
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

-- Same correction for the profile guard. It has the same latent flaw: a future
-- SECURITY DEFINER routine that touches profiles.role — claim approval already
-- does — would be blocked when called inside a user's request.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
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
