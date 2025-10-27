/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        black: '#000000',
        coal: '#0a0a0a',
        blood: '#8b0000',
        venom: '#1f0040',
        silver: '#b5b5b5',
      },
      fontFamily: {
        metal: ['"Metal Mania"', 'cursive'],
        oswald: ['Oswald', 'sans-serif'],
      },
      boxShadow: {
        neonred: '0 0 8px #8b0000',
      },
      clipPath: {
        jagged: 'polygon(0 10%, 5% 0, 15% 12%, 25% 0, 35% 8%, 45% 0, 55% 14%, 65% 0, 75% 12%, 85% 0, 95% 8%, 100% 10%, 100% 90%, 95% 100%, 85% 88%, 75% 100%, 65% 86%, 55% 100%, 45% 92%, 35% 100%, 25% 86%, 15% 100%, 5% 92%, 0 90%)'
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};