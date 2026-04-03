/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // Mobile-first breakpoints (default Tailwind breakpoints)
    screens: {
      sm: '640px',  // Small devices (landscape phones)
      md: '768px',  // Medium devices (tablets)
      lg: '1024px', // Large devices (desktops)
      xl: '1280px', // Extra large devices (large desktops)
      '2xl': '1536px', // 2X large devices
    },
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        secondary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
        },
      },
    },
  },
  plugins: [],
};
