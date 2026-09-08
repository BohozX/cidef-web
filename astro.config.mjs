// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Cambiar por el dominio definitivo antes de desplegar en Cloudflare Pages.
export default defineConfig({
  site: 'https://cidef.bo',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  vite: {
    // Astro empaqueta su propia copia de Vite: el tipo del plugin proviene
    // de otra instalación y no coincide nominalmente. El plugin funciona.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
