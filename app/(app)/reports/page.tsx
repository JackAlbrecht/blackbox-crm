import { createClient } from '@/lib/supabase/server';
import { PipelineFunnel } from '@/components/reports/PipelineFunnel';
import { BarChart3 } from 'lucide-react';

export const metadata = { title: 'Reports · Blackbox CRM' };

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: rollup } = await supabase.from('pipeline_rollup').select('*');
  const { data: activityDays } = await supabase
    .from('activity_rollup')
    .select('*')
    .gte('day', new Date(Date.now() - 30 * 86400 * 1000).toISOString())
    .order('day', { ascending: true });

  const byDay = (activityDays || []).reduce((m: any, r: any) => {
    const d = String(r.day).slice(0, 10);
    m[d] = (m[d] || 0) + Number(r.n);
    return m;
  }, {});
  const daySeries = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400 * 1000).toISOString().slice(0, 10);
    return { d, n: byDay[d] || 0 };
  });
  const maxN = Math.max(1, ...daySeries.map((x) => x.n));

  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white inline-flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Reports
        </h1>
        <p className="mt-1 text-sm text-gray-400">Pipeline, activity volume, and weighted forecast for your workspace.</p>
      </header>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Pipeline funnel</h2>
        <PipelineFunnel rollup={(rollup || []) as any} />
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-400">Activity — last 30 days</h2>
        <p className="mb-4 text-xs text-gray-500">Calls, emails, meetings, notes, anything logged to the unified timeline.</p>
        <div className="flex items-end gap-1 h-28">
          {daySeries.map(({ d, n }) => (
            <div key={d} className="flex flex-1 flex-col items-center justify-end">
              <div
                title={`${d}: ${n} activities`}
                className="w-full rounded-sm bg-primary/40 hover:bg-primary transition"
                style={{ height: `${(n / maxN) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-gray-500">
          <span>{daySeries[0]?.d}</span>
          <span>{daySeries[29]?.d}</span>
        </div>
      </section>
    </div>
  );
}
