-- ===========================================================================
-- Saved content: share slugs, and reads for favourites and lists.
--
-- The tables and policies landed in Phase 1. Three things were missing before
-- any of it could be used, and one of them was a leak.
--
-- 1. Nothing generated `share_slug`, so a list could never legally leave
--    `private`: the check constraint requires a slug for a shared list, and no
--    code produced one.
-- 2. `lists_select_own_or_shared` allowed *any* caller to select rows with
--    visibility `unlisted` or `public`. Since PostgREST will happily answer
--    `select * from lists`, an unlisted list was readable by anyone who asked
--    for the whole table — so "only people with the link" was not a restriction
--    at all, and neither were the notes inside it. The same applied to
--    `list_items`. Shared reads now go through a slug-scoped function and the
--    policies are narrowed to the owner.
-- 3. Reading a saved listing needs the same fields a card shows. Doing that
--    through nested PostgREST embeds means one round trip per relation and a
--    different shape from every other card in the product.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Share slugs
--
-- Random, not derived from the name: a slug is the only thing protecting an
-- unlisted list, so it must not be guessable from anything a person can see.
-- 12 random bytes is 96 bits, url-safe base64 with the padding removed.
-- ---------------------------------------------------------------------------

create or replace function public.new_share_slug()
returns text
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  candidate text;
begin
  loop
    candidate := translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=', '-_');
    exit when not exists (select 1 from public.lists where share_slug = candidate);
  end loop;
  return candidate;
end $$;

revoke all on function public.new_share_slug() from public;

/*
 * Keep `share_slug` in step with `visibility`.
 *
 * Three rules, all of them here rather than in the application: the constraint
 * says a private list has no slug and a shared one does, and enforcing that in
 * code would mean every write path has to remember.
 *
 *  - Making a list private *destroys* the slug rather than parking it, so links
 *    already shared around stop working. That is what someone means when they
 *    make something private again.
 *  - The slug is always chosen here, never accepted from the client. Otherwise a
 *    person could pick a memorable one — defeating the point of an unguessable
 *    link — or squat on a slug someone else might be given.
 *  - SECURITY DEFINER, like the other non-guard triggers, so it can call
 *    `new_share_slug()` without that generator being executable by clients.
 */
create or replace function public.lists_sync_share_slug()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.visibility = 'private' then
    new.share_slug := null;
  elsif tg_op = 'INSERT'
     or old.share_slug is null
     or new.share_slug is distinct from old.share_slug then
    new.share_slug := public.new_share_slug();
  end if;
  return new;
end $$;

revoke all on function public.lists_sync_share_slug() from public;

-- Fires on every write, not only on `update of visibility`: a statement that
-- touched `share_slug` alone would otherwise skip the trigger entirely, which is
-- precisely the statement that must not be trusted.
create trigger lists_sync_share_slug
  before insert or update on public.lists
  for each row execute function public.lists_sync_share_slug();

-- ---------------------------------------------------------------------------
-- Narrow the read policies to the owner
--
-- Sharing is now a capability granted by holding the slug, which is checked in
-- the functions below, rather than a property of the row that any caller can
-- select on.
-- ---------------------------------------------------------------------------

drop policy lists_select_own_or_shared on public.lists;

create policy lists_select_own on public.lists
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy list_items_select on public.list_items;

create policy list_items_select_own on public.list_items
  for select using (
    exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Card fields for a saved listing
--
-- The same columns `nearby_businesses` returns, so a saved listing renders in
-- exactly the card the rest of the product uses.
-- ---------------------------------------------------------------------------

create or replace function public.favorite_businesses(
  p_limit  integer default 60,
  p_offset integer default 0
)
returns table (
  id            uuid,
  slug          text,
  name          text,
  name_i18n     jsonb,
  city_name     text,
  locality_name text,
  address_line1 text,
  rating        numeric,
  review_count  integer,
  price_level   smallint,
  verified      boolean,
  is_open       boolean,
  photo_url     text,
  saved_at      timestamptz,
  total_count   bigint
)
language sql
stable
security invoker            -- RLS decides: favorites_own_all limits this to the caller
set search_path = public, pg_temp
as $$
  select
    b.id, b.slug, b.name, b.name_i18n,
    c.name, l.name, b.address_line1,
    b.rating, b.review_count, b.price_level, b.verified,
    public.is_open_at(b.id),
    (select bp.storage_path from public.business_photos bp
      where bp.business_id = b.id order by bp.sort_order, bp.created_at limit 1),
    f.created_at,
    count(*) over ()
  from public.favorites f
  join public.businesses b on b.id = f.business_id
  join public.cities c on c.id = b.city_id
  left join public.localities l on l.id = b.locality_id
  order by f.created_at desc
  limit greatest(least(coalesce(p_limit, 60), 200), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.favorite_businesses(integer, integer) to authenticated;

/*
 * A list's contents for its owner.
 *
 * SECURITY INVOKER on purpose: `list_items_select_own` and the listing policies
 * already say who may see what, so this function needs no privilege of its own
 * and cannot become a way around them.
 */
create or replace function public.list_businesses(p_list_id uuid)
returns table (
  id            uuid,
  slug          text,
  name          text,
  name_i18n     jsonb,
  city_name     text,
  locality_name text,
  address_line1 text,
  rating        numeric,
  review_count  integer,
  price_level   smallint,
  verified      boolean,
  is_open       boolean,
  photo_url     text,
  note          text,
  sort_order    integer,
  added_at      timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    b.id, b.slug, b.name, b.name_i18n,
    c.name, l.name, b.address_line1,
    b.rating, b.review_count, b.price_level, b.verified,
    public.is_open_at(b.id),
    (select bp.storage_path from public.business_photos bp
      where bp.business_id = b.id order by bp.sort_order, bp.created_at limit 1),
    li.note, li.sort_order, li.added_at
  from public.list_items li
  join public.businesses b on b.id = li.business_id
  join public.cities c on c.id = b.city_id
  left join public.localities l on l.id = b.locality_id
  where li.list_id = p_list_id
  order by li.sort_order, li.added_at;
$$;

grant execute on function public.list_businesses(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Shared list, by slug
--
-- SECURITY DEFINER because the policies above deliberately hide the list from
-- everyone but its owner. The slug *is* the credential, so the function checks
-- it and nothing else is reachable through it: no listing of lists, no lookup by
-- id, and a private list has no slug to present.
-- ---------------------------------------------------------------------------

create or replace function public.shared_list(p_slug text)
returns table (
  id          uuid,
  name        text,
  description text,
  visibility  public.list_visibility,
  owner_name  text,
  item_count  bigint,
  updated_at  timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    l.id, l.name, l.description, l.visibility,
    p.full_name,
    (select count(*) from public.list_items li
      join public.businesses b on b.id = li.business_id
     where li.list_id = l.id and b.status = 'published'),
    l.updated_at
  from public.lists l
  join public.profiles p on p.id = l.owner_id
  where l.share_slug = p_slug
    and l.visibility in ('unlisted', 'public')
  limit 1;
$$;

grant execute on function public.shared_list(text) to anon, authenticated;

create or replace function public.shared_list_items(p_slug text)
returns table (
  id            uuid,
  slug          text,
  name          text,
  name_i18n     jsonb,
  city_name     text,
  locality_name text,
  address_line1 text,
  rating        numeric,
  review_count  integer,
  price_level   smallint,
  verified      boolean,
  is_open       boolean,
  photo_url     text,
  note          text,
  sort_order    integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    b.id, b.slug, b.name, b.name_i18n,
    c.name, l.name, b.address_line1,
    b.rating, b.review_count, b.price_level, b.verified,
    public.is_open_at(b.id),
    (select bp.storage_path from public.business_photos bp
      where bp.business_id = b.id order by bp.sort_order, bp.created_at limit 1),
    li.note, li.sort_order
  from public.lists lst
  join public.list_items li on li.list_id = lst.id
  join public.businesses b on b.id = li.business_id
  -- An unpublished listing drops out of a shared list rather than leaking
  -- through it: the same rule the anon policy applies everywhere else.
  and b.status = 'published'
  join public.cities c on c.id = b.city_id
  left join public.localities l on l.id = b.locality_id
  where lst.share_slug = p_slug
    and lst.visibility in ('unlisted', 'public')
  order by li.sort_order, li.added_at;
$$;

grant execute on function public.shared_list_items(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reordering a list
--
-- One statement instead of one round trip per item, and it cannot leave the list
-- half-reordered. SECURITY INVOKER, so `list_items_write_own` still decides
-- whose list may be touched — a caller passing someone else's list id updates
-- nothing.
-- ---------------------------------------------------------------------------

create or replace function public.reorder_list_items(
  p_list_id      uuid,
  p_business_ids uuid[]
)
returns integer
language sql
volatile
security invoker
set search_path = public, pg_temp
as $$
  with ordered as (
    select id, (ordinality - 1)::int as position
    from unnest(p_business_ids) with ordinality as t(id, ordinality)
  )
  update public.list_items li
     set sort_order = o.position
    from ordered o
   where li.list_id = p_list_id
     and li.business_id = o.id
     and li.sort_order is distinct from o.position;

  select coalesce(array_length(p_business_ids, 1), 0);
$$;

grant execute on function public.reorder_list_items(uuid, uuid[]) to authenticated;
