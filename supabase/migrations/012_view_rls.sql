-- Fix tenant isolation: views default to running as owner (superuser) which bypasses
-- RLS. Recreate with security_invoker=true so they run under the querying user's
-- role and the base-table RLS policies are enforced.

drop view if exists pipeline_rollup;
create view pipeline_rollup with (security_invoker = true) as
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

drop view if exists activity_rollup;
create view activity_rollup with (security_invoker = true) as
select
  tenant_id,
  date_trunc('day', occurred_at) as day,
  activity_type,
  count(*) as n
  from activities
 group by tenant_id, date_trunc('day', occurred_at), activity_type;

-- Also tighten tenant_overview so super admin (the only intended caller) gets
-- consistent view, but members can't bypass RLS through it.
drop view if exists tenant_overview;
create view tenant_overview with (security_invoker = true) as
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
