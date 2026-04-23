'use client';

import { Phone, Mail, Video, FileText, CheckSquare, ArrowRightLeft, Paperclip, MessageSquare, Circle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const TYPE_META: Record<string, { icon: any; label: string; color: string }> = {
  call:          { icon: Phone,          label: 'Call',          color: 'text-primary' },
  email:         { icon: Mail,           label: 'Email',         color: 'text-cyan' },
  meeting:       { icon: Video,          label: 'Meeting',       color: 'text-amber-400' },
  note:          { icon: FileText,       label: 'Note',          color: 'text-gray-300' },
  task:          { icon: CheckSquare,    label: 'Task',          color: 'text-emerald-400' },
  stage_change:  { icon: ArrowRightLeft, label: 'Stage change',  color: 'text-violet-400' },
  status_change: { icon: ArrowRightLeft, label: 'Status change', color: 'text-violet-400' },
  file:          { icon: Paperclip,      label: 'File',          color: 'text-sky-400' },
  sms:           { icon: MessageSquare,  label: 'SMS',           color: 'text-primary' },
};

export function ActivityTimeline({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-gray-500">
        <Circle className="h-6 w-6 text-gray-700" />
        <p className="text-sm">No activity yet. Every call, email, meeting, and note shows up here.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {activities.map((a) => {
        const meta = TYPE_META[a.activity_type] || TYPE_META.note;
        const Icon = meta.icon;
        return (
          <li key={a.id} className="relative">
            <span className={`absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background ${meta.color}`}>
              <Icon className="h-3 w-3" />
            </span>
            <div className="rounded-md border border-border bg-black/20 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                <span className="text-gray-500">{formatDate(a.occurred_at)}</span>
              </div>
              {a.subject && (
                <div className="mt-1 text-sm font-medium text-white">{a.subject}</div>
              )}
              {a.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{a.body}</p>
              )}
              {a.outcome && (
                <div className="mt-2 inline-flex items-center gap-1 pill">{a.outcome}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
