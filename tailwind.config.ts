// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Iqra School Brand Colors
        primary: {
          50: '#f3e8f9',
          100: '#e1c4f0',
          200: '#c98de3',
          300: '#b056d6',
          400: '#9b38c9',
          500: '#6B2C91',  // Main deep purple
          600: '#5e2680',
          700: '#4A1D63',
          800: '#3a1650',
          900: '#2a0f3a',
        },
        accent: {
          50: '#e8f5ed',
          100: '#c5e6d0',
          200: '#8fcea5',
          300: '#55b576',
          400: '#2d9e55',
          500: '#1B7A3D',  // Main green
          600: '#176d35',
          700: '#125c2b',
          800: '#0d4a22',
          900: '#083818',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
