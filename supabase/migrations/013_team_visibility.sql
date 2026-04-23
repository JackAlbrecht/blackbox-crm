-- Allow every active tenant member to see the list of other profiles in the same tenant.
-- Existing "self read" policy kept. Admin-only write policies stay unchanged.
drop policy if exists "profiles tenant read" on profiles;
create policy "profiles tenant read" on profiles
  for select
  using (
    tenant_id = (select tenant_id from profiles where user_id = auth.uid())
    or user_id = auth.uid()
    or coalesce((select is_super_admin from profiles where user_id = auth.uid()), false)
  );

-- Realtime: turn on replica identity for the tables members should see update live.
-- (Supabase Realtime uses logical replication; these tables need it for UPDATE/DELETE payloads.)
alter table lead_lists        replica identity full;
alter table contact_lists     replica identity full;
alter table call_logs         replica identity full;
alter table contacts          replica identity full;
alter table deals             replica identity full;
alter table activities        replica identity full;
alter table record_comments   replica identity full;

-- Add to the supabase_realtime publication (created by Supabase automatically).
-- `if not exists` the whole addition — Postgres doesn't support it directly on publication add,
-- so wrap in exception-tolerant blocks.
do $$
declare t text;
begin
  for t in select unnest(array['lead_lists','contact_lists','call_logs','contacts','deals','activities','record_comments']) loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object or undefined_object then null;
    end;
  end loop;
end $$;
