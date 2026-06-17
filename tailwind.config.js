/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        dark: {
          950: '#0a0a0f',
          900: '#12121a',
          850: '#181825',
          800: '#1e1e2e',
          750: '#252535',
          700: '#2d2d3f',
          600: '#3c3c50',
          500: '#5a5a70',
          400: '#7a7a90',
        },
        accent: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
        },
        bone: {
          default: '#60a5fa',
          selected: '#fbbf24',
          hover: '#93c5fd',
          ik: '#f472b6',
        },
        weight: {
          min: '#3b82f6',
          mid: '#22c55e',
          max: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        'xs': '11px',
        'sm': '12px',
        'base': '13px',
      },
      spacing: {
        'panel': '280px',
        'timeline': '220px',
        'toolbar': '48px',
      },
    },
  },
  plugins: [],
};
