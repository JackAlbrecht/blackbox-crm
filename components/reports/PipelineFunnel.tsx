'use client';

import { formatCurrency } from '@/lib/utils';

export type PipelineBucket = {
  stage_id: string;
  stage_name: string;
  stage_position: number;
  stage_color: string | null;
  is_won: boolean;
  is_lost: boolean;
  deal_count: number;
  total_value: number;
  weighted_value: number;
};

export function PipelineFunnel({ rollup }: { rollup: PipelineBucket[] }) {
  // Filter to non-terminal stages for the funnel (keep won separately).
  const active = (rollup || []).filter((r) => !r.is_lost).sort((a, b) => a.stage_position - b.stage_position);
  const totals = {
    total: active.reduce((s, r) => s + Number(r.total_value), 0),
    weighted: active.reduce((s, r) => s + Number(r.weighted_value), 0),
    deals: active.reduce((s, r) => s + Number(r.deal_count), 0),
    won: (rollup || []).filter((r) => r.is_won).reduce((s, r) => s + Number(r.total_value), 0),
  };
  const max = Math.max(1, ...active.map((r) => Number(r.total_value)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open deals" value={String(totals.deals)} />
        <Stat label="Total pipeline" value={formatCurrency(totals.total)} />
        <Stat label="Weighted" value={formatCurrency(totals.weighted)} />
        <Stat label="Closed won" value={formatCurrency(totals.won)} />
      </div>

      <div className="space-y-1.5">
        {active.map((r) => {
          const width = (Number(r.total_value) / max) * 100;
          return (
            <div key={r.stage_id} className="group">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="w-36 truncate text-gray-200">{r.stage_name}</span>
                <span className="text-gray-500">{r.deal_count} deals</span>
                <span className="ml-auto text-primary">{formatCurrency(r.total_value)}</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${Math.max(4, width)}%`, background: r.stage_color || 'var(--primary, #6366f1)' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-black/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  );
}
