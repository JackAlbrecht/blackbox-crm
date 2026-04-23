'use client';

/**
 * Aurora motion graphic hero strip — subtle animated gradient with floating orbs
 * that pick up the tenant's primary color. Top-of-dashboard signature element.
 * Uses CSS-only animation (no WebGL) so it's cheap and renders everywhere.
 */

export function AuroraHero({
  greeting,
  subtitle,
}: {
  greeting: string;
  subtitle: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40">
      {/* base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(130% 110% at 0% 0%, var(--primary-glow, rgba(99,102,241,0.25)) 0%, transparent 55%),' +
            'radial-gradient(110% 100% at 100% 0%, rgba(34,211,238,0.14) 0%, transparent 55%),' +
            'radial-gradient(140% 140% at 50% 120%, rgba(99,102,241,0.10) 0%, transparent 60%)',
        }}
      />

      {/* animated aurora orbs */}
      <div className="aurora-orb aurora-orb-1" />
      <div className="aurora-orb aurora-orb-2" />
      <div className="aurora-orb aurora-orb-3" />

      {/* soft scanlines on top */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* content */}
      <div className="relative px-8 py-10">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-primary/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
          Your workspace
        </div>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
          {greeting}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">{subtitle}</p>
      </div>

      <style jsx>{`
        .aurora-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.55;
          mix-blend-mode: screen;
          will-change: transform;
        }
        .aurora-orb-1 {
          width: 360px;
          height: 360px;
          background: var(--primary, #6366f1);
          top: -120px;
          left: -80px;
          animation: drift1 18s ease-in-out infinite;
        }
        .aurora-orb-2 {
          width: 280px;
          height: 280px;
          background: #22d3ee;
          top: -80px;
          right: 10%;
          animation: drift2 22s ease-in-out infinite;
        }
        .aurora-orb-3 {
          width: 320px;
          height: 320px;
          background: var(--primary, #6366f1);
          bottom: -160px;
          right: -80px;
          opacity: 0.35;
          animation: drift3 26s ease-in-out infinite;
        }
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-60px, 40px) scale(1.1); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-30px, -50px) scale(1.05); }
        }
      `}</style>
    </section>
  );
}
