import { createClient } from '@/lib/supabase/server';
import { SeoClient } from './SeoClient';

export const metadata = { title: 'SEO · Blackbox CRM' };

export default async function SeoPage() {
  const supabase = createClient();
  const { data } = await supabase.from('seo_keywords').select('*').order('created_at', { ascending: false });

  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">SEO tracker</h1>
        <p className="mt-1 text-sm text-gray-400">Track keyword positions for your site.</p>
      </header>
      <SeoClient initial={data || []} />
    </div>
  );
}
