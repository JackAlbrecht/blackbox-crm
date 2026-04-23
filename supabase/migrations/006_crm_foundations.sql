-- =====================================================================
-- Blackbox CRM — Foundations migration
-- Brings every tenant's data model to HubSpot-parity:
--   * Companies as first-class objects
--   * Many-to-many deal<->contact and deal<->company
--   * Rich contact + deal fields (address, owner, lead_source, etc.)
--   * Pipelines as first-class (multi-pipeline per tenant)
--   * Unified activities timeline (calls, emails, meetings, notes, status changes)
--   * Per-tenant custom properties + values
--   * First-class tags (many-to-many)
--   * Attachments polymorphic to contact/deal/company
-- Safe to re-run. Every add is guarded by `if not exists`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- COMPANIES
-- ---------------------------------------------------------------------
create table if not exists companies (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  name              text not null,
  domain            text,
  website           text,
  industry          text,
  size              text,                 -- e.g. "1-10", "11-50"
  annual_revenue    numeric(14,2),
  phone             text,
  description       text,
  address_street    text,
  address_city      text,
  address_state     text,
  address_zip       text,
  address_country   text,
  linkedin_url      text,
  twitter_handle    text,
  facebook_url      text,
  logo_url          text,
  lifecycle_stage   text,                 -- lead | mql | sql | customer | evangelist | other
  source            text,                 -- hubspot | manual | csv | import
  owner_user_id     uuid references auth.users(id) on delete set null,
  notes             text,
  tags              text[],
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists companies_tenant_idx    on companies(tenant_id);
create index if not exists companies_domain_idx    on companies(tenant_id, lower(domain));
create index if not exists companies_name_idx      on companies(tenant_id, lower(name));
create index if not exists companies_owner_idx     on companies(tenant_id, owner_user_id);

alter table companies enable row level security;
drop policy if exists companies_tenant_rw on companies;
create policy companies_tenant_rw on companies
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- ---------------------------------------------------------------------
-- RICH CONTACT FIELDS
-- ---------------------------------------------------------------------
alter table contacts add column if not exists primary_company_id uuid references companies(id) on delete set null;
alter table contacts add column if not exists mobile_phone     text;
alter table contacts add column if not exists secondary_email  text;
alter table contacts add column if not exists website          text;
alter table contacts add column if not exists linkedin_url     text;
alter table contacts add column if not exists twitter_handle   text;
alter table contacts add column if not exists avatar_url       text;
alter table contacts add column if not exists address_street   text;
alter table contacts add column if not exists address_city     text;
alter table contacts add column if not exists address_state    text;
alter table contacts add column if not exists address_zip      text;
alter table contacts add column if not exists address_country  text;
alter table contacts add column if not exists lifecycle_stage  text;    -- lead, mql, sql, customer, opportunity, evangelist, other
alter table contacts add column if not exists lead_source      text;    -- website, referral, google_ads, organic_search, cold_call, etc.
alter table contacts add column if not exists lead_score       int      default 0;
alter table contacts add column if not exists owner_user_id    uuid     references auth.users(id) on delete set null;
alter table contacts add column if not exists do_not_contact   boolean  not null default false;
alter table contacts add column if not exists timezone         text;
alter table contacts add column if not exists birthday         date;

create index if not exists contacts_primary_company_idx on contacts(primary_company_id);
create index if not exists contacts_owner_idx           on contacts(tenant_id, owner_user_id);
create index if not exists contacts_lifecycle_idx       on contacts(tenant_id, lifecycle_stage);
create index if not exists contacts_lead_score_idx      on contacts(tenant_id, lead_score desc);

-- Contact <-> Company (many-to-many; primary_company_id above is the headline one)
create table if not exists contact_companies (
  contact_id  uuid not null references contacts(id)  on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  is_primary  boolean not null default false,
  role        text,        -- e.g. "Project Manager", "Owner"
  created_at  timestamptz not null default now(),
  primary key (contact_id, company_id)
);
create index if not exists contact_companies_company_idx on contact_companies(company_id);

alter table contact_companies enable row level security;
drop policy if exists contact_companies_tenant on contact_companies;
create policy contact_companies_tenant on contact_companies
  for all using (
    exists (select 1 from contacts c where c.id = contact_companies.contact_id and c.tenant_id = my_tenant_id())
  )
  with check (
    exists (select 1 from contacts c where c.id = contact_companies.contact_id and c.tenant_id = my_tenant_id())
  );

-- ---------------------------------------------------------------------
-- PIPELINES (first-class; deal_stages become children of a pipeline)
-- ---------------------------------------------------------------------
create table if not exists pipelines (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  position    int  not null default 0,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists pipelines_tenant_idx on pipelines(tenant_id, position);

alter table pipelines enable row level security;
drop policy if exists pipelines_tenant_rw on pipelines;
create policy pipelines_tenant_rw on pipelines
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

alter table deal_stages add column if not exists pipeline_id uuid references pipelines(id) on delete cascade;
alter table deal_stages add column if not exists win_probability int default 0;   -- 0-100
alter table deal_stages add column if not exists color text;

-- Ensure every tenant has a default pipeline, and attach their existing stages to it.
do $$
declare
  t record;
  v_pipeline uuid;
begin
  for t in select id from tenants loop
    if not exists (select 1 from pipelines where tenant_id = t.id) then
      insert into pipelines (tenant_id, name, position, is_default)
        values (t.id, 'Sales Pipeline', 1, true)
        returning id into v_pipeline;
    else
      select id into v_pipeline from pipelines where tenant_id = t.id and is_default = true limit 1;
      if v_pipeline is null then
        select id into v_pipeline from pipelines where tenant_id = t.id order by position asc limit 1;
      end if;
    end if;

    update deal_stages
       set pipeline_id = v_pipeline
     where tenant_id = t.id and pipeline_id is null;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- RICH DEAL FIELDS
-- ---------------------------------------------------------------------
alter table deals add column if not exists pipeline_id        uuid references pipelines(id) on delete set null;
alter table deals add column if not exists owner_user_id      uuid references auth.users(id) on delete set null;
alter table deals add column if not exists primary_company_id uuid references companies(id) on delete set null;
alter table deals add column if not exists probability        int default 0;      -- 0-100 (overrides stage default if set)
alter table deals add column if not exists deal_type          text;               -- new_business, existing_business, renewal, upsell
alter table deals add column if not exists priority           text check (priority in ('low','medium','high','urgent'));
alter table deals add column if not exists source             text;               -- lead_source
alter table deals add column if not exists description        text;
alter table deals add column if not exists lost_reason        text;
alter table deals add column if not exists closed_at          timestamptz;
alter table deals add column if not exists last_activity_at   timestamptz;
alter table deals add column if not exists currency           text default 'USD';

create index if not exists deals_pipeline_idx       on deals(tenant_id, pipeline_id);
create index if not exists deals_owner_idx          on deals(tenant_id, owner_user_id);
create index if not exists deals_primary_company    on deals(primary_company_id);
create index if not exists deals_last_activity_idx  on deals(tenant_id, last_activity_at desc);

-- Backfill pipeline_id on existing deals from the stage's pipeline.
update deals d
   set pipeline_id = ds.pipeline_id
  from deal_stages ds
 where d.stage_id = ds.id
   and d.pipeline_id is null;

-- Deal <-> Contact (many-to-many). Keep existing deals.contact_id as a convenience / primary.
create table if not exists deal_contacts (
  deal_id    uuid not null references deals(id)    on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  is_primary boolean not null default false,
  role       text,
  created_at timestamptz not null default now(),
  primary key (deal_id, contact_id)
);
create index if not exists deal_contacts_contact_idx on deal_contacts(contact_id);

alter table deal_contacts enable row level security;
drop policy if exists deal_contacts_tenant on deal_contacts;
create policy deal_contacts_tenant on deal_contacts
  for all using (
    exists (select 1 from deals d where d.id = deal_contacts.deal_id and d.tenant_id = my_tenant_id())
  )
  with check (
    exists (select 1 from deals d where d.id = deal_contacts.deal_id and d.tenant_id = my_tenant_id())
  );

-- Deal <-> Company (many-to-many).
create table if not exists deal_companies (
  deal_id    uuid not null references deals(id)     on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (deal_id, company_id)
);
create index if not exists deal_companies_company_idx on deal_companies(company_id);

alter table deal_companies enable row level security;
drop policy if exists deal_companies_tenant on deal_companies;
create policy deal_companies_tenant on deal_companies
  for all using (
    exists (select 1 from deals d where d.id = deal_companies.deal_id and d.tenant_id = my_tenant_id())
  )
  with check (
    exists (select 1 from deals d where d.id = deal_companies.deal_id and d.tenant_id = my_tenant_id())
  );

-- Keep deal_contacts in sync with deals.contact_id convenience field.
create or replace function sync_deal_primary_contact() returns trigger
  language plpgsql as $$
begin
  if new.contact_id is not null then
    insert into deal_contacts (deal_id, contact_id, is_primary)
      values (new.id, new.contact_id, true)
    on conflict (deal_id, contact_id) do update set is_primary = true;
  end if;
  return new;
end $$;

drop trigger if exists trg_deals_sync_contact on deals;
create trigger trg_deals_sync_contact
  after insert or update of contact_id on deals
  for each row execute function sync_deal_primary_contact();

-- ---------------------------------------------------------------------
-- ACTIVITIES — unified timeline (calls, emails, meetings, notes, stage changes)
-- ---------------------------------------------------------------------
create table if not exists activities (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  activity_type  text not null check (activity_type in
    ('call','email','meeting','note','task','stage_change','status_change','file','sms')),
  subject        text,
  body           text,
  contact_id     uuid references contacts(id)  on delete set null,
  deal_id        uuid references deals(id)     on delete set null,
  company_id     uuid references companies(id) on delete set null,
  user_id        uuid references auth.users(id) on delete set null,
  occurred_at    timestamptz not null default now(),
  duration_sec   int,             -- call length, meeting length
  outcome        text,             -- booked, answered, voicemail, sent, opened, clicked, ...
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists activities_contact_idx  on activities(contact_id, occurred_at desc);
create index if not exists activities_deal_idx     on activities(deal_id, occurred_at desc);
create index if not exists activities_company_idx  on activities(company_id, occurred_at desc);
create index if not exists activities_tenant_time  on activities(tenant_id, occurred_at desc);
create index if not exists activities_type_idx     on activities(tenant_id, activity_type, occurred_at desc);

alter table activities enable row level security;
drop policy if exists activities_tenant_rw on activities;
create policy activities_tenant_rw on activities
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- Mirror call_logs into activities automatically so the timeline is unified.
create or replace function mirror_call_into_activity() returns trigger
  language plpgsql as $$
begin
  insert into activities (
    tenant_id, activity_type, subject, body,
    contact_id, user_id, occurred_at, outcome, meta
  ) values (
    new.tenant_id, 'call',
    'Call: ' || coalesce(new.outcome, ''),
    new.notes,
    new.contact_id, new.caller_id, new.called_at, new.outcome,
    jsonb_build_object(
      'call_log_id', new.id,
      'list_id',     new.list_id,
      'next_action_at', new.next_action_at
    )
  );
  return new;
end $$;

drop trigger if exists trg_call_logs_mirror on call_logs;
create trigger trg_call_logs_mirror
  after insert on call_logs
  for each row execute function mirror_call_into_activity();

-- Update deal.last_activity_at whenever a deal-linked activity is logged.
create or replace function bump_deal_last_activity() returns trigger
  language plpgsql as $$
begin
  if new.deal_id is not null then
    update deals set last_activity_at = new.occurred_at, updated_at = now()
     where id = new.deal_id
       and (last_activity_at is null or last_activity_at < new.occurred_at);
  end if;
  return new;
end $$;

drop trigger if exists trg_activity_bump_deal on activities;
create trigger trg_activity_bump_deal
  after insert on activities
  for each row execute function bump_deal_last_activity();

-- ---------------------------------------------------------------------
-- CUSTOM PROPERTIES (per-tenant custom fields)
-- ---------------------------------------------------------------------
create table if not exists custom_properties (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  object_type text not null check (object_type in ('contact','company','deal')),
  name        text not null,        -- machine key, snake_case
  label       text not null,        -- display label
  data_type   text not null check (data_type in ('text','longtext','number','boolean','date','datetime','select','multiselect','url','email','phone')),
  options     jsonb,                -- for select / multiselect
  position    int not null default 0,
  required    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (tenant_id, object_type, name)
);
create index if not exists custom_properties_lookup on custom_properties(tenant_id, object_type, position);

alter table custom_properties enable row level security;
drop policy if exists custom_properties_rw on custom_properties;
create policy custom_properties_rw on custom_properties
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

create table if not exists custom_values (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  property_id  uuid not null references custom_properties(id) on delete cascade,
  contact_id   uuid references contacts(id)  on delete cascade,
  company_id   uuid references companies(id) on delete cascade,
  deal_id      uuid references deals(id)     on delete cascade,
  value        jsonb,                         -- flexible container
  updated_at   timestamptz not null default now(),
  check (
    (contact_id is not null)::int
    + (company_id is not null)::int
    + (deal_id is not null)::int = 1
  )
);
create index if not exists custom_values_contact_idx on custom_values(contact_id, property_id);
create index if not exists custom_values_company_idx on custom_values(company_id, property_id);
create index if not exists custom_values_deal_idx    on custom_values(deal_id, property_id);

alter table custom_values enable row level security;
drop policy if exists custom_values_rw on custom_values;
create policy custom_values_rw on custom_values
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- ---------------------------------------------------------------------
-- FIRST-CLASS TAGS (many-to-many) — supplement the text[] on contacts
-- ---------------------------------------------------------------------
create table if not exists tags (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  color       text,
  created_at  timestamptz not null default now()
);
create index if not exists tags_tenant_idx on tags(tenant_id, name);
create unique index if not exists tags_tenant_name_uniq on tags(tenant_id, lower(name));

alter table tags enable row level security;
drop policy if exists tags_rw on tags;
create policy tags_rw on tags
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

create table if not exists tag_assignments (
  tag_id       uuid not null references tags(id) on delete cascade,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  contact_id   uuid references contacts(id)  on delete cascade,
  company_id   uuid references companies(id) on delete cascade,
  deal_id      uuid references deals(id)     on delete cascade,
  created_at   timestamptz not null default now(),
  check (
    (contact_id is not null)::int
    + (company_id is not null)::int
    + (deal_id is not null)::int = 1
  )
);
create index if not exists tag_assign_contact_idx on tag_assignments(contact_id);
create index if not exists tag_assign_company_idx on tag_assignments(company_id);
create index if not exists tag_assign_deal_idx    on tag_assignments(deal_id);
create unique index if not exists tag_assign_contact_uniq on tag_assignments(tag_id, contact_id) where contact_id is not null;
create unique index if not exists tag_assign_company_uniq on tag_assignments(tag_id, company_id) where company_id is not null;
create unique index if not exists tag_assign_deal_uniq    on tag_assignments(tag_id, deal_id)    where deal_id is not null;

alter table tag_assignments enable row level security;
drop policy if exists tag_assignments_rw on tag_assignments;
create policy tag_assignments_rw on tag_assignments
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- ---------------------------------------------------------------------
-- ATTACHMENTS (files linked to contacts/deals/companies/activities)
-- ---------------------------------------------------------------------
create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  mime_type    text,
  size_bytes   bigint,
  storage_path text not null,              -- supabase storage object path
  contact_id   uuid references contacts(id)  on delete cascade,
  company_id   uuid references companies(id) on delete cascade,
  deal_id      uuid references deals(id)     on delete cascade,
  activity_id  uuid references activities(id) on delete cascade,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists attachments_contact_idx on attachments(contact_id);
create index if not exists attachments_deal_idx    on attachments(deal_id);
create index if not exists attachments_company_idx on attachments(company_id);

alter table attachments enable row level security;
drop policy if exists attachments_rw on attachments;
create policy attachments_rw on attachments
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- ---------------------------------------------------------------------
-- Extend default pipeline seeder to also create a pipelines row.
-- New tenants going forward get a proper pipeline + stages.
-- ---------------------------------------------------------------------
create or replace function seed_default_pipeline(p_tenant uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_pipeline uuid;
begin
  insert into pipelines (tenant_id, name, position, is_default)
    values (p_tenant, 'Sales Pipeline', 1, true)
    returning id into v_pipeline;

  insert into deal_stages (tenant_id, pipeline_id, name, position, is_won, is_lost, win_probability, color) values
    (p_tenant, v_pipeline, 'Lead',         1, false, false,  10, '#94a3b8'),
    (p_tenant, v_pipeline, 'Qualified',    2, false, false,  25, '#38bdf8'),
    (p_tenant, v_pipeline, 'Proposal',     3, false, false,  50, '#6366f1'),
    (p_tenant, v_pipeline, 'Negotiation',  4, false, false,  75, '#f59e0b'),
    (p_tenant, v_pipeline, 'Won',          5, true,  false, 100, '#10b981'),
    (p_tenant, v_pipeline, 'Lost',         6, false, true,    0, '#ef4444');
end $$;
