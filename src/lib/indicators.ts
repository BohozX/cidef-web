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

export type Indicator = {
  id: string;
  name: string;
  shortName: string;
  category: string;
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
  description: string;
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
export const higherIsBetter = (id: string): boolean =>
  ['reservas-internacionales', 'exportaciones', 'saldo-comercial', 'imae', 'pib-trimestral', 'nowcast-pib', 'credito-privado', 'depositos'].includes(id);
