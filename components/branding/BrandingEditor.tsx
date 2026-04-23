'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Paintbrush, Check, ExternalLink, Image as ImageIcon } from 'lucide-react';

type Tenant = {
  id: string;
  name?: string | null;
  display_name?: string | null;
  tagline?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
  logo_wide_url?: string | null;
  favicon_url?: string | null;
  login_bg_url?: string | null;
  meeting_location?: string | null;
  meeting_phone?: string | null;
  meeting_description?: string | null;
};

const PRESETS: { name: string; primary: string; accent: string }[] = [
  { name: 'Violet',   primary: '#8b5cf6', accent: '#22d3ee' },
  { name: 'Emerald',  primary: '#10b981', accent: '#34d399' },
  { name: 'Sky',      primary: '#0ea5e9', accent: '#38bdf8' },
  { name: 'Amber',    primary: '#f59e0b', accent: '#fbbf24' },
  { name: 'Rose',     primary: '#f43f5e', accent: '#fb7185' },
  { name: 'Blue',     primary: '#2563eb', accent: '#60a5fa' },
  { name: 'Forest',   primary: '#166534', accent: '#4ade80' },
  { name: 'Graphite', primary: '#475569', accent: '#94a3b8' },
];

export function BrandingEditor({ tenant, canEditLogo = true }: { tenant: Tenant; canEditLogo?: boolean }) {
  const router = useRouter();
  const [displayName,   setDisplayName]   = useState(tenant.display_name || tenant.name || '');
  const [tagline,       setTagline]       = useState(tenant.tagline || '');
  const [primaryColor,  setPrimaryColor]  = useState(tenant.primary_color || '#8b5cf6');
  const [accentColor,   setAccentColor]   = useState(tenant.accent_color  || '#22d3ee');
  const [logoUrl,       setLogoUrl]       = useState(tenant.logo_url      || '');
  const [logoWideUrl,   setLogoWideUrl]   = useState(tenant.logo_wide_url || '');
  const [faviconUrl,    setFaviconUrl]    = useState(tenant.favicon_url   || '');
  const [loginBgUrl,    setLoginBgUrl]    = useState(tenant.login_bg_url  || '');
  const [meetLocation,  setMeetLocation]  = useState(tenant.meeting_location    || '');
  const [meetPhone,     setMeetPhone]     = useState(tenant.meeting_phone       || '');
  const [meetDesc,      setMeetDesc]      = useState(tenant.meeting_description || '');
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setStatus(null);
    const res = await fetch('/api/tenant/branding', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        display_name:  displayName  || null,
        tagline:       tagline      || null,
        primary_color: primaryColor || null,
        accent_color:  accentColor  || null,
        logo_url:      logoUrl      || null,
        logo_wide_url: logoWideUrl  || null,
        meeting_location:    meetLocation || null,
        meeting_phone:       meetPhone    || null,
        meeting_description: meetDesc     || null,
        favicon_url:   faviconUrl   || null,
        login_bg_url:  loginBgUrl   || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setStatus({ type: 'err', msg: data.error || 'Failed' }); return; }
    setStatus({ type: 'ok', msg: 'Saved. Reloading to apply theme…' });
    setTimeout(() => { router.refresh(); window.location.reload(); }, 600);
  }

  // Live preview uses inline vars so it updates as the user changes colors
  const previewStyle: React.CSSProperties & Record<string, string> = {
    ['--preview-primary' as any]: primaryColor,
    ['--preview-accent' as any]: accentColor,
  };

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Paintbrush className="h-4 w-4" /> Branding
          </h2>
          <p className="mt-1 text-xs text-gray-500">Brand the entire CRM for your company. Applied across every page.</p>
        </div>
        {status && (
          <span className={status.type === 'ok' ? 'text-emerald-400 text-sm inline-flex items-center gap-1' : 'text-rose-400 text-sm'}>
            {status.type === 'ok' && <Check className="h-4 w-4" />}{status.msg}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ---- Controls ---- */}
        <div className="space-y-5">
          <div>
            <label className="label">Workspace display name</label>
            <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Evergreen Epoxy Flooring" />
          </div>

          <div>
            <label className="label">Tagline / subtitle</label>
            <input className="input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="CRM · Phoenix, AZ" maxLength={60} />
            <p className="mt-1 text-[11px] text-gray-500">Shows under the logo in the sidebar. Keep it short.</p>
          </div>

          <div>
            <label className="label">Color presets</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => { setPrimaryColor(p.primary); setAccentColor(p.accent); }}
                  className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white"
                >
                  <span className="flex overflow-hidden rounded">
                    <span className="h-4 w-4" style={{ backgroundColor: p.primary }} />
                    <span className="h-4 w-4" style={{ backgroundColor: p.accent }} />
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Primary color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-black/30" />
                <input className="input font-mono text-xs" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Buttons, highlights, active nav.</p>
            </div>
            <div>
              <label className="label">Accent color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-black/30" />
                <input className="input font-mono text-xs" value={accentColor} onChange={e => setAccentColor(e.target.value)} />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Secondary pops — status dots, admin chips.</p>
            </div>
          </div>

          {canEditLogo ? (
            <>
              <div>
                <label className="label">Wide logo URL (horizontal, sidebar hero)</label>
                <input className="input" value={logoWideUrl} onChange={e => setLogoWideUrl(e.target.value)} placeholder="https://evergreenepoxyflooring.com/logo.png" />
                <p className="mt-1 text-[11px] text-gray-500">Best at 600–900px wide, transparent PNG or SVG. Shown at 56px tall.</p>
              </div>
              <div>
                <label className="label">Square logo URL (fallback + topbar)</label>
                <input className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/icon.png" />
              </div>
              <div>
                <label className="label">Favicon URL (browser tab icon)</label>
                <input className="input" value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} placeholder="https://example.com/favicon.png" />
              </div>
              <div>
                <label className="label">Login page background (optional)</label>
                <input className="input" value={loginBgUrl} onChange={e => setLoginBgUrl(e.target.value)} placeholder="https://example.com/hero.jpg" />
              </div>
            </>
          ) : (
            <div className="rounded-md border border-border bg-black/20 p-3 text-xs text-gray-500">
              Your workspace logo, favicon, and login background are managed by your Blackbox administrator.
              If you want to change any of those, reach out and they'll update it. You can still tweak colors and tagline here.
            </div>
          )}

          <div className="mt-4 rounded-lg border border-border bg-black/20 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Meeting template</div>
            <p className="text-[11px] text-gray-500">Pasted into every booking description + ICS/Google Calendar event so each appointment already has your link + dial-in info.</p>
            <div>
              <label className="label">Meeting link (Google Meet / Zoom / Teams URL)</label>
              <input className="input" placeholder="https://meet.google.com/abc-defg-hij" value={meetLocation} onChange={(e) => setMeetLocation(e.target.value)} />
            </div>
            <div>
              <label className="label">Phone dial-in (optional)</label>
              <input className="input" placeholder="Join by phone: +1 555-123-4567 · PIN 123 456#" value={meetPhone} onChange={(e) => setMeetPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">Default description</label>
              <textarea rows={4} className="input" placeholder="Agenda, links, whatever should always be on these calendar events" value={meetDesc} onChange={(e) => setMeetDesc(e.target.value)} />
            </div>
          </div>
          <button disabled={saving} onClick={save} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save branding'}
          </button>
        </div>

        {/* ---- Live Preview ---- */}
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Live preview</p>
          <div
            className="overflow-hidden rounded-xl border border-white/10 bg-black/40"
            style={previewStyle}
          >
            {/* Fake sidebar */}
            <div className="flex gap-0">
              <div className="w-44 shrink-0 border-r border-white/10 bg-black/50 p-4">
                <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-4">
                  {logoWideUrl ? (
                    <img src={logoWideUrl} alt="" className="h-12 w-auto max-w-[140px] object-contain" />
                  ) : logoUrl ? (
                    <img src={logoUrl} alt="" className="h-12 w-12 rounded-lg border border-white/10 bg-white/5 object-contain p-1" />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-lg border"
                      style={{
                        borderColor: `rgba(0,0,0,0)`,
                        background: `linear-gradient(135deg, var(--preview-primary), var(--preview-accent))`,
                      }}
                    />
                  )}
                  <div className="text-center">
                    <div className="text-[11px] font-semibold text-white truncate max-w-[140px]">{displayName || 'Workspace'}</div>
                    <div className="text-[9px] uppercase tracking-[0.25em] text-gray-500 truncate max-w-[140px]">{tagline || 'CRM'}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div
                    className="rounded-md px-2 py-1.5 text-[11px] text-white"
                    style={{ backgroundColor: `${primaryColor}26` /* ~15% */ }}
                  >
                    <span style={{ color: primaryColor }}>●</span>  Dashboard
                  </div>
                  <div className="rounded-md px-2 py-1.5 text-[11px] text-gray-400">Contacts</div>
                  <div className="rounded-md px-2 py-1.5 text-[11px] text-gray-400">Lead lists</div>
                  <div className="rounded-md px-2 py-1.5 text-[11px] text-gray-400">Deals</div>
                </div>
              </div>

              {/* Fake content */}
              <div className="flex-1 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Dashboard</div>
                    <div className="text-[11px] text-gray-500">Your workspace snapshot</div>
                  </div>
                  <button
                    className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-white"
                    style={{ backgroundColor: primaryColor, boxShadow: `0 0 24px ${primaryColor}66` }}
                  >
                    New contact
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Leads',  val: 142 },
                    { label: 'Booked', val: 38 },
                    { label: 'Deals',  val: 12 },
                  ].map((k, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500">{k.label}</div>
                      <div className="mt-0.5 text-lg font-semibold" style={{ color: i === 0 ? primaryColor : i === 1 ? accentColor : '#fff' }}>{k.val}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: '62%', backgroundColor: primaryColor }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border px-2 py-0.5 text-[10px]"
                    style={{ borderColor: `${primaryColor}66`, backgroundColor: `${primaryColor}22`, color: primaryColor }}>
                    Answered
                  </span>
                  <span className="rounded-full border px-2 py-0.5 text-[10px]"
                    style={{ borderColor: `${accentColor}66`, backgroundColor: `${accentColor}22`, color: accentColor }}>
                    Booked
                  </span>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] border-white/10 bg-white/5 text-gray-400">Callback</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 inline-flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Logos are linked, not uploaded — paste a public HTTPS URL.
            <a href="https://www.whatismyimage.com" target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline">
              help <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
