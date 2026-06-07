/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f4f8',
          100: '#e8e8f0',
          200: '#c5c5d8',
          300: '#9898b3',
          400: '#6b6b8a',
          500: '#4a4a6a',
          600: '#35354f',
          700: '#252538',
          800: '#1a1a2e',
          900: '#12121f',
          950: '#0a0a12',
        },
        iris: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        gold: {
          100: '#faf3e0',
          200: '#f5e6c8',
          300: '#ecd08a',
          400: '#d4af37',
          500: '#b8941f',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(139, 92, 246, 0.45)',
        'glow-gold': '0 0 30px -5px rgba(212, 175, 55, 0.35)',
        card: '0 4px 24px -4px rgba(0, 0, 0, 0.25)',
        'card-hover': '0 12px 40px -8px rgba(139, 92, 246, 0.2)',
      },
      backgroundImage: {
        'mesh-gradient':
          'radial-gradient(at 40% 20%, rgba(139, 92, 246, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(212, 175, 55, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(109, 40, 217, 0.08) 0px, transparent 50%)',
        'mesh-gradient-dark':
          'radial-gradient(at 40% 20%, rgba(139, 92, 246, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(212, 175, 55, 0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(109, 40, 217, 0.1) 0px, transparent 50%)',
        'auth-gradient':
          'linear-gradient(135deg, #0a0a12 0%, #1a1a2e 40%, #2d1b4e 70%, #1a1a2e 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};
