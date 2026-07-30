-- ===========================================================================
-- Nearby listings: prefer the same category, but never come back empty.
--
-- The first version required a same-category match within the radius. With
-- listings spread across six cities that left the section blank on most pages —
-- and an empty "Similar nearby" is worse than a slightly looser one: someone
-- looking at a closed bakery still benefits from knowing what else is on that
-- street.
--
-- So: rank same-category first, then everything else, by distance within each
-- group. Same intent, no dead section.
-- ===========================================================================

drop function if exists public.nearby_businesses(uuid, integer, double precision);

create or replace function public.nearby_businesses(
  p_business_id uuid,
  p_limit integer default 4,
  p_radius_km double precision default 10
)
returns table (
  id             uuid,
  slug           text,
  name           text,
  name_i18n      jsonb,
  city_name      text,
  locality_name  text,
  address_line1  text,
  rating         numeric,
  review_count   integer,
  price_level    smallint,
  verified       boolean,
  distance_km    double precision,
  is_open        boolean,
  photo_url      text,
  same_category  boolean
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with target as (
    select b.id, b.location,
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
      where bp.business_id = b.id order by bp.sort_order, bp.created_at limit 1),
    coalesce(
      exists (
        select 1 from public.business_categories bc
        where bc.business_id = b.id and bc.category_id = t.category_id
      ),
      false
    ) as same_category
  from target t
  join public.businesses b
    on b.status = 'published'
   and b.id <> t.id
   and extensions.ST_DWithin(b.location, t.location, p_radius_km * 1000.0)
  join public.cities c on c.id = b.city_id
  left join public.localities l on l.id = b.locality_id
  order by
    -- Same category wins; distance decides within each group.
    (case when exists (
       select 1 from public.business_categories bc
       where bc.business_id = b.id and bc.category_id = t.category_id
     ) then 0 else 1 end),
    extensions.ST_Distance(b.location, t.location)
  limit greatest(least(coalesce(p_limit, 4), 12), 1);
$$;

grant execute on function public.nearby_businesses(uuid, integer, double precision) to anon, authenticated;
