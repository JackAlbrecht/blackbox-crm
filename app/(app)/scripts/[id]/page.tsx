import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ScriptEditor } from './ScriptEditor';

export const dynamic = 'force-dynamic';

export default async function ScriptDetail({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new';
  const supabase = createClient();
  const initial = isNew
    ? { id: null, title: '', body: '' }
    : (await supabase.from('call_scripts').select('id, title, body').eq('id', params.id).maybeSingle()).data;

  return (
    <div className="max-w-3xl animate-fade-in space-y-6">
      <Link href="/scripts" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All scripts
      </Link>
      <ScriptEditor initial={(initial as any) || { id: null, title: '', body: '' }} isNew={isNew} />
    </div>
  );
}
