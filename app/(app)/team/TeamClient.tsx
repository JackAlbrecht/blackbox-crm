'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Shield, Trash2, KeyRound, Check } from 'lucide-react';

type Member = {
  user_id: string;
  email: string;
  full_name: string | null;
  active: boolean;
  is_tenant_admin: boolean;
  is_super_admin: boolean;
  created_at: string;
};

export function TeamClient({
  me,
  tenantName,
  initialMembers,
}: {
  me: { user_id: string; is_super_admin: boolean; is_tenant_admin: boolean };
  tenantName: string;
  initialMembers: Member[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setPending(true);
    const res = await fetch('/api/team/members', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email, password, full_name: fullName || undefined, is_tenant_admin: makeAdmin,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) { setStatus({ type: 'err', msg: data.error || 'Failed' }); return; }
    setStatus({ type: 'ok', msg: `Added ${email}. Share credentials: ${email} / ${password}` });
    setEmail(''); setPassword(''); setFullName(''); setMakeAdmin(false);
    startTransition(() => router.refresh());
    // Refetch list
    fetchMembers();
  }

  async function fetchMembers() {
    const res = await fetch('/api/team/members');
    const data = await res.json();
    if (data.members) setMembers(data.members);
  }

  async function toggleAdmin(m: Member) {
    if (m.user_id === me.user_id) return;
    const res = await fetch('/api/team/members', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: m.user_id, is_tenant_admin: !m.is_tenant_admin }),
    });
    if (res.ok) fetchMembers();
  }

  async function resetPassword(m: Member) {
    const pw = prompt(`New password for ${m.email} (min 6 chars):`);
    if (!pw || pw.length < 6) return;
    const res = await fetch('/api/team/members', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: m.user_id, password: pw }),
    });
    if (res.ok) setStatus({ type: 'ok', msg: `Reset password for ${m.email} to: ${pw}` });
    else { const data = await res.json(); setStatus({ type: 'err', msg: data.error || 'Failed' }); }
  }

  async function removeMember(m: Member) {
    if (m.user_id === me.user_id) return;
    if (!confirm(`Remove ${m.email} from ${tenantName}? They'll lose access immediately.`)) return;
    const res = await fetch(`/api/team/members?user_id=${m.user_id}`, { method: 'DELETE' });
    if (res.ok) fetchMembers();
    else { const data = await res.json(); setStatus({ type: 'err', msg: data.error || 'Failed' }); }
  }

  function genPw() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setPassword(s);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold text-white">Team</h1>
        <p className="mt-1 text-sm text-gray-400">
          Add members to <span className="text-white">{tenantName}</span>. They can sign in at{' '}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-primary">crm.blackboxadvancements.com</code> with the email + password you set.
        </p>
      </header>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Add team member</h2>
        <form onSubmit={addMember} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="email" required autoComplete="off"
              className="input" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input
              className="input" placeholder="Full name (optional)"
              value={fullName} onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              required minLength={6} autoComplete="new-password"
              className="input" placeholder="Password (min 6 chars)"
              value={password} onChange={e => setPassword(e.target.value)}
            />
            <button type="button" onClick={genPw} className="btn btn-ghost text-xs">
              <KeyRound className="h-3.5 w-3.5" /> Generate
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox" checked={makeAdmin}
              onChange={e => setMakeAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            Make them a workspace admin (can also add/remove members)
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pending} className="btn btn-primary">
              <UserPlus className="h-4 w-4" /> {pending ? 'Adding…' : 'Add member'}
            </button>
            {status && (
              <span className={status.type === 'ok' ? 'text-emerald-400 text-sm inline-flex items-center gap-1' : 'text-rose-400 text-sm'}>
                {status.type === 'ok' && <Check className="h-4 w-4" />} {status.msg}
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Members ({members.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-black/40 text-left text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.user_id} className="table-row">
                <td className="px-4 py-3 font-medium text-white">{m.email}</td>
                <td className="px-4 py-3 text-gray-300">{m.full_name || '—'}</td>
                <td className="px-4 py-3">
                  {m.is_super_admin ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-300">
                      <Shield className="h-3 w-3" /> Super admin
                    </span>
                  ) : m.is_tenant_admin ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                      <Shield className="h-3 w-3" /> Workspace admin
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Member</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {m.active ? (
                    <span className="inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">Active</span>
                  ) : (
                    <span className="inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-500">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!m.is_super_admin && m.user_id !== me.user_id && (
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => toggleAdmin(m)}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300 hover:text-white"
                        title={m.is_tenant_admin ? 'Demote to member' : 'Promote to admin'}
                      >
                        {m.is_tenant_admin ? 'Demote' : 'Make admin'}
                      </button>
                      <button
                        onClick={() => resetPassword(m)}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300 hover:text-white"
                      >
                        Reset pw
                      </button>
                      <button
                        onClick={() => removeMember(m)}
                        className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300 hover:text-rose-200"
                      >
                        <Trash2 className="inline h-3 w-3" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
