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
          fairway: '#10B981',
          rough: '#D97706',
          sand: '#EAB308',
          water: '#0284C7',
          outOfBounds: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace']
      },
      minHeight: {
        'touch': '44px'
      },
      minWidth: {
        'touch': '44px'
      }
    },
  },
  plugins: [],
}
