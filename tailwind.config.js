/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shreem: {
          cream: '#F4F2EE',
          black: '#111111',
          gold: '#D4A24A',
          gray: '#6E6A63',
        },
      },
      fontFamily: {
        display: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        nav: '0 10px 30px rgba(0,0,0,.08)',
        card: '0 18px 50px rgba(0,0,0,.1)',
      },
    },
  },
  plugins: [],
}
