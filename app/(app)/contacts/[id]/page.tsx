import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ContactForm } from '@/components/forms/ContactForm';
import { ArrowLeft } from 'lucide-react';

export default async function ContactDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: contact } = await supabase
    .from('contacts').select('*').eq('id', params.id).maybeSingle();
  if (!contact) notFound();

  return (
    <div className="max-w-3xl animate-fade-in">
      <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to contacts
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-white">
          {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || '(no name)'}
        </h1>
        <p className="mt-1 text-sm text-gray-400">{contact.company || 'Contact details'}</p>
      </header>
      <div className="card p-6">
        <ContactForm contact={contact} />
      </div>
    </div>
  );
}
