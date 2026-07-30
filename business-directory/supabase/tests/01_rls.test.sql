-- ===========================================================================
-- Authorization tests.
--
-- Every assertion here is a claim the product makes about who can do what. The
-- negative cases matter more than the positive ones: it is easy to write a
-- policy that grants the right access and accidentally grants more.
--
-- Run with: npm run db:test
-- ===========================================================================

begin;

create extension if not exists pgtap with schema extensions;

-- Assertion count is not pinned; adding a case should not require editing a number.
select no_plan();

-- ---------------------------------------------------------------------------
-- Fixtures, chosen from seeded data so the tests exercise real rows.
-- ---------------------------------------------------------------------------

create temp table fx as
select
  (select id from public.profiles where role = 'admin' limit 1)          as admin_id,
  (select b.owner_id from public.businesses b
    where b.owner_id is not null and b.status = 'published'
    order by b.slug limit 1)                                             as owner_a,
  (select b.id from public.businesses b
    where b.owner_id is not null and b.status = 'published'
    order by b.slug limit 1)                                             as biz_a,
  (select b.owner_id from public.businesses b
    where b.owner_id is not null and b.status = 'published'
      and b.owner_id <> (select b2.owner_id from public.businesses b2
                          where b2.owner_id is not null and b2.status = 'published'
                          order by b2.slug limit 1)
    order by b.slug limit 1)                                             as owner_b,
  (select b.id from public.businesses b
    where b.owner_id is not null and b.status = 'published'
      and b.owner_id <> (select b2.owner_id from public.businesses b2
                          where b2.owner_id is not null and b2.status = 'published'
                          order by b2.slug limit 1)
    order by b.slug limit 1)                                             as biz_b,
  -- Ordered by id: unique, so the two fixtures are guaranteed to be different
  -- people. Ordering by created_at previously returned the same row twice.
  (select id from public.profiles where role = 'user' order by id limit 1)          as user_a,
  (select id from public.profiles where role = 'user' order by id offset 1 limit 1) as user_b,
  (select id from public.businesses where status = 'draft' limit 1)      as biz_draft,
  (select id from public.businesses where status = 'published' and owner_id is null limit 1) as biz_unowned;

-- Fixtures are read after switching roles, so the non-superuser roles need to
-- reach them. Temp objects vanish with the transaction regardless.
grant select on fx to anon, authenticated;

-- Identity helpers. `set local` keeps every change inside this transaction.
create or replace function pg_temp.become(p_user uuid, p_role text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'user_role', p_role)::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.become_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end $$;

create or replace function pg_temp.become_postgres()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ===========================================================================
-- Anonymous visitors
-- ===========================================================================

select pg_temp.become_anon();

select is(
  (select count(*) from public.businesses where status <> 'published')::int, 0,
  'anon sees no unpublished listing'
);

select ok(
  (select count(*) from public.businesses) > 50,
  'anon sees published listings'
);

select is(
  (select count(*) from public.reviews r
    join public.businesses b on b.id = r.business_id
    where b.status <> 'published')::int, 0,
  'anon sees no review attached to an unpublished listing'
);

select throws_ok(
  $$ insert into public.businesses (slug, name, market_code, city_id, address_line1, location)
     values ('anon-hack', 'Anon Listing', 'IN',
             (select id from public.cities limit 1), '1 Nowhere',
             extensions.ST_SetSRID(extensions.ST_MakePoint(72.5, 23.0), 4326)::extensions.geography) $$,
  '42501', null, 'anon cannot create a listing'
);

-- Stronger than an empty result: anon holds no grant at all on these tables,
-- so access fails at the privilege layer before RLS is even consulted.
select throws_ok(
  $$ select count(*) from public.audit_log $$,
  '42501', null, 'anon is denied the audit log at the grant layer'
);

select throws_ok(
  $$ select count(*) from public.favorites $$,
  '42501', null, 'anon is denied favourites at the grant layer'
);

select pg_temp.become_postgres();

-- ===========================================================================
-- Ordinary members
-- ===========================================================================

select pg_temp.become((select user_a from fx), 'user');

select throws_ok(
  format($$ update public.profiles set role = 'admin' where id = %L $$,
         (select user_a from fx)),
  '42501', null, 'a user cannot promote themselves to admin'
);

select throws_ok(
  format($$ update public.profiles set banned_at = now(), ban_reason = 'x' where id = %L $$,
         (select user_a from fx)),
  '42501', null, 'a user cannot clear or set their own ban status'
);

select lives_ok(
  format($$ update public.profiles set full_name = 'Renamed' where id = %L $$,
         (select user_a from fx)),
  'a user can edit their own display name'
);

select is(
  (select count(*) from public.profiles where id = (select user_b from fx)
     and full_name = 'Renamed')::int, 0,
  'that rename did not touch another user'
);

select is(
  (select count(*) from public.audit_log)::int, 0,
  'a non-admin cannot read the audit log'
);

-- Reviews
select throws_ok(
  format($$ insert into public.reviews (business_id, author_id, rating, body)
            values (%L, %L, 5, 'Impersonating another account here.') $$,
         (select biz_a from fx), (select user_b from fx)),
  '42501', null, 'a user cannot post a review as somebody else'
);

select throws_ok(
  format($$ insert into public.reviews (business_id, author_id, rating, body)
            values (%L, %L, 5, 'Trying to review a draft listing.') $$,
         (select biz_draft from fx), (select user_a from fx)),
  '42501', null, 'a user cannot review an unpublished listing'
);

select pg_temp.become_postgres();

-- Self-review: the author must own the business, so borrow an owner identity.
select pg_temp.become((select owner_a from fx), 'owner');

select throws_ok(
  format($$ insert into public.reviews (business_id, author_id, rating, body)
            values (%L, %L, 5, 'Reviewing my own establishment, five stars.') $$,
         (select biz_a from fx), (select owner_a from fx)),
  '42501', null, 'an owner cannot review their own business'
);

-- ===========================================================================
-- Business owners
-- ===========================================================================

select lives_ok(
  format($$ update public.businesses set description = 'Updated by the rightful owner.'
            where id = %L $$, (select biz_a from fx)),
  'an owner can edit their own listing'
);

-- The seeded listing is already verified, so flipping it *off* is the change
-- that actually reaches the guard. Setting a column to the value it already
-- holds is not a modification and correctly raises nothing.
select throws_ok(
  format($$ update public.businesses set verified = not verified where id = %L $$,
         (select biz_a from fx)),
  '42501', null, 'an owner cannot change their own verification flag'
);

select throws_ok(
  format($$ update public.businesses set status = 'suspended' where id = %L $$,
         (select biz_a from fx)),
  '42501', null, 'an owner cannot change their own listing status'
);

select throws_ok(
  format($$ update public.businesses set rating = 5.0 where id = %L $$,
         (select biz_a from fx)),
  '42501', null, 'an owner cannot write their own rating'
);

select throws_ok(
  format($$ update public.businesses set owner_id = %L where id = %L $$,
         (select user_a from fx), (select biz_a from fx)),
  '42501', null, 'an owner cannot reassign ownership'
);

-- The critical negative: one owner must not reach another owner's listing.
select is(
  (select count(*) from public.businesses
    where id = (select biz_b from fx)
      and description = 'Owner A got here')::int,
  0,
  'precondition: owner B listing is unmodified'
);

select lives_ok(
  format($$ update public.businesses set description = 'Owner A got here' where id = %L $$,
         (select biz_b from fx)),
  'the cross-owner update statement itself does not error'
);

select is(
  (select count(*) from public.businesses
    where id = (select biz_b from fx) and description = 'Owner A got here')::int,
  0,
  'but RLS matched zero rows — owner A cannot edit owner B''s listing'
);

select lives_ok(
  format($$ insert into public.business_hours (business_id, day_of_week, opens, closes)
            values (%L, 2, '08:00', '10:00') $$, (select biz_a from fx)),
  'an owner can add hours to their own listing'
);

select throws_ok(
  format($$ insert into public.business_hours (business_id, day_of_week, opens, closes)
            values (%L, 2, '08:00', '10:00') $$, (select biz_b from fx)),
  '42501', null, 'an owner cannot add hours to a listing they do not own'
);

select throws_ok(
  format($$ select public.approve_claim((select id from public.claims where status = 'pending' limit 1)) $$),
  '42501', null, 'an owner cannot approve a claim'
);

select pg_temp.become_postgres();

-- ===========================================================================
-- Saved content is private
-- ===========================================================================

select pg_temp.become((select user_a from fx), 'user');

select lives_ok(
  format($$ insert into public.favorites (user_id, business_id) values (%L, %L) $$,
         (select user_a from fx), (select biz_a from fx)),
  'a user can favourite a listing'
);

select lives_ok(
  format($$ insert into public.lists (owner_id, name, visibility) values (%L, 'Private picks', 'private') $$,
         (select user_a from fx)),
  'a user can create a private list'
);

select pg_temp.become((select user_b from fx), 'user');

select is(
  (select count(*) from public.favorites where user_id = (select user_a from fx))::int, 0,
  'another user cannot read those favourites'
);

select is(
  (select count(*) from public.lists where name = 'Private picks')::int, 0,
  'another user cannot read a private list'
);

select pg_temp.become_postgres();

-- A shared list is reachable by anyone holding the link.
insert into public.lists (owner_id, name, visibility, share_slug)
values ((select user_a from fx), 'Shared picks', 'unlisted', 'shared-picks-demo');

select pg_temp.become_anon();

select is(
  (select count(*) from public.lists where share_slug = 'shared-picks-demo')::int, 1,
  'a shared list is readable without signing in'
);

select pg_temp.become_postgres();

-- ===========================================================================
-- Administrators
-- ===========================================================================

select pg_temp.become((select admin_id from fx), 'admin');

select ok(
  (select count(*) from public.businesses where status <> 'published') > 0,
  'an admin sees unpublished listings'
);

select lives_ok(
  format($$ update public.businesses set verified = true where id = %L $$,
         (select biz_unowned from fx)),
  'an admin can verify a listing'
);

-- Even an admin must not call record_audit() directly. It is invoked only by
-- other SECURITY DEFINER routines, which run as the owner and need no grant.
-- A client that could write here could forge the moderation trail.
select throws_ok(
  $$ select public.record_audit('forged.action', 'business', 'abc', null, null) $$,
  '42501', null, 'not even an admin can write an audit entry directly'
);

-- Claim approval is atomic: owner assigned, listing verified, claim closed.
select lives_ok(
  $$ select public.approve_claim((select id from public.claims where status = 'pending' limit 1),
                                 'Documents verified.') $$,
  'an admin can approve a claim'
);

select is(
  (select count(*) from public.businesses b
     join public.claims c on c.business_id = b.id
    where c.status = 'approved' and (b.owner_id is null or not b.verified))::int,
  0,
  'claim approval assigned the owner and verified the listing atomically'
);

-- The audit entry is readable now, written by approve_claim rather than by a
-- client — which is the only path that should exist.
select ok(
  (select count(*) from public.audit_log where action = 'claim.approve') > 0,
  'an admin can read an audit entry written by approve_claim()'
);

select pg_temp.become_postgres();

select * from finish();

rollback;
