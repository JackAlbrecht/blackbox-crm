import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ContactForm } from '@/components/forms/ContactForm';
import { LogCallWidget } from '@/components/calls/LogCallWidget';
import { CallHistory } from '@/components/calls/CallHistory';
import { LogActivityWidget } from '@/components/activities/LogActivityWidget';
import { ActivityTimeline } from '@/components/activities/ActivityTimeline';
import { CommentThread } from '@/components/comments/CommentThread';
import { EmailComposer } from '@/components/activities/EmailComposer';
import { ArrowLeft } from 'lucide-react';

export default async function ContactDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: contact } = await supabase
    .from('contacts').select('*').eq('id', params.id).maybeSingle();
  if (!contact) notFound();

  const safe = <T,>(p: PromiseLike<T>, fb: any) => Promise.resolve(p).then(
    (r: any) => (r && r.error ? { data: fb } : r), () => ({ data: fb }),
  );
  const [{ data: calls }, activitiesRes, { data: comments }] = await Promise.all([
    safe(supabase
      .from('call_logs')
      .select('id, outcome, notes, called_at, next_action_at, caller_id, list_id')
      .eq('contact_id', params.id)
      .order('called_at', { ascending: false })
      .limit(50) as any, [] as any[]),
    safe(supabase
      .from('activities')
      .select('*')
      .eq('contact_id', params.id)
      .order('occurred_at', { ascending: false })
      .limit(50) as any, [] as any[]),
    safe(supabase.from('record_comments').select('*').eq('contact_id', params.id).order('created_at', { ascending: true }) as any, [] as any[]),
  ]);
  const activities = (activitiesRes as any)?.data || [];

  return (
    <div className="animate-fade-in">
      <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to contacts
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-white">
          {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || '(no name)'}
        </h1>
        <p className="mt-1 text-sm text-gray-400">{contact.company || 'Contact details'}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Details</h2>
          <ContactForm contact={contact} />
        </div>

        <div className="space-y-6">
          <LogCallWidget contactId={contact.id} phone={contact.phone} />
          {contact.email && (
            <div className="card p-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">Send an email and log it to the timeline.</div>
              <EmailComposer contactId={contact.id} toEmail={contact.email} toName={[contact.first_name, contact.last_name].filter(Boolean).join(' ')} />
            </div>
          )}
          <div className="card p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Log activity</h2>
            <LogActivityWidget scope={{ contact_id: contact.id }} />
          </div>
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Timeline</h2>
            <ActivityTimeline activities={activities || []} />
          </div>
          <CallHistory calls={calls || []} />
          <div className="card p-6"><CommentThread comments={comments || []} scope={{ contact_id: contact.id }} /></div>
        </div>
      </div>
    </div>
  );
}
