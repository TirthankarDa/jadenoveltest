// tailwind.config.mjs
import { defineConfig } from 'tailwindcss'

export default defineConfig({
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // Add this section to map your CSS variables to Tailwind colors
      colors: {
        background: 'var(--theme-bg)',
        foreground: 'var(--theme-text)',
        'foreground-secondary': 'var(--theme-text-secondary)',
        border: 'var(--theme-border)',
        link: 'var(--theme-link)',
      },
      // Also map your font family for consistency
      fontFamily: {
        reading: 'var(--font-family)',
      },
    },
  },
  plugins: [],
});