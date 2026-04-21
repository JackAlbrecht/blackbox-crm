import { createClient } from '@/lib/supabase/server';
import { TasksClient } from './TasksClient';

export const metadata = { title: 'Tasks · Blackbox CRM' };

export default async function TasksPage() {
  const supabase = createClient();
  const [{ data: tasks }, { data: contacts }, { data: deals }] = await Promise.all([
    supabase.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false }),
    supabase.from('contacts').select('id, first_name, last_name, company'),
    supabase.from('deals').select('id, name'),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Tasks</h1>
        <p className="mt-1 text-sm text-gray-400">What needs to happen next.</p>
      </header>
      <TasksClient initialTasks={tasks || []} contacts={contacts || []} deals={deals || []} />
    </div>
  );
}
