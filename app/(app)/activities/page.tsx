import { createClient } from '@/lib/supabase/server';
import { ActivityTimeline } from '@/components/activities/ActivityTimeline';
import { Activity as ActivityIcon } from 'lucide-react';

export const metadata = { title: 'Activity · Blackbox CRM' };

export default async function ActivitiesPage() {
  const supabase = createClient();
  const { data: activities, error } = await (supabase
    .from('activities')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(100) as any).then((r: any) => r, (e: any) => ({ data: [], error: e }));

  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Activity feed</h1>
        <p className="mt-1 text-sm text-gray-400">
          Every call, email, meeting, and note across your workspace — most recent first.
        </p>
      </header>

      {error && (
        <div className="card p-6 text-sm text-danger">
          Couldn't load activities: {error.message}
          {error.message.includes('relation') && (
            <div className="mt-2 text-xs text-gray-400">
              The activities table doesn't exist yet. Run migration 006_crm_foundations.sql.
            </div>
          )}
        </div>
      )}

      {!error && (
        <div className="card p-6">
          <ActivityTimeline activities={activities || []} />
        </div>
      )}
    </div>
  );
}
