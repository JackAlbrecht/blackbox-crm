import type { Config } from 'tailwindcss';

// Per-tenant branding is injected via CSS variables on the app layout root:
//   --primary, --primary-rgb (e.g. "168 85 247"), --primary-soft, --primary-glow,
//   --accent,  --accent-rgb,  --accent-soft
// Tailwind colors below resolve from those vars so every brand-sensitive
// utility (bg-primary, text-primary, border-primary, shadow-glow, etc.)
// repaints automatically when the tenant changes their color.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#05060c',
        card: '#0a0b16',
        border: 'rgba(var(--primary-rgb, 168 85 247), 0.18)',
        muted: '#9ca3af',
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb, 168 85 247) / <alpha-value>)',
          deep: 'rgb(var(--primary-rgb, 168 85 247) / <alpha-value>)',
          soft: 'rgba(var(--primary-rgb, 168 85 247), 0.12)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb, 34 211 238) / <alpha-value>)',
          soft: 'rgba(var(--accent-rgb, 34 211 238), 0.12)',
        },
        cyan: {
          DEFAULT: 'rgb(var(--accent-rgb, 34 211 238) / <alpha-value>)',
          soft: 'rgba(var(--accent-rgb, 34 211 238), 0.12)',
        },
        danger: '#ef4444',
        success: '#10b981',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(var(--primary-rgb, 168 85 247), 0.25)',
        'glow-cyan': '0 0 32px rgba(var(--accent-rgb, 34 211 238), 0.22)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(180deg, rgba(5,6,12,0) 0%, rgba(5,6,12,0.85) 100%), radial-gradient(circle at 50% 0%, rgba(var(--primary-rgb, 168 85 247), 0.18), transparent 55%)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn .5s ease-out',
        'slide-up': 'slideUp .6s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
