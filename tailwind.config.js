/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gray-850': '#1f2937',
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'Noto Sans CJK TC', 'sans-serif'],
      },
      fontSize: {
        '10xl': '140px',
      }
    },
  },
  plugins: [],
}
