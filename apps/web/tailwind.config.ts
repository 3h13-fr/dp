import type { Config } from 'tailwindcss';

/**
 * Design system — Référence: Airbnb UI Kit (Figma)
 * https://www.figma.com/design/66fdWaCXgdEJVhMqdcXx2Q/Airbnb-UI-Kit--Community-?node-id=208-2874
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        border: 'var(--border)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        /* Airbnb UI Kit — utiliser ds-primary, ds-gray, etc. */
        ds: {
          primary: 'var(--color-primary)',
          'primary-hover': 'var(--color-primary-hover)',
          'primary-light': 'var(--color-primary-light)',
          black: 'var(--color-black)',
          'gray-dark': 'var(--color-gray-dark)',
          gray: 'var(--color-gray)',
          'gray-light': 'var(--color-gray-light)',
          'gray-bg': 'var(--color-gray-bg)',
          white: 'var(--color-white)',
        },
      },
      borderRadius: {
        'ds-button': 'var(--radius-button)',
        'ds-input': 'var(--radius-input)',
        'ds-pill': 'var(--radius-pill)',
        'ds-card': 'var(--radius-card)',
      },
      boxShadow: {
        'ds-card': 'var(--shadow-card)',
        'ds-dropdown': 'var(--shadow-dropdown)',
        'ds-search': 'var(--shadow-search)',
        'ds-search-hover': 'var(--shadow-search-hover)',
      },
    },
  },
  plugins: [],
};
export default config;
