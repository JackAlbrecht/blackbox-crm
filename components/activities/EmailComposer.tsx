'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, X, Send, Loader2 } from 'lucide-react';

export function EmailComposer({
  contactId, toEmail, toName,
}: { contactId: string; toEmail: string; toName?: string | null }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function sendAndLog() {
    setBusy(true);
    // Log the email to the activity feed first so it's recorded even if the user closes their mail client.
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_type: 'email',
        subject: subject || '(no subject)',
        body,
        contact_id: contactId,
        outcome: 'sent',
      }),
    });
    // Open the user's default mail client with the message prefilled.
    const mailto = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
    setBusy(false);
    setOpen(false);
    setSubject(''); setBody('');
    router.refresh();
  }

  if (!toEmail) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-ghost">
        <Mail className="h-4 w-4" /> Email
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
             onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-[rgb(10,11,18)] shadow-glow"
               onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm text-gray-300">
                To: <span className="text-white">{toName || toEmail}</span>
                <span className="ml-2 text-xs text-gray-500">&lt;{toEmail}&gt;</span>
              </div>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </header>
            <div className="space-y-3 p-4">
              <input className="input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea className="input min-h-[180px]" placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <footer className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-gray-500">
              <span>Sends via your default mail app and logs to Activity.</span>
              <button onClick={sendAndLog} disabled={busy || (!subject && !body)} className="btn btn-primary">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
