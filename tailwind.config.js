/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        sand: '#f4f1ea',
        sunrise: '#f97316',
        olive: '#3f6212',
      },
      boxShadow: {
        glow: '0 0 60px rgba(249, 115, 22, 0.35)',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Space Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
