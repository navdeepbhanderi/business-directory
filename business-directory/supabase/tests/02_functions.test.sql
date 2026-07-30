-- ===========================================================================
-- Behaviour tests for is_open_at() and search_businesses().
--
-- These use purpose-built fixtures rather than seeded rows, so the assertions
-- state exact expected values instead of "greater than zero".
-- ===========================================================================

begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Fixtures: three listings in one locality with known hours and ratings.
-- ---------------------------------------------------------------------------

create temp table f as
select
  (select id from public.cities where slug = 'bengaluru')                  as city_id,
  (select l.id from public.localities l
     join public.cities c on c.id = l.city_id
    where c.slug = 'bengaluru' and l.slug = 'indiranagar')                 as locality_id,
  gen_random_uuid() as split_id,
  gen_random_uuid() as night_id,
  gen_random_uuid() as plain_id;

insert into public.businesses
  (id, slug, name, description, status, verified, market_code, city_id, locality_id,
   address_line1, location, price_level, amenities, rating, review_count, published_at)
select f.split_id, 'tap-split-shift', 'Tap Split Shift Thali',
       'A lunch and dinner thali house used as a test fixture.',
       'published'::public.business_status, true, 'IN', f.city_id, f.locality_id, '1 Test Road',
       extensions.ST_SetSRID(extensions.ST_MakePoint(77.6408, 12.9784), 4326)::extensions.geography,
       2, array['Parking','UPI accepted'], 4.8, 40, now()
from f
union all
select f.night_id, 'tap-late-night', 'Tap Late Night Kitchen',
       'Open past midnight, used as a test fixture.',
       'published'::public.business_status, true, 'IN', f.city_id, f.locality_id, '2 Test Road',
       extensions.ST_SetSRID(extensions.ST_MakePoint(77.6418, 12.9794), 4326)::extensions.geography,
       3, array['Home delivery'], 3.2, 12, now()
from f
union all
select f.plain_id, 'tap-far-away', 'Tap Far Away Cafe',
       'Deliberately located far from the search origin.',
       'published'::public.business_status, true, 'IN', f.city_id, f.locality_id, '3 Test Road',
       -- ~450 km away, so a radius filter must exclude it.
       extensions.ST_SetSRID(extensions.ST_MakePoint(73.8567, 18.5204), 4326)::extensions.geography,
       1, array['Wi-Fi'], 4.9, 99, now()
from f;

-- Split shift: 11:00-15:00 and 18:30-22:30, every day.
insert into public.business_hours (business_id, day_of_week, opens, closes)
select (select split_id from f), d, t.opens, t.closes
from generate_series(0, 6) d,
     (values (time '11:00', time '15:00'), (time '18:30', time '22:30')) as t(opens, closes);

-- Past midnight: 18:00-01:30, every day.
insert into public.business_hours (business_id, day_of_week, opens, closes)
select (select night_id from f), d, time '18:00', time '01:30'
from generate_series(0, 6) d;

-- Plain: 09:00-18:00, every day.
insert into public.business_hours (business_id, day_of_week, opens, closes)
select (select plain_id from f), d, time '09:00', time '18:00'
from generate_series(0, 6) d;

-- ===========================================================================
-- is_open_at
-- ===========================================================================

select ok(public.is_open_at((select split_id from f), timestamptz '2026-08-05 12:00 Asia/Kolkata'),
          'split shift: open during the lunch service');

select ok(not public.is_open_at((select split_id from f), timestamptz '2026-08-05 16:00 Asia/Kolkata'),
          'split shift: closed in the afternoon gap');

select ok(public.is_open_at((select split_id from f), timestamptz '2026-08-05 20:00 Asia/Kolkata'),
          'split shift: open again for dinner');

select ok(public.is_open_at((select night_id from f), timestamptz '2026-08-05 23:30 Asia/Kolkata'),
          'past midnight: open before midnight');

select ok(public.is_open_at((select night_id from f), timestamptz '2026-08-06 00:45 Asia/Kolkata'),
          'past midnight: still open after midnight, on the previous day''s slot');

select ok(not public.is_open_at((select night_id from f), timestamptz '2026-08-06 02:30 Asia/Kolkata'),
          'past midnight: closed once the slot ends');

-- The timezone must come from the market, never the server.
select ok(not public.is_open_at((select plain_id from f), timestamptz '2026-08-05 18:00 UTC'),
          'timezone: 18:00 UTC is 23:30 IST, so a 09:00-18:00 shop is closed');

select ok(public.is_open_at((select plain_id from f), timestamptz '2026-08-05 12:00 Asia/Kolkata'),
          'timezone: midday IST is inside 09:00-18:00');

-- Date overrides beat the weekly schedule.
insert into public.hours_overrides (business_id, on_date, closed, note)
values ((select plain_id from f), date '2026-11-08', true, 'Closed for Diwali');

select ok(not public.is_open_at((select plain_id from f), timestamptz '2026-11-08 12:00 Asia/Kolkata'),
          'override: closed for Diwali despite regular hours');

insert into public.hours_overrides (business_id, on_date, closed, opens, closes, note)
values ((select plain_id from f), date '2026-03-04', false, time '11:00', time '16:00', 'Holi hours');

select ok(not public.is_open_at((select plain_id from f), timestamptz '2026-03-04 10:00 Asia/Kolkata'),
          'override: short hours exclude the normal 09:00 opening');

select ok(public.is_open_at((select plain_id from f), timestamptz '2026-03-04 12:00 Asia/Kolkata'),
          'override: open inside the shortened window');

-- ===========================================================================
-- search_businesses
-- ===========================================================================

-- Text
select ok(
  exists (select 1 from public.search_businesses(p_query => 'Tap Split Shift Thali') where slug = 'tap-split-shift'),
  'search: exact name matches'
);

select ok(
  exists (select 1 from public.search_businesses(p_query => 'thalis') where slug = 'tap-split-shift'),
  'search: english stemming matches a plural against the singular'
);

select ok(
  exists (select 1 from public.search_businesses(p_query => 'Tap Split Shif') where slug = 'tap-split-shift'),
  'search: trigram similarity tolerates a typo'
);

select ok(
  exists (select 1 from public.search_businesses(p_query => 'Indiranagar') where slug = 'tap-split-shift'),
  'search: locality name is indexed at weight B'
);

-- Distance
select ok(
  not exists (
    select 1 from public.search_businesses(
      p_query => 'Tap', p_lat => 12.9784, p_lng => 77.6408, p_radius_km => 5)
    where slug = 'tap-far-away'),
  'search: a 5km radius excludes the 450km-away fixture'
);

select ok(
  exists (
    select 1 from public.search_businesses(
      p_query => 'Tap', p_lat => 12.9784, p_lng => 77.6408, p_radius_km => 5)
    where slug = 'tap-split-shift'),
  'search: the same radius includes the nearby fixture'
);

select ok(
  (select distance_km from public.search_businesses(
     p_query => 'Tap Split Shift Thali', p_lat => 12.9784, p_lng => 77.6408) limit 1) < 0.1,
  'search: distance is reported in kilometres from the origin'
);

-- Facets
select ok(
  not exists (select 1 from public.search_businesses(p_query => 'Tap', p_min_rating => 4.5)
              where slug = 'tap-late-night'),
  'search: minimum rating excludes the 3.2-rated fixture'
);

select ok(
  exists (select 1 from public.search_businesses(p_query => 'Tap', p_min_rating => 4.5)
          where slug = 'tap-split-shift'),
  'search: minimum rating keeps the 4.8-rated fixture'
);

select ok(
  not exists (select 1 from public.search_businesses(p_query => 'Tap', p_price_levels => array[1]::smallint[])
              where slug = 'tap-split-shift'),
  'search: price level filter excludes non-matching listings'
);

select ok(
  exists (select 1 from public.search_businesses(p_query => 'Tap', p_amenities => array['Home delivery'])
          where slug = 'tap-late-night'),
  'search: amenity filter matches on array containment'
);

select ok(
  not exists (select 1 from public.search_businesses(p_query => 'Tap', p_city_slug => 'mumbai')
              where slug like 'tap-%'),
  'search: city facet excludes fixtures in another city'
);

-- Open-now facet, evaluated at a fixed instant.
select ok(
  exists (select 1 from public.search_businesses(
            p_query => 'Tap', p_open_now => true, p_at => timestamptz '2026-08-05 12:00 Asia/Kolkata')
          where slug = 'tap-split-shift'),
  'search: open-now includes a listing serving lunch at that instant'
);

select ok(
  not exists (select 1 from public.search_businesses(
                p_query => 'Tap', p_open_now => true, p_at => timestamptz '2026-08-05 12:00 Asia/Kolkata')
              where slug = 'tap-late-night'),
  'search: open-now excludes a listing that opens at 18:00'
);

-- The combined case the plan names as the exit criterion for this phase:
-- query + distance + open-now + rating, all at once.
select results_eq(
  $$ select slug from public.search_businesses(
       p_query      => 'Tap',
       p_lat        => 12.9784,
       p_lng        => 77.6408,
       p_radius_km  => 5,
       p_min_rating => 4.0,
       p_open_now   => true,
       p_at         => timestamptz '2026-08-05 12:00 Asia/Kolkata'
     ) $$,
  $$ values ('tap-split-shift'::text) $$,
  'search: query + radius + rating + open-now together resolve to exactly one listing'
);

-- Pagination and the pre-pagination total.
select is(
  (select total_count from public.search_businesses(p_query => 'Tap', p_page_size => 1) limit 1),
  3::bigint,
  'search: total_count reports the full match count, not the page size'
);

select is(
  (select count(*)::int from public.search_businesses(p_query => 'Tap', p_page_size => 1)),
  1,
  'search: page size limits the rows returned'
);

select is(
  (select count(*)::int from public.search_businesses(p_query => 'Tap', p_page => 99, p_page_size => 10)),
  0,
  'search: a page past the end returns nothing rather than erroring'
);

-- Sorting
select is(
  (select slug from public.search_businesses(p_query => 'Tap', p_sort => 'rating') limit 1),
  'tap-far-away',
  'search: rating sort puts the 4.9 fixture first'
);

select is(
  (select slug from public.search_businesses(
     p_query => 'Tap', p_sort => 'nearest', p_lat => 12.9784, p_lng => 77.6408) limit 1),
  'tap-split-shift',
  'search: nearest sort puts the closest fixture first'
);

-- Unpublished listings never appear.
update public.businesses set status = 'suspended' where slug = 'tap-split-shift';

select ok(
  not exists (select 1 from public.search_businesses(p_query => 'Tap') where slug = 'tap-split-shift'),
  'search: a suspended listing drops out of results'
);

select * from finish();

rollback;
