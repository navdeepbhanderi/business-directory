-- ===========================================================================
-- Saved content, monetization, and analytics.
-- ===========================================================================

create table public.favorites (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, business_id)
);

create index favorites_business_idx on public.favorites (business_id);

create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  description text,
  visibility  public.list_visibility not null default 'private',
  share_slug  text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint lists_name_length check (char_length(btrim(name)) between 1 and 80),
  -- A shareable list needs a slug; a private one must not leak one.
  constraint lists_share_slug_shape check (
    (visibility = 'private' and share_slug is null)
    or (visibility <> 'private' and share_slug is not null)
  )
);

create index lists_owner_idx on public.lists (owner_id, updated_at desc);

create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create table public.list_items (
  list_id     uuid not null references public.lists (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  note        text,
  sort_order  int not null default 0,
  added_at    timestamptz not null default now(),
  primary key (list_id, business_id)
);

create index list_items_list_idx on public.list_items (list_id, sort_order);

create table public.saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  params     jsonb not null,
  notify     boolean not null default false,
  created_at timestamptz not null default now()
);

create index saved_searches_user_idx on public.saved_searches (user_id);

create table public.notification_preferences (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  offers             boolean not null default true,
  reviews_on_saved   boolean not null default true,
  city_promotions    boolean not null default false,
  frequency          text not null default 'instant',
  email_enabled      boolean not null default true,
  push_enabled       boolean not null default false,
  sms_enabled        boolean not null default false,
  updated_at         timestamptz not null default now(),

  constraint notification_frequency_valid
    check (frequency in ('instant', 'daily', 'weekly'))
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Monetization
-- ---------------------------------------------------------------------------

create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  name_i18n     jsonb not null default '{}'::jsonb,
  price_monthly numeric(10, 2) not null default 0,
  currency      char(3) not null default 'INR',
  features      jsonb not null default '[]'::jsonb,
  sort_order    int not null default 0,
  active        boolean not null default true,

  constraint plans_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint plans_price_positive check (price_monthly >= 0)
);

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references public.businesses (id) on delete cascade,
  plan_id                uuid not null references public.plans (id) on delete restrict,
  status                 public.subscription_status not null default 'trialing',
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index subscriptions_one_active_per_business_idx
  on public.subscriptions (business_id)
  where status in ('trialing', 'active', 'past_due');

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.promoted_placements (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  surface     text not null,
  city_id     uuid references public.cities (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  weight      int not null default 1,

  constraint promoted_date_order check (ends_at > starts_at),
  constraint promoted_weight_range check (weight between 1 and 100),
  constraint promoted_surface_valid check (surface in ('home', 'search', 'city', 'category'))
);

create index promoted_active_idx on public.promoted_placements (surface, starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- Analytics
--
-- Replaces the prototype's hardcoded `views: 1250`. Anonymous inserts are
-- allowed because most events come from signed-out visitors; `session_hash` is
-- a salted hash rather than an identifier, so it supports de-duplication
-- without storing anything that identifies a person.
-- ---------------------------------------------------------------------------

create table public.business_events (
  id           bigint generated always as identity primary key,
  business_id  uuid not null references public.businesses (id) on delete cascade,
  event_type   public.business_event_type not null,
  occurred_at  timestamptz not null default now(),
  session_hash text,
  referrer     text,
  locale       text
);

create index business_events_business_time_idx
  on public.business_events (business_id, occurred_at desc);
create index business_events_type_idx
  on public.business_events (business_id, event_type, occurred_at desc);

-- ===========================================================================
-- RLS
-- ===========================================================================

alter table public.favorites enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.saved_searches enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.promoted_placements enable row level security;
alter table public.business_events enable row level security;

create policy favorites_own_all on public.favorites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Shared lists are readable by anyone holding the link.
create policy lists_select_own_or_shared on public.lists
  for select using (
    owner_id = auth.uid() or visibility in ('unlisted', 'public') or public.is_admin()
  );

create policy lists_write_own on public.lists
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy list_items_select on public.list_items
  for select using (
    exists (
      select 1 from public.lists l
      where l.id = list_id
        and (l.owner_id = auth.uid() or l.visibility in ('unlisted', 'public'))
    )
    or public.is_admin()
  );

create policy list_items_write_own on public.list_items
  for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()));

create policy saved_searches_own_all on public.saved_searches
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_preferences_own_all on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy plans_select_active on public.plans
  for select using (active or public.is_admin());

create policy plans_admin_all on public.plans
  for all using (public.is_admin()) with check (public.is_admin());

-- Owners read their own billing state. Writes come from the Stripe webhook via
-- the service role, which bypasses RLS entirely.
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (public.owns_business(business_id) or public.is_admin());

create policy subscriptions_admin_all on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

create policy promoted_select_all on public.promoted_placements
  for select using (true);

create policy promoted_admin_all on public.promoted_placements
  for all using (public.is_admin()) with check (public.is_admin());

-- Anyone may record an event on a published listing; nobody may read raw rows.
-- Owners get aggregates through a SECURITY DEFINER function in Phase 8.
create policy business_events_insert_any on public.business_events
  for insert with check (public.business_is_public(business_id));

create policy business_events_admin_select on public.business_events
  for select using (public.is_admin());
