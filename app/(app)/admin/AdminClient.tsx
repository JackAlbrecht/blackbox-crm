'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Tenant = { id: string; name: string; slug: string };
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
  const [addingMember, setAddingMember] = useState(false);

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
    const r = await fetch('/api/admin/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mEmail, tenant_id: mTenant }),
    });
    setAddingMember(false);
    if (!r.ok) { const d = await r.json(); setErr(d.error); return; }
    setMEmail('');
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
            <li key={t.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-white">{t.name}</div>
                <div className="text-xs text-gray-500">{t.slug}</div>
              </div>
              <span className="pill">ACTIVE</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Members</h2>
        <form onSubmit={addMember} className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input required type="email" className="input" placeholder="email@company.com" value={mEmail} onChange={(e) => setMEmail(e.target.value)} />
          <select className="input" value={mTenant} onChange={(e) => setMTenant(e.target.value)}>
            {tenants.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
          <button disabled={addingMember || !tenants.length} className="btn btn-primary">
            {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Grant access
          </button>
        </form>

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
        When they visit <code className="text-primary">/login</code> and enter their email, they&apos;ll get a magic link.
      </p>
    </div>
  );
}
