-- ===========================================================================
-- Add the primary photo to search results.
--
-- A directory whose result cards have no image is a materially worse product:
-- the card reserves the space regardless, and an empty frame reads as a
-- missing listing rather than a deliberate layout. Fetching it per-row in the
-- application would be an N+1; here it is a correlated subquery the planner
-- resolves with the existing (business_id, sort_order) index.
--
-- The return type changes, so the function must be dropped rather than
-- replaced in place.
-- ===========================================================================

drop function if exists public.search_businesses(
  text, text[], text, text, double precision, double precision, double precision,
  numeric, smallint[], text[], boolean, text, integer, integer, timestamptz
);

create or replace function public.search_businesses(
  p_query          text default null,
  p_category_slugs text[] default null,
  p_city_slug      text default null,
  p_locality_slug  text default null,
  p_lat            double precision default null,
  p_lng            double precision default null,
  p_radius_km      double precision default null,
  p_min_rating     numeric default null,
  p_price_levels   smallint[] default null,
  p_amenities      text[] default null,
  p_open_now       boolean default false,
  p_sort           text default 'relevance',
  p_page           integer default 1,
  p_page_size      integer default 20,
  p_at             timestamptz default now()
)
returns table (
  id            uuid,
  slug          text,
  name          text,
  name_i18n     jsonb,
  description   text,
  city_slug     text,
  city_name     text,
  locality_name text,
  address_line1 text,
  rating        numeric,
  review_count  integer,
  price_level   smallint,
  amenities     text[],
  verified      boolean,
  latitude      double precision,
  longitude     double precision,
  distance_km   double precision,
  is_open       boolean,
  promoted      boolean,
  photo_url     text,
  category_slugs text[],
  total_count   bigint
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with params as (
    select
      nullif(btrim(coalesce(p_query, '')), '')                        as q_text,
      greatest(coalesce(p_page, 1), 1)                                as page,
      least(greatest(coalesce(p_page_size, 20), 1), 100)              as page_size,
      case
        when p_lat is null or p_lng is null then null
        else extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
      end                                                             as origin
  ),
  queries as (
    select
      p.*,
      case when p.q_text is null then null
           else websearch_to_tsquery('english', p.q_text) end         as q_en,
      case when p.q_text is null then null
           else websearch_to_tsquery('simple', unaccent(p.q_text)) end as q_simple
    from params p
  ),
  matched as (
    select
      b.*,
      c.slug as c_slug,
      c.name as c_name,
      l.name as l_name,
      qq.origin,
      case when qq.origin is null then null
           else extensions.ST_Distance(b.location, qq.origin) / 1000.0 end as dist_km,
      case
        when qq.q_text is null then 0::real
        else greatest(
               coalesce(ts_rank(b.search_vector, qq.q_en), 0),
               coalesce(ts_rank(b.search_vector, qq.q_simple), 0)
             ) + (extensions.similarity(b.name, qq.q_text) * 0.3)::real
      end as rank,
      exists (
        select 1 from public.promoted_placements pp
        where pp.business_id = b.id
          and pp.surface = 'search'
          and p_at between pp.starts_at and pp.ends_at
      ) as is_promoted
    from public.businesses b
    cross join queries qq
    join public.cities c on c.id = b.city_id
    left join public.localities l on l.id = b.locality_id
    where b.status = 'published'
      and (
        qq.q_text is null
        or b.search_vector @@ qq.q_en
        or b.search_vector @@ qq.q_simple
        or extensions.similarity(b.name, qq.q_text) > 0.25
      )
      and (p_city_slug is null or c.slug = p_city_slug)
      and (p_locality_slug is null or l.slug = p_locality_slug)
      and (p_min_rating is null or b.rating >= p_min_rating)
      and (p_price_levels is null or b.price_level = any (p_price_levels))
      and (p_amenities is null or b.amenities @> p_amenities)
      and (
        qq.origin is null
        or p_radius_km is null
        or extensions.ST_DWithin(b.location, qq.origin, p_radius_km * 1000.0)
      )
      and (
        p_category_slugs is null
        or exists (
          select 1
          from public.business_categories bc
          join public.categories cat on cat.id = bc.category_id
          where bc.business_id = b.id and cat.slug = any (p_category_slugs)
        )
      )
      and (not coalesce(p_open_now, false) or public.is_open_at(b.id, p_at))
  )
  select
    m.id,
    m.slug,
    m.name,
    m.name_i18n,
    m.description,
    m.c_slug,
    m.c_name,
    m.l_name,
    m.address_line1,
    m.rating,
    m.review_count,
    m.price_level,
    m.amenities,
    m.verified,
    extensions.ST_Y(m.location::extensions.geometry)::double precision,
    extensions.ST_X(m.location::extensions.geometry)::double precision,
    m.dist_km,
    public.is_open_at(m.id, p_at),
    m.is_promoted,
    (select bp.storage_path
       from public.business_photos bp
      where bp.business_id = m.id
      order by bp.sort_order, bp.created_at
      limit 1),
    coalesce(
      (select array_agg(cat.slug order by bc.is_primary desc, cat.slug)
       from public.business_categories bc
       join public.categories cat on cat.id = bc.category_id
       where bc.business_id = m.id),
      '{}'::text[]
    ),
    count(*) over ()
  from matched m
  order by
    case when coalesce(p_sort, 'relevance') = 'relevance' and m.is_promoted then 0 else 1 end,
    case when coalesce(p_sort, 'relevance') = 'relevance' then m.rank end desc nulls last,
    case when p_sort = 'rating' then m.rating end desc nulls last,
    case when p_sort = 'reviews' then m.review_count end desc nulls last,
    case when p_sort = 'nearest' then m.dist_km end asc nulls last,
    case when p_sort = 'newest' then m.published_at end desc nulls last,
    m.review_count desc,
    m.id
  offset (select (page - 1) * page_size from params)
  limit  (select page_size from params);
$$;

comment on function public.search_businesses is
  'Full-text rank + PostGIS radius + open-now + facets + pagination in one '
  'statement. total_count is the pre-pagination count via a window function.';

grant execute on function public.search_businesses(
  text, text[], text, text, double precision, double precision, double precision,
  numeric, smallint[], text[], boolean, text, integer, integer, timestamptz
) to anon, authenticated;

-- ===========================================================================
-- Aggregate counts for the home page. A SECURITY DEFINER function rather than
-- three client round trips, and it only ever exposes counts of published data.
-- ===========================================================================

create or replace function public.directory_stats()
returns table (
  listing_count  bigint,
  city_count     bigint,
  category_count bigint,
  review_count   bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*) from public.businesses where status = 'published'),
    (select count(distinct b.city_id) from public.businesses b where b.status = 'published'),
    (select count(*) from public.categories where active),
    (select count(*) from public.reviews r
       join public.businesses b on b.id = r.business_id
      where r.status = 'published' and b.status = 'published')
$$;

grant execute on function public.directory_stats() to anon, authenticated;
