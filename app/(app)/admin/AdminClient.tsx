'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  display_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
};
type Member = { id: string; email: string; tenant_id: string | null; tenant_name?: string; created_at: string };

export function AdminClient() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newTenant, setNewTenant] = useState('');
  const [creatingTenant, setCreatingTenant] = useState(false);

  const [mEmail, setMEmail] = useState('');
  const [mTenant, setMTenant] = useState('');
  const [mPassword, setMPassword] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/list');
    const d = await r.json();
    if (d.error) setErr(d.error);
    else {
      setTenants(d.tenants);
      setMembers(d.members);
      if (d.tenants[0] && !mTenant) setMTenant(d.tenants[0].id);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    setCreatingTenant(true);
    const r = await fetch('/api/admin/tenants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTenant }),
    });
    setCreatingTenant(false);
    if (!r.ok) { const d = await r.json(); setErr(d.error); return; }
    setNewTenant('');
    await load();
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setAddingMember(true);
    setInviteStatus(null);
    setErr(null);
    const r = await fetch('/api/admin/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mEmail, tenant_id: mTenant, password: mPassword || undefined }),
    });
    const d = await r.json().catch(() => ({}));
    setAddingMember(false);
    if (!r.ok) { setErr(d.error || 'Failed to add member'); return; }

    // Surface the invite result so the admin knows whether an email actually went out.
    if (d.status === 'password_set') {
      setInviteStatus(`Access granted. Share these credentials: ${mEmail} / ${mPassword}. They can sign in at /login.`);
    } else if (d.status === 'invite_sent') {
      setInviteStatus(`Invite email sent to ${mEmail}. They'll click the link to set a password.`);
    } else if (d.status === 'existing_user_reset_sent') {
      setInviteStatus(`${mEmail} already has an account — a password reset email was sent.`);
    } else if (d.status === 'invite_failed' || d.status === 'existing_user_reset_failed') {
      setInviteStatus(`Access granted, but email failed: ${d.message || 'unknown error'}. Ask them to use "Forgot password" at the sign-in page.`);
    }

    setMEmail('');
    setMPassword('');
    await load();
  }

  async function removeMember(id: string) {
    if (!confirm('Revoke access?')) return;
    await fetch(`/api/admin/members?id=${id}`, { method: 'DELETE' });
    await load();
  }

  if (loading) return <div className="card p-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      {err && <p className="text-sm text-danger">{err}</p>}

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Workspaces (tenants)</h2>
        </div>
        <form onSubmit={createTenant} className="mt-4 flex gap-2">
          <input required className="input" placeholder="Workspace name, e.g. Grandview Golf Course" value={newTenant} onChange={(e) => setNewTenant(e.target.value)} />
          <button disabled={creatingTenant} className="btn btn-primary shrink-0">
            {creatingTenant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
        </form>
        <ul className="mt-4 divide-y divide-border text-sm">
          {tenants.map((t) => (
            <TenantRow key={t.id} tenant={t} onSaved={load} />
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Members</h2>
        <form onSubmit={addMember} className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input required type="email" className="input" placeholder="email@company.com" value={mEmail} onChange={(e) => setMEmail(e.target.value)} />
          <input type="text" className="input" placeholder="Password (optional, min 6)" value={mPassword} onChange={(e) => setMPassword(e.target.value)} autoComplete="new-password" />
          <select className="input" value={mTenant} onChange={(e) => setMTenant(e.target.value)}>
            {tenants.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
          <button disabled={addingMember || !tenants.length} className="btn btn-primary">
            {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Grant access
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-500">Leave password blank to email them an invite. Set a password to create their account instantly so you can share the credentials directly.</p>

        {inviteStatus && (
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {inviteStatus}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-black/40 text-left text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">No members yet.</td></tr>
              ) : members.map((m) => (
                <tr key={m.id} className="table-row">
                  <td className="px-4 py-3 font-medium text-white">{m.email}</td>
                  <td className="px-4 py-3 text-gray-300">{m.tenant_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(m.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeMember(m.id)} className="text-gray-500 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-gray-500">
        Workflow: create a workspace for each customer, then add the emails of people who should be able to log in.
        When you grant access they get an email prompting them to set a password. After that, they sign in at
        <code className="mx-1 text-primary">/login</code> with their email + password.
      </p>
    </div>
  );
}

function TenantRow({ tenant, onSaved }: { tenant: Tenant; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(tenant.display_name || '');
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '');
  const [color, setColor] = useState(tenant.primary_color || '#8b5cf6');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const r = await fetch('/api/admin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tenant.id,
        display_name: displayName,
        logo_url: logoUrl,
        primary_color: color,
      }),
    });
    setSaving(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setMsg(d.error || 'Save failed');
      return;
    }
    setMsg('Saved.');
    await onSaved();
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt="" className="h-8 w-8 rounded-md border border-white/10 object-contain" />
          ) : (
            <div
              className="h-8 w-8 rounded-md border border-white/10"
              style={{ background: tenant.primary_color || '#8b5cf6' }}
            />
          )}
          <div>
            <div className="font-medium text-white">{tenant.display_name || tenant.name}</div>
            <div className="text-xs text-gray-500">{tenant.slug}</div>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-gray-400 hover:text-primary"
        >
          {open ? 'Close' : 'Edit branding'}
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-3 rounded-lg border border-border bg-black/30 p-4 md:grid-cols-3">
          <div>
            <label className="label">Display name</label>
            <input
              className="input"
              placeholder={tenant.name}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input
              className="input"
              placeholder="https://..."
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Primary color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded border border-border bg-black/40"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <input
                className="input"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>
          <div className="md:col-span-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">{msg}</div>
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save branding
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
