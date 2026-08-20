/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          500: '#2f6fed',
          600: '#1f5bd6',
          700: '#1a4bb4'
        }
      }
    }
  },
  plugins: []
};
