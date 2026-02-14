-- ExploreValley relational schema
-- Run this in Supabase SQL editor.

create table if not exists public.ev_settings (
  id text primary key default 'main',
  currency text not null default 'INR',
  page_slugs jsonb not null default '{}'::jsonb,
  tax_rules jsonb not null default '{}'::jsonb,
  pricing_tiers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ev_tours (
  id text primary key,
  title text not null,
  description text not null,
  price numeric not null,
  vendor_mobile text not null default '',
  additional_comments text not null default '',
  price_dropped boolean not null default false,
  price_drop_percent numeric not null default 0,
  hero_image text not null default '',
  duration text not null,
  images jsonb not null default '[]'::jsonb,
  image_titles jsonb not null default '[]'::jsonb,
  image_descriptions jsonb not null default '[]'::jsonb,
  image_meta jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  itinerary text not null default '',
  map_embed_url text not null default '',
  faqs jsonb not null default '[]'::jsonb,
  itinerary_items jsonb not null default '[]'::jsonb,
  facts jsonb not null default '[]'::jsonb,
  content_blocks jsonb not null default '{}'::jsonb,
  i18n jsonb not null default '{}'::jsonb,
  inclusions jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  max_guests integer not null,
  availability jsonb not null default '{}'::jsonb,
  available boolean not null default true,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.ev_festivals (
  id text primary key,
  title text not null,
  description text not null default '',
  location text not null default '',
  vendor_mobile text not null default '',
  additional_comments text not null default '',
  price_dropped boolean not null default false,
  price_drop_percent numeric not null default 0,
  hero_image text not null default '',
  month text not null default 'All Season',
  date text,
  vibe text not null default '',
  ticket text not null default 'On request',
  images jsonb not null default '[]'::jsonb,
  image_titles jsonb not null default '[]'::jsonb,
  image_descriptions jsonb not null default '[]'::jsonb,
  image_meta jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  available boolean not null default true,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.ev_hotels (
  id text primary key,
  name text not null,
  description text not null,
  location text not null,
  vendor_mobile text not null default '',
  additional_comments text not null default '',
  price_per_night numeric not null,
  price_dropped boolean not null default false,
  price_drop_percent numeric not null default 0,
  hero_image text not null default '',
  images jsonb not null default '[]'::jsonb,
  image_titles jsonb not null default '[]'::jsonb,
  image_descriptions jsonb not null default '[]'::jsonb,
  image_meta jsonb not null default '[]'::jsonb,
  amenities jsonb not null default '[]'::jsonb,
  room_types jsonb not null default '[]'::jsonb,
  rating numeric not null default 0,
  reviews integer not null default 0,
  check_in_time text not null default '14:00',
  check_out_time text not null default '11:00',
  availability jsonb not null default '{}'::jsonb,
  seasonal_pricing jsonb not null default '[]'::jsonb,
  date_overrides jsonb not null default '{}'::jsonb,
  min_nights integer not null default 1,
  max_nights integer not null default 30,
  child_policy text not null default '',
  available boolean not null default true,
  created_at timestamptz
);

create table if not exists public.ev_restaurants (
  id text primary key,
  name text not null,
  description text not null,
  vendor_mobile text not null default '',
  additional_comments text not null default '',
  cuisine jsonb not null default '[]'::jsonb,
  rating numeric not null default 0,
  review_count integer not null default 0,
  delivery_time text not null default '',
  minimum_order numeric not null default 0,
  price_dropped boolean not null default false,
  price_drop_percent numeric not null default 0,
  hero_image text not null default '',
  images jsonb not null default '[]'::jsonb,
  image_titles jsonb not null default '[]'::jsonb,
  image_descriptions jsonb not null default '[]'::jsonb,
  image_meta jsonb not null default '[]'::jsonb,
  available boolean not null default true,
  is_veg boolean not null default false,
  tags jsonb not null default '[]'::jsonb,
  location text not null default '',
  service_radius_km numeric not null default 0,
  delivery_zones jsonb not null default '[]'::jsonb,
  open_hours text not null default '09:00',
  closing_hours text not null default '22:00',
  menu jsonb not null default '[]'::jsonb
);

create table if not exists public.ev_vendor_menus (
  restaurant_id text primary key,
  menu jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ev_menu_items (
  id text primary key,
  restaurant_id text not null,
  category text not null,
  name text not null,
  description text not null default '',
  price numeric not null,
  price_dropped boolean not null default false,
  price_drop_percent numeric not null default 0,
  hero_image text not null default '',
  image text,
  image_titles jsonb not null default '[]'::jsonb,
  image_descriptions jsonb not null default '[]'::jsonb,
  image_meta jsonb not null default '[]'::jsonb,
  available boolean not null default true,
  is_veg boolean not null default false,
  tags jsonb not null default '[]'::jsonb,
  stock integer not null default 0,
  max_per_order integer not null default 10,
  addons jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb
);

create table if not exists public.ev_bookings (
  id text primary key,
  type text not null,
  item_id text not null,
  user_name text not null,
  email text not null,
  phone text not null,
  aadhaar_url text not null default '',
  country_code text not null default '',
  paid_amount numeric,
  guests integer not null,
  check_in text,
  check_out text,
  room_type text,
  num_rooms integer not null default 1,
  tour_date text,
  special_requests text not null default '',
  pricing jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  booking_date timestamptz
);

create table if not exists public.ev_cab_bookings (
  id text primary key,
  user_name text not null,
  phone text not null,
  pickup_location text not null,
  drop_location text not null,
  datetime text not null,
  passengers integer not null,
  vehicle_type text not null,
  estimated_fare numeric not null,
  service_area_id text,
  pricing jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz
);

create table if not exists public.ev_food_orders (
  id text primary key,
  user_id text not null default '',
  restaurant_id text not null default '',
  user_name text not null,
  phone text not null,
  items jsonb not null default '[]'::jsonb,
  delivery_address text not null,
  special_instructions text not null default '',
  pricing jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  order_time timestamptz
);

create table if not exists public.ev_food_carts (
  id text primary key,
  user_id text not null default '',
  phone text not null default '',
  email text not null default '',
  restaurant_id text not null default '',
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists ev_food_carts_user_uidx on public.ev_food_carts (user_id) where user_id <> '';
create index if not exists ev_food_carts_phone_idx on public.ev_food_carts (phone) where phone <> '';
create index if not exists ev_food_carts_email_idx on public.ev_food_carts (lower(email)) where email <> '';

create table if not exists public.ev_queries (
  id text primary key,
  user_name text not null,
  email text not null,
  phone text not null,
  subject text not null,
  message text not null,
  status text not null default 'pending',
  submitted_at timestamptz,
  responded_at timestamptz,
  response text
);

create table if not exists public.ev_audit_log (
  id text primary key,
  at timestamptz not null,
  admin_chat_id bigint,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.ev_cab_providers (
  id text primary key,
  name text not null,
  vehicle_type text not null,
  plate_number text not null,
  capacity integer not null,
  vendor_mobile text not null default '',
  additional_comments text not null default '',
  price_dropped boolean not null default false,
  price_drop_percent numeric not null default 0,
  hero_image text not null default '',
  active boolean not null default true,
  service_area_id text
);

create table if not exists public.ev_service_areas (
  id text primary key,
  name text not null,
  city text not null,
  enabled boolean not null default true
);

create table if not exists public.ev_coupons (
  code text primary key,
  type text not null,
  amount numeric not null,
  min_cart numeric not null default 0,
  category text not null default 'all',
  expiry text not null,
  max_uses integer
);

create table if not exists public.ev_policies (
  id text primary key default 'main',
  hotel jsonb not null default '{}'::jsonb,
  tour jsonb not null default '{}'::jsonb,
  cab jsonb not null default '{}'::jsonb,
  food jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ev_payments (
  id text primary key default 'main',
  wallet_enabled boolean not null default false,
  refund_method text not null default 'original',
  refund_window_hours integer not null default 72,
  updated_at timestamptz not null default now()
);

create table if not exists public.ev_site_pages (
  slug text primary key,
  title text not null,
  content text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.ev_user_profiles (
  id text primary key,
  phone text not null,
  name text not null default '',
  email text not null default '',
  ip_address text not null default '',
  browser text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  orders jsonb not null default '[]'::jsonb
);

create table if not exists public.ev_user_behavior_profiles (
  id text primary key,
  user_id text not null,
  phone text not null default '',
  name text not null default '',
  email text not null default '',
  core_identity jsonb not null default '{}'::jsonb,
  device_fingerprinting jsonb not null default '{}'::jsonb,
  location_mobility jsonb not null default '{}'::jsonb,
  behavioral_analytics jsonb not null default '{}'::jsonb,
  transaction_payment jsonb not null default '{}'::jsonb,
  preference_personalization jsonb not null default '{}'::jsonb,
  ratings_reviews_feedback jsonb not null default '{}'::jsonb,
  marketing_attribution jsonb not null default '{}'::jsonb,
  trust_safety_fraud jsonb not null default '{}'::jsonb,
  derived_inferred jsonb not null default '{}'::jsonb,
  orders jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ev_analytics_events (
  id text primary key,
  type text not null,
  category text not null default '',
  user_id text not null default '',
  phone text not null default '',
  email text not null default '',
  at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

-- Safe alters for existing projects
alter table if exists public.ev_settings add column if not exists page_slugs jsonb not null default '{}'::jsonb;
alter table if exists public.ev_tours add column if not exists price_dropped boolean not null default false;
alter table if exists public.ev_tours add column if not exists price_drop_percent numeric not null default 0;
alter table if exists public.ev_tours add column if not exists hero_image text not null default '';
alter table if exists public.ev_tours add column if not exists vendor_mobile text not null default '';
alter table if exists public.ev_tours add column if not exists additional_comments text not null default '';
alter table if exists public.ev_tours add column if not exists image_titles jsonb not null default '[]'::jsonb;
alter table if exists public.ev_tours add column if not exists image_descriptions jsonb not null default '[]'::jsonb;
alter table if exists public.ev_tours add column if not exists image_meta jsonb not null default '[]'::jsonb;
alter table if exists public.ev_tours add column if not exists map_embed_url text not null default '';
alter table if exists public.ev_tours add column if not exists faqs jsonb not null default '[]'::jsonb;
alter table if exists public.ev_tours add column if not exists itinerary_items jsonb not null default '[]'::jsonb;
alter table if exists public.ev_tours add column if not exists facts jsonb not null default '[]'::jsonb;
alter table if exists public.ev_tours add column if not exists content_blocks jsonb not null default '{}'::jsonb;
alter table if exists public.ev_tours add column if not exists i18n jsonb not null default '{}'::jsonb;
alter table if exists public.ev_festivals add column if not exists price_dropped boolean not null default false;
alter table if exists public.ev_festivals add column if not exists price_drop_percent numeric not null default 0;
alter table if exists public.ev_festivals add column if not exists hero_image text not null default '';
alter table if exists public.ev_festivals add column if not exists vendor_mobile text not null default '';
alter table if exists public.ev_festivals add column if not exists additional_comments text not null default '';
alter table if exists public.ev_festivals add column if not exists image_titles jsonb not null default '[]'::jsonb;
alter table if exists public.ev_festivals add column if not exists image_descriptions jsonb not null default '[]'::jsonb;
alter table if exists public.ev_festivals add column if not exists image_meta jsonb not null default '[]'::jsonb;
alter table if exists public.ev_hotels add column if not exists price_dropped boolean not null default false;
alter table if exists public.ev_hotels add column if not exists price_drop_percent numeric not null default 0;
alter table if exists public.ev_hotels add column if not exists hero_image text not null default '';
alter table if exists public.ev_hotels add column if not exists vendor_mobile text not null default '';
alter table if exists public.ev_hotels add column if not exists additional_comments text not null default '';
alter table if exists public.ev_hotels add column if not exists image_titles jsonb not null default '[]'::jsonb;
alter table if exists public.ev_hotels add column if not exists image_descriptions jsonb not null default '[]'::jsonb;
alter table if exists public.ev_hotels add column if not exists image_meta jsonb not null default '[]'::jsonb;
alter table if exists public.ev_restaurants add column if not exists price_dropped boolean not null default false;
alter table if exists public.ev_restaurants add column if not exists price_drop_percent numeric not null default 0;
alter table if exists public.ev_restaurants add column if not exists hero_image text not null default '';
alter table if exists public.ev_restaurants add column if not exists vendor_mobile text not null default '';
alter table if exists public.ev_restaurants add column if not exists additional_comments text not null default '';
alter table if exists public.ev_restaurants add column if not exists image_titles jsonb not null default '[]'::jsonb;
alter table if exists public.ev_restaurants add column if not exists image_descriptions jsonb not null default '[]'::jsonb;
alter table if exists public.ev_restaurants add column if not exists image_meta jsonb not null default '[]'::jsonb;
alter table if exists public.ev_restaurants add column if not exists menu jsonb not null default '[]'::jsonb;
alter table if exists public.ev_vendor_menus add column if not exists menu jsonb not null default '[]'::jsonb;
alter table if exists public.ev_vendor_menus add column if not exists updated_at timestamptz not null default now();
alter table if exists public.ev_menu_items add column if not exists price_dropped boolean not null default false;
alter table if exists public.ev_menu_items add column if not exists price_drop_percent numeric not null default 0;
alter table if exists public.ev_menu_items add column if not exists hero_image text not null default '';
alter table if exists public.ev_menu_items add column if not exists image_titles jsonb not null default '[]'::jsonb;
alter table if exists public.ev_menu_items add column if not exists image_descriptions jsonb not null default '[]'::jsonb;
alter table if exists public.ev_menu_items add column if not exists image_meta jsonb not null default '[]'::jsonb;
alter table if exists public.ev_cab_providers add column if not exists price_dropped boolean not null default false;
alter table if exists public.ev_cab_providers add column if not exists price_drop_percent numeric not null default 0;
alter table if exists public.ev_cab_providers add column if not exists hero_image text not null default '';
alter table if exists public.ev_cab_providers add column if not exists vendor_mobile text not null default '';
alter table if exists public.ev_cab_providers add column if not exists additional_comments text not null default '';
alter table if exists public.ev_bookings add column if not exists aadhaar_url text not null default '';
alter table if exists public.ev_bookings add column if not exists country_code text not null default '';
alter table if exists public.ev_bookings add column if not exists paid_amount numeric;
alter table if exists public.ev_food_orders add column if not exists user_id text not null default '';
alter table if exists public.ev_food_orders add column if not exists restaurant_id text not null default '';
alter table if exists public.ev_user_profiles add column if not exists phone text not null default '';
alter table if exists public.ev_user_profiles add column if not exists name text not null default '';
alter table if exists public.ev_user_profiles add column if not exists email text not null default '';
alter table if exists public.ev_user_profiles add column if not exists ip_address text not null default '';
alter table if exists public.ev_user_profiles add column if not exists browser text not null default '';
alter table if exists public.ev_user_profiles add column if not exists created_at timestamptz not null default now();
alter table if exists public.ev_user_profiles add column if not exists updated_at timestamptz not null default now();
alter table if exists public.ev_user_profiles add column if not exists orders jsonb not null default '[]'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists user_id text not null default '';
alter table if exists public.ev_user_behavior_profiles add column if not exists phone text not null default '';
alter table if exists public.ev_user_behavior_profiles add column if not exists name text not null default '';
alter table if exists public.ev_user_behavior_profiles add column if not exists email text not null default '';
alter table if exists public.ev_user_behavior_profiles add column if not exists core_identity jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists device_fingerprinting jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists location_mobility jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists behavioral_analytics jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists transaction_payment jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists preference_personalization jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists ratings_reviews_feedback jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists marketing_attribution jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists trust_safety_fraud jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists derived_inferred jsonb not null default '{}'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists orders jsonb not null default '[]'::jsonb;
alter table if exists public.ev_user_behavior_profiles add column if not exists created_at timestamptz not null default now();
alter table if exists public.ev_user_behavior_profiles add column if not exists updated_at timestamptz not null default now();
alter table if exists public.ev_analytics_events add column if not exists type text not null default '';
alter table if exists public.ev_analytics_events add column if not exists category text not null default '';
alter table if exists public.ev_analytics_events add column if not exists user_id text not null default '';
alter table if exists public.ev_analytics_events add column if not exists phone text not null default '';
alter table if exists public.ev_analytics_events add column if not exists email text not null default '';
alter table if exists public.ev_analytics_events add column if not exists at timestamptz not null default now();
alter table if exists public.ev_analytics_events add column if not exists meta jsonb not null default '{}'::jsonb;

-- ------------------------------------------------------------
-- Security Hardening (Supabase RLS + Least Privilege)
-- ------------------------------------------------------------
-- These tables contain sensitive PII and/or admin-only operational data.
-- This project uses the server with the Supabase service role key for writes,
-- so it is safe (and preferred) to block all direct anon/authenticated access.
--
-- After running this section:
-- - Anon key (role=anon) cannot read/insert these tables.
-- - Authenticated users also cannot access these tables directly (server-only).
-- - Service role retains full access.

-- Enable RLS (defense-in-depth; service_role bypasses RLS, but anon/authenticated will be constrained).
alter table if exists public.ev_bookings enable row level security;
alter table if exists public.ev_food_orders enable row level security;
alter table if exists public.ev_food_carts enable row level security;
alter table if exists public.ev_user_profiles enable row level security;
alter table if exists public.ev_user_behavior_profiles enable row level security;
alter table if exists public.ev_audit_log enable row level security;
alter table if exists public.ev_payments enable row level security;
alter table if exists public.ev_policies enable row level security;

-- Revoke direct table privileges from anon/authenticated.
revoke all on table public.ev_bookings from anon, authenticated;
revoke all on table public.ev_food_orders from anon, authenticated;
revoke all on table public.ev_food_carts from anon, authenticated;
revoke all on table public.ev_user_profiles from anon, authenticated;
revoke all on table public.ev_user_behavior_profiles from anon, authenticated;
revoke all on table public.ev_audit_log from anon, authenticated;
revoke all on table public.ev_payments from anon, authenticated;
revoke all on table public.ev_policies from anon, authenticated;

-- Ensure service_role can access (normally present by default, but explicit is fine).
grant all on table public.ev_bookings to service_role;
grant all on table public.ev_food_orders to service_role;
grant all on table public.ev_food_carts to service_role;
grant all on table public.ev_user_profiles to service_role;
grant all on table public.ev_user_behavior_profiles to service_role;
grant all on table public.ev_audit_log to service_role;
grant all on table public.ev_payments to service_role;
grant all on table public.ev_policies to service_role;

-- ------------------------------------------------------------
-- Integrity Constraints / Triggers (Server-Managed Tables)
-- ------------------------------------------------------------
-- These constraints support security testcases and prevent accidental corruption
-- even when writes happen via service_role.

-- ev_settings: single-row, validated, auto-updated timestamp, delete-protected
-- NOTE: Postgres does not support `ADD CONSTRAINT IF NOT EXISTS`, so we use DO blocks.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ev_settings') then
    -- Ensure the singleton row exists and has minimally valid JSON structures before adding constraints.
    -- IMPORTANT: If `ev_settings_page_slugs_required` already exists and is VALID,
    -- inserting with the column default `{}` will violate it. So we insert the
    -- required keys explicitly.
    insert into public.ev_settings (id, currency, page_slugs, tax_rules, pricing_tiers)
    values (
      'main',
      'INR',
      jsonb_build_object(
        'affiliateProgram', 'affiliate-program',
        'contactUs', 'contact-us',
        'privacyPolicy', 'privacy-policy',
        'refundPolicy', 'refund-policy',
        'termsAndConditions', 'terms-and-conditions'
      ),
      '{}'::jsonb,
      '[]'::jsonb
    )
    on conflict (id) do nothing;

    update public.ev_settings
    set
      page_slugs = (
        jsonb_build_object(
          'affiliateProgram', 'affiliate-program',
          'contactUs', 'contact-us',
          'privacyPolicy', 'privacy-policy',
          'refundPolicy', 'refund-policy',
          'termsAndConditions', 'terms-and-conditions'
        ) || case when jsonb_typeof(page_slugs) = 'object' then page_slugs else '{}'::jsonb end
      ),
      tax_rules = case when jsonb_typeof(tax_rules) = 'object' then tax_rules else '{}'::jsonb end,
      pricing_tiers = case when jsonb_typeof(pricing_tiers) = 'array' then pricing_tiers else '[]'::jsonb end
    where id = 'main';

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='ev_settings' and c.conname='ev_settings_singleton'
    ) then
      alter table public.ev_settings add constraint ev_settings_singleton check (id = 'main') not valid;
    end if;

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='ev_settings' and c.conname='ev_settings_currency_nonempty'
    ) then
      alter table public.ev_settings add constraint ev_settings_currency_nonempty check (length(btrim(currency)) > 0) not valid;
    end if;

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='ev_settings' and c.conname='ev_settings_currency_allowed'
    ) then
      alter table public.ev_settings add constraint ev_settings_currency_allowed check (currency in ('INR')) not valid;
    end if;

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='ev_settings' and c.conname='ev_settings_page_slugs_object'
    ) then
      alter table public.ev_settings add constraint ev_settings_page_slugs_object check (jsonb_typeof(page_slugs) = 'object') not valid;
    end if;

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='ev_settings' and c.conname='ev_settings_page_slugs_required'
    ) then
      alter table public.ev_settings add constraint ev_settings_page_slugs_required check (
        page_slugs ? 'affiliateProgram' and
        page_slugs ? 'contactUs' and
        page_slugs ? 'privacyPolicy' and
        page_slugs ? 'refundPolicy' and
        page_slugs ? 'termsAndConditions'
      ) not valid;
    end if;

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='ev_settings' and c.conname='ev_settings_pricing_tiers_array'
    ) then
      alter table public.ev_settings add constraint ev_settings_pricing_tiers_array check (jsonb_typeof(pricing_tiers) = 'array') not valid;
    end if;

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='ev_settings' and c.conname='ev_settings_pricing_tiers_limit'
    ) then
      alter table public.ev_settings add constraint ev_settings_pricing_tiers_limit check (jsonb_array_length(pricing_tiers) <= 200) not valid;
    end if;

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='ev_settings' and c.conname='ev_settings_tax_rules_object'
    ) then
      alter table public.ev_settings add constraint ev_settings_tax_rules_object check (jsonb_typeof(tax_rules) = 'object') not valid;
    end if;

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='ev_settings' and c.conname='ev_settings_tax_rules_ranges'
    ) then
      alter table public.ev_settings add constraint ev_settings_tax_rules_ranges check (
        ((tax_rules #>> '{tour,gst}') is null or ((tax_rules #>> '{tour,gst}')::numeric between 0 and 1)) and
        ((tax_rules #>> '{food,gst}') is null or ((tax_rules #>> '{food,gst}')::numeric between 0 and 1)) and
        ((tax_rules #>> '{cab,gst}') is null or ((tax_rules #>> '{cab,gst}')::numeric between 0 and 1)) and
        ((tax_rules -> 'hotel' -> 'slabs') is null or jsonb_typeof(tax_rules -> 'hotel' -> 'slabs') = 'array')
      ) not valid;
    end if;
  end if;
end;
$$;

create or replace function public.ev_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists ev_settings_touch_updated_at on public.ev_settings;
create trigger ev_settings_touch_updated_at
before update on public.ev_settings
for each row execute function public.ev_touch_updated_at();

create or replace function public.ev_block_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'DELETE_BLOCKED';
end;
$$;

drop trigger if exists ev_settings_block_delete on public.ev_settings;
create trigger ev_settings_block_delete
before delete on public.ev_settings
for each row execute function public.ev_block_delete();

-- ev_audit_log
-- IMPORTANT: do NOT add UPDATE/DELETE blocking triggers here.
-- The current server sync strategy (`writeSupabaseDatabase`) uses a full "delete all then upsert"
-- approach for most tables, including `ev_audit_log`. Blocking deletes would crash the server.
-- Security is enforced by RLS + revoking anon/authenticated privileges above.

-- Tours: basic field sanity
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ev_tours') then
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_tours' and c.conname='ev_tours_title_nonempty') then
      alter table public.ev_tours add constraint ev_tours_title_nonempty check (length(btrim(title)) > 0);
    end if;
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_tours' and c.conname='ev_tours_duration_nonempty') then
      alter table public.ev_tours add constraint ev_tours_duration_nonempty check (length(btrim(duration)) > 0);
    end if;
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_tours' and c.conname='ev_tours_price_positive') then
      alter table public.ev_tours add constraint ev_tours_price_positive check (price >= 0.01);
    end if;
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_tours' and c.conname='ev_tours_max_guests_reasonable') then
      alter table public.ev_tours add constraint ev_tours_max_guests_reasonable check (max_guests >= 1 and max_guests <= 10000);
    end if;
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_tours' and c.conname='ev_tours_drop_percent_range') then
      alter table public.ev_tours add constraint ev_tours_drop_percent_range check (price_drop_percent >= 0 and price_drop_percent <= 100);
    end if;
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_tours' and c.conname='ev_tours_drop_consistency') then
      alter table public.ev_tours add constraint ev_tours_drop_consistency check ((price_dropped = true) or (price_drop_percent = 0));
    end if;
  end if;
end;
$$;

-- Hotels: basic field sanity
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ev_hotels') then
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_hotels' and c.conname='ev_hotels_name_nonempty') then
      alter table public.ev_hotels add constraint ev_hotels_name_nonempty check (length(btrim(name)) > 0);
    end if;
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_hotels' and c.conname='ev_hotels_min_nights_valid') then
      alter table public.ev_hotels add constraint ev_hotels_min_nights_valid check (min_nights >= 1);
    end if;
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_hotels' and c.conname='ev_hotels_max_nights_valid') then
      alter table public.ev_hotels add constraint ev_hotels_max_nights_valid check (max_nights >= min_nights);
    end if;
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_hotels' and c.conname='ev_hotels_rating_range') then
      alter table public.ev_hotels add constraint ev_hotels_rating_range check (rating >= 0 and rating <= 5);
    end if;
    if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='ev_hotels' and c.conname='ev_hotels_reviews_nonneg') then
      alter table public.ev_hotels add constraint ev_hotels_reviews_nonneg check (reviews >= 0);
    end if;
  end if;
end;
$$;

-- ============================================================
-- NEW FEATURE TABLES (Telegram Bot, AI Support, Notifications)
-- ============================================================

-- Telegram bot conversation log (admin commands & AI chats)
create table if not exists public.ev_telegram_messages (
  id text primary key,
  chat_id bigint not null,
  direction text not null default 'incoming', -- incoming | outgoing
  message_type text not null default 'text', -- text | voice | image | command
  content text not null default '',
  intent text not null default '', -- detected intent from AI
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- AI support conversations (customer-facing)
create table if not exists public.ev_ai_conversations (
  id text primary key,
  user_id text not null default '',
  phone text not null default '',
  email text not null default '',
  name text not null default '',
  channel text not null default 'web', -- web | telegram | whatsapp
  status text not null default 'active', -- active | escalated | resolved
  messages jsonb not null default '[]'::jsonb,
  escalated_to text not null default '', -- manager channel/chatId
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order delivery tracking and field team notifications
create table if not exists public.ev_delivery_tracking (
  id text primary key,
  order_id text not null,
  order_type text not null default 'food', -- food | booking | cab
  status text not null default 'pending', -- pending | assigned | picked_up | in_transit | delivered | cancelled
  assigned_to text not null default '', -- field team member name/id
  assigned_phone text not null default '',
  pickup_time timestamptz,
  delivery_time timestamptz,
  notes text not null default '',
  telegram_notified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- WhatsApp vendor messages
create table if not exists public.ev_vendor_messages (
  id text primary key,
  vendor_id text not null default '',
  vendor_name text not null default '',
  vendor_mobile text not null default '',
  order_id text not null default '',
  message_type text not null default 'order_confirmation', -- order_confirmation | status_update | query
  content text not null default '',
  status text not null default 'pending', -- pending | sent | delivered | failed
  channel text not null default 'whatsapp', -- whatsapp | sms | telegram
  created_at timestamptz not null default now()
);

-- Email notifications log
create table if not exists public.ev_email_notifications (
  id text primary key,
  to_email text not null default '',
  to_name text not null default '',
  subject text not null default '',
  body_html text not null default '',
  template text not null default '', -- order_confirmation | status_update | refund_initiated
  order_id text not null default '',
  status text not null default 'pending', -- pending | sent | failed
  error text not null default '',
  created_at timestamptz not null default now()
);

-- Customer reviews and ratings
create table if not exists public.ev_reviews (
  id text primary key,
  user_id text not null default '',
  phone text not null default '',
  name text not null default '',
  order_id text not null default '',
  order_type text not null default '', -- tour | hotel | food | cab
  item_id text not null default '',
  rating integer not null default 5,
  review text not null default '',
  status text not null default 'published', -- published | pending | hidden
  created_at timestamptz not null default now()
);

-- Refund requests
create table if not exists public.ev_refunds (
  id text primary key,
  order_id text not null default '',
  order_type text not null default '',
  user_id text not null default '',
  phone text not null default '',
  email text not null default '',
  name text not null default '',
  amount numeric not null default 0,
  reason text not null default '',
  status text not null default 'requested', -- requested | processing | approved | rejected | completed
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe alters for new tables
alter table if exists public.ev_telegram_messages add column if not exists chat_id bigint not null default 0;
alter table if exists public.ev_telegram_messages add column if not exists direction text not null default 'incoming';
alter table if exists public.ev_telegram_messages add column if not exists message_type text not null default 'text';
alter table if exists public.ev_telegram_messages add column if not exists content text not null default '';
alter table if exists public.ev_telegram_messages add column if not exists intent text not null default '';
alter table if exists public.ev_telegram_messages add column if not exists handled boolean not null default false;
alter table if exists public.ev_telegram_messages add column if not exists created_at timestamptz not null default now();

alter table if exists public.ev_ai_conversations add column if not exists user_id text not null default '';
alter table if exists public.ev_ai_conversations add column if not exists phone text not null default '';
alter table if exists public.ev_ai_conversations add column if not exists email text not null default '';
alter table if exists public.ev_ai_conversations add column if not exists name text not null default '';
alter table if exists public.ev_ai_conversations add column if not exists channel text not null default 'web';
alter table if exists public.ev_ai_conversations add column if not exists status text not null default 'active';
alter table if exists public.ev_ai_conversations add column if not exists messages jsonb not null default '[]'::jsonb;
alter table if exists public.ev_ai_conversations add column if not exists escalated_to text not null default '';
alter table if exists public.ev_ai_conversations add column if not exists created_at timestamptz not null default now();
alter table if exists public.ev_ai_conversations add column if not exists updated_at timestamptz not null default now();

alter table if exists public.ev_delivery_tracking add column if not exists order_id text not null default '';
alter table if exists public.ev_delivery_tracking add column if not exists order_type text not null default 'food';
alter table if exists public.ev_delivery_tracking add column if not exists status text not null default 'pending';
alter table if exists public.ev_delivery_tracking add column if not exists assigned_to text not null default '';
alter table if exists public.ev_delivery_tracking add column if not exists assigned_phone text not null default '';
alter table if exists public.ev_delivery_tracking add column if not exists pickup_time timestamptz;
alter table if exists public.ev_delivery_tracking add column if not exists delivery_time timestamptz;
alter table if exists public.ev_delivery_tracking add column if not exists notes text not null default '';
alter table if exists public.ev_delivery_tracking add column if not exists telegram_notified boolean not null default false;
alter table if exists public.ev_delivery_tracking add column if not exists created_at timestamptz not null default now();
alter table if exists public.ev_delivery_tracking add column if not exists updated_at timestamptz not null default now();

alter table if exists public.ev_vendor_messages add column if not exists vendor_id text not null default '';
alter table if exists public.ev_vendor_messages add column if not exists vendor_name text not null default '';
alter table if exists public.ev_vendor_messages add column if not exists vendor_mobile text not null default '';
alter table if exists public.ev_vendor_messages add column if not exists order_id text not null default '';
alter table if exists public.ev_vendor_messages add column if not exists message_type text not null default 'order_confirmation';
alter table if exists public.ev_vendor_messages add column if not exists content text not null default '';
alter table if exists public.ev_vendor_messages add column if not exists status text not null default 'pending';
alter table if exists public.ev_vendor_messages add column if not exists channel text not null default 'whatsapp';
alter table if exists public.ev_vendor_messages add column if not exists created_at timestamptz not null default now();

alter table if exists public.ev_email_notifications add column if not exists to_email text not null default '';
alter table if exists public.ev_email_notifications add column if not exists to_name text not null default '';
alter table if exists public.ev_email_notifications add column if not exists subject text not null default '';
alter table if exists public.ev_email_notifications add column if not exists body_html text not null default '';
alter table if exists public.ev_email_notifications add column if not exists template text not null default '';
alter table if exists public.ev_email_notifications add column if not exists order_id text not null default '';
alter table if exists public.ev_email_notifications add column if not exists status text not null default 'pending';
alter table if exists public.ev_email_notifications add column if not exists error text not null default '';
alter table if exists public.ev_email_notifications add column if not exists created_at timestamptz not null default now();

alter table if exists public.ev_reviews add column if not exists user_id text not null default '';
alter table if exists public.ev_reviews add column if not exists phone text not null default '';
alter table if exists public.ev_reviews add column if not exists name text not null default '';
alter table if exists public.ev_reviews add column if not exists order_id text not null default '';
alter table if exists public.ev_reviews add column if not exists order_type text not null default '';
alter table if exists public.ev_reviews add column if not exists item_id text not null default '';
alter table if exists public.ev_reviews add column if not exists rating integer not null default 5;
alter table if exists public.ev_reviews add column if not exists review text not null default '';
alter table if exists public.ev_reviews add column if not exists status text not null default 'published';
alter table if exists public.ev_reviews add column if not exists created_at timestamptz not null default now();

alter table if exists public.ev_refunds add column if not exists order_id text not null default '';
alter table if exists public.ev_refunds add column if not exists order_type text not null default '';
alter table if exists public.ev_refunds add column if not exists user_id text not null default '';
alter table if exists public.ev_refunds add column if not exists phone text not null default '';
alter table if exists public.ev_refunds add column if not exists email text not null default '';
alter table if exists public.ev_refunds add column if not exists name text not null default '';
alter table if exists public.ev_refunds add column if not exists amount numeric not null default 0;
alter table if exists public.ev_refunds add column if not exists reason text not null default '';
alter table if exists public.ev_refunds add column if not exists status text not null default 'requested';
alter table if exists public.ev_refunds add column if not exists admin_notes text not null default '';
alter table if exists public.ev_refunds add column if not exists created_at timestamptz not null default now();
alter table if exists public.ev_refunds add column if not exists updated_at timestamptz not null default now();

-- RLS for new sensitive tables
alter table if exists public.ev_ai_conversations enable row level security;
alter table if exists public.ev_delivery_tracking enable row level security;
alter table if exists public.ev_vendor_messages enable row level security;
alter table if exists public.ev_email_notifications enable row level security;
alter table if exists public.ev_refunds enable row level security;
alter table if exists public.ev_telegram_messages enable row level security;

revoke all on table public.ev_ai_conversations from anon, authenticated;
revoke all on table public.ev_delivery_tracking from anon, authenticated;
revoke all on table public.ev_vendor_messages from anon, authenticated;
revoke all on table public.ev_email_notifications from anon, authenticated;
revoke all on table public.ev_refunds from anon, authenticated;
revoke all on table public.ev_telegram_messages from anon, authenticated;

grant all on table public.ev_ai_conversations to service_role;
grant all on table public.ev_delivery_tracking to service_role;
grant all on table public.ev_vendor_messages to service_role;
grant all on table public.ev_email_notifications to service_role;
grant all on table public.ev_refunds to service_role;
grant all on table public.ev_telegram_messages to service_role;
