/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        fin: {
          bg: '#F7F8FA',
          subtle: '#F0F2F5',
          card: '#FFFFFF',
          primary: '#171B26',
          secondary: '#687080',
          muted: '#9299A5',
          border: '#E5E7EB',
          navy: '#17243A',
          'navy-hover': '#1F304D',
          orange: '#F28C28',
          'orange-hover': '#DD7416',
          'orange-light': '#FFF5EB',
          gold: '#EBCB87',
          'gold-dark': '#9A7B38',
          'gold-light': '#FEF9EC',
          success: '#16865C',
          'success-light': '#EDF8F3',
          warning: '#D18A22',
          'warning-light': '#FDF6E9',
          danger: '#D94B4B',
          'danger-light': '#FDF1F1',
        },
      },
      borderRadius: {
        card: '8px',
        pill: '40px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(23, 27, 38, 0.05), 0 1px 2px -1px rgba(23, 27, 38, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(23, 27, 38, 0.08), 0 2px 4px -2px rgba(23, 27, 38, 0.06)',
        'btn-orange': '0 2px 4px 0 rgba(242, 140, 40, 0.25)',
      }
    },
  },
  plugins: [],
}
