-- ===========================================================================
-- Open-now evaluation and the search RPC.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- is_open_at
--
-- Evaluated in the business's *market* timezone, never the server's. Handles
-- three cases the prototype's hardcoded "Open now" badge did not:
--   1. split shifts     — a thali place open 11:00-15:00 and 19:00-23:00
--   2. past-midnight    — closes 01:30, which is `closes < opens`
--   3. date overrides   — Diwali, Holi, Eid, regional festivals
-- ---------------------------------------------------------------------------

create or replace function public.is_open_at(
  p_business_id uuid,
  p_at timestamptz default now()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  tz         text;
  local_ts   timestamp;
  local_date date;
  local_time time;
  dow        smallint;
  ov         public.hours_overrides;
begin
  select m.time_zone into tz
  from public.businesses b
  join public.markets m on m.code = b.market_code
  where b.id = p_business_id;

  if tz is null then
    return false;
  end if;

  local_ts   := p_at at time zone tz;
  local_date := local_ts::date;
  local_time := local_ts::time;
  dow        := extract(dow from local_ts)::smallint;   -- 0 = Sunday

  -- An override for today replaces the weekly schedule outright.
  select * into ov
  from public.hours_overrides o
  where o.business_id = p_business_id and o.on_date = local_date;

  if found then
    if ov.closed then
      return false;
    end if;
    return case
      when ov.closes > ov.opens then local_time >= ov.opens and local_time < ov.closes
      else local_time >= ov.opens or local_time < ov.closes
    end;
  end if;

  -- A slot starting today.
  if exists (
    select 1 from public.business_hours h
    where h.business_id = p_business_id
      and h.day_of_week = dow
      and (
        (h.closes > h.opens and local_time >= h.opens and local_time < h.closes)
        or (h.closes < h.opens and local_time >= h.opens)
      )
  ) then
    return true;
  end if;

  -- A slot that began yesterday and runs past midnight — unless yesterday was
  -- overridden closed, in which case it never opened.
  if exists (
    select 1 from public.business_hours h
    where h.business_id = p_business_id
      and h.day_of_week = (dow + 6) % 7
      and h.closes < h.opens
      and local_time < h.closes
  ) then
    return not exists (
      select 1 from public.hours_overrides o
      where o.business_id = p_business_id
        and o.on_date = local_date - 1
        and o.closed
    );
  end if;

  return false;
end;
$$;

comment on function public.is_open_at(uuid, timestamptz) is
  'Open-now in the business market timezone. Handles split shifts, past-midnight '
  'closing times, and date overrides.';

-- ---------------------------------------------------------------------------
-- search_businesses
--
-- One function combining weighted full-text ranking, PostGIS radius filtering,
-- open-now evaluation, facet filters, and pagination. Keeping it in a single
-- statement lets the planner use the GIN and GiST indexes together instead of
-- filtering a large intermediate result in application code.
--
-- Text matching runs three ways at once, because a directory in India receives
-- queries in English, in Devanagari, and in ad-hoc transliteration:
--   · `english` tsquery  — stemming for Latin text ("bakeries" -> "bakery")
--   · `simple`  tsquery  — raw tokens, so Indic scripts match at all
--   · trigram similarity — typos and transliteration ("bangalore"/"bengaluru")
-- ---------------------------------------------------------------------------

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
    -- Promotion only influences the default ordering, and never outranks an
    -- explicit user sort. Surfaced to the UI via `promoted` for disclosure.
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

grant execute on function public.is_open_at(uuid, timestamptz) to anon, authenticated;
