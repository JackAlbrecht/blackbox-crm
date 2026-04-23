'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Mail, Video, FileText, Send, Loader2, CheckCircle2 } from 'lucide-react';

const TYPES = [
  { key: 'note',    label: 'Note',    icon: FileText },
  { key: 'call',    label: 'Call',    icon: Phone    },
  { key: 'email',   label: 'Email',   icon: Mail     },
  { key: 'meeting', label: 'Meeting', icon: Video    },
] as const;

type Scope = { contact_id?: string; company_id?: string; deal_id?: string };

export function LogActivityWidget({ scope }: { scope: Scope }) {
  const [type, setType] = useState<string>('note');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(false);
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_type: type, subject, body, ...scope }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || 'Failed'); return; }
    setSubject(''); setBody('');
    setOk(true);
    router.refresh();
    setTimeout(() => setOk(false), 1800);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-1">
        {TYPES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setType(key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              type === key ? 'bg-primary/20 text-primary border border-primary/30'
                           : 'bg-black/30 text-gray-400 border border-border hover:text-white'
            }`}
          >
            <Icon className="h-3 w-3" /> {label}
          </button>
        ))}
      </div>

      <input
        className="input"
        placeholder={type === 'note' ? 'Title (optional)' : 'Subject'}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <textarea
        className="input min-h-[80px]"
        placeholder={
          type === 'call' ? 'Call notes — who did you reach? what did they say?'
          : type === 'email' ? 'Email body or summary'
          : type === 'meeting' ? 'What was discussed?'
          : 'Jot it down…'
        }
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      {err && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{err}</div>}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Logs to the activity feed for {scope.contact_id ? 'this contact' : scope.deal_id ? 'this deal' : 'this company'}.
        </span>
        <button disabled={busy || (!subject && !body)} className="btn btn-primary">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
           ok   ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                  <Send className="h-3.5 w-3.5" />}
          Log
        </button>
      </div>
    </form>
  );
}
