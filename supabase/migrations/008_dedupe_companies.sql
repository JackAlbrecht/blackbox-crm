-- Dedupe: keep the earliest row per (tenant_id, hubspot_id in notes), delete the rest.
with ranked as (
  select id,
         row_number() over (
           partition by tenant_id, split_part(split_part(coalesce(notes,''), 'hubspot_id=', 2), ';', 1)
           order by created_at asc, id asc
         ) as rn
    from companies
   where tenant_id = 'fd0a0817-9294-4391-9507-401d3ff4d142'
     and notes like 'hubspot_id=%'
)
delete from companies using ranked
 where companies.id = ranked.id and ranked.rn > 1;

-- After dedupe: rewire any contacts whose primary_company_id points at a now-deleted row.
-- The `on delete set null` reference already did this for us — but the primary row may not be
-- the one we want. Re-run the linker to pick a currently-existing company by domain/name.
update contacts c
   set primary_company_id = co.id
  from companies co
 where c.tenant_id = 'fd0a0817-9294-4391-9507-401d3ff4d142'
   and c.primary_company_id is null
   and c.email is not null
   and co.tenant_id = c.tenant_id
   and co.domain is not null
   and lower(split_part(c.email, '@', 2)) = lower(co.domain);

update contacts c
   set primary_company_id = co.id
  from companies co
 where c.tenant_id = 'fd0a0817-9294-4391-9507-401d3ff4d142'
   and c.primary_company_id is null
   and c.company is not null
   and co.tenant_id = c.tenant_id
   and lower(btrim(c.company)) = lower(btrim(co.name));

insert into contact_companies (contact_id, company_id, is_primary)
  select id, primary_company_id, true
    from contacts
   where tenant_id = 'fd0a0817-9294-4391-9507-401d3ff4d142'
     and primary_company_id is not null
on conflict (contact_id, company_id) do update set is_primary = true;

select
  (select count(*) from companies where tenant_id='fd0a0817-9294-4391-9507-401d3ff4d142')          as companies_total,
  (select count(*) from contacts  where tenant_id='fd0a0817-9294-4391-9507-401d3ff4d142' and primary_company_id is not null) as contacts_linked,
  (select count(*) from contact_companies) as join_rows;
