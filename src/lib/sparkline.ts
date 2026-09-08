/**
 * Sparklines generadas en tiempo de build (SVG puro, sin JS en el cliente).
 * El trazo se anima después con GSAP mediante `.spark-path`.
 */

export type Point = { d: string; v: number };

export type SparkGeometry = {
  line: string;
  area: string;
  lastX: number;
  lastY: number;
  width: number;
  height: number;
};

export function buildSparkline(
  values: readonly number[],
  width = 168,
  height = 44,
  padding = 3,
): SparkGeometry {
  const empty: SparkGeometry = {
    line: '',
    area: '',
    lastX: width,
    lastY: height / 2,
    width,
    height,
  };
  if (values.length < 2) return empty;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const innerH = height - padding * 2;
  const stepX = width / (values.length - 1);

  const coords = values.map((v, i) => {
    const x = i * stepX;
    const y = padding + innerH - ((v - min) / span) * innerH;
    return [round(x), round(y)] as const;
  });

  const line = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`)
    .join(' ');

  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const area = `${line} L${last[0]} ${height} L${first[0]} ${height} Z`;

  return { line, area, lastX: last[0], lastY: last[1], width, height };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Devuelve los últimos `n` valores de una serie histórica. */
export function tail(history: readonly Point[], n = 36): number[] {
  return history.slice(-n).map((p) => p.v);
}
