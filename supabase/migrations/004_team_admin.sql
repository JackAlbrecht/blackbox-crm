-- =============================================================
-- Per-tenant admin: workspace owners can add members to their
-- own tenant without being super admin.
-- =============================================================

alter table profiles add column if not exists is_tenant_admin boolean not null default false;
create index if not exists profiles_tenant_admin_idx on profiles(tenant_id) where is_tenant_admin;

-- Auto-promote the first active member of a tenant to tenant admin,
-- so whoever the super admin invites first becomes the owner.
create or replace function promote_first_tenant_member() returns trigger as $$
begin
  if new.tenant_id is not null and new.active = true and coalesce(new.is_tenant_admin, false) = false then
    if not exists (
      select 1 from profiles
       where tenant_id = new.tenant_id
         and is_tenant_admin = true
         and user_id <> new.user_id
    ) then
      new.is_tenant_admin := true;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_first_admin on profiles;
create trigger trg_profiles_first_admin
  before insert or update of tenant_id, active on profiles
  for each row execute function promote_first_tenant_member();

-- Backfill: for each tenant that has NO tenant admin yet, promote the oldest active member.
update profiles p
   set is_tenant_admin = true
  from (
    select distinct on (tenant_id) user_id, tenant_id
      from profiles
     where tenant_id is not null and active = true
     order by tenant_id, created_at asc
  ) first_member
 where p.user_id = first_member.user_id
   and not exists (
     select 1 from profiles pp
      where pp.tenant_id = p.tenant_id
        and pp.is_tenant_admin = true
   );
