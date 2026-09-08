/**
 * Rutas conscientes del `base` del sitio.
 *
 * El sitio se despliega en dos destinos con prefijos distintos: en Cloudflare
 * Pages cuelga de la raíz (`/`) y en GitHub Pages de `/cidef-web/`. Astro
 * prefija por su cuenta lo que él genera —CSS, JS, imágenes optimizadas— pero
 * no las rutas escritas a mano en el marcado, así que estas pasan por aquí.
 */

const BASE = import.meta.env.BASE_URL;

/** `base` sin la barra final: '' en la raíz, '/cidef-web' en GitHub Pages. */
const PREFIX = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;

/**
 * Antepone el `base` a una ruta interna absoluta.
 *
 * Se dejan intactas las URL externas, los anclas y los esquemas (`mailto:`,
 * `tel:`), y también las rutas relativas: prefijarlas las rompería.
 */
export function withBase(path: string): string {
  if (!path) return path;
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)) return path;
  if (!path.startsWith('/')) return path;
  if (PREFIX && path.startsWith(PREFIX + '/')) return path;
  return PREFIX + path;
}

/**
 * Igual que `withBase`, para el atributo `srcset`, cuyo formato es
 * `url descriptor, url descriptor, ...`.
 */
export function withBaseSrcset(srcset: string): string {
  return srcset
    .split(',')
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      if (parts.length === 0 || parts[0] === '') return candidate.trim();
      const [url, ...descriptors] = parts;
      return [withBase(url), ...descriptors].join(' ');
    })
    .join(', ');
}

/**
 * Quita el `base` de una ruta del navegador para poder compararla con las
 * rutas declaradas en `site.config.ts`, que se escriben sin prefijo.
 */
export function stripBase(pathname: string): string {
  if (PREFIX && pathname.startsWith(PREFIX)) {
    return pathname.slice(PREFIX.length) || '/';
  }
  return pathname;
}
