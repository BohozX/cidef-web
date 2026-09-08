// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// El sitio se publica en dos destinos. Cloudflare Pages lo sirve desde la raíz
// del dominio definitivo; GitHub Pages, al ser un repositorio de proyecto, lo
// sirve bajo /cidef-web/. El workflow de Pages activa GITHUB_PAGES=true; sin esa
// variable el build sigue siendo exactamente el de Cloudflare.
const enGitHubPages = process.env.GITHUB_PAGES === 'true';

/* Las redirecciones de /analisis existen para los enlaces antiguos del dominio
   propio. Astro aplica el `base` al origen de una redirección pero no a su
   destino, y el destino tiene que ser una ruta interna sin prefijo —si se le
   antepone, deja de reconocerla como ruta y pide getStaticPaths—. En la copia
   de GitHub Pages, que es una previsualización sin enlaces entrantes, se
   apagan; en Cloudflare siguen igual. */
const redirecciones = enGitHubPages
  ? {}
  : {
      '/analisis': '/publicaciones',
      '/analisis/[...id]': '/publicaciones/[...id]',
    };

export default defineConfig({
  site: enGitHubPages ? 'https://bohozx.github.io' : 'https://cidef.bo',
  base: enGitHubPages ? '/cidef-web' : '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  redirects: redirecciones,
  vite: {
    // Astro empaqueta su propia copia de Vite: el tipo del plugin proviene
    // de otra instalación y no coincide nominalmente. El plugin funciona.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
