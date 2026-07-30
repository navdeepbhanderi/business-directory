-- ===========================================================================
-- Facet options for the search UI.
--
-- Amenities live in a text[] on businesses, so the distinct set has to be
-- unnested. Doing that in the application would mean shipping every listing's
-- amenity array to the server just to build a filter list; here it is one
-- indexed scan returning a dozen rows.
--
-- Counts are included so the UI can show "Parking (48)" and, more importantly,
-- so an option that would return nothing can be hidden rather than offered.
-- ===========================================================================

create or replace function public.facet_amenities(p_city_slug text default null)
returns table (amenity text, listing_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.amenity, count(*) as listing_count
  from public.businesses b
  cross join unnest(b.amenities) as a(amenity)
  join public.cities c on c.id = b.city_id
  where b.status = 'published'
    and (p_city_slug is null or c.slug = p_city_slug)
  group by a.amenity
  having count(*) > 0
  order by count(*) desc, a.amenity
$$;

grant execute on function public.facet_amenities(text) to anon, authenticated;

-- Localities for the selected city, so the facet only offers reachable options.
create or replace function public.facet_localities(p_city_slug text)
returns table (slug text, name text, name_i18n jsonb, listing_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.slug, l.name, l.name_i18n, count(b.id) as listing_count
  from public.localities l
  join public.cities c on c.id = l.city_id
  left join public.businesses b
    on b.locality_id = l.id and b.status = 'published'
  where c.slug = p_city_slug and l.active
  group by l.slug, l.name, l.name_i18n
  having count(b.id) > 0
  order by count(b.id) desc, l.name
$$;

grant execute on function public.facet_localities(text) to anon, authenticated;
