import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, Mail } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Campaigns · Blackbox CRM' };

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  sending: 'bg-cyan/20 text-cyan border-cyan/30',
  sent: 'bg-success/20 text-success border-success/30',
  failed: 'bg-danger/20 text-danger border-danger/30',
};

export default async function CampaignsPage() {
  const supabase = createClient();
  const { data: campaigns } = await supabase
    .from('campaigns').select('*').order('created_at', { ascending: false });

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-400">Marketing emails to your contact list.</p>
        </div>
        <Link href="/campaigns/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> New campaign
        </Link>
      </header>

      <div className="card overflow-hidden">
        {(campaigns || []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center text-sm text-gray-500">
            <Mail className="h-8 w-8 text-primary" />
            <p>No campaigns yet. Build your first broadcast email.</p>
            <Link href="/campaigns/new" className="btn btn-primary mt-2">
              <Plus className="h-4 w-4" /> New campaign
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-black/40 text-left text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent to</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns || []).map((c: any) => (
                <tr key={c.id} className="table-row">
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-white hover:text-primary">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{c.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`pill !border ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.sent_count}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.sent_at || c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
