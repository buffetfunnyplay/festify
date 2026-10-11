import { BRAND } from './brand.config.js'

// Gera a escala 50–900 a partir de uma única cor
const hex = (h) => h.replace('#', '').match(/../g).map((x) => parseInt(x, 16))
const mix = (a, b, t) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
const base = hex(BRAND)
const W = [255, 255, 255]
const K = [10, 20, 40]
const brand = {
  50: mix(base, W, 0.93), 100: mix(base, W, 0.85), 200: mix(base, W, 0.7), 300: mix(base, W, 0.5),
  400: mix(base, W, 0.25), 500: BRAND, 600: mix(base, K, 0.15), 700: mix(base, K, 0.3),
  800: mix(base, K, 0.45), 900: mix(base, K, 0.6),
}
const [r, g, b] = base

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        brand,
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px -6px rgba(16,24,40,.10)',
        glow: `0 10px 40px -10px rgba(${r},${g},${b},.5)`,
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: 0, transform: 'translate(-50%, 16px) scale(.96)' },
          '100%': { opacity: 1, transform: 'translate(-50%, 0) scale(1)' },
        },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'pop-in': {
          '0%': { opacity: 0, transform: 'translateY(12px) scale(.97)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'highlight': {
          '0%': { backgroundColor: `rgba(${r},${g},${b},.18)` },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'toast-in': 'toast-in .28s cubic-bezier(.2,.9,.3,1.2) both',
        'fade-in': 'fade-in .2s ease-out both',
        'pop-in': 'pop-in .3s cubic-bezier(.2,.9,.3,1.1) both',
        'highlight': 'highlight 2.4s ease-out both',
      },
    },
  },
  plugins: [],
}
