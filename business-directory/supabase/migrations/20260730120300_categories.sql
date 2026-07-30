-- ===========================================================================
-- Categories. Self-referencing so subcategories are possible without a
-- second table.
-- ===========================================================================

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  name_i18n  jsonb not null default '{}'::jsonb,
  icon       text,
  parent_id  uuid references public.categories (id) on delete set null,
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),

  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_not_own_parent check (parent_id is distinct from id)
);

create index categories_parent_idx on public.categories (parent_id);
create index categories_active_sort_idx on public.categories (active, sort_order);

alter table public.categories enable row level security;

create policy categories_select_active on public.categories
  for select using (active or public.is_admin());

create policy categories_admin_all on public.categories
  for all using (public.is_admin()) with check (public.is_admin());
