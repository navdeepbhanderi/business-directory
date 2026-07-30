-- ===========================================================================
-- Markets and geography.
--
-- India is the only active market, but every market-specific fact lives in a
-- row rather than in application constants. Adding a country is an INSERT.
-- ===========================================================================

create table public.markets (
  code          char(2) primary key,               -- ISO 3166-1 alpha-2
  name          text        not null,
  name_i18n     jsonb       not null default '{}'::jsonb,
  time_zone     text        not null,              -- IANA, e.g. Asia/Kolkata
  currency      char(3)     not null,              -- ISO 4217
  dial_code     text        not null,              -- E.164, no leading '+'
  -- [west, south, east, north] — seeds default map viewports.
  bounds        numeric(9, 6)[] not null,
  locales       text[]      not null default '{en}',
  active        boolean     not null default true,
  created_at    timestamptz not null default now(),

  constraint markets_code_upper check (code = upper(code)),
  constraint markets_currency_upper check (currency = upper(currency)),
  constraint markets_dial_code_numeric check (dial_code ~ '^[0-9]{1,4}$'),
  constraint markets_bounds_shape check (
    array_length(bounds, 1) = 4
    and bounds[1] between -180 and 180
    and bounds[3] between -180 and 180
    and bounds[2] between -90 and 90
    and bounds[4] between -90 and 90
    and bounds[3] > bounds[1]
    and bounds[4] > bounds[2]
  ),
  constraint markets_locales_present check (array_length(locales, 1) >= 1)
);

comment on table public.markets is
  'One row per country served. Timezone drives open-now correctness — never the server clock.';

-- ---------------------------------------------------------------------------

create table public.cities (
  id              uuid primary key default gen_random_uuid(),
  market_code     char(2) not null references public.markets (code) on delete restrict,
  slug            text    not null,
  name            text    not null,
  name_i18n       jsonb   not null default '{}'::jsonb,
  state           text,
  centroid        extensions.geography(Point, 4326) not null,
  population_rank int,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),

  constraint cities_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint cities_slug_unique_per_market unique (market_code, slug)
);

create index cities_centroid_idx on public.cities using gist (centroid);
create index cities_market_active_idx on public.cities (market_code, active);

-- ---------------------------------------------------------------------------

create table public.localities (
  id         uuid primary key default gen_random_uuid(),
  city_id    uuid not null references public.cities (id) on delete cascade,
  slug       text not null,
  name       text not null,
  name_i18n  jsonb not null default '{}'::jsonb,
  centroid   extensions.geography(Point, 4326),
  active     boolean not null default true,
  created_at timestamptz not null default now(),

  constraint localities_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint localities_slug_unique_per_city unique (city_id, slug)
);

create index localities_city_idx on public.localities (city_id, active);
create index localities_centroid_idx on public.localities using gist (centroid);

comment on table public.localities is
  'Neighbourhood granularity — Navrangpura, Indiranagar. Powers fine-grained landing pages.';

-- ===========================================================================
-- RLS
--
-- Reference geography is world-readable; only admins may change it.
-- ===========================================================================

alter table public.markets enable row level security;
alter table public.cities enable row level security;
alter table public.localities enable row level security;

create policy markets_select_active on public.markets
  for select using (active or public.is_admin());

create policy markets_admin_all on public.markets
  for all using (public.is_admin()) with check (public.is_admin());

create policy cities_select_active on public.cities
  for select using (active or public.is_admin());

create policy cities_admin_all on public.cities
  for all using (public.is_admin()) with check (public.is_admin());

create policy localities_select_active on public.localities
  for select using (active or public.is_admin());

create policy localities_admin_all on public.localities
  for all using (public.is_admin()) with check (public.is_admin());
