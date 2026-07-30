-- ===========================================================================
-- Expose latitude/longitude as plain columns.
--
-- `location` is a PostGIS geography, which PostgREST returns as WKB — unusable
-- directly from the client. Until now only the search RPC could hand back
-- coordinates, so the listing page had no way to draw its own map or find
-- neighbours without a second round trip through that RPC.
--
-- Generated columns rather than a view or a trigger: they are always consistent
-- with `location` by definition, cost nothing to maintain, and can be indexed
-- and selected like any other column.
-- ===========================================================================

alter table public.businesses
  add column latitude double precision
    generated always as (extensions.ST_Y(location::extensions.geometry)) stored,
  add column longitude double precision
    generated always as (extensions.ST_X(location::extensions.geometry)) stored;

comment on column public.businesses.latitude is
  'Derived from location. Always consistent by construction; never write directly.';

-- ===========================================================================
-- Similar listings nearby.
--
-- "People who looked at this also want" is the wrong model for a directory —
-- someone reading about a closed bakery wants another bakery within walking
-- distance, not a statistically related one. So: same primary category, nearest
-- first, excluding itself.
-- ===========================================================================

create or replace function public.nearby_businesses(
  p_business_id uuid,
  p_limit integer default 4,
  p_radius_km double precision default 10
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
  distance_km   double precision,
  is_open       boolean,
  photo_url     text
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with target as (
    select b.id, b.location, b.city_id,
           (select bc.category_id
              from public.business_categories bc
             where bc.business_id = b.id
             order by bc.is_primary desc
             limit 1) as category_id
    from public.businesses b
    where b.id = p_business_id and b.status = 'published'
  )
  select
    b.id, b.slug, b.name, b.name_i18n,
    c.name, l.name, b.address_line1,
    b.rating, b.review_count, b.price_level, b.verified,
    extensions.ST_Distance(b.location, t.location) / 1000.0,
    public.is_open_at(b.id),
    (select bp.storage_path from public.business_photos bp
      where bp.business_id = b.id order by bp.sort_order, bp.created_at limit 1)
  from target t
  join public.businesses b
    on b.status = 'published'
   and b.id <> t.id
   and extensions.ST_DWithin(b.location, t.location, p_radius_km * 1000.0)
  join public.cities c on c.id = b.city_id
  left join public.localities l on l.id = b.locality_id
  where t.category_id is null
     or exists (
       select 1 from public.business_categories bc
       where bc.business_id = b.id and bc.category_id = t.category_id
     )
  order by extensions.ST_Distance(b.location, t.location)
  limit greatest(least(coalesce(p_limit, 4), 12), 1);
$$;

grant execute on function public.nearby_businesses(uuid, integer, double precision) to anon, authenticated;
