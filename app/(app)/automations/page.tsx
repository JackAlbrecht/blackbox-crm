import { createClient } from '@/lib/supabase/server';
import { WorkflowList } from './WorkflowList';
import { Workflow as WorkflowIcon } from 'lucide-react';

export const metadata = { title: 'Automations · Blackbox CRM' };

export default async function AutomationsPage() {
  const supabase = createClient();
  const { data: workflows } = await supabase.from('workflows').select('*, workflow_actions(*)').order('created_at', { ascending: false });
  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white inline-flex items-center gap-2">
          <WorkflowIcon className="h-5 w-5 text-primary" /> Automations
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          "When X happens, do Y." Build simple rules that run in the background.
        </p>
      </header>
      <WorkflowList initial={workflows || []} />
    </div>
  );
}
