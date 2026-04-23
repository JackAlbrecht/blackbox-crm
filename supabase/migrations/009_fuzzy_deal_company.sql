-- Best-effort: link deals to companies by matching deal.name against company.name.
-- Many Evergreen deal names contain the company (e.g. "Piazza Construction - Garage Epoxy").
-- This is a heuristic; it will link confidently-matched pairs and skip the rest.

update deals d
   set primary_company_id = co.id
  from companies co
 where d.tenant_id = 'fd0a0817-9294-4391-9507-401d3ff4d142'
   and d.primary_company_id is null
   and co.tenant_id = d.tenant_id
   and length(co.name) >= 5               -- avoid matching tiny/ambiguous names
   and position(lower(co.name) in lower(d.name)) > 0;

-- Mirror into deal_companies.
insert into deal_companies (deal_id, company_id, is_primary)
  select id, primary_company_id, true
    from deals
   where tenant_id = 'fd0a0817-9294-4391-9507-401d3ff4d142'
     and primary_company_id is not null
on conflict (deal_id, company_id) do update set is_primary = true;

select
  (select count(*) from deals where tenant_id='fd0a0817-9294-4391-9507-401d3ff4d142' and primary_company_id is not null) as deals_linked_to_company,
  (select count(*) from deal_companies) as join_rows;
