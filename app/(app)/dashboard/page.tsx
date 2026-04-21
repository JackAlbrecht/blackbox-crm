import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowRight, Users, Kanban, CheckSquare, Mail } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata = { title: 'Dashboard · Blackbox CRM' };

export default async function Dashboard() {
  const supabase = createClient();

  const [
    { count: contactsCount },
    { data: deals },
    { data: tasks },
    { data: campaigns },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('id, name, value, expected_close, stage:deal_stages(name, is_won, is_lost)').order('updated_at', { ascending: false }).limit(5),
    supabase.from('tasks').select('id, title, due_at, priority, completed').eq('completed', false).order('due_at', { ascending: true, nullsFirst: false }).limit(6),
    supabase.from('campaigns').select('id, name, status, sent_count, sent_at').order('created_at', { ascending: false }).limit(3),
  ]);

  const openDealValue = (deals || [])
    .filter((d: any) => !d.stage?.is_won && !d.stage?.is_lost)
    .reduce((s: number, d: any) => s + Number(d.value || 0), 0);

  const stats = [
    { label: 'Contacts', value: contactsCount ?? 0, icon: Users, href: '/contacts' },
    { label: 'Open deal value', value: formatCurrency(openDealValue), icon: Kanban, href: '/deals' },
    { label: 'Open tasks', value: (tasks || []).length, icon: CheckSquare, href: '/tasks' },
    { label: 'Campaigns', value: (campaigns || []).length, icon: Mail, href: '/campaigns' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">What&apos;s happening in your workspace.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:shadow-glow">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-gray-500">{s.label}</div>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Recent deals</h2>
            <Link href="/deals" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(deals || []).length === 0 ? (
            <p className="text-sm text-gray-500">No deals yet. <Link href="/deals" className="text-primary">Add your first</Link>.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(deals || []).map((d: any) => (
                <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium text-white">{d.name}</div>
                    <div className="text-xs text-gray-500">{d.stage?.name || 'No stage'} · {d.expected_close ? formatDate(d.expected_close) : 'No close date'}</div>
                  </div>
                  <div className="text-primary">{formatCurrency(d.value)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Open tasks</h2>
            <Link href="/tasks" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(tasks || []).length === 0 ? (
            <p className="text-sm text-gray-500">All clear. <Link href="/tasks" className="text-primary">Add a task</Link>.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(tasks || []).map((t: any) => (
                <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium text-white">{t.title}</div>
                    <div className="text-xs text-gray-500">{t.due_at ? formatDate(t.due_at) : 'No due date'}</div>
                  </div>
                  <span className={`pill ${t.priority === 'high' ? '!bg-danger/20 !text-danger !border-danger/30' : ''}`}>
                    {t.priority || 'medium'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
