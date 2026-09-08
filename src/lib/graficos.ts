/**
 * Geometría de los gráficos del panorama, calculada en tiempo de compilación.
 *
 * Son SVG planos: no llega una sola línea de JavaScript al navegador para
 * dibujarlos. La ficha de cada indicador sí monta ECharts, porque ahí el
 * gráfico es interactivo; en el tablero, no hace falta.
 *
 * Cada función devuelve solo coordenadas. El color, el grosor y el resto de
 * la presentación los pone el componente, que es quien conoce la superficie
 * sobre la que va a dibujar.
 */

export type Punto = { d: string; v: number };

const num = (n: number): string => (Math.round(n * 10) / 10).toString();

/** Escala vertical común: deja aire arriba y abajo para que nada se corte. */
function escala(valores: readonly number[], alto: number, margen: number) {
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || 1;
  const util = alto - margen * 2;
  return {
    min,
    max,
    y: (v: number): number => margen + util - ((v - min) / span) * util,
  };
}

/** Curva suave que pasa por los puntos (Catmull-Rom convertida a Bézier). */
function suave(pts: readonly [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${num(pts[0][0])} ${num(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${num(c1[0])} ${num(c1[1])}, ${num(c2[0])} ${num(c2[1])}, ${num(p2[0])} ${num(p2[1])}`;
  }
  return d;
}

export type Linea = {
  tipo: 'linea' | 'area';
  linea: string;
  area: string;
  ultimoX: number;
  ultimoY: number;
};

export function linea(
  valores: readonly number[],
  ancho: number,
  alto: number,
  area = false,
): Linea {
  if (valores.length < 2) {
    return { tipo: area ? 'area' : 'linea', linea: '', area: '', ultimoX: ancho, ultimoY: alto / 2 };
  }
  const e = escala(valores, alto, 6);
  const paso = ancho / (valores.length - 1);
  const pts = valores.map((v, i) => [i * paso, e.y(v)] as [number, number]);
  const d = suave(pts);
  return {
    tipo: area ? 'area' : 'linea',
    linea: d,
    area: `${d} L ${num(ancho)} ${alto} L 0 ${alto} Z`,
    ultimoX: pts[pts.length - 1][0],
    ultimoY: pts[pts.length - 1][1],
  };
}

export type Barra = { x: number; y: number; w: number; h: number; positiva: boolean };

/** Barras apoyadas en la base. Para volúmenes y tasas de crecimiento. */
export function barras(valores: readonly number[], ancho: number, alto: number): Barra[] {
  if (valores.length === 0) return [];
  const e = escala([...valores, 0], alto, 6);
  const hueco = valores.length > 24 ? 1.5 : 3;
  const w = Math.max(2, ancho / valores.length - hueco);
  const base = e.y(Math.max(0, e.min));
  return valores.map((v, i) => {
    const y = e.y(v);
    return {
      x: i * (ancho / valores.length),
      y: Math.min(y, base),
      w,
      h: Math.max(1, Math.abs(base - y)),
      positiva: v >= 0,
    };
  });
}

/** Barras a ambos lados del cero: saldos comerciales, resultado fiscal. */
export function divergentes(valores: readonly number[], ancho: number, alto: number) {
  const max = Math.max(...valores.map(Math.abs)) || 1;
  const cero = alto / 2;
  const util = cero - 5;
  const hueco = valores.length > 24 ? 1.5 : 3;
  const w = Math.max(2, ancho / valores.length - hueco);
  return {
    cero,
    barras: valores.map((v, i) => {
      const h = Math.max(1, (Math.abs(v) / max) * util);
      return {
        x: i * (ancho / valores.length),
        y: v >= 0 ? cero - h : cero,
        w,
        h,
        positiva: v >= 0,
      };
    }),
  };
}

export type Porcion = {
  d: string;
  nombre: string;
  valor: number;
  porcentaje: number;
};

/**
 * Dona de composición. Solo para repartos que suman un total: en qué se
 * divide el gasto, de qué se compone la canasta. Para una serie temporal es
 * el gráfico equivocado, y por eso no se ofrece como alternativa general.
 */
export function dona(
  partes: readonly { nombre: string; valor: number }[],
  radio = 50,
  grosor = 18,
): Porcion[] {
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
  const r = radio - grosor / 2;
  let angulo = -Math.PI / 2; // arranca arriba

  return partes.map((p) => {
    const barrido = (p.valor / total) * Math.PI * 2;
    /* Un pelo de separación entre porciones: sin ella, dos colores contiguos
       de tono parecido se leen como una sola. */
    const fin = angulo + barrido - 0.02;
    const x1 = radio + r * Math.cos(angulo);
    const y1 = radio + r * Math.sin(angulo);
    const x2 = radio + r * Math.cos(fin);
    const y2 = radio + r * Math.sin(fin);
    const largo = barrido > Math.PI ? 1 : 0;
    angulo += barrido;
    return {
      d: `M ${num(x1)} ${num(y1)} A ${num(r)} ${num(r)} 0 ${largo} 1 ${num(x2)} ${num(y2)}`,
      nombre: p.nombre,
      valor: p.valor,
      porcentaje: (p.valor / total) * 100,
    };
  });
}

/**
 * Observado y proyectado en la misma escala, con el corte donde termina el
 * dato medido. Sin esa separación, un pronóstico se lee como una medición.
 */
export function conProyeccion(
  valores: readonly number[],
  ancho: number,
  alto: number,
  proporcionObservada = 0.75,
) {
  const corte = Math.max(2, Math.floor(valores.length * proporcionObservada));
  const e = escala(valores, alto, 6);
  const paso = ancho / (valores.length - 1);
  const pts = valores.map((v, i) => [i * paso, e.y(v)] as [number, number]);
  return {
    observado: suave(pts.slice(0, corte)),
    proyectado: suave(pts.slice(corte - 1)),
    corteX: pts[corte - 1][0],
    ultimoX: pts[pts.length - 1][0],
    ultimoY: pts[pts.length - 1][1],
  };
}
