-- =============================================================
-- Extended branding: accent color, logo sizing hint, login/bg image,
-- tagline, and the ability for each tenant admin to edit their own.
-- =============================================================

alter table tenants add column if not exists accent_color    text;
alter table tenants add column if not exists logo_wide_url   text;   -- wide/horizontal logo for sidebar + login
alter table tenants add column if not exists favicon_url     text;
alter table tenants add column if not exists tagline         text;
alter table tenants add column if not exists login_bg_url    text;

-- Ensure tenant admins can UPDATE their own tenant branding.
-- The base RLS on tenants already lets members SELECT their tenant.
drop policy if exists tenants_admin_update on tenants;
create policy tenants_admin_update on tenants
  for update
  using (
    id = (select tenant_id from profiles where user_id = auth.uid())
      and (
        (select is_tenant_admin from profiles where user_id = auth.uid()) = true
        or
        (select is_super_admin from profiles where user_id = auth.uid()) = true
      )
  )
  with check (
    id = (select tenant_id from profiles where user_id = auth.uid())
      and (
        (select is_tenant_admin from profiles where user_id = auth.uid()) = true
        or
        (select is_super_admin from profiles where user_id = auth.uid()) = true
      )
  );
