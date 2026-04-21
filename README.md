# Blackbox CRM

The operator's CRM. Multi-tenant, invite-only, built by Blackbox Advancements.

Stack: Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + RLS) + Resend (email).

## What's in the box

- **Magic-link auth** (no passwords).
- **Invite-only access.** Only emails you manually add to the `allowed_members` table can sign in. Everyone else gets bounced to `/denied`.
- **Multi-tenant isolation** via Postgres Row-Level Security. Every row belongs to a tenant, and every policy enforces `tenant_id = my_tenant_id()`. Evergreen Epoxy's data is invisible to Grandview Golf Course and vice versa, enforced at the database layer.
- **Modules:** Dashboard, Contacts, Deals (drag-and-drop kanban pipeline), Tasks, Marketing Email Campaigns, SEO keyword tracker, Settings.
- **Admin console** at `/admin` (super-admins only): create workspaces, add/revoke member emails.
- **WebGL splash hero** on the login page, matching the blackboxadvancements.com aesthetic.

---

## One-time setup (≈ 10 minutes)

### 1. Create a Supabase project
1. Go to https://supabase.com → **New Project**.
2. Pick a name ("blackbox-crm"), a region, and a database password.
3. Wait ~60 seconds for provisioning.
4. Open **Settings → API**. Copy these three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret, server-only)

### 2. Run the schema
1. Open **SQL Editor** → **New query**.
2. Paste the contents of `supabase/migrations/001_schema.sql`.
3. Click **Run**.

### 3. Configure auth redirect URL
1. **Authentication → URL Configuration**.
2. Set **Site URL** to your production URL (e.g. `https://crm.blackboxadvancements.com`).
3. Add redirect URLs: `https://crm.blackboxadvancements.com/auth-callback` and `http://localhost:3000/auth-callback`.

### 4. Make yourself the super-admin + first tenant
Run this in the SQL Editor (replace the email):
```sql
-- 1. Create your workspace
insert into tenants (name, slug) values ('Evergreen Epoxy', 'evergreen-epoxy')
  returning id;
-- copy the UUID it returns, then:
select seed_default_pipeline('<tenant-uuid>');

-- 2. Put your email on the allowlist (replace EMAIL + UUID)
insert into allowed_members (email, tenant_id) values
  ('carson@evergreenepoxyflooring.com', '<tenant-uuid>');
```

Then log in once via the app (magic link). After you log in, run:
```sql
update profiles set is_super_admin = true
  where email = 'carson@evergreenepoxyflooring.com';
```

From then on, use `/admin` in the UI to add workspaces and members. No more SQL needed.

### 5. Deploy to Vercel
```bash
# From Vercel dashboard:
# 1. New Project → Import this GitHub repo
# 2. Environment Variables: paste the four values from step 1 + RESEND_API_KEY (optional)
# 3. Deploy
```

### 6. Point `crm.blackboxadvancements.com` at Vercel
1. In Vercel → **Domains** → add `crm.blackboxadvancements.com`.
2. At your DNS provider (where blackboxadvancements.com is managed), add a **CNAME** record:
   - Name: `crm`
   - Value: `cname.vercel-dns.com`
3. Wait ~30 seconds. The subdomain goes live.
4. Update the Supabase redirect URL (step 3 above) if you haven't already.

### 7. (Optional) Set up email sending
1. Sign up at https://resend.com (free tier: 100 emails/day).
2. Verify your sending domain (takes 5 minutes, adds 3 DNS records).
3. Create an API key → paste into Vercel env as `RESEND_API_KEY`.
4. Redeploy. The "Send to all contacts" button in Campaigns now works.

---

## Local development
```bash
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev
```

Visit http://localhost:3000.

---

## Granting access to a new customer

1. Log in at `crm.blackboxadvancements.com`.
2. Go to **Members** (super-admin only, left nav).
3. Click **Create** to add a new workspace (e.g. "Grandview Golf Course").
4. In the **Members** section, add their email and pick their workspace.
5. Tell them to go to `crm.blackboxadvancements.com`, enter their email, click the magic link.

That's it. They see only their workspace's data. You can revoke access any time from the same screen.

---

## Architecture notes

**Why Supabase + RLS for multi-tenancy.** The tenant filter lives in the database, not the app code. Even if an app developer writes `select * from contacts` with no `where` clause, Postgres still applies `tenant_id = my_tenant_id()` because of Row-Level Security. Zero chance of data leaking across customers.

**Why magic links instead of passwords.** Lower friction for users, no password reset flows to maintain, no compromised-password risk. The link expires in 1 hour.

**Why a separate `allowed_members` table instead of checking Stripe directly.** Decouples auth from billing. You can hand out free seats, paid seats, or comp access without touching Stripe. Later we can add a Stripe webhook that auto-upserts rows on purchase.
