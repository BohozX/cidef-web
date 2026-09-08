// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// El sitio se publica en dos destinos. Cloudflare Pages lo sirve desde la raíz
// del dominio definitivo; GitHub Pages, al ser un repositorio de proyecto, lo
// sirve bajo /cidef-web/. El workflow de Pages activa GITHUB_PAGES=true; sin esa
// variable el build sigue siendo exactamente el de Cloudflare.
const enGitHubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  site: enGitHubPages ? 'https://bohozx.github.io' : 'https://cidef.bo',
  base: enGitHubPages ? '/cidef-web' : '/',
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
