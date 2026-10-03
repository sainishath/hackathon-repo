/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#070A11',
        slateSurface: '#0F172A',
        slateSub: '#131F37',
        slateBorder: '#1E293B',
        emeraldAccent: '#10B981',
        amberAccent: '#F59E0B',
        crimsonAccent: '#EF4444',
        cyanAccent: '#06B6D4',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
