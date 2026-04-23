update contacts
   set lifecycle_stage = substring(tag from 11)
  from (
    select id, unnest(tags) as tag from contacts
     where tenant_id = 'fd0a0817-9294-4391-9507-401d3ff4d142'
       and lifecycle_stage is null
       and tags is not null
  ) src
 where contacts.id = src.id
   and src.tag like 'lifecycle:%';

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

update deals d
   set primary_company_id = c.primary_company_id
  from contacts c
 where d.tenant_id = 'fd0a0817-9294-4391-9507-401d3ff4d142'
   and d.contact_id = c.id
   and d.primary_company_id is null
   and c.primary_company_id is not null;

select
  (select count(*) from contacts where tenant_id='fd0a0817-9294-4391-9507-401d3ff4d142' and primary_company_id is not null) as contacts_with_company,
  (select count(*) from contacts where tenant_id='fd0a0817-9294-4391-9507-401d3ff4d142' and lifecycle_stage is not null) as contacts_with_lifecycle,
  (select count(*) from deals    where tenant_id='fd0a0817-9294-4391-9507-401d3ff4d142' and primary_company_id is not null) as deals_linked_to_company;
