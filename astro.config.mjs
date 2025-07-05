// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// CORRECTED IMPORT: Use curly braces for the named export
import { sveltePreprocess } from 'svelte-preprocess';

// https://astro.build/config
export default defineConfig({
  integrations: [
    svelte({
      // This part was correct, it just needed the right import
      preprocess: sveltePreprocess({
        postcss: true,
      }),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});