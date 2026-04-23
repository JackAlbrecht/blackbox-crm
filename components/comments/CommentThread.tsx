'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Scope = { contact_id?: string; company_id?: string; deal_id?: string };

export function CommentThread({ comments, scope }: { comments: any[]; scope: Scope }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text, ...scope }),
    });
    setBusy(false); setText('');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 inline-flex items-center gap-2">
        <MessageCircle className="h-4 w-4" /> Team comments
      </h2>
      {comments.length === 0 ? (
        <p className="text-xs text-gray-500">No internal comments yet — add a note only your team will see.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-black/20 p-3">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Team member</span>
                <span>{formatDate(c.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={post} className="flex gap-2">
        <input className="input flex-1" placeholder="Add a comment only your team will see…"
          value={text} onChange={(e) => setText(e.target.value)} />
        <button disabled={busy || !text.trim()} className="btn btn-primary">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </form>
    </div>
  );
}
