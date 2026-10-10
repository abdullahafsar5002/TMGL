/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tmgl: {
          green: {
            DEFAULT: '#0B3D2E',
            50: '#F2F8F5',
            100: '#E1EFE9',
            200: '#C2DFD3',
            300: '#94C7B3',
            400: '#5EA78C',
            500: '#38886D',
            600: '#266D56',
            700: '#1C5644',
            800: '#0B3D2E', // Brand Primary Golf Green
            900: '#052319', // Deep Forest / Dark Canvas
            950: '#02120C'
          },
          gold: {
            DEFAULT: '#D4AF37',
            50: '#FCFAF0',
            100: '#F8F3DC',
            200: '#EFE4B4',
            300: '#E4D187',
            400: '#DABC5C',
            500: '#D4AF37', // Brand Restrained Gold Accent
            600: '#B59124',
            700: '#8C6C1B',
            800: '#684E18',
            900: '#463414'
          },
          charcoal: {
            DEFAULT: '#111827',
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
            950: '#0B0F17'
          },
          silver: '#C0C0C0',
          dark: '#1A1A2E',
          fairway: '#10B981',
          rough: '#D97706',
          sand: '#EAB308',
          water: '#0284C7',
          outOfBounds: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace']
      },
      fontSize: {
        'display-2xl': ['clamp(2.5rem, 5vw, 3.75rem)', { lineHeight: '1.04', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-xl': ['clamp(2.25rem, 4.5vw, 3.5rem)', { lineHeight: '1.06', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-lg': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['clamp(1.375rem, 2vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '600' }]
      },
      borderRadius: {
        card: '14px',
        panel: '20px',
        pill: '999px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(7,20,16,0.04), 0 4px 16px -4px rgba(7,20,16,0.08)',
        'card-hover': '0 2px 4px rgba(7,20,16,0.05), 0 12px 32px -8px rgba(7,20,16,0.14)',
        panel: '0 1px 2px rgba(7,20,16,0.05), 0 16px 48px -12px rgba(7,20,16,0.16)',
        gold: '0 1px 2px rgba(7,20,16,0.06), 0 8px 24px -8px rgba(212,175,55,0.35)'
      },
      minHeight: {
        'touch': '44px'
      },
      minWidth: {
        'touch': '44px'
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both'
      }
    },
  },
  plugins: [],
}
