import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: ['./app/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'Public Sans', 'Segoe UI', 'sans-serif'] },
      colors: {
        hospital: { 50: '#eef8f5', 100: '#d7eee7', 600: '#16705b', 700: '#115b4b', 800: '#12493e' },
      },
    },
  },
}
