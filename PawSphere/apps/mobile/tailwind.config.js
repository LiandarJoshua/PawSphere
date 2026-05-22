/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PawSphere Apple-style design system
        background: '#FFFFFF',
        surface: '#F8F8F8',
        'surface-2': '#F2F2F2',
        primary: '#F4C2C2',        // Soft light pink — accents, active tabs, buttons
        'primary-dark': '#E8A0A0', // Darker pink for pressed states
        'primary-light': '#FAE0E0',// Very light pink for backgrounds
        text: {
          primary: '#1C1C1E',      // Charcoal — main text
          secondary: '#636366',    // Medium gray — subtitles
          tertiary: '#AEAEB2',     // Light gray — captions
          inverse: '#FFFFFF',
        },
        border: '#E5E5EA',
        separator: '#C6C6C8',
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        info: '#007AFF',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '28px',
        'full': '9999px',
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 12px rgba(0, 0, 0, 0.06)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'pink': '0 4px 16px rgba(244, 194, 194, 0.40)',
      },
    },
  },
  plugins: [],
};
