import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar as CalendarIcon, User, Phone, Mail, Building2 } from 'lucide-react';
import { BookingForm } from './BookingForm';

export const dynamic = 'force-dynamic';

export default async function BookPage({
  params, searchParams,
}: {
  params: { contactId: string };
  searchParams: { list?: string; back?: string };
}) {
  const supabase = createClient();
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, company, notes, primary_company_id')
    .eq('id', params.contactId)
    .maybeSingle();
  if (!contact) notFound();

  const backHref = searchParams.back || (searchParams.list ? `/lead-lists/${searchParams.list}` : '/calendar');
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || 'Unnamed';

  return (
    <div className="max-w-3xl animate-fade-in space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <header className="card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Book appointment</h1>
            <p className="mt-1 text-sm text-gray-400">Schedule a meeting and log the outcome in one step.</p>
          </div>
        </div>
      </header>

      <section className="card p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Customer</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2 text-white"><User className="h-4 w-4 text-primary" /><span className="font-medium">{name}</span>
            {contact.company && <span className="text-gray-400">· {contact.company}</span>}
          </div>
          {contact.phone && <div className="flex items-center gap-2 text-gray-300"><Phone className="h-4 w-4 text-gray-500" /> <a href={`tel:${contact.phone}`} className="hover:text-primary">{contact.phone}</a></div>}
          {contact.email && <div className="flex items-center gap-2 text-gray-300"><Mail className="h-4 w-4 text-gray-500" /> <a href={`mailto:${contact.email}`} className="hover:text-primary">{contact.email}</a></div>}
          {contact.notes && (
            <div className="mt-3 rounded-md border-l-4 border-primary/60 bg-primary/5 px-3 py-2 text-xs text-gray-200 whitespace-pre-wrap">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">Context</div>
              {contact.notes}
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">When</h2>
        <BookingForm contactId={contact.id} listId={searchParams.list || null} backHref={backHref} />
      </section>
    </div>
  );
}
