/**
 * Configuración central del sitio.
 * Todo lo institucional se edita aquí, no dentro de los componentes.
 */

import { withBase } from './lib/url';

export const site = {
  name: 'CIDEF',
  legalName: 'Centro de Inteligencia en Desarrollo Económico y Financiero',
  shortDescription:
    'Centro de Inteligencia en Desarrollo Económico y Financiero. Investigación aplicada, datos y análisis para comprender la economía boliviana.',
  url: 'https://cidef.bo',
  locale: 'es-BO',
  country: 'Bolivia',
  city: 'La Paz',

  /**
   * Fotografía de portada: La Paz de noche con el Illimani.
   * Las variantes se generan con `node tools/hero.mjs`.
   */
  hero: {
    src: '/media/lapaz-illimani.jpg',
    width: 2400,
    height: 1553,
    alt: 'Vista nocturna de la ciudad de La Paz con el nevado Illimani al fondo',
    sizes: '100vw',
    srcset: {
      avif: '/media/lapaz-illimani-800.avif 800w, /media/lapaz-illimani-1200.avif 1200w, /media/lapaz-illimani-1800.avif 1800w, /media/lapaz-illimani.avif 2400w',
      webp: '/media/lapaz-illimani-800.webp 800w, /media/lapaz-illimani-1200.webp 1200w, /media/lapaz-illimani-1800.webp 1800w, /media/lapaz-illimani.webp 2400w',
      jpg: '/media/lapaz-illimani-800.jpg 800w, /media/lapaz-illimani-1200.jpg 1200w, /media/lapaz-illimani-1800.jpg 1800w, /media/lapaz-illimani.jpg 2400w',
    },
  },

  /**
   * Marca institucional.
   *
   * Todas las variantes derivan del archivo oficial mediante
   * `tools/prepare_assets.py`, que únicamente recorta el margen, genera
   * transparencia, compone el bloque horizontal con los dos elementos que ya
   * existen en el original y produce la versión reversa a dos tintas para
   * fondos oscuros. La geometría del logo no se altera.
   *
   * Si se reemplaza el archivo fuente, basta con volver a ejecutar el script.
   */
  logos: {
    horizontal: '/media/logo-cidef-h.png',
    horizontalInverse: '/media/logo-cidef-h-inv.png',
    stacked: '/media/logo-cidef.png',
    stackedInverse: '/media/logo-cidef-inv.png',
    mark: '/media/logo-cidef-mark.png',
  } as Record<string, string | null>,

  contact: {
    email: 'contacto@cidef.bo',
    phones: ['68781621', '67152566', '75293589', '79545011'],
    address: 'Calle Batallón Colorados, Edificio El Cóndor, Piso 7',
    addressCity: 'La Paz — Bolivia',
  },

  social: {
    linkedin: '#',
    x: '#',
    youtube: '#',
    repec: '#',
  },

  partners: [
    { name: 'Colegio de Economistas de La Paz', role: 'Respaldo gremial' },
    { name: 'Escuela de Postgrado MSC', role: 'Alianza académica' },
    { name: 'Universidad Franz Tamayo (UNIFRANZ)', role: 'Certificación de postgrado' },
  ],
} as const;

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

export const nav: NavItem[] = [
  { label: 'Inicio', href: '/', description: 'Portada del centro' },
  { label: 'Radar Económico', href: '/radar', description: 'Indicadores de la economía boliviana' },
  {
    label: 'Publicaciones',
    href: '/publicaciones',
    description: 'Informes, reportes, working papers, notas y memorias',
  },
  { label: 'Formación', href: '/formacion', description: 'Diplomados y oferta académica' },
  { label: 'Agenda', href: '/agenda', description: 'Seminarios, conferencias y convocatorias' },
  { label: 'Nosotros', href: '/nosotros', description: 'Quiénes somos y equipo' },
];

/**
 * Portadas de sección.
 *
 * Cada página principal abre con una imagen a sangre, como la portada del
 * sitio. Los archivos se generan con `node tools/covers.mjs`: unas se dibujan
 * —el abanico del Radar— y otras salen de una fotografía dejada en
 * `.design/secciones/`. Una sección sin entrada aquí conserva la cabecera
 * sobria de siempre, así que se pueden ir añadiendo de una en una.
 */
export type Cover = {
  src: string;
  alt: string;
  /** Medidas del archivo mayor: reservan el hueco antes de que cargue. */
  width: number;
  height: number;
  srcset: { avif: string; webp: string; jpg: string };
};

/** `alto` lo imprime `tools/covers.mjs` al generar cada portada. */
const cover = (nombre: string, alt: string, alto: number): Cover => {
  const anchos = [800, 1200, 1800];
  const lista = (ext: string): string =>
    [
      ...anchos.map((w) => `${withBase(`/media/secciones/${nombre}-${w}.${ext}`)} ${w}w`),
      `${withBase(`/media/secciones/${nombre}.${ext}`)} 2400w`,
    ].join(', ');

  return {
    src: withBase(`/media/secciones/${nombre}.jpg`),
    alt,
    width: 2400,
    height: alto,
    srcset: { avif: lista('avif'), webp: lista('webp'), jpg: lista('jpg') },
  };
};

export const covers = {
  radar: cover(
    'radar',
    'Gráfico de abanico: una serie observada que se abre en bandas de probabilidad hacia la proyección, sobre notación econométrica',
    1351,
  ),
  publicaciones: cover(
    'publicaciones',
    'Libro abierto sobre una mesa, con el desarrollo de un modelo macroeconómico: la función de utilidad del hogar, su restricción presupuestaria y las condiciones de primer orden',
    1351,
  ),
  formacion: cover(
    'formacion',
    'Pizarra de aula con las ecuaciones de un modelo DSGE escritas con tiza: la ecuación de Euler, la curva de Phillips y la regla de Taylor',
    1352,
  ),
  agenda: cover(
    'agenda',
    'Sala de conferencias vacía antes de un seminario, con la pantalla de proyección encendida',
    1351,
  ),
  nosotros: cover(
    'nosotros',
    'Equipo de investigación trabajando alrededor de una mesa con computadoras, papeles y gráficos',
    1351,
  ),
} as const;

/** Aviso global para datos de demostración. */
export const DEMO_NOTICE =
  'Versión de demostración: los valores mostrados son de ejemplo y no constituyen cifras oficiales.';
