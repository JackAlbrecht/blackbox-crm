import { createClient } from '@/lib/supabase/server';
import { TagManager } from './TagManager';
import { Tag as TagIcon } from 'lucide-react';

export const metadata = { title: 'Tags · Blackbox CRM' };

export default async function TagsPage() {
  const supabase = createClient();
  const { data: tags, error } = await supabase
    .from('tags').select('*').order('name');

  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white inline-flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-primary" /> Tags
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Organize contacts, companies, and deals. Tags are shared across your whole workspace.
        </p>
      </header>

      {error && (
        <div className="card p-6 text-sm text-danger">
          Couldn't load tags: {error.message}
        </div>
      )}

      {!error && <TagManager initial={tags || []} />}
    </div>
  );
}
