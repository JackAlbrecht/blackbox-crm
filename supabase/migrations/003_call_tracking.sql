-- =============================================================
-- Call tracking + lead lists
-- =============================================================

-- Lead lists (a batch of imported contacts to work through).
create table if not exists lead_lists (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  description text,
  source      text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists lead_lists_tenant_idx on lead_lists(tenant_id, created_at desc);

alter table lead_lists enable row level security;
drop policy if exists lead_lists_tenant on lead_lists;
create policy lead_lists_tenant on lead_lists
  for all
  using (tenant_id = (select tenant_id from profiles where user_id = auth.uid()))
  with check (tenant_id = (select tenant_id from profiles where user_id = auth.uid()));

-- Contacts -> lists (many-to-many).
create table if not exists contact_lists (
  contact_id uuid not null references contacts(id) on delete cascade,
  list_id    uuid not null references lead_lists(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (contact_id, list_id)
);
create index if not exists contact_lists_list_idx on contact_lists(list_id);

alter table contact_lists enable row level security;
drop policy if exists contact_lists_tenant on contact_lists;
create policy contact_lists_tenant on contact_lists
  for all
  using (
    exists (
      select 1 from contacts c
      where c.id = contact_lists.contact_id
        and c.tenant_id = (select tenant_id from profiles where user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from contacts c
      where c.id = contact_lists.contact_id
        and c.tenant_id = (select tenant_id from profiles where user_id = auth.uid())
    )
  );

-- Call outcomes enum (plain text + check so we can add freely later).
-- Values: answered | no_answer | voicemail | busy | booked | not_interested | callback | wrong_number | do_not_call
create table if not exists call_logs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  contact_id      uuid not null references contacts(id) on delete cascade,
  list_id         uuid references lead_lists(id) on delete set null,
  caller_id       uuid references auth.users(id) on delete set null,
  outcome         text not null check (outcome in (
    'answered','no_answer','voicemail','busy','booked',
    'not_interested','callback','wrong_number','do_not_call'
  )),
  notes           text,
  called_at       timestamptz not null default now(),
  next_action_at  timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists call_logs_contact_idx on call_logs(contact_id, called_at desc);
create index if not exists call_logs_tenant_idx  on call_logs(tenant_id, called_at desc);
create index if not exists call_logs_list_idx    on call_logs(list_id, outcome);

alter table call_logs enable row level security;
drop policy if exists call_logs_tenant on call_logs;
create policy call_logs_tenant on call_logs
  for all
  using (tenant_id = (select tenant_id from profiles where user_id = auth.uid()))
  with check (tenant_id = (select tenant_id from profiles where user_id = auth.uid()));

-- Denormalized fields on contacts so the contacts list view is fast.
alter table contacts add column if not exists last_call_at      timestamptz;
alter table contacts add column if not exists last_call_outcome text;
alter table contacts add column if not exists next_follow_up_at timestamptz;

create index if not exists contacts_last_call_idx    on contacts(tenant_id, last_call_at desc);
create index if not exists contacts_follow_up_idx    on contacts(tenant_id, next_follow_up_at);
create index if not exists contacts_last_outcome_idx on contacts(tenant_id, last_call_outcome);

-- Keep denormalized fields in sync: when a call is logged, update the contact's
-- last_call_* and next_follow_up_at fields if this is the most recent call.
create or replace function sync_contact_call_state() returns trigger as $$
begin
  update contacts
     set last_call_at      = new.called_at,
         last_call_outcome = new.outcome,
         next_follow_up_at = new.next_action_at,
         updated_at        = now()
   where id = new.contact_id
     and (last_call_at is null or last_call_at <= new.called_at);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_call_logs_sync on call_logs;
create trigger trg_call_logs_sync
  after insert on call_logs
  for each row execute function sync_contact_call_state();
