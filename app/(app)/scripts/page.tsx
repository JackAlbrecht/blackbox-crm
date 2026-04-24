import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ScrollText, Plus } from 'lucide-react';

export const metadata = { title: 'Call scripts · Blackbox CRM' };
export const dynamic = 'force-dynamic';

export default async function ScriptsPage() {
  const supabase = createClient();
  const { data: scripts, error } = await supabase.from('call_scripts').select('id, title, body, updated_at').order('updated_at', { ascending: false });
  return (
    <div className="max-w-4xl animate-fade-in space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white inline-flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" /> Call scripts
          </h1>
          <p className="mt-1 text-sm text-gray-400">Ready-to-read scripts for your callers. Openers, pitches, objection handlers.</p>
        </div>
        <Link href="/scripts/new" className="btn btn-primary"><Plus className="h-4 w-4" /> New script</Link>
      </header>

      {error && <div className="card p-6 text-sm text-danger">Couldn't load scripts: {error.message}. If this is a brand new workspace, run migration 014_call_scripts.sql.</div>}

      {!error && (scripts || []).length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <ScrollText className="h-10 w-10 text-primary/60" />
          <div className="text-base font-medium text-white">No scripts yet</div>
          <p className="max-w-sm text-sm text-gray-500">Write one up and every caller in your workspace will have it at their fingertips while they dial.</p>
          <Link href="/scripts/new" className="btn btn-primary mt-3"><Plus className="h-4 w-4" /> New script</Link>
        </div>
      ) : !error && (
        <ul className="space-y-3">
          {(scripts || []).map((s: any) => (
            <li key={s.id}>
              <Link href={`/scripts/${s.id}`} className="card block p-5 transition hover:border-primary/40">
                <div className="text-base font-medium text-white">{s.title}</div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-gray-400">{s.body.slice(0, 240)}{s.body.length > 240 ? '…' : ''}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
