import raw from '../data/indicators.json';
import cats from '../data/categories.json';

/**
 * Capa de acceso a los datos del Radar Económico.
 *
 * Hoy lee un JSON local generado por `tools/generate_demo_data.py`.
 * Para conectar una API basta con reemplazar `raw` por la respuesta del
 * endpoint manteniendo este mismo esquema: el resto del sitio no cambia.
 */

export type HistoryPoint = { d: string; v: number };

export type Vintage = {
  version: string;
  date: string;
  value: number;
  note?: string;
};

/** Qué es el dato. Una estimación nunca se presenta como estadística oficial. */
export type Kind = 'oficial' | 'estimacion' | 'proyeccion';

/** Hasta dónde llega la capa gratuita de esa serie. */
export type Access = 'publico' | 'profesional';

/**
 * Con qué gráfico se lee mejor la serie. La elección es económica, no
 * estética: una tasa en línea, un stock en área, un saldo en barras
 * divergentes, una serie con pronóstico en observado más proyectado.
 */
export type Viz = 'linea' | 'area' | 'barras' | 'divergente' | 'proyeccion';

export const ETIQUETA: Record<Kind, string> = {
  oficial: 'Oficial',
  estimacion: 'Estimación del Centro',
  proyeccion: 'Proyección del Centro',
};

export type Indicator = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  kind: Kind;
  access: Access;
  viz: Viz;
  /** Publicación del centro que documenta la serie, si la hay. */
  related?: string;
  unit: string;
  decimals: number;
  frequency: string;
  periodicity: string;
  source: string;
  sourceUrl: string | null;
  own: boolean;
  demo: boolean;
  featured: boolean;
  description: string;
  methodology: string;
  history: HistoryPoint[];
  value: number;
  change: number;
  changeUnit: string;
  date: string;
  updated: string;
  ciLow?: number;
  ciHigh?: number;
  version?: string;
  authors?: string[];
  vintages?: Vintage[];
};

export type Category = {
  id: string;
  name: string;
  /** La pregunta que contesta el sector, en el idioma de quien consulta. */
  pregunta?: string;
  description: string;
  /** Materias que cubre el sector, incluidas las que aún no tienen serie. */
  temas?: string[];
};

export const indicators = raw as unknown as Indicator[];
export const categories = cats as unknown as Category[];

export const byId = (id: string): Indicator | undefined =>
  indicators.find((i) => i.id === id);

export const byCategory = (categoryId: string): Indicator[] =>
  indicators.filter((i) => i.category === categoryId);

/** Indicadores destacados de la portada, en orden estable. */
export const featuredOrder = [
  'inflacion-interanual',
  'tipo-cambio',
  'reservas-internacionales',
  'imae',
  'exportaciones',
  'nowcast-pib',
];

export const featured = (): Indicator[] =>
  featuredOrder
    .map((id) => byId(id))
    .filter((i): i is Indicator => Boolean(i));

export const ownIndicators = (): Indicator[] => indicators.filter((i) => i.own);

export const categoryName = (id: string): string =>
  categories.find((c) => c.id === id)?.name ?? id;

/** Fecha de actualización más reciente del conjunto. */
export const lastUpdated = (): string =>
  indicators.map((i) => i.updated).sort().at(-1) ?? '';

/**
 * Para algunos indicadores un aumento es una mala noticia (inflación, deuda,
 * desocupación) y para otros es buena (reservas, exportaciones). El color se
 * asigna por dirección del dato, no por juicio de valor, pero se expone esta
 * ayuda por si se quiere invertir la semántica en el futuro.
 */
/**
 * Los sectores del Radar, en el orden en que se recorren. El panorama abre y
 * los indicadores del centro cierran; en medio, la economía por bloques.
 *
 * El orden no es alfabético ni por tamaño: va de lo que se produce a lo que
 * cuesta, de ahí al dinero y al dólar, después a las cuentas con el exterior
 * y con el Estado, y termina en las personas. El comercio exterior no es un
 * bloque aparte: exportar, importar y el saldo son la cara comercial del
 * sector externo.
 */
export const SECTORES = [
  'panorama',
  'actividad',
  'precios',
  'monetario',
  'cambiario',
  'externo',
  'fiscal',
  'laboral',
  'social',
  'internacional',
  'centro',
] as const;

export type SectorId = (typeof SECTORES)[number];

/**
 * Los sectores con su ficha completa y cuántas series tiene cada uno hoy.
 * El panorama queda fuera: no es un sector, es la portada del tablero.
 */
export const sectores = (): (Category & { series: number })[] =>
  SECTORES.filter((id) => id !== 'panorama')
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => Boolean(c))
    .map((c) => ({ ...c, series: byCategory(c.id).length }));

/** Serie de acceso rápido de la cabecera: lo que se mira cada mañana. */
export const ATAJOS = [
  'inflacion-interanual',
  'pib-trimestral',
  'tipo-cambio',
  'reservas-internacionales',
  'credito-privado',
  'desocupacion',
];

export const atajos = (): Indicator[] =>
  ATAJOS.map((id) => byId(id)).filter((i): i is Indicator => Boolean(i));

/** Las tres familias, para separarlas visualmente sin ambigüedad. */
export const porTipo = (kind: Kind): Indicator[] =>
  indicators.filter((i) => i.kind === kind);

export const higherIsBetter = (id: string): boolean =>
  [
    'reservas-internacionales',
    'exportaciones',
    'saldo-comercial',
    'imae',
    'pib-trimestral',
    'nowcast-pib',
    'credito-privado',
    'depositos',
    'industria',
    'recaudacion',
    'salario-minimo',
  ].includes(id);
