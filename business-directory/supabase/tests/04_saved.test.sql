-- ===========================================================================
-- Saved content: favourites, lists, and what "shared by link" actually means.
--
-- The claim being tested is narrow and worth stating: an unlisted list is
-- reachable *only* by presenting its slug. Before this phase the read policy
-- allowed any caller to select rows whose visibility was unlisted or public, so
-- "only people with the link" was decoration — `select * from lists` returned
-- every one of them, notes included.
-- ===========================================================================

begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

create temp table f as
select
  (select id from public.profiles where role = 'user' order by created_at limit 1)        as owner_a,
  (select id from public.profiles where role = 'user' order by created_at offset 1 limit 1) as other,
  (select id from public.profiles where role = 'admin' order by id limit 1)              as admin_a,
  (select id from public.lists where visibility = 'public' order by created_at limit 1)  as list_public,
  (select id from public.lists where visibility = 'unlisted' order by created_at limit 1) as list_unlisted,
  (select id from public.lists where visibility = 'private' order by created_at limit 1) as list_private,
  (select share_slug from public.lists where visibility = 'unlisted' order by created_at limit 1) as slug_unlisted,
  (select id from public.businesses where status = 'published' order by slug limit 1)    as biz_published,
  (select id from public.businesses where status = 'draft' order by slug limit 1)        as biz_draft;

grant select on f to anon, authenticated;

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
-- Share slugs are minted and destroyed by the database
-- ===========================================================================

select pg_temp.become_postgres();

select isnt(
  (select share_slug from public.lists where visibility = 'public' order by created_at limit 1),
  null,
  'share slug: a shared list has one without the application providing it'
);

select is(
  (select share_slug from public.lists where visibility = 'private' order by created_at limit 1),
  null,
  'share slug: a private list has none'
);

select ok(
  (select length(share_slug) >= 16 from public.lists where visibility = 'public'
    order by created_at limit 1),
  'share slug: long enough not to be guessed'
);

select pg_temp.become((select owner_a from f), 'user');

-- A client that supplies its own slug does not get to keep it. Otherwise the
-- link stops being unguessable, which is the only thing protecting the list.
do $$
declare
  target uuid := (select list_private from f);
begin
  update public.lists set visibility = 'unlisted', share_slug = 'easy-to-guess' where id = target;
end;
$$;

select isnt(
  (select share_slug from public.lists where id = (select list_private from f)),
  'easy-to-guess',
  'share slug: a client-chosen slug is replaced by a generated one'
);

-- Making it private again must revoke the link rather than park it.
update public.lists set visibility = 'private' where id = (select list_private from f);

select is(
  (select share_slug from public.lists where id = (select list_private from f)),
  null,
  'share slug: going private destroys the link immediately'
);

-- ===========================================================================
-- Lists are not enumerable
-- ===========================================================================

select pg_temp.become_anon();

select is(
  (select count(*)::int from public.lists),
  0,
  'lists: an anonymous caller cannot enumerate lists, shared ones included'
);

select is(
  (select count(*)::int from public.list_items),
  0,
  'list items: nor the contents of one'
);

select pg_temp.become((select other from f), 'user');

select is(
  (select count(*)::int from public.lists),
  0,
  'lists: a signed-in stranger sees none of them either'
);

select is(
  (select count(*)::int from public.list_items where list_id = (select list_public from f)),
  0,
  'list items: a stranger cannot read a shared list by id'
);

-- ===========================================================================
-- The slug is the credential
-- ===========================================================================

select pg_temp.become_anon();

select is(
  (select count(*)::int from public.shared_list((select slug_unlisted from f))),
  1,
  'shared_list: presenting the slug returns the list'
);

select ok(
  (select count(*) from public.shared_list_items((select slug_unlisted from f))) > 0,
  'shared_list_items: and its published contents'
);

select is(
  (select count(*)::int from public.shared_list('definitely-not-a-real-slug')),
  0,
  'shared_list: an unknown slug returns nothing, so a 404 cannot be distinguished'
);

-- A private list has no slug at all, so there is nothing to present. Asserting
-- with the id proves the function cannot be addressed any other way.
select is(
  (select count(*)::int from public.shared_list((select list_private from f)::text)),
  0,
  'shared_list: a list id is not accepted in place of a slug'
);

-- ===========================================================================
-- A shared list leaks nothing that is not already public
-- ===========================================================================

select pg_temp.become_postgres();

-- Put an unpublished listing into the shared list.
insert into public.list_items (list_id, business_id, sort_order)
values ((select list_public from f), (select biz_draft from f), 99)
on conflict do nothing;

select pg_temp.become_anon();

select is(
  (select count(*)::int from public.shared_list_items(
    (select share_slug from public.lists where id = (select list_public from f)))
   where id = (select biz_draft from f)),
  0,
  'shared list: an unpublished listing in a shared list is not exposed through it'
);

-- ===========================================================================
-- Favourites are private, and only ever your own
-- ===========================================================================

select pg_temp.become((select owner_a from f), 'user');

select ok(
  (select count(*) from public.favorites) > 0,
  'favourites: a member sees their own'
);

select is(
  (select count(*)::int from public.favorites where user_id <> (select owner_a from f)),
  0,
  'favourites: and nobody else''s'
);

select throws_ok(
  format(
    $$ insert into public.favorites (user_id, business_id) values (%L, %L) $$,
    (select other from f), (select biz_published from f)
  ),
  '42501',
  null,
  'favourites: a member cannot save something on behalf of someone else'
);

select is(
  (select count(*)::int from public.favorite_businesses(60, 0)
    where id not in (select business_id from public.favorites where user_id = (select owner_a from f))),
  0,
  'favorite_businesses: returns the caller''s favourites and no others'
);

-- ===========================================================================
-- Writes into someone else's list do nothing
-- ===========================================================================

select pg_temp.become((select other from f), 'user');

select throws_ok(
  format(
    $$ insert into public.list_items (list_id, business_id) values (%L, %L) $$,
    (select list_public from f), (select biz_published from f)
  ),
  '42501',
  null,
  'list items: a stranger cannot add to a list they do not own'
);

-- Reordering is a function call, and a function is not a way around a policy: it
-- matches no rows rather than raising, which is the correct shape for an update.
select lives_ok(
  format(
    $$ select public.reorder_list_items(%L, array[%L]::uuid[]) $$,
    (select list_public from f), (select biz_published from f)
  ),
  'reorder: a stranger''s call is accepted but changes nothing'
);

select pg_temp.become_postgres();

select is(
  (select count(*)::int from public.list_items
    where list_id = (select list_public from f)
      and business_id = (select biz_published from f)
      and sort_order = 0),
  0,
  'reorder: and really did change nothing'
);

select * from finish();

rollback;
