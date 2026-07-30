-- ===========================================================================
-- Seed data — India.
--
-- IMPORTANT: every business, review, and account below is INVENTED. Names are
-- plausible for their city and category but do not refer to real establishments.
-- Attaching fabricated ratings to real businesses would be defamatory, so the
-- demo does not do it. See PLAN.md section 12.
--
-- Deterministic: setseed() fixes the PRNG so `db reset` reproduces byte-identical
-- data, which keeps tests and snapshots stable.
-- ===========================================================================

select setseed(0.42);

-- ---------------------------------------------------------------------------
-- Market
-- ---------------------------------------------------------------------------

insert into public.markets (code, name, name_i18n, time_zone, currency, dial_code, bounds, locales)
values (
  'IN', 'India', '{"hi": "भारत"}'::jsonb,
  'Asia/Kolkata', 'INR', '91',
  array[68.1, 6.5, 97.4, 35.7]::numeric(9,6)[],
  array['en', 'hi']
);

-- ---------------------------------------------------------------------------
-- Cities and localities
--
-- Centroids are approximate city centres; locality points are offset from them.
-- Precise to roughly the right neighbourhood, which is all a demo needs.
-- ---------------------------------------------------------------------------

insert into public.cities (market_code, slug, name, name_i18n, state, centroid, population_rank)
values
  ('IN', 'ahmedabad', 'Ahmedabad', '{"hi": "अहमदाबाद"}', 'Gujarat',
   extensions.ST_SetSRID(extensions.ST_MakePoint(72.5714, 23.0225), 4326)::extensions.geography, 5),
  ('IN', 'mumbai', 'Mumbai', '{"hi": "मुंबई"}', 'Maharashtra',
   extensions.ST_SetSRID(extensions.ST_MakePoint(72.8777, 19.0760), 4326)::extensions.geography, 1),
  ('IN', 'bengaluru', 'Bengaluru', '{"hi": "बेंगलुरु"}', 'Karnataka',
   extensions.ST_SetSRID(extensions.ST_MakePoint(77.5946, 12.9716), 4326)::extensions.geography, 3),
  ('IN', 'delhi', 'Delhi', '{"hi": "दिल्ली"}', 'Delhi',
   extensions.ST_SetSRID(extensions.ST_MakePoint(77.2090, 28.6139), 4326)::extensions.geography, 2),
  ('IN', 'pune', 'Pune', '{"hi": "पुणे"}', 'Maharashtra',
   extensions.ST_SetSRID(extensions.ST_MakePoint(73.8567, 18.5204), 4326)::extensions.geography, 7),
  ('IN', 'hyderabad', 'Hyderabad', '{"hi": "हैदराबाद"}', 'Telangana',
   extensions.ST_SetSRID(extensions.ST_MakePoint(78.4867, 17.3850), 4326)::extensions.geography, 4);

do $$
declare
  city_slug text;
  loc       text;
  loc_slug  text;
  idx       int;
  c         public.cities;
  spec      jsonb := '{
    "ahmedabad": ["Navrangpura", "Satellite", "Maninagar", "Bodakdev", "Vastrapur"],
    "mumbai":    ["Bandra West", "Andheri East", "Dadar", "Powai", "Colaba"],
    "bengaluru": ["Indiranagar", "Koramangala", "Jayanagar", "Whitefield", "Malleshwaram"],
    "delhi":     ["Connaught Place", "Hauz Khas", "Karol Bagh", "Saket", "Lajpat Nagar"],
    "pune":      ["Koregaon Park", "Kothrud", "Viman Nagar", "Deccan Gymkhana", "Hadapsar"],
    "hyderabad": ["Banjara Hills", "Jubilee Hills", "Gachibowli", "Secunderabad", "Madhapur"]
  }'::jsonb;
begin
  for city_slug in select jsonb_object_keys(spec) loop
    select * into c from public.cities where slug = city_slug;
    idx := 0;
    for loc in select jsonb_array_elements_text(spec -> city_slug) loop
      idx := idx + 1;
      loc_slug := public.slugify(loc);
      insert into public.localities (city_id, slug, name, centroid)
      values (
        c.id, loc_slug, loc,
        extensions.ST_SetSRID(
          extensions.ST_MakePoint(
            extensions.ST_X(c.centroid::extensions.geometry) + ((idx - 3) * 0.021),
            extensions.ST_Y(c.centroid::extensions.geometry) + ((idx - 3) * 0.017)
          ), 4326
        )::extensions.geography
      );
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Categories — chosen for what people actually search for in India.
-- ---------------------------------------------------------------------------

insert into public.categories (slug, name, name_i18n, icon, sort_order) values
  ('restaurants',        'Restaurants',            '{"hi": "रेस्टोरेंट"}',        'utensils',     1),
  ('street-food',        'Street Food & Chaat',    '{"hi": "स्ट्रीट फ़ूड और चाट"}', 'soup',         2),
  ('sweets-bakery',      'Sweets & Bakery',        '{"hi": "मिठाई और बेकरी"}',     'cake',         3),
  ('tiffin-services',    'Tiffin & Meal Services', '{"hi": "टिफ़िन सेवाएँ"}',       'lunch-box',    4),
  ('kirana-grocery',     'Kirana & Grocery',       '{"hi": "किराना और ग्रॉसरी"}',   'shopping-bag', 5),
  ('salons-spa',         'Salons & Spa',           '{"hi": "सैलून और स्पा"}',       'scissors',     6),
  ('clinics-diagnostics','Clinics & Diagnostics',  '{"hi": "क्लिनिक और जाँच"}',     'stethoscope',  7),
  ('pharmacies',         'Pharmacies',             '{"hi": "मेडिकल स्टोर"}',        'pill',         8),
  ('tuition-coaching',   'Tuition & Coaching',     '{"hi": "ट्यूशन और कोचिंग"}',    'graduation-cap', 9),
  ('gyms-fitness',       'Gyms & Fitness',         '{"hi": "जिम और फ़िटनेस"}',      'dumbbell',    10),
  ('mobile-repair',      'Mobile & Electronics Repair', '{"hi": "मोबाइल रिपेयर"}',  'smartphone',  11),
  ('tailors-boutiques',  'Tailors & Boutiques',    '{"hi": "दर्जी और बुटीक"}',      'shirt',       12);

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------

insert into public.plans (slug, name, name_i18n, price_monthly, currency, features, sort_order) values
  ('basic', 'Basic', '{"hi": "बेसिक"}', 0, 'INR',
   '["Listing in search", "Up to 5 photos", "Contact details", "Opening hours"]', 1),
  ('premium', 'Premium', '{"hi": "प्रीमियम"}', 799, 'INR',
   '["Everything in Basic", "Up to 20 photos", "Priority placement", "Analytics dashboard", "Reply to reviews", "Offers and promotions"]', 2),
  ('business', 'Business', '{"hi": "बिज़नेस"}', 2499, 'INR',
   '["Everything in Premium", "Unlimited photos and video", "Top placement", "Multi-location support", "Advanced analytics", "Priority support"]', 3);

-- ===========================================================================
-- Accounts
--
-- Inserted directly into auth.users; the on_auth_user_created trigger creates
-- the matching profile. Every demo account uses the password `demo123456`.
-- ===========================================================================

do $$
declare
  first_names text[] := array[
    'Aarav','Priya','Rohan','Ananya','Vikram','Meera','Arjun','Kavya','Rahul','Divya',
    'Siddharth','Neha','Karthik','Shreya','Aditya','Pooja','Nikhil','Ritu','Manish','Sneha',
    'Imran','Fatima','Joseph','Lakshmi','Sanjay','Anjali','Harsh','Tara','Vivek','Ishita'];
  last_names text[] := array[
    'Patel','Sharma','Iyer','Reddy','Desai','Nair','Gupta','Rao','Mehta','Joshi',
    'Kulkarni','Banerjee','Shah','Menon','Chauhan','Pillai','Bhatt','Verma','Kapoor','Naidu'];
  i          int;
  uid        uuid;
  fname      text;
  lname      text;
  v_full_name text;
  v_email     text;
  assigned   public.user_role;
begin
  for i in 1..80 loop
    uid   := gen_random_uuid();
    fname := first_names[1 + ((i * 7) % array_length(first_names, 1))];
    lname := last_names[1 + ((i * 11) % array_length(last_names, 1))];
    v_full_name := fname || ' ' || lname;
    v_email := lower(fname) || '.' || lower(lname) || i || '@example.com';

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token,
      recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      v_email, extensions.crypt('demo123456', extensions.gen_salt('bf')),
      now() - (i || ' days')::interval,
      now() - (i || ' days')::interval,
      now() - (i || ' days')::interval,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name,
                         'locale', case when i % 5 = 0 then 'hi' else 'en' end),
      '', '', '', ''
    );

    -- 1 admin, 20 owners, the rest ordinary members.
    assigned := case
      when i = 1 then 'admin'
      when i between 2 and 21 then 'owner'
      else 'user'
    end::public.user_role;

    -- created_at mirrors the auth user. Without this every profile shares the
    -- transaction timestamp, which makes any `order by created_at` a coin flip.
    update public.profiles
       set role = assigned,
           full_name = v_full_name,
           locale = case when i % 5 = 0 then 'hi' else 'en' end,
           created_at = now() - (i || ' days')::interval
     where id = uid;
  end loop;
end;
$$;

-- ===========================================================================
-- Businesses
--
-- 120 listings: 10 per category, spread across the six cities.
-- ===========================================================================



do $$
declare
  rec           record;
  idx           int := 0;
  biz_id        uuid;
  city_rec      public.cities;
  loc_rec       public.localities;
  owner_uid     uuid;
  city_slugs    text[] := array['ahmedabad','mumbai','bengaluru','delhi','pune','hyderabad'];
  amenity_pool  text[] := array['Parking','Card payment','UPI accepted','Air conditioned',
                                'Home delivery','Wheelchair accessible','Wi-Fi','Family seating'];
  chosen        text[];
  photo_pool    text[] := array[
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800'];
  base_slug     text;
  final_slug    text;
  status_pick   public.business_status;
  d             int;
begin
  -- Inlined rather than staged in a table: the CLI parses a whole batch
  -- before executing it, so a CREATE TABLE and a DO block that reads it
  -- cannot share a batch.
  for rec in
    select * from (values
('restaurants','Gopi Dining Hall'),('restaurants','Shri Krishna Bhojanalaya'),
  ('restaurants','Swati Snacks Corner'),('restaurants','Rajdhani Thali House'),
  ('restaurants','Vishala Village Kitchen'),('restaurants','Kamat Family Restaurant'),
  ('restaurants','Anand Bhavan Pure Veg'),('restaurants','Deccan Spice House'),
  ('restaurants','Malabar Coast Kitchen'),('restaurants','Punjab Grill Corner'),

  ('street-food','Manek Chowk Chaat Centre'),('street-food','Tundey Kebab Stall'),
  ('street-food','Juhu Beach Pav Bhaji'),('street-food','Chandni Chowk Golgappa'),
  ('street-food','Vada Pav Junction'),('street-food','Bhel Puri Express'),
  ('street-food','Kathi Roll Kingdom'),('street-food','Dosa Point Corner'),
  ('street-food','Momo Magic Cart'),('street-food','Misal Pav House'),

  ('sweets-bakery','Kandoi Bhogilal Mulchand'),('sweets-bakery','Chhappan Bhog Sweets'),
  ('sweets-bakery','Iyengar Bakery'),('sweets-bakery','Hot Breads Bakery'),
  ('sweets-bakery','Ghasitaram Halwai'),('sweets-bakery','Bombay Sweet Mart'),
  ('sweets-bakery','Karachi Bakery Outlet'),('sweets-bakery','Mysore Pak House'),
  ('sweets-bakery','Sugar & Spice Patisserie'),('sweets-bakery','Anand Sweets Corner'),

  ('tiffin-services','Annapurna Tiffin Service'),('tiffin-services','Ghar Ka Khana Tiffin'),
  ('tiffin-services','Maa Ki Rasoi Dabba'),('tiffin-services','Swad Tiffin Centre'),
  ('tiffin-services','Daily Dabba Service'),('tiffin-services','Shubham Tiffin House'),
  ('tiffin-services','Homely Meals Kitchen'),('tiffin-services','Sai Tiffin Suppliers'),
  ('tiffin-services','Green Leaf Tiffin'),('tiffin-services','Nutri Dabba Kitchen'),

  ('kirana-grocery','Jai Bhavani Kirana Store'),('kirana-grocery','Shree Ganesh Provisions'),
  ('kirana-grocery','Apna Bazaar Grocery'),('kirana-grocery','Daily Needs Super Store'),
  ('kirana-grocery','Fresh Mart Kirana'),('kirana-grocery','Balaji General Stores'),
  ('kirana-grocery','Sharma Provision Store'),('kirana-grocery','Metro Grocery Point'),
  ('kirana-grocery','Nature Basket Organics'),('kirana-grocery','Laxmi Super Bazaar'),

  ('salons-spa','Naturals Salon & Spa'),('salons-spa','Lakme Beauty Studio'),
  ('salons-spa','Green Trends Unisex Salon'),('salons-spa','Bliss Ayurvedic Spa'),
  ('salons-spa','Studio 9 Hair Lounge'),('salons-spa','Enrich Beauty Bar'),
  ('salons-spa','Kerala Ayurveda Wellness'),('salons-spa','Glow Up Salon'),
  ('salons-spa','Barber Junction'),('salons-spa','Serene Day Spa'),

  ('clinics-diagnostics','Aarogya Multispeciality Clinic'),('clinics-diagnostics','Sanjeevani Health Centre'),
  ('clinics-diagnostics','Dr Mehta Family Clinic'),('clinics-diagnostics','Metropolis Diagnostics'),
  ('clinics-diagnostics','Lifeline Polyclinic'),('clinics-diagnostics','Sparsh Dental Care'),
  ('clinics-diagnostics','Vision Plus Eye Clinic'),('clinics-diagnostics','Shanti Childrens Clinic'),
  ('clinics-diagnostics','Path Lab Diagnostics'),('clinics-diagnostics','Ayush Wellness Clinic'),

  ('pharmacies','Apollo Pharmacy Outlet'),('pharmacies','MedPlus Medical Store'),
  ('pharmacies','Jan Aushadhi Kendra'),('pharmacies','Wellness Forever Chemist'),
  ('pharmacies','Sanjivani Medical Stores'),('pharmacies','City Care Pharmacy'),
  ('pharmacies','Krishna Medical Agency'),('pharmacies','Health First Chemist'),
  ('pharmacies','New Life Pharmacy'),('pharmacies','Guardian Medicare'),

  ('tuition-coaching','Aakash Coaching Centre'),('tuition-coaching','Vidya Mandir Classes'),
  ('tuition-coaching','Brilliant Tutorials Hub'),('tuition-coaching','Genius Kids Academy'),
  ('tuition-coaching','Success Point Coaching'),('tuition-coaching','Sharma Maths Classes'),
  ('tuition-coaching','Spoken English Institute'),('tuition-coaching','Career Launcher Centre'),
  ('tuition-coaching','Abacus Learning Studio'),('tuition-coaching','Scholars Academy'),

  ('gyms-fitness','Gold Gym Fitness Centre'),('gyms-fitness','Anytime Fitness Studio'),
  ('gyms-fitness','Iron Paradise Gym'),('gyms-fitness','Yoga Shala Studio'),
  ('gyms-fitness','CrossFit Box Arena'),('gyms-fitness','Fitness First Club'),
  ('gyms-fitness','Zumba Dance Fitness'),('gyms-fitness','Power House Gym'),
  ('gyms-fitness','Wellness Yoga Kendra'),('gyms-fitness','Body Zone Fitness'),

  ('mobile-repair','Mobile Care Repair Hub'),('mobile-repair','Gadget Doctor Service'),
  ('mobile-repair','Screen Fix Express'),('mobile-repair','Tech Point Repairs'),
  ('mobile-repair','iService Mobile Care'),('mobile-repair','Laptop Care Centre'),
  ('mobile-repair','Quick Fix Electronics'),('mobile-repair','Smart Repair Studio'),
  ('mobile-repair','Digital Solutions Repair'),('mobile-repair','Mobile Mart Service'),

  ('tailors-boutiques','Raymond Tailoring House'),('tailors-boutiques','Silk Route Boutique'),
  ('tailors-boutiques','Master Tailors & Co'),('tailors-boutiques','Anokhi Designer Studio'),
  ('tailors-boutiques','Blouse Studio Couture'),('tailors-boutiques','Sherwani Palace'),
  ('tailors-boutiques','Fabindia Alterations'),('tailors-boutiques','Kalamkari Boutique'),
  ('tailors-boutiques','Perfect Fit Tailors'),('tailors-boutiques','Zari Work Studio')
    ) as t(category_slug, name)
    order by category_slug, name
  loop
    idx := idx + 1;

    select * into city_rec from public.cities
      where slug = city_slugs[1 + (idx % 6)];
    select * into loc_rec from public.localities
      where city_id = city_rec.id
      order by slug
      offset (idx % 5) limit 1;

    -- 100 published, 10 pending moderation, 6 draft, 4 rejected — so the admin
    -- queues have something real in them from the start.
    status_pick := case
      when idx <= 100 then 'published'
      when idx <= 110 then 'pending'
      when idx <= 116 then 'draft'
      else 'rejected'
    end::public.business_status;

    -- 60 of the published listings are claimed by an owner account.
    owner_uid := null;
    if idx <= 60 then
      select id into owner_uid from public.profiles
       where role = 'owner' order by created_at offset (idx % 20) limit 1;
    end if;

    base_slug  := public.slugify(rec.name);
    final_slug := base_slug || '-' || city_rec.slug;

    chosen := array(
      select a from unnest(amenity_pool) a order by md5(a || idx::text) limit 2 + (idx % 3)
    );

    insert into public.businesses (
      slug, name, description, owner_id, status, verified,
      market_code, city_id, locality_id, address_line1, postal_code, location,
      phone, email, website, price_level, amenities, published_at
    ) values (
      final_slug,
      rec.name,
      rec.name || ' is a well-known ' ||
        (select lower(c.name) from public.categories c where c.slug = rec.category_slug) ||
        ' spot in ' || loc_rec.name || ', ' || city_rec.name || '.',
      owner_uid,
      status_pick,
      owner_uid is not null,
      'IN', city_rec.id, loc_rec.id,
      (10 + (idx % 90))::text || ', ' || loc_rec.name || ' Main Road',
      (380000 + idx)::text,
      extensions.ST_SetSRID(
        extensions.ST_MakePoint(
          extensions.ST_X(loc_rec.centroid::extensions.geometry) + ((idx % 11) - 5) * 0.0035,
          extensions.ST_Y(loc_rec.centroid::extensions.geometry) + ((idx % 7) - 3) * 0.0035
        ), 4326
      )::extensions.geography,
      '+91 ' || (70000 + (idx * 137) % 29999)::text || ' ' || (10000 + (idx * 91) % 89999)::text,
      'hello@' || replace(base_slug, '-', '') || '.example.com',
      'https://' || replace(base_slug, '-', '') || '.example.com',
      1 + (idx % 4),
      chosen,
      case when status_pick = 'published' then now() - (idx || ' days')::interval end
    )
    returning id into biz_id;

    insert into public.business_categories (business_id, category_id, is_primary)
    select biz_id, c.id, true from public.categories c where c.slug = rec.category_slug;

    -- A second, related category for roughly a third of listings.
    if idx % 3 = 0 then
      insert into public.business_categories (business_id, category_id, is_primary)
      select biz_id, c.id, false from public.categories c
       where c.slug <> rec.category_slug
       order by md5(c.slug || idx::text) limit 1
      on conflict do nothing;
    end if;

    -- Hours. Every seventh listing closes past midnight; every fifth runs a
    -- split shift; every eleventh shuts one day a week. That variety is what
    -- makes the open-now filter worth testing.
    for d in 0..6 loop
      if idx % 11 = 0 and d = 1 then
        continue;  -- closed Mondays
      end if;

      if idx % 5 = 0 then
        insert into public.business_hours (business_id, day_of_week, opens, closes)
        values (biz_id, d, time '11:00', time '15:00'),
               (biz_id, d, time '18:30', time '22:30');
      elsif idx % 7 = 0 then
        insert into public.business_hours (business_id, day_of_week, opens, closes)
        values (biz_id, d, time '17:00', time '01:30');   -- past midnight
      else
        insert into public.business_hours (business_id, day_of_week, opens, closes)
        values (biz_id, d, time '09:00', time '21:00');
      end if;
    end loop;

    -- Festival closures.
    insert into public.hours_overrides (business_id, on_date, closed, note)
    values (biz_id, date '2026-11-08', true, 'Closed for Diwali')
    on conflict do nothing;

    if idx % 4 = 0 then
      insert into public.hours_overrides (business_id, on_date, closed, opens, closes, note)
      values (biz_id, date '2026-03-04', false, time '11:00', time '16:00', 'Short hours for Holi')
      on conflict do nothing;
    end if;

    insert into public.business_photos (business_id, storage_path, alt, sort_order)
    select biz_id, photo_pool[1 + ((idx + g) % 4)], rec.name || ' photo ' || g, g
    from generate_series(1, 3) g;

    insert into public.services (business_id, name, price_min, price_max, currency, duration_min, sort_order)
    values
      (biz_id, 'Standard service', 150 + (idx % 10) * 50, 400 + (idx % 10) * 60, 'INR', 30, 1),
      (biz_id, 'Premium service',  600 + (idx % 8) * 75, 1200 + (idx % 8) * 90, 'INR', 60, 2);

    if idx % 6 = 0 then
      insert into public.offers (business_id, title, description, valid_from, valid_to, terms)
      values (biz_id, 'Weekday special — 15% off',
              'Flat 15% off on all orders between Monday and Thursday.',
              date '2026-07-01', date '2026-12-31',
              'Not valid with other offers. Dine-in only.');
    end if;
  end loop;
end;
$$;

-- ===========================================================================
-- Reviews
--
-- ~800 reviews. The unique (business_id, author_id) constraint and the
-- no-self-review trigger are both real here — the generator has to respect them,
-- which is a small proof that they work.
-- ===========================================================================

do $$
declare
  biz        record;
  author     uuid;
  n          int;
  i          int;
  rating     smallint;
  bodies     text[] := array[
    'Went here on a weekday evening and it was quick, clean and exactly what I expected. Would come back.',
    'Good value for the price. Staff were patient and answered all my questions without rushing.',
    'Decent enough, but it was very crowded when I visited and the wait was longer than advertised.',
    'Excellent service. They handled a last-minute request without any fuss and the quality was consistent.',
    'Average experience overall. Nothing wrong exactly, but nothing that stood out either.',
    'Have been coming here for two years now. Consistent quality and the owner remembers regulars.',
    'Parking is a real problem in this area, but the place itself is well run and worth the trouble.',
    'Booked over the phone and everything was ready on time. Straightforward and professional.',
    'Not my best visit. The place was understaffed that day and it showed in the wait times.',
    'Genuinely impressed. Clean, well organised, and the pricing was exactly as quoted upfront.'];
begin
  for biz in
    select id, owner_id from public.businesses where status = 'published'
  loop
    n := 4 + (abs(hashtext(biz.id::text)) % 9);   -- 4 to 12 reviews each

    for i in 1..n loop
      select p.id into author
      from public.profiles p
      where p.role <> 'admin'
        and (biz.owner_id is null or p.id <> biz.owner_id)
        and not exists (
          select 1 from public.reviews r
          where r.business_id = biz.id and r.author_id = p.id
        )
      order by md5(p.id::text || biz.id::text || i::text)
      limit 1;

      exit when author is null;

      -- Skewed positive, as real review distributions are.
      rating := (array[5,5,5,4,4,4,3,2,1])[1 + (abs(hashtext(author::text || biz.id::text)) % 9)];

      insert into public.reviews (business_id, author_id, rating, body, created_at)
      values (
        biz.id, author, rating,
        bodies[1 + (abs(hashtext(author::text || i::text)) % array_length(bodies, 1))],
        now() - ((abs(hashtext(author::text)) % 500) || ' days')::interval
      )
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;

-- Helpful votes, so "most helpful" has something to sort by.
insert into public.review_votes (review_id, user_id)
select r.id, p.id
from public.reviews r
join lateral (
  select id from public.profiles
  where id <> r.author_id
  order by md5(id::text || r.id::text)
  limit (abs(hashtext(r.id::text)) % 6)
) p on true
on conflict do nothing;

-- Owner replies on a slice of reviews.
insert into public.review_replies (review_id, business_id, author_id, body)
select r.id, r.business_id, b.owner_id,
       'Thank you for taking the time to write this — we have shared your feedback with the team.'
from public.reviews r
join public.businesses b on b.id = r.business_id
where b.owner_id is not null
  and abs(hashtext(r.id::text)) % 7 = 0
on conflict do nothing;

-- ===========================================================================
-- Moderation queues — a working admin console needs real items in it.
-- ===========================================================================

-- Pending claims on unclaimed published listings.
insert into public.claims (business_id, claimant_id, role_at_business, contact_phone, evidence, status)
select b.id, p.id, 'Owner', '+91 98250 10101',
       jsonb_build_object('gst', '24AAACB1234C1ZP', 'note', 'Registered proprietor'),
       'pending'
from public.businesses b
join lateral (
  select id from public.profiles where role = 'user'
  order by md5(id::text || b.id::text) limit 1
) p on true
where b.owner_id is null and b.status = 'published'
order by b.created_at
limit 8;

-- Reported reviews awaiting moderation.
insert into public.review_reports (review_id, reporter_id, reason, detail)
select r.id, p.id, 'Suspected fake review',
       'This account has posted near-identical text on several listings.'
from public.reviews r
join lateral (
  select id from public.profiles where id <> r.author_id
  order by md5(id::text || r.id::text) limit 1
) p on true
where abs(hashtext(r.id::text)) % 97 = 0
limit 12;

-- Promoted placements, disclosed in search results.
insert into public.promoted_placements (business_id, surface, city_id, starts_at, ends_at, weight)
select b.id, 'search', b.city_id, now() - interval '7 days', now() + interval '60 days', 10
from public.businesses b
where b.status = 'published' and b.verified
order by b.created_at
limit 6;

-- Active subscriptions for the promoted listings.
insert into public.subscriptions (business_id, plan_id, status, current_period_end)
select b.id, (select id from public.plans where slug = 'premium'), 'active', now() + interval '30 days'
from public.businesses b
where b.status = 'published' and b.verified
order by b.created_at
limit 6
on conflict do nothing;

