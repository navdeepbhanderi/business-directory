-- ===========================================================================
-- Review writes: rate limiting, eligibility, and the sortable reviews RPC.
-- ===========================================================================

begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

create temp table f as
select
  (select id from public.profiles where role = 'user' order by id limit 1)        as user_a,
  (select id from public.profiles where role = 'user' order by id offset 1 limit 1) as user_b,
  (select b.owner_id from public.businesses b
    where b.owner_id is not null and b.status = 'published' order by b.slug limit 1) as owner_a,
  (select b.id from public.businesses b
    where b.owner_id is not null and b.status = 'published' order by b.slug limit 1) as biz_owned,
  (select id from public.businesses
    where status = 'published' and owner_id is null order by slug limit 1)        as biz_free,
  (select id from public.businesses where status = 'draft' order by slug limit 1) as biz_draft;

grant select on f to anon, authenticated;

create or replace function pg_temp.become(p_user uuid, p_role text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'user_role', p_role)::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.become_postgres()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ===========================================================================
-- review_eligibility explains itself
-- ===========================================================================

select pg_temp.become_postgres();

select is(
  (select reason from public.review_eligibility((select biz_free from f))),
  'signed-out',
  'eligibility: an unauthenticated caller is told to sign in'
);

select pg_temp.become((select owner_a from f), 'owner');

select is(
  (select reason from public.review_eligibility((select biz_owned from f))),
  'owner',
  'eligibility: an owner cannot review their own listing'
);

select pg_temp.become_postgres();

-- Give user_a an existing review so the duplicate case can be checked.
insert into public.reviews (business_id, author_id, rating, body)
values (
  (select biz_free from f), (select user_a from f), 4,
  'A first review, inserted directly so eligibility can be checked.'
);

select pg_temp.become((select user_a from f), 'user');

select is(
  (select reason from public.review_eligibility((select biz_free from f))),
  'already-reviewed',
  'eligibility: a second review on the same listing is refused'
);

select isnt(
  (select existing_review_id from public.review_eligibility((select biz_free from f))),
  null,
  'eligibility: the existing review is identified so the UI can offer an edit'
);

select pg_temp.become((select user_b from f), 'user');

select ok(
  (select can_review from public.review_eligibility((select biz_free from f))),
  'eligibility: a different user may still review'
);

-- ===========================================================================
-- Rate limiting
--
-- The security claim is that a client cannot lift its own limit, and that the
-- limit is shared rather than per-process. Both are asserted.
-- ===========================================================================

select pg_temp.become((select user_b from f), 'user');

select throws_ok(
  $$ select count(*) from public.rate_limits $$,
  '42501',
  null,
  'rate limits: a client cannot read the counter table at all'
);

-- Calling the limiter directly with a zero-length window would reset the
-- counter, so a client must not be able to reach it at all.
select throws_ok(
  $$ select public.consume_rate_limit('review.create', 5, interval '1 hour') $$,
  '42501',
  null,
  'rate limits: a client cannot call the limiter directly to burn or reset it'
);

select throws_ok(
  $$ select public.record_audit('forged.action', 'business', 'x', null, null) $$,
  '42501',
  null,
  'audit: a client cannot forge an audit entry'
);

/*
 * Generic guard against the whole class of mistake.
 *
 * Postgres grants EXECUTE to PUBLIC on every new function. Revoking from
 * `anon, authenticated` does not remove that, which is how consume_rate_limit
 * and record_audit stayed callable by any signed-in user. Rather than trusting
 * each future migration to remember, enumerate the privileged functions and
 * assert none of them carries a PUBLIC grant.
 */
select is(
  (
    select coalesce(array_agg(p.proname order by p.proname), '{}')
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef                                   -- SECURITY DEFINER only
      and p.proname not in (
        -- Read-only helpers: they expose nothing a policy would not, and
        -- policies themselves call them.
        'auth_role', 'is_admin', 'owns_business', 'business_is_public',
        'is_open_at', 'directory_stats', 'facet_amenities', 'facet_localities',
        'nearby_businesses', 'review_eligibility',
        -- Called by Supabase's auth service, which is granted explicitly.
        'custom_access_token_hook'
      )
      and (
        p.proacl is null                                -- null ACL means default: PUBLIC
        or exists (
          select 1 from aclexplode(p.proacl) a
          where a.grantee = 0 and a.privilege_type = 'EXECUTE'
        )
      )
  ),
  '{}'::name[],
  'no privileged SECURITY DEFINER function is executable by PUBLIC'
);

select pg_temp.become_postgres();

-- Six inserts as one user, each through the trigger. The sixth must fail.
do $$
declare
  target uuid := (select biz_free from f);
  actor  uuid := (select user_b from f);
  i      int;
begin
  -- Distinct businesses are needed because of the one-review-per-listing
  -- constraint, so borrow five other published listings.
  for i in 1..5 loop
    perform set_config('request.jwt.claims',
      json_build_object('sub', actor, 'role', 'authenticated', 'user_role', 'user')::text, true);
    execute 'set local role authenticated';

    insert into public.reviews (business_id, author_id, rating, body)
    select b.id, actor, 4, 'Rate limit probe number ' || i || ', long enough to pass validation.'
    from public.businesses b
    where b.status = 'published'
      and b.owner_id is distinct from actor
      and not exists (select 1 from public.reviews r
                       where r.business_id = b.id and r.author_id = actor)
    order by b.slug
    limit 1;

    execute 'reset role';
  end loop;
end;
$$;

select pg_temp.become((select user_b from f), 'user');

select throws_ok(
  format(
    $$ insert into public.reviews (business_id, author_id, rating, body)
       select b.id, %L, 4, 'One review past the hourly limit, long enough to validate.'
       from public.businesses b
       where b.status = 'published'
         and b.owner_id is distinct from %L
         and not exists (select 1 from public.reviews r
                          where r.business_id = b.id and r.author_id = %L)
       order by b.slug limit 1 $$,
    (select user_b from f), (select user_b from f), (select user_b from f)
  ),
  '54000',
  null,
  'rate limits: the sixth review within the hour is refused'
);

select pg_temp.become_postgres();

select ok(
  (select count(*) from public.rate_limits where action = 'review.create') > 0,
  'rate limits: a counter row exists for the action'
);

-- ===========================================================================
-- business_reviews sorting
-- ===========================================================================

select pg_temp.become_postgres();

-- Give one review a clear vote lead so the helpful sort has something to prove.
do $$
declare
  target   uuid := (select biz_free from f);
  favoured uuid;
begin
  select id into favoured from public.reviews
   where business_id = target and status = 'published'
   order by created_at limit 1;

  insert into public.review_votes (review_id, user_id)
  select favoured, p.id
  from public.profiles p
  where p.id <> (select author_id from public.reviews where id = favoured)
  limit 8
  on conflict do nothing;
end;
$$;

select is(
  (select id from public.business_reviews((select biz_free from f), 'helpful', 10, 0) limit 1),
  (select r.id from public.reviews r
    where r.business_id = (select biz_free from f) and r.status = 'published'
    order by (select count(*) from public.review_votes v where v.review_id = r.id) desc,
             r.created_at
    limit 1),
  'reviews: the helpful sort returns the most-voted review first'
);

select ok(
  (select helpful_count from public.business_reviews((select biz_free from f), 'helpful', 10, 0) limit 1) >= 8,
  'reviews: helpful_count is computed across all reviews, not just the page'
);

select is(
  (select rating from public.business_reviews((select biz_free from f), 'highest', 10, 0) limit 1),
  (select max(rating) from public.reviews
    where business_id = (select biz_free from f) and status = 'published'),
  'reviews: the highest sort leads with the top rating'
);

select ok(
  (select total_count from public.business_reviews((select biz_free from f), 'newest', 1, 0) limit 1) > 1,
  'reviews: total_count reports the full set, not the page size'
);

select is(
  (select count(*)::int from public.business_reviews((select biz_draft from f), 'newest', 10, 0)),
  0,
  'reviews: an unpublished listing exposes no reviews'
);

-- ===========================================================================
-- The rating trigger stays true after a write
-- ===========================================================================

select is(
  (select round(avg(r.rating)::numeric, 1) from public.reviews r
    where r.business_id = (select biz_free from f) and r.status = 'published'),
  (select rating from public.businesses where id = (select biz_free from f)),
  'rating: the denormalised average matches the published reviews after inserts'
);

select is(
  (select count(*)::int from public.reviews
    where business_id = (select biz_free from f) and status = 'published'),
  (select review_count from public.businesses where id = (select biz_free from f)),
  'rating: review_count matches after inserts'
);

-- Moderating a review must correct the score immediately.
select pg_temp.become_postgres();

do $$
declare
  victim uuid;
begin
  select id into victim from public.reviews
   where business_id = (select biz_free from f) and status = 'published'
   order by created_at limit 1;
  update public.reviews set status = 'removed' where id = victim;
end;
$$;

select is(
  (select count(*)::int from public.reviews
    where business_id = (select biz_free from f) and status = 'published'),
  (select review_count from public.businesses where id = (select biz_free from f)),
  'rating: removing a review immediately corrects review_count'
);

select * from finish();

rollback;
