/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./screens/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#D64541',
        dark: '#1c1c0d',
        cream: '#F5F5DC',
        secondary: '#666666',
      },
    },
  },
  plugins: [],
}