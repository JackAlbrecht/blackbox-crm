import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#05060c',
        card: '#0a0b16',
        border: 'rgba(168, 85, 247, 0.15)',
        muted: '#9ca3af',
        primary: {
          DEFAULT: '#a855f7',
          deep: '#7c3aed',
          soft: 'rgba(168, 85, 247, 0.12)',
        },
        cyan: {
          DEFAULT: '#22d3ee',
          soft: 'rgba(34, 211, 238, 0.12)',
        },
        danger: '#ef4444',
        success: '#10b981',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(168, 85, 247, 0.25)',
        'glow-cyan': '0 0 32px rgba(34, 211, 238, 0.22)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(180deg, rgba(5,6,12,0) 0%, rgba(5,6,12,0.85) 100%), radial-gradient(circle at 50% 0%, rgba(168,85,247,0.18), transparent 55%)',
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
