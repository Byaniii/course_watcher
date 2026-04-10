/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        feu: {
          green: '#1a7a3f',
          gold: '#f7c32e',
        }
      }
    },
  },
  plugins: [],
}
