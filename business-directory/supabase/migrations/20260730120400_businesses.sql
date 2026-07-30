-- ===========================================================================
-- Businesses and everything that hangs off them.
-- ===========================================================================

create table public.businesses (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  name_i18n       jsonb not null default '{}'::jsonb,
  description     text,
  description_i18n jsonb not null default '{}'::jsonb,

  owner_id        uuid references public.profiles (id) on delete set null,
  status          public.business_status not null default 'draft',
  verified        boolean not null default false,

  market_code     char(2) not null references public.markets (code) on delete restrict,
  city_id         uuid not null references public.cities (id) on delete restrict,
  locality_id     uuid references public.localities (id) on delete set null,
  address_line1   text not null,
  address_line2   text,
  postal_code     text,
  location        extensions.geography(Point, 4326) not null,

  phone           text,
  email           text,
  website         text,
  socials         jsonb not null default '{}'::jsonb,

  price_level     smallint,
  amenities       text[] not null default '{}',

  -- Denormalised, trigger-maintained. Search filters and sorts on rating across
  -- the whole table; aggregating reviews per query does not hold up at scale.
  rating          numeric(2, 1) not null default 0,
  review_count    integer not null default 0,

  search_vector   tsvector,

  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint businesses_price_level_range check (price_level is null or price_level between 1 and 4),
  constraint businesses_rating_range check (rating between 0 and 5),
  constraint businesses_review_count_positive check (review_count >= 0),
  constraint businesses_published_has_timestamp check (
    status <> 'published' or published_at is not null
  ),
  constraint businesses_website_scheme check (
    website is null or website ~* '^https?://'
  )
);

create index businesses_status_published_idx
  on public.businesses (status, published_at desc);
create index businesses_location_idx on public.businesses using gist (location);
create index businesses_search_idx on public.businesses using gin (search_vector);
create index businesses_name_trgm_idx
  on public.businesses using gin (name extensions.gin_trgm_ops);
create index businesses_owner_idx on public.businesses (owner_id);
create index businesses_city_idx on public.businesses (city_id, status);
create index businesses_locality_idx on public.businesses (locality_id, status);
create index businesses_rating_idx on public.businesses (rating desc, review_count desc);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.business_categories (
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  is_primary  boolean not null default false,
  primary key (business_id, category_id)
);

create index business_categories_category_idx
  on public.business_categories (category_id);

-- At most one primary category per business.
create unique index business_categories_one_primary_idx
  on public.business_categories (business_id) where is_primary;

-- ---------------------------------------------------------------------------
-- Hours. Multiple rows per weekday express split shifts (a thali place open
-- 11:00-15:00 and 19:00-23:00). `closes < opens` means the slot runs past
-- midnight — is_open_at() handles that case explicitly.
-- ---------------------------------------------------------------------------

create table public.business_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  day_of_week smallint not null,   -- 0 = Sunday, matching JS getDay()
  opens       time not null,
  closes      time not null,

  constraint business_hours_day_range check (day_of_week between 0 and 6),
  constraint business_hours_not_empty check (opens <> closes)
);

create index business_hours_business_idx
  on public.business_hours (business_id, day_of_week);

create table public.hours_overrides (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  on_date     date not null,
  closed      boolean not null default false,
  opens       time,
  closes      time,
  note        text,

  constraint hours_overrides_unique unique (business_id, on_date),
  constraint hours_overrides_shape check (
    (closed and opens is null and closes is null)
    or (not closed and opens is not null and closes is not null)
  )
);

comment on table public.hours_overrides is
  'Diwali, Holi, Eid, regional festivals. Without these, open-now is wrong on '
  'exactly the days people most want to know.';

-- ---------------------------------------------------------------------------

create table public.business_photos (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  storage_path text not null,
  alt          text,
  alt_i18n     jsonb not null default '{}'::jsonb,
  sort_order   int not null default 0,
  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index business_photos_business_idx
  on public.business_photos (business_id, sort_order);

create table public.services (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null,
  name_i18n    jsonb not null default '{}'::jsonb,
  price_min    numeric(10, 2),
  price_max    numeric(10, 2),
  currency     char(3) not null default 'INR',
  duration_min int,
  sort_order   int not null default 0,

  constraint services_price_order check (
    price_min is null or price_max is null or price_max >= price_min
  )
);

create index services_business_idx on public.services (business_id, sort_order);

create table public.offers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title       text not null,
  title_i18n  jsonb not null default '{}'::jsonb,
  description text,
  valid_from  date not null,
  valid_to    date not null,
  terms       text,

  constraint offers_date_order check (valid_to >= valid_from)
);

create index offers_business_idx on public.offers (business_id, valid_to);

-- ===========================================================================
-- Search vector
--
-- Trigger-maintained rather than GENERATED, because the weights include values
-- from other tables (categories, city, locality) and a generated column may
-- only reference its own row.
--
-- Two configurations per field: `english` supplies stemming for Latin text,
-- `simple` indexes the raw tokens so Devanagari and other Indic scripts — for
-- which Postgres ships no stemmer — are still searchable. pg_trgm on `name`
-- covers typos and transliteration slips ("bombay" vs "mumbai").
-- ===========================================================================

create or replace function public.jsonb_values_text(source jsonb)
returns text
language sql
immutable
set search_path = pg_temp
as $$
  select coalesce(string_agg(value, ' '), '')
  from jsonb_each_text(coalesce(source, '{}'::jsonb)) as entry(key, value)
$$;

create or replace function public.businesses_refresh_search_vector()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  place_terms text;
begin
  select coalesce(string_agg(term, ' '), '') into place_terms
  from (
    select c.name as term from public.cities c where c.id = new.city_id
    union all
    select public.jsonb_values_text(c.name_i18n) from public.cities c where c.id = new.city_id
    union all
    select l.name from public.localities l where l.id = new.locality_id
    union all
    select public.jsonb_values_text(l.name_i18n) from public.localities l where l.id = new.locality_id
    union all
    select cat.name
    from public.business_categories bc
    join public.categories cat on cat.id = bc.category_id
    where bc.business_id = new.id
    union all
    select public.jsonb_values_text(cat.name_i18n)
    from public.business_categories bc
    join public.categories cat on cat.id = bc.category_id
    where bc.business_id = new.id
  ) as terms(term);

  new.search_vector :=
      setweight(to_tsvector('english', coalesce(new.name, '')), 'A')
   || setweight(to_tsvector('simple', unaccent(coalesce(new.name, ''))), 'A')
   || setweight(to_tsvector('simple', public.jsonb_values_text(new.name_i18n)), 'A')
   || setweight(to_tsvector('simple', unaccent(place_terms)), 'B')
   || setweight(to_tsvector('simple', array_to_string(new.amenities, ' ')), 'B')
   || setweight(to_tsvector('english', coalesce(new.description, '')), 'C')
   || setweight(to_tsvector('simple', public.jsonb_values_text(new.description_i18n)), 'C');

  return new;
end;
$$;

create trigger businesses_search_vector
  before insert or update of
    name, name_i18n, description, description_i18n, amenities, city_id, locality_id
  on public.businesses
  for each row execute function public.businesses_refresh_search_vector();

-- Category changes must re-weight the parent business.
create or replace function public.business_categories_touch_parent()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.businesses
     set name = name  -- no-op write; fires the search-vector trigger
   where id = coalesce(new.business_id, old.business_id);
  return coalesce(new, old);
end;
$$;

create trigger business_categories_touch_parent
  after insert or delete on public.business_categories
  for each row execute function public.business_categories_touch_parent();

-- ===========================================================================
-- Ownership helper
--
-- SECURITY DEFINER so child-table policies can ask "does the caller own the
-- parent?" without invoking businesses' own policies. Keeps the policy graph
-- acyclic and the behaviour obvious.
-- ===========================================================================

create or replace function public.owns_business(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target and b.owner_id = auth.uid() and auth.uid() is not null
  )
$$;

create or replace function public.business_is_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target and b.status = 'published'
  )
$$;

-- ===========================================================================
-- Owner column guard
--
-- Owners may edit their listing's content. They may NOT grant themselves
-- verification, publish a suspended listing, hand ownership to someone else, or
-- write their own rating. RLS gates rows; this gates columns.
-- ===========================================================================

create or replace function public.guard_business_owner_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('request.jwt.claims', true) is null
     or current_setting('request.jwt.claims', true) = '' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.verified     is distinct from old.verified
  or new.status       is distinct from old.status
  or new.owner_id     is distinct from old.owner_id
  or new.rating       is distinct from old.rating
  or new.review_count is distinct from old.review_count
  or new.market_code  is distinct from old.market_code
  or new.slug         is distinct from old.slug then
    raise exception 'not authorized to change privileged business columns'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger businesses_guard_owner_columns
  before update on public.businesses
  for each row execute function public.guard_business_owner_columns();

-- ===========================================================================
-- RLS
-- ===========================================================================

alter table public.businesses enable row level security;
alter table public.business_categories enable row level security;
alter table public.business_hours enable row level security;
alter table public.hours_overrides enable row level security;
alter table public.business_photos enable row level security;
alter table public.services enable row level security;
alter table public.offers enable row level security;

create policy businesses_select_published on public.businesses
  for select using (
    status = 'published'
    or (owner_id is not null and owner_id = auth.uid())
    or public.is_admin()
  );

-- A new listing always enters the moderation queue. It cannot arrive published.
create policy businesses_insert_own on public.businesses
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and status in ('draft', 'pending')
    and not verified
  );

create policy businesses_update_own on public.businesses
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy businesses_admin_all on public.businesses
  for all using (public.is_admin()) with check (public.is_admin());

-- Child tables share one rule: readable when the parent is public, writable by
-- the parent's owner, and fully open to admins.
do $$
declare
  child text;
begin
  foreach child in array array[
    'business_categories', 'business_hours', 'hours_overrides',
    'business_photos', 'services', 'offers'
  ]
  loop
    execute format($f$
      create policy %1$s_select_public on public.%1$s
        for select using (
          public.business_is_public(business_id)
          or public.owns_business(business_id)
          or public.is_admin()
        );

      create policy %1$s_owner_write on public.%1$s
        for all to authenticated
        using (public.owns_business(business_id))
        with check (public.owns_business(business_id));

      create policy %1$s_admin_all on public.%1$s
        for all using (public.is_admin()) with check (public.is_admin());
    $f$, child);
  end loop;
end;
$$;
