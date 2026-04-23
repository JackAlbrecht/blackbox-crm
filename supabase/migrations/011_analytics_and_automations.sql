-- =====================================================================
-- Blackbox CRM — Analytics, automations, lead scoring, saved views
-- Every add is idempotent. Applies to ALL tenants past and future.
-- =====================================================================

-- Extend tasks to be linkable to any object type.
alter table tasks add column if not exists company_id   uuid references companies(id) on delete set null;
alter table tasks add column if not exists assignee_id  uuid references auth.users(id) on delete set null;
alter table tasks add column if not exists task_type    text;            -- call, email, meeting, todo
create index if not exists tasks_company_idx  on tasks(company_id);
create index if not exists tasks_assignee_idx on tasks(tenant_id, assignee_id, completed);

-- Saved views (filters) for contacts / companies / deals.
create table if not exists saved_views (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  owner_id    uuid references auth.users(id) on delete cascade,
  object_type text not null check (object_type in ('contact','company','deal')),
  name        text not null,
  filters     jsonb not null default '{}'::jsonb,
  is_shared   boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists saved_views_lookup on saved_views(tenant_id, object_type, position);

alter table saved_views enable row level security;
drop policy if exists saved_views_rw on saved_views;
create policy saved_views_rw on saved_views
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

-- Workflows: per-tenant "when X, do Y" automations.
create table if not exists workflows (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  description  text,
  trigger_type text not null check (trigger_type in
    ('contact_created','contact_stage_changed','deal_created','deal_stage_changed','deal_won','deal_lost','activity_logged','tag_added','task_overdue')),
  trigger_config jsonb not null default '{}'::jsonb,
  is_active    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists workflow_actions (
  id          uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  position    int not null default 0,
  action_type text not null check (action_type in
    ('create_task','send_email','add_tag','set_lifecycle','set_owner','log_note','webhook')),
  config      jsonb not null default '{}'::jsonb
);
create index if not exists workflow_actions_wf on workflow_actions(workflow_id, position);

create table if not exists workflow_runs (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  workflow_id  uuid not null references workflows(id) on delete cascade,
  contact_id   uuid references contacts(id)  on delete set null,
  deal_id      uuid references deals(id)     on delete set null,
  company_id   uuid references companies(id) on delete set null,
  status       text not null default 'pending' check (status in ('pending','success','failed','skipped')),
  error        text,
  ran_at       timestamptz not null default now()
);
create index if not exists workflow_runs_tenant_idx on workflow_runs(tenant_id, ran_at desc);
create index if not exists workflow_runs_wf_idx on workflow_runs(workflow_id, ran_at desc);

alter table workflows        enable row level security;
alter table workflow_actions enable row level security;
alter table workflow_runs    enable row level security;
drop policy if exists workflows_rw        on workflows;
drop policy if exists workflow_actions_rw on workflow_actions;
drop policy if exists workflow_runs_rw    on workflow_runs;
create policy workflows_rw on workflows
  for all using (tenant_id = my_tenant_id()) with check (tenant_id = my_tenant_id());
create policy workflow_actions_rw on workflow_actions
  for all using (exists (select 1 from workflows w where w.id = workflow_actions.workflow_id and w.tenant_id = my_tenant_id()))
  with check  (exists (select 1 from workflows w where w.id = workflow_actions.workflow_id and w.tenant_id = my_tenant_id()));
create policy workflow_runs_rw on workflow_runs
  for all using (tenant_id = my_tenant_id()) with check (tenant_id = my_tenant_id());

-- Lead-scoring rules (per tenant, per object type).
create table if not exists lead_score_rules (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  condition   jsonb not null,        -- eg {"field":"lifecycle_stage","op":"eq","value":"customer"}
  points      int not null default 10,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists lead_score_rules_tenant_idx on lead_score_rules(tenant_id, is_active);
alter table lead_score_rules enable row level security;
drop policy if exists lead_score_rules_rw on lead_score_rules;
create policy lead_score_rules_rw on lead_score_rules
  for all using (tenant_id = my_tenant_id()) with check (tenant_id = my_tenant_id());

-- Notifications / in-app inbox for each user.
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null,              -- task_due, deal_won, mention, new_contact, etc.
  title        text not null,
  body         text,
  href         text,                        -- where to send the user when they click
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications(user_id) where read_at is null;

alter table notifications enable row level security;
drop policy if exists notifications_self on notifications;
create policy notifications_self on notifications
  for all using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Comments/mentions on any record (light-weight internal team chat on records).
create table if not exists record_comments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  body         text not null,
  contact_id   uuid references contacts(id)  on delete cascade,
  company_id   uuid references companies(id) on delete cascade,
  deal_id      uuid references deals(id)     on delete cascade,
  created_at   timestamptz not null default now()
);
create index if not exists record_comments_contact_idx on record_comments(contact_id, created_at desc);
create index if not exists record_comments_deal_idx    on record_comments(deal_id, created_at desc);
create index if not exists record_comments_company_idx on record_comments(company_id, created_at desc);
alter table record_comments enable row level security;
drop policy if exists record_comments_rw on record_comments;
create policy record_comments_rw on record_comments
  for all using (tenant_id = my_tenant_id()) with check (tenant_id = my_tenant_id());

-- Reporting view: pipeline rollup per tenant (used by dashboard).
create or replace view pipeline_rollup as
select
  d.tenant_id,
  ds.id as stage_id,
  ds.name as stage_name,
  ds.position as stage_position,
  ds.color as stage_color,
  ds.is_won,
  ds.is_lost,
  count(d.id) as deal_count,
  coalesce(sum(d.value), 0) as total_value,
  coalesce(sum(d.value * coalesce(d.probability, ds.win_probability, 0) / 100.0), 0) as weighted_value
  from deal_stages ds
  left join deals d on d.stage_id = ds.id
 group by d.tenant_id, ds.id, ds.name, ds.position, ds.color, ds.is_won, ds.is_lost;

-- Activity rollup: activity counts per tenant per day for sparklines.
create or replace view activity_rollup as
select
  tenant_id,
  date_trunc('day', occurred_at) as day,
  activity_type,
  count(*) as n
  from activities
 group by tenant_id, date_trunc('day', occurred_at), activity_type;

-- Seed 3 starter lead score rules for every existing tenant (only if that tenant has none yet).
do $$
declare t record;
begin
  for t in select id from tenants loop
    if not exists (select 1 from lead_score_rules where tenant_id = t.id) then
      insert into lead_score_rules (tenant_id, name, condition, points) values
        (t.id, 'Is a customer',    '{"field":"lifecycle_stage","op":"eq","value":"customer"}'::jsonb, 50),
        (t.id, 'Has phone number', '{"field":"phone","op":"not_null"}'::jsonb, 10),
        (t.id, 'Has company',      '{"field":"primary_company_id","op":"not_null"}'::jsonb, 10);
    end if;
  end loop;
end $$;
