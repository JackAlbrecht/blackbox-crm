'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

type Field = 'first_name' | 'last_name' | 'email' | 'phone' | 'company' | 'title' | 'tags' | 'notes' | 'ignore';

const FIELD_OPTIONS: { value: Field; label: string }[] = [
  { value: 'first_name', label: 'First name' },
  { value: 'last_name',  label: 'Last name' },
  { value: 'email',      label: 'Email' },
  { value: 'phone',      label: 'Phone' },
  { value: 'company',    label: 'Company' },
  { value: 'title',      label: 'Title' },
  { value: 'tags',       label: 'Tags (comma-separated)' },
  { value: 'notes',      label: 'Notes' },
  { value: 'ignore',     label: 'Ignore column' },
];

// Super-simple CSV parser with quote handling. Good enough for typical lead CSVs.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cur.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        cur.push(cell); cell = '';
        if (cur.some(c => c !== '')) rows.push(cur);
        cur = [];
      } else { cell += ch; }
    }
  }
  if (cell !== '' || cur.length) { cur.push(cell); if (cur.some(c => c !== '')) rows.push(cur); }
  return rows;
}

function autoMap(header: string): Field {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['firstname', 'first', 'fname', 'givenname'].includes(h)) return 'first_name';
  if (['lastname', 'last', 'lname', 'surname', 'familyname'].includes(h)) return 'last_name';
  if (['name', 'fullname'].includes(h)) return 'first_name';
  if (['email', 'emailaddress', 'mail', 'workemail'].includes(h)) return 'email';
  if (['phone', 'phonenumber', 'mobile', 'cell', 'tel', 'telephone', 'workphone'].includes(h)) return 'phone';
  if (['company', 'companyname', 'organization', 'org', 'account'].includes(h)) return 'company';
  if (['title', 'jobtitle', 'position', 'role'].includes(h)) return 'title';
  if (['tag', 'tags', 'labels'].includes(h)) return 'tags';
  if (['notes', 'note', 'comments', 'description'].includes(h)) return 'notes';
  return 'ignore';
}

export function ImportClient() {
  const router = useRouter();
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Field[]>([]);
  const [listName, setListName] = useState('');
  const [listSource, setListSource] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [status, setStatus] = useState<{ type: 'error' | 'ok'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; list_id: string | null } | null>(null);

  const header = parsed?.[0] || [];
  const dataRows = parsed?.slice(1) || [];

  const previewRows = useMemo(() => dataRows.slice(0, 5), [dataRows]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result || '');
      setRawText(t);
      parseNow(t);
    };
    reader.readAsText(file);
  }

  function parseNow(text: string) {
    const rows = parseCSV(text);
    if (!rows.length) {
      setStatus({ type: 'error', msg: 'No rows parsed.' });
      setParsed(null);
      return;
    }
    setParsed(rows);
    setMapping(rows[0].map(h => autoMap(h)));
    setStatus(null);
  }

  async function submit() {
    if (!parsed) return;
    setLoading(true);
    setStatus(null);
    setResult(null);
    const out: any[] = [];
    for (const row of dataRows) {
      const obj: any = {};
      mapping.forEach((field, i) => {
        if (field === 'ignore') return;
        const val = (row[i] || '').trim();
        if (!val) return;
        if (field === 'tags') obj.tags = val.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
        else obj[field] = val;
      });
      if (Object.keys(obj).length) out.push(obj);
    }
    if (!out.length) {
      setStatus({ type: 'error', msg: 'No usable rows after mapping.' });
      setLoading(false);
      return;
    }
    const res = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        rows: out,
        list_name: listName || undefined,
        list_source: listSource || undefined,
        list_description: listDescription || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus({ type: 'error', msg: data.error || 'Import failed' });
      return;
    }
    setResult({ inserted: data.inserted, list_id: data.list_id });
    setStatus({ type: 'ok', msg: `Imported ${data.inserted} contacts` });
    router.refresh();
  }

  return (
    <div className="max-w-5xl space-y-6 animate-fade-in">
      <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to contacts
      </Link>
      <header>
        <h1 className="text-2xl font-semibold text-white">Import contacts</h1>
        <p className="mt-1 text-sm text-gray-400">Upload a CSV or paste it in. Map columns, tag them as a lead list, hit import.</p>
      </header>

      <div className="card p-6 space-y-5">
        <div className="grid gap-3 md:grid-cols-[auto_1fr]">
          <label className="btn btn-ghost cursor-pointer">
            <Upload className="h-4 w-4" /> Upload .csv
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>
          <div className="text-xs text-gray-500 self-center">
            Or paste CSV text below. First row should be headers.
          </div>
        </div>
        <textarea
          className="input min-h-[140px] font-mono text-xs"
          placeholder="first_name,last_name,email,phone,company&#10;Jane,Doe,jane@acme.com,555-1212,Acme Inc."
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          onBlur={() => rawText && parseNow(rawText)}
        />
        {rawText && !parsed && (
          <button className="btn btn-primary" onClick={() => parseNow(rawText)}>Parse</button>
        )}
      </div>

      {parsed && (
        <>
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Map columns ({dataRows.length} rows)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="px-2 py-2">CSV column</th>
                    <th className="px-2 py-2">Maps to</th>
                    <th className="px-2 py-2">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {header.map((h, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-2 text-gray-300 font-medium">{h || `Column ${i + 1}`}</td>
                      <td className="px-2 py-2">
                        <select
                          className="input py-1 text-xs"
                          value={mapping[i] || 'ignore'}
                          onChange={e => {
                            const next = [...mapping];
                            next[i] = e.target.value as Field;
                            setMapping(next);
                          }}
                        >
                          {FIELD_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-gray-500">
                        {previewRows.map((r, idx) => (
                          <div key={idx} className="truncate max-w-[260px]">{r[i] || <span className="text-gray-700">—</span>}</div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Lead list (optional)</h2>
            <p className="text-xs text-gray-500">Give this batch a name to track call progress on it separately.</p>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="input"
                placeholder="List name (e.g. Phoenix epoxy leads)"
                value={listName}
                onChange={e => setListName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Source (Apollo, LinkedIn, referral...)"
                value={listSource}
                onChange={e => setListSource(e.target.value)}
              />
              <input
                className="input"
                placeholder="Description (optional)"
                value={listDescription}
                onChange={e => setListDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              <FileSpreadsheet className="h-4 w-4" />
              {loading ? 'Importing…' : `Import ${dataRows.length} contacts`}
            </button>
            {status && (
              <span className={status.type === 'ok' ? 'text-emerald-400 text-sm inline-flex items-center gap-1' : 'text-rose-400 text-sm'}>
                {status.type === 'ok' && <CheckCircle2 className="h-4 w-4" />}
                {status.msg}
              </span>
            )}
            {result?.list_id && (
              <Link href={`/lead-lists/${result.list_id}`} className="text-sm text-primary hover:underline">
                Open list →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
