'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DealStage, Profile, Tenant } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export function SettingsClient({
  profile, tenant, stages,
}: { profile: Profile; tenant: Tenant | null; stages: DealStage[] }) {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', profile.user_id);
    setSaving(false);
    setMsg(error ? error.message : 'Saved.');
  }

  return (
    <>
      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Profile</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" disabled value={profile.email} />
          </div>
          <div>
            <label className="label">Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          {msg && <p className="text-sm text-success">{msg}</p>}
          <button disabled={saving} className="btn btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save
          </button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Workspace</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div><span className="text-gray-500">Name:</span> <span className="text-white">{tenant?.name || '—'}</span></div>
          <div><span className="text-gray-500">Slug:</span> <span className="text-white">{tenant?.slug || '—'}</span></div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Pipeline stages</h2>
        <p className="mt-2 text-xs text-gray-500">Your deal stages. Edit via SQL for now; drag-to-reorder coming soon.</p>
        <ol className="mt-4 space-y-2 text-sm">
          {stages.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-black/30 px-3 py-2">
              <span className="text-white">{s.position}. {s.name}</span>
              <span className="text-xs text-gray-500">
                {s.is_won ? 'Won' : s.is_lost ? 'Lost' : 'Active'}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
