-- =====================================================================
-- Blackbox CRM — schema, RLS, helpers
-- Run once in Supabase SQL Editor after creating a fresh project.
-- =====================================================================

-- Extensions -----------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =====================================================================
-- TABLES
-- =====================================================================

-- Tenants (workspaces). Each customer = one tenant.
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

-- Allowlist. Only emails on this list can sign in. Also pins the tenant.
create table if not exists allowed_members (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  tenant_id   uuid references tenants(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Profile per auth user. Linked 1:1 with auth.users via user_id.
create table if not exists profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id       uuid references tenants(id) on delete set null,
  email           text not null,
  full_name       text,
  active          boolean not null default false,
  is_super_admin  boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists profiles_tenant_idx on profiles(tenant_id);
create index if not exists profiles_email_idx  on profiles(email);

-- Contacts
create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  first_name  text,
  last_name   text,
  email       text,
  phone       text,
  company     text,
  title       text,
  source      text,
  tags        text[],
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists contacts_tenant_idx on contacts(tenant_id);
create index if not exists contacts_email_idx  on contacts(tenant_id, email);

-- Pipeline stages
create table if not exists deal_stages (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  position   int  not null default 0,
  is_won     boolean not null default false,
  is_lost    boolean not null default false
);
create index if not exists deal_stages_tenant_idx on deal_stages(tenant_id, position);

-- Deals
create table if not exists deals (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  name            text not null,
  value           numeric(12,2) default 0,
  stage_id        uuid references deal_stages(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  expected_close  date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists deals_tenant_idx       on deals(tenant_id);
create index if not exists deals_stage_idx        on deals(tenant_id, stage_id);
create index if not exists deals_contact_idx      on deals(contact_id);

-- Tasks
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  title       text not null,
  notes       text,
  due_at      timestamptz,
  priority    text check (priority in ('low','medium','high')),
  completed   boolean not null default false,
  contact_id  uuid references contacts(id) on delete set null,
  deal_id     uuid references deals(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists tasks_tenant_idx    on tasks(tenant_id, completed, due_at);

-- Email campaigns
create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  subject     text not null,
  from_name   text not null,
  from_email  text not null,
  body        text not null,
  status      text not null default 'draft' check (status in ('draft','sending','sent','failed')),
  sent_count  int  not null default 0,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index if not exists campaigns_tenant_idx on campaigns(tenant_id, created_at desc);

-- SEO keyword tracker
create table if not exists seo_keywords (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  keyword        text not null,
  target_url     text not null,
  current_rank   int,
  previous_rank  int,
  last_checked   timestamptz,
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists seo_keywords_tenant_idx on seo_keywords(tenant_id);

-- =====================================================================
-- HELPERS
-- =====================================================================

-- Returns the caller's tenant_id. Used in every RLS policy.
create or replace function my_tenant_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select tenant_id from profiles where user_id = auth.uid()
$$;

-- Returns true if the caller is a super admin.
create or replace function is_super_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select is_super_admin from profiles where user_id = auth.uid()), false)
$$;

-- Seeds the default 5-stage sales pipeline for a new tenant.
create or replace function seed_default_pipeline(p_tenant uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  insert into deal_stages (tenant_id, name, position, is_won, is_lost) values
    (p_tenant, 'Lead',         1, false, false),
    (p_tenant, 'Qualified',    2, false, false),
    (p_tenant, 'Proposal',     3, false, false),
    (p_tenant, 'Negotiation',  4, false, false),
    (p_tenant, 'Won',          5, true,  false),
    (p_tenant, 'Lost',         6, false, true);
end $$;

-- =====================================================================
-- AUTH TRIGGER — create a profile row for every signup, set active if
-- the email is on the allowlist.
-- =====================================================================

create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_tenant uuid;
  v_active boolean := false;
begin
  select tenant_id into v_tenant from allowed_members
    where lower(email) = lower(new.email) limit 1;
  if v_tenant is not null then v_active := true; end if;

  insert into profiles (user_id, email, tenant_id, active)
    values (new.id, new.email, v_tenant, v_active)
    on conflict (user_id) do update
      set tenant_id = excluded.tenant_id,
          active    = excluded.active,
          email     = excluded.email;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =====================================================================
-- ROW-LEVEL SECURITY
-- =====================================================================

alter table tenants         enable row level security;
alter table allowed_members enable row level security;
alter table profiles        enable row level security;
alter table contacts        enable row level security;
alter table deal_stages     enable row level security;
alter table deals           enable row level security;
alter table tasks           enable row level security;
alter table campaigns       enable row level security;
alter table seo_keywords    enable row level security;

-- ---------- tenants
drop policy if exists "tenants read own"      on tenants;
create policy "tenants read own" on tenants
  for select using (id = my_tenant_id() or is_super_admin());

drop policy if exists "tenants super write"   on tenants;
create policy "tenants super write" on tenants
  for all using (is_super_admin()) with check (is_super_admin());

-- ---------- allowed_members — super admin only (UI hits this via service role anyway)
drop policy if exists "am super all" on allowed_members;
create policy "am super all" on allowed_members
  for all using (is_super_admin()) with check (is_super_admin());

-- ---------- profiles — user sees self; super admin sees all
drop policy if exists "profiles self read"     on profiles;
create policy "profiles self read" on profiles
  for select using (user_id = auth.uid() or is_super_admin());

drop policy if exists "profiles super write"   on profiles;
create policy "profiles super write" on profiles
  for all using (is_super_admin()) with check (is_super_admin());

-- ---------- generic tenant-scoped policies (reusable shape)
-- contacts
drop policy if exists "contacts tenant rw" on contacts;
create policy "contacts tenant rw" on contacts
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- deal_stages
drop policy if exists "deal_stages tenant rw" on deal_stages;
create policy "deal_stages tenant rw" on deal_stages
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- deals
drop policy if exists "deals tenant rw" on deals;
create policy "deals tenant rw" on deals
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- tasks
drop policy if exists "tasks tenant rw" on tasks;
create policy "tasks tenant rw" on tasks
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- campaigns
drop policy if exists "campaigns tenant rw" on campaigns;
create policy "campaigns tenant rw" on campaigns
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- seo_keywords
drop policy if exists "seo_keywords tenant rw" on seo_keywords;
create policy "seo_keywords tenant rw" on seo_keywords
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());
