/**
 * Configuración central del sitio.
 * Todo lo institucional se edita aquí, no dentro de los componentes.
 */

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
   * Las variantes se generan con `python tools/prepare_assets.py`.
   */
  hero: {
    src: '/media/lapaz-illimani.jpg',
    width: 2048,
    height: 1360,
    alt: 'Vista nocturna de la ciudad de La Paz con el nevado Illimani al fondo',
    sizes: '100vw',
    srcset: {
      avif: '/media/lapaz-illimani-800.avif 800w, /media/lapaz-illimani-1200.avif 1200w, /media/lapaz-illimani-1600.avif 1600w, /media/lapaz-illimani.avif 2048w',
      webp: '/media/lapaz-illimani-800.webp 800w, /media/lapaz-illimani-1200.webp 1200w, /media/lapaz-illimani-1600.webp 1600w, /media/lapaz-illimani.webp 2048w',
      jpg: '/media/lapaz-illimani-800.jpg 800w, /media/lapaz-illimani-1200.jpg 1200w, /media/lapaz-illimani-1600.jpg 1600w, /media/lapaz-illimani.jpg 2048w',
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
  { label: 'Análisis', href: '/analisis', description: 'Working papers, reportes y notas' },
  { label: 'Archivo Vivo', href: '/archivo', description: 'Repositorio abierto de documentos y datos' },
  { label: 'Formación', href: '/formacion', description: 'Diplomados y oferta académica' },
  { label: 'Agenda', href: '/agenda', description: 'Seminarios, conferencias y convocatorias' },
  { label: 'Nosotros', href: '/nosotros', description: 'Quiénes somos y equipo' },
];

/** Aviso global para datos de demostración. */
export const DEMO_NOTICE =
  'Versión de demostración: los valores mostrados son de ejemplo y no constituyen cifras oficiales.';
