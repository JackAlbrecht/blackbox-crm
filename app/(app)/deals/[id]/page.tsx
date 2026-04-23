import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Kanban, Users, Building2, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ActivityTimeline } from '@/components/activities/ActivityTimeline';
import { LogActivityWidget } from '@/components/activities/LogActivityWidget';
import { CommentThread } from '@/components/comments/CommentThread';
import { DealEditor } from './DealEditor';

export default async function DealDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: deal, error } = await supabase
    .from('deals')
    .select('*, stage:deal_stages(id, name, color, win_probability, is_won, is_lost)')
    .eq('id', params.id)
    .maybeSingle();

  // Fetch related contact + company separately (avoids PostgREST multi-FK embed ambiguity).
  const relatedPromises: Promise<any>[] = [];
  relatedPromises.push(
    deal?.contact_id
      ? supabase.from('contacts').select('id, first_name, last_name, email, phone, title').eq('id', deal.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
  );
  relatedPromises.push(
    (deal as any)?.primary_company_id
      ? supabase.from('companies').select('id, name, domain, industry').eq('id', (deal as any).primary_company_id).maybeSingle()
      : Promise.resolve({ data: null }),
  );
  const [{ data: contact }, { data: company }] = await Promise.all(relatedPromises as any);
  if (deal) {
    (deal as any).contact = contact;
    (deal as any).company = company;
  }
  if (error || !deal) notFound();

  const [{ data: stages }, { data: activities }, { data: contacts }, { data: companies }, { data: comments }] = await Promise.all([
    supabase.from('deal_stages').select('id, name, position, color, win_probability').order('position'),
    supabase.from('activities').select('*').eq('deal_id', params.id).order('occurred_at', { ascending: false }).limit(50),
    supabase.from('contacts').select('id, first_name, last_name, email, company, phone').order('first_name').limit(2000),
    supabase.from('companies').select('id, name, domain').order('name').limit(1000).then((r) => r.error ? { data: [] as any[] } : r),
    supabase.from('record_comments').select('*').eq('deal_id', params.id).order('created_at', { ascending: true }).then((r) => r.error ? { data: [] } : r),
  ]);

  const probability = (deal as any).probability || (deal as any).stage?.win_probability || 0;
  const weighted = Number(deal.value || 0) * (probability / 100);

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/deals" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary">
        <ArrowLeft className="h-3 w-3" /> Back to deals
      </Link>

      <header className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-white">{deal.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ background: (deal as any).stage?.color || 'var(--primary)' }} />
                {(deal as any).stage?.name || 'No stage'}
              </span>
              <span className="text-gray-600">·</span>
              <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(deal.value)}</span>
              {deal.expected_close && (
                <><span className="text-gray-600">·</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(deal.expected_close)}</span></>
              )}
              {probability > 0 && (
                <><span className="text-gray-600">·</span>
                <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />{probability}% probability</span>
                <span className="text-gray-500">({formatCurrency(weighted)} weighted)</span></>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Details</h2>
            <DealEditor initial={deal} stages={stages || []} contacts={contacts || []} companies={companies || []} />
          </section>

          <section className="card p-6 space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Log activity</h2>
              <LogActivityWidget scope={{ deal_id: params.id }} />
            </div>
            <div className="border-t border-border pt-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Timeline</h2>
              <ActivityTimeline activities={activities || []} />
            </div>
          </section>
          <section className="card p-6">
            <CommentThread comments={comments || []} scope={{ deal_id: params.id }} />
          </section>
        </div>

        <div className="space-y-6">
          {(deal as any).contact && (
            <section className="card p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 inline-flex items-center gap-2">
                <Users className="h-4 w-4" /> Primary contact
              </h2>
              <Link href={`/contacts/${(deal as any).contact.id}`} className="block rounded-md border border-border p-3 hover:border-primary/40">
                <div className="font-medium text-white">
                  {[(deal as any).contact.first_name, (deal as any).contact.last_name].filter(Boolean).join(' ')}
                </div>
                {(deal as any).contact.title && <div className="text-xs text-gray-500">{(deal as any).contact.title}</div>}
                {(deal as any).contact.email && <div className="text-xs text-gray-400">{(deal as any).contact.email}</div>}
                {(deal as any).contact.phone && <div className="text-xs text-gray-400">{(deal as any).contact.phone}</div>}
              </Link>
            </section>
          )}
          {(deal as any).company && (
            <section className="card p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 inline-flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Company
              </h2>
              <Link href={`/companies/${(deal as any).company.id}`} className="block rounded-md border border-border p-3 hover:border-primary/40">
                <div className="font-medium text-white">{(deal as any).company.name}</div>
                {(deal as any).company.industry && <div className="text-xs text-gray-500">{(deal as any).company.industry}</div>}
                {(deal as any).company.domain && <div className="text-xs text-gray-400">{(deal as any).company.domain}</div>}
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
