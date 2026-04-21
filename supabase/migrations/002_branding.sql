-- Per-tenant branding: logo, color, display name.
-- Safe to re-run.

alter table tenants add column if not exists logo_url text;
alter table tenants add column if not exists primary_color text;
alter table tenants add column if not exists display_name text;

-- Allow authenticated users to read their own tenant's branding.
-- (RLS on tenants is already scoped to members by tenant_id in 001_schema;
-- this is just a belt-and-suspenders note — no change needed if the
-- existing policy already covers SELECT on tenants.)
