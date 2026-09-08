/** Utilidades de formato — convención boliviana: coma decimal, punto de miles. */

const NBSP = ' ';

export function num(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function compact(value: number): string {
  return new Intl.NumberFormat('es-BO', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Valor + unidad, listo para mostrar en una tarjeta de indicador. */
export function withUnit(value: number, unit: string, decimals = 2): string {
  if (unit === '%') return `${num(value, decimals)}%`;
  if (unit === 'Bs') return `Bs${NBSP}${num(value, decimals)}`;
  if (unit === 'USD MM') return `${num(value, 0)}`;
  return `${num(value, decimals)}${NBSP}${unit}`;
}

export type Direction = 'up' | 'down' | 'flat';

export function direction(change: number): Direction {
  if (change > 0.0001) return 'up';
  if (change < -0.0001) return 'down';
  return 'flat';
}

export function deltaLabel(change: number, unit: string, decimals = 2): string {
  const glyph = change > 0.0001 ? '▲' : change < -0.0001 ? '▼' : '—';
  if (Math.abs(change) < 0.0001) return `${glyph}${NBSP}sin cambio`;
  return `${glyph}${NBSP}${num(Math.abs(change), decimals)}${NBSP}${unit}`;
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function parseISO(iso: string): Date {
  // Se fuerza mediodía UTC para evitar corrimientos de zona horaria.
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`);
}

export function longDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export function monthYear(iso: string): string {
  const d = parseISO(iso);
  const m = MONTHS[d.getUTCMonth()]!;
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getUTCFullYear()}`;
}

export function shortDate(iso: string): string {
  const d = parseISO(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export function dayMonth(iso: string): { day: string; month: string; year: string } {
  const d = parseISO(iso);
  return {
    day: String(d.getUTCDate()).padStart(2, '0'),
    month: MONTHS_SHORT[d.getUTCMonth()]!,
    year: String(d.getUTCFullYear()),
  };
}

export function year(iso: string): number {
  return parseISO(iso).getUTCFullYear();
}

export function isFuture(iso: string): boolean {
  return parseISO(iso).getTime() >= Date.now() - 12 * 3600 * 1000;
}

/** Lista de autores en formato legible. */
export function authorList(authors: readonly string[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0]!;
  return `${authors.slice(0, -1).join(', ')} y ${authors[authors.length - 1]}`;
}

/**
 * "Apellidos, N." para citas.
 * Convención usada: el primer token es el nombre de pila y el resto son
 * apellidos. Para autores con dos nombres, declararlos en el frontmatter
 * con el campo `citeAs` si se requiere otra forma.
 */
export function apaAuthors(authors: readonly string[]): string {
  return authors
    .map((full) => {
      const parts = full.trim().split(/\s+/).filter(Boolean);
      if (parts.length < 2) return full;
      const given = parts[0]!;
      const family = parts.slice(1).join(' ');
      return `${family}, ${given.charAt(0)}.`;
    })
    .join(', ');
}

/** "Apellido" solo — para claves BibTeX. */
export function familyName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[1]! : parts[0] ?? '';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Período de referencia del dato, según la frecuencia de la serie.
 *
 * «Inflación 6,64 %» no informa de nada si no se sabe de qué mes es, y una
 * serie trimestral fechada al 1 de abril no es «1 de abril»: es el segundo
 * trimestre.
 */
const ROMANOS = ['I', 'II', 'III', 'IV'];

export function periodoRef(iso: string, frecuencia: string): string {
  const d = parseISO(iso);
  const mes = d.getUTCMonth();
  const anio = d.getUTCFullYear();
  if (frecuencia === 'Anual') return String(anio);
  if (frecuencia === 'Trimestral') return `${ROMANOS[Math.floor(mes / 3)]} trimestre ${anio}`;
  if (frecuencia === 'Diaria' || frecuencia === 'Semanal') return longDate(iso);
  return `${MONTHS[mes]} de ${anio}`;
}
