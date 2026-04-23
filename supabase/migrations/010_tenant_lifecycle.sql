-- Workspace lifecycle: pause (keep data, block login) and delete (already cascades).

alter table tenants add column if not exists paused boolean not null default false;
alter table tenants add column if not exists paused_at timestamptz;
alter table tenants add column if not exists paused_reason text;

-- Optional super-admin convenience: a view summarizing each tenant's footprint.
create or replace view tenant_overview as
select
  t.id,
  t.name,
  t.slug,
  t.paused,
  t.paused_at,
  t.paused_reason,
  t.created_at,
  (select count(*) from profiles  where tenant_id = t.id and active = true) as active_members,
  (select count(*) from contacts  where tenant_id = t.id)                   as contacts,
  (select count(*) from companies where tenant_id = t.id)                   as companies,
  (select count(*) from deals     where tenant_id = t.id)                   as deals
  from tenants t;
