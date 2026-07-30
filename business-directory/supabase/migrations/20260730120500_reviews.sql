-- ===========================================================================
-- Reviews and the trust signals around them.
-- ===========================================================================

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null,
  body        text not null,
  status      public.review_status not null default 'published',
  created_at  timestamptz not null default now(),
  edited_at   timestamptz,

  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_body_length check (char_length(btrim(body)) between 10 and 3000),
  -- One review per person per business. Re-reviewing is an edit, not a new row.
  constraint reviews_one_per_author unique (business_id, author_id)
);

create index reviews_business_idx
  on public.reviews (business_id, status, created_at desc);
create index reviews_author_idx on public.reviews (author_id, created_at desc);

-- ---------------------------------------------------------------------------
-- You cannot review your own business.
--
-- Enforced by trigger rather than CHECK, because a CHECK constraint may not
-- read another table.
-- ---------------------------------------------------------------------------

create or replace function public.reviews_reject_self_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.businesses b
    where b.id = new.business_id and b.owner_id = new.author_id
  ) then
    raise exception 'cannot review a business you own'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reviews_no_self_review
  before insert or update on public.reviews
  for each row execute function public.reviews_reject_self_review();

-- ---------------------------------------------------------------------------

create table public.review_photos (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references public.reviews (id) on delete cascade,
  storage_path text not null,
  sort_order   int not null default 0
);

create index review_photos_review_idx on public.review_photos (review_id, sort_order);

-- One owner reply per review, publicly attributed.
create table public.review_replies (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null unique references public.reviews (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint review_replies_body_length check (char_length(btrim(body)) between 2 and 2000)
);

create trigger review_replies_set_updated_at
  before update on public.review_replies
  for each row execute function public.set_updated_at();

-- Helpful votes. This is what makes "most helpful" a real sort instead of the
-- prototype's Math.random().
create table public.review_votes (
  review_id  uuid not null references public.reviews (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index review_votes_review_idx on public.review_votes (review_id);

create table public.review_reports (
  id              uuid primary key default gen_random_uuid(),
  review_id       uuid not null references public.reviews (id) on delete cascade,
  reporter_id     uuid not null references public.profiles (id) on delete cascade,
  reason          text not null,
  detail          text,
  status          public.report_status not null default 'pending',
  resolved_by     uuid references public.profiles (id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now(),

  constraint review_reports_one_per_reporter unique (review_id, reporter_id),
  constraint review_reports_resolution_shape check (
    (status = 'pending') = (resolved_at is null)
  )
);

create index review_reports_status_idx on public.review_reports (status, created_at);

-- ===========================================================================
-- Denormalised rating maintenance
--
-- Only `published` reviews count toward the public rating, so moderating a
-- review immediately corrects the business's score.
-- ===========================================================================

create or replace function public.refresh_business_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target uuid := coalesce(new.business_id, old.business_id);
begin
  update public.businesses b
     set rating = coalesce(agg.avg_rating, 0),
         review_count = coalesce(agg.total, 0)
    from (
      select round(avg(r.rating)::numeric, 1) as avg_rating, count(*) as total
      from public.reviews r
      where r.business_id = target and r.status = 'published'
    ) as agg
   where b.id = target;

  return coalesce(new, old);
end;
$$;

create trigger reviews_refresh_rating
  after insert or update of rating, status or delete on public.reviews
  for each row execute function public.refresh_business_rating();

-- ---------------------------------------------------------------------------
-- Owner replies must belong to the business the review targets.
-- ---------------------------------------------------------------------------

create or replace function public.review_replies_check_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.reviews r
    where r.id = new.review_id and r.business_id = new.business_id
  ) then
    raise exception 'reply business_id does not match the review'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger review_replies_target_matches
  before insert or update on public.review_replies
  for each row execute function public.review_replies_check_target();

-- ===========================================================================
-- RLS
-- ===========================================================================

alter table public.reviews enable row level security;
alter table public.review_photos enable row level security;
alter table public.review_replies enable row level security;
alter table public.review_votes enable row level security;
alter table public.review_reports enable row level security;

create policy reviews_select_published on public.reviews
  for select using (
    (status = 'published' and public.business_is_public(business_id))
    or author_id = auth.uid()
    or public.owns_business(business_id)   -- owners see flagged reviews on their listing
    or public.is_admin()
  );

create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'published'
    and public.business_is_public(business_id)
  );

-- Editing is allowed for 24 hours. After that the review is part of the record.
create policy reviews_update_own on public.reviews
  for update to authenticated
  using (author_id = auth.uid() and created_at > now() - interval '24 hours')
  with check (author_id = auth.uid() and status = 'published');

create policy reviews_delete_own on public.reviews
  for delete to authenticated using (author_id = auth.uid());

create policy reviews_admin_all on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- Photos follow their review.
create policy review_photos_select on public.review_photos
  for select using (
    exists (select 1 from public.reviews r where r.id = review_id)
  );

create policy review_photos_write_own on public.review_photos
  for all to authenticated
  using (exists (
    select 1 from public.reviews r where r.id = review_id and r.author_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.reviews r where r.id = review_id and r.author_id = auth.uid()
  ));

create policy review_photos_admin_all on public.review_photos
  for all using (public.is_admin()) with check (public.is_admin());

create policy review_replies_select on public.review_replies
  for select using (public.business_is_public(business_id) or public.is_admin());

create policy review_replies_owner_write on public.review_replies
  for all to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id) and author_id = auth.uid());

create policy review_replies_admin_all on public.review_replies
  for all using (public.is_admin()) with check (public.is_admin());

create policy review_votes_select on public.review_votes
  for select using (true);

-- You cannot upvote your own review.
create policy review_votes_insert_own on public.review_votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (
      select 1 from public.reviews r where r.id = review_id and r.author_id = auth.uid()
    )
  );

create policy review_votes_delete_own on public.review_votes
  for delete to authenticated using (user_id = auth.uid());

create policy review_reports_insert_own on public.review_reports
  for insert to authenticated with check (reporter_id = auth.uid());

create policy review_reports_select_own on public.review_reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy review_reports_admin_all on public.review_reports
  for all using (public.is_admin()) with check (public.is_admin());
