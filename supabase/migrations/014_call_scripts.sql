-- Cold-call scripts per tenant. Any member can read; admins write.
create table if not exists call_scripts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  title       text not null,
  body        text not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists call_scripts_tenant_idx on call_scripts(tenant_id, updated_at desc);

alter table call_scripts enable row level security;
drop policy if exists call_scripts_tenant_rw on call_scripts;
create policy call_scripts_tenant_rw on call_scripts
  for all using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());
