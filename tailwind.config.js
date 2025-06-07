/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Life Arrow Luxury Pastel Wellness Palette
        wellness: {
          sage: {
            50: '#F8FDF8',
            100: '#E8F5E8',
            200: '#D1E7DD',
            300: '#A3D9CC',
            400: '#6BCF7F',
            500: '#4ADE80',
            600: '#059669',
            700: '#047857',
            800: '#065F46',
            900: '#064E3B',
          },
          rose: {
            50: '#FDF8F8',
            100: '#F8E8E8',
            200: '#F3D5D5',
            300: '#F0B8B8',
            400: '#EB9999',
            500: '#E57373',
            600: '#D97706',
            700: '#B45309',
            800: '#92400E',
            900: '#78350F',
          },
          eucalyptus: {
            50: '#F0FDFA',
            100: '#E0F7F0',
            200: '#C6F7E9',
            300: '#8DE5D4',
            400: '#5FD3BD',
            500: '#14B8A6',
            600: '#0D9488',
            700: '#0F766E',
            800: '#115E59',
            900: '#134E4A',
          },
          ivory: {
            50: '#FFFEF7',
            100: '#FEFCF3',
            200: '#FDF8E6',
            300: '#FCF2CC',
            400: '#FAEBA8',
            500: '#F7E6C4',
            600: '#D97706',
            700: '#B45309',
            800: '#92400E',
            900: '#78350F',
          },
        },
        pastel: {
          champagne: '#F7E6C4',
          lavender: '#F0F0FF',
          peach: '#FFE8D6',
          sky: '#E0F2FE',
          mint: '#ECFDF5',
        },
        neutral: {
          greige: '#F7F5F3',
          taupe: '#F5F4F1',
          charcoal: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        medical: ['SF Mono', 'Monaco', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};