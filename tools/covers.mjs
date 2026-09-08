/**
 * Portadas de sección.
 *
 * Dos oficios en un mismo archivo:
 *
 *  1. Dibuja las portadas que conviene dibujar —hoy, el fan chart del Radar—.
 *     Un gráfico vectorial trazado con los datos a la vista queda más limpio
 *     que cualquier fotografía de un gráfico, y no envejece.
 *
 *  2. Procesa las fotografías que se dejen en `.design/secciones/<nombre>.png`
 *     (o .jpg) con el mismo tratamiento que la portada del Illimani: enfoque
 *     al reducir y exportación en tres formatos y cuatro anchos.
 *
 *   node tools/covers.mjs            todas
 *   node tools/covers.mjs radar      solo una
 */

import sharp from 'sharp';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUENTES = join(RAIZ, '.design', 'secciones');
const SALIDA = join(RAIZ, 'public', 'media', 'secciones');

const ANCHO = 2400;
const ALTO = 1553; // la misma proporción que la portada del Illimani
const ANCHOS = [2400, 1800, 1200, 800];

const INK = '#031a24';
const PETROLEO = '#04313a';
const TEAL = '#008c85';
const ORO = '#d29a28';

/* ------------------------------------------------------------------ dibujo */

/** Generador reproducible: la portada tiene que salir igual cada vez. */
function azar(semilla) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Curva suave por los puntos dados (Catmull-Rom pasada a Bézier). */
function trazo(puntos) {
  if (puntos.length < 2) return '';
  let d = `M ${puntos[0][0].toFixed(1)} ${puntos[0][1].toFixed(1)}`;
  for (let i = 0; i < puntos.length - 1; i += 1) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Fan chart: una serie observada que se abre en abanico de probabilidad.
 *
 * Se dibuja sin ejes ni rótulos a propósito —es una portada, no una ficha—,
 * pero la forma es la de verdad: la incertidumbre crece con la raíz del
 * horizonte, así que el abanico se abre despacio y no en línea recta.
 */
function fanChart() {
  const r = azar(20260906);
  const nHist = 128;
  const nProy = 96;
  const total = nHist + nProy;

  const x = (i) => (i / (total - 1)) * ANCHO;
  const base = ALTO * 0.54;
  const escala = ALTO * 0.021;

  /* Serie observada: caminata con reversión débil y algo de ciclo, para que
     tenga carácter de dato y no de ruido puro. */
  const hist = [];
  let v = 0;
  for (let i = 0; i < nHist; i += 1) {
    v = v * 0.94 + (r() - 0.5) * 1.5 + Math.sin(i / 11) * 0.3;
    hist.push(v);
  }

  /* Proyección: la central sigue la inercia y vuelve despacio a su media. */
  const central = [];
  let c = hist[nHist - 1];
  const deriva = (hist[nHist - 1] - hist[nHist - 12]) / 12;
  for (let h = 1; h <= nProy; h += 1) {
    c = c * 0.985 + deriva * Math.exp(-h / 26) * 3.2;
    central.push(c);
  }

  const punto = (i, valor) => [x(i), base - valor * escala];

  const histPts = hist.map((valor, i) => punto(i, valor));
  const centralPts = central.map((valor, h) => punto(nHist - 1 + h + 1, valor));

  /* Bandas: cinco niveles de probabilidad. El ancho crece con √h. */
  const niveles = [
    { k: 2.1, op: 0.1 },
    { k: 1.6, op: 0.14 },
    { k: 1.15, op: 0.18 },
    { k: 0.75, op: 0.24 },
    { k: 0.38, op: 0.32 },
  ];

  const bandas = niveles
    .map(({ k, op }) => {
      const arriba = [];
      const abajo = [];
      // Arranca cerrada en el último dato observado: sin salto en la unión.
      arriba.push(histPts[nHist - 1]);
      abajo.push(histPts[nHist - 1]);
      central.forEach((valor, h) => {
        /* El 0,5 está calibrado para que la banda más ancha termine ocupando
           poco más de un tercio del alto: más abierta se sale del cuadro y
           deja de leerse como abanico. */
        const ancho = k * Math.sqrt(h + 1) * 0.5;
        arriba.push(punto(nHist + h, valor + ancho));
        abajo.push(punto(nHist + h, valor - ancho));
      });
      const d = `${trazo(arriba)} L ${abajo[abajo.length - 1][0].toFixed(1)} ${abajo[abajo.length - 1][1].toFixed(1)} ${trazo([...abajo].reverse()).replace(/^M[^C]*/, '')} Z`;
      return `<path d="${d}" fill="${TEAL}" fill-opacity="${op}"/>`;
    })
    .join('\n    ');

  const rejilla = Array.from({ length: 7 }, (_, i) => {
    const y = (ALTO / 8) * (i + 1);
    return `<line x1="0" y1="${y.toFixed(0)}" x2="${ANCHO}" y2="${y.toFixed(0)}" stroke="#f5f3ed" stroke-opacity="0.045" stroke-width="1.5"/>`;
  }).join('\n    ');

  const corte = x(nHist - 1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INK}"/>
      <stop offset="1" stop-color="${PETROLEO}"/>
    </linearGradient>
    <linearGradient id="brillo" x1="0.2" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="${TEAL}" stop-opacity="0.16"/>
      <stop offset="0.6" stop-color="${TEAL}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${ANCHO}" height="${ALTO}" fill="url(#fondo)"/>
  <rect width="${ANCHO}" height="${ALTO}" fill="url(#brillo)"/>
  <g>
    ${rejilla}
  </g>

  <g>
    ${bandas}
  </g>

  <line x1="${corte.toFixed(0)}" y1="${(ALTO * 0.12).toFixed(0)}" x2="${corte.toFixed(0)}" y2="${(ALTO * 0.9).toFixed(0)}"
        stroke="#f5f3ed" stroke-opacity="0.22" stroke-width="2" stroke-dasharray="10 12"/>

  <path d="${trazo(histPts)}" fill="none" stroke="${ORO}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${trazo([histPts[nHist - 1], ...centralPts])}" fill="none" stroke="${ORO}" stroke-opacity="0.75"
        stroke-width="4" stroke-dasharray="16 12" stroke-linecap="round"/>

  <circle cx="${histPts[nHist - 1][0].toFixed(1)}" cy="${histPts[nHist - 1][1].toFixed(1)}" r="11" fill="${ORO}"/>
  <circle cx="${histPts[nHist - 1][0].toFixed(1)}" cy="${histPts[nHist - 1][1].toFixed(1)}" r="26" fill="none" stroke="${ORO}" stroke-opacity="0.35" stroke-width="3"/>
</svg>`;
}

/**
 * Portadas trazadas aquí mismo. Una fotografía con el mismo nombre en
 * `.design/secciones/` tiene preferencia: el dibujo es el recurso de reserva,
 * no una imposición.
 *
 * `fanChart` sigue disponible aunque hoy no se use: dibuja el abanico de
 * probabilidad completo y sirve para cualquier sección que lo necesite.
 */
const DIBUJADAS = {};

/* --------------------------------------------------------------- exportar */

/** Imágenes que llegan con marco oscuro alrededor y hay que despuntar. */
const RECORTAR = new Set(['formacion']);

async function exportar(nombre, entrada) {
  let base = sharp(entrada);
  if (RECORTAR.has(nombre)) base = base.trim({ threshold: 20 });

  /* Se conserva la proporción del original y solo se limita el ancho: el
     recorte a la caja de la portada lo hace el navegador según el hueco, y
     así no se tira información que en otra pantalla sí cabría. */
  const trabajo = await base.resize(ANCHO, null, { kernel: 'lanczos3' }).toBuffer();
  const medida = await sharp(trabajo).metadata();

  for (const f of await readdir(SALIDA).catch(() => [])) {
    if (f.startsWith(`${nombre}-`) || f.startsWith(`${nombre}.`)) {
      await unlink(join(SALIDA, f));
    }
  }

  for (const ancho of ANCHOS) {
    const sufijo = ancho === ANCHOS[0] ? '' : `-${ancho}`;
    let img = sharp(trabajo).resize(ancho, null, { kernel: 'lanczos3' });
    if (ancho !== ANCHO) {
      img = img.sharpen({ sigma: 0.7, m1: 0.4, m2: 0.9, x1: 3, y2: 12 });
    }
    await img.clone().avif({ quality: 68, effort: 6 }).toFile(join(SALIDA, `${nombre}${sufijo}.avif`));
    await img.clone().webp({ quality: 88, effort: 6 }).toFile(join(SALIDA, `${nombre}${sufijo}.webp`));
    await img.clone().jpeg({ quality: 92, mozjpeg: true, progressive: true }).toFile(join(SALIDA, `${nombre}${sufijo}.jpg`));
  }

  const pesos = (await readdir(SALIDA))
    .filter((f) => f.startsWith(nombre))
    .sort();
  let total = 0;
  for (const f of pesos) total += (await stat(join(SALIDA, f))).size;
  console.log(
    `  ${nombre.padEnd(16)} ${ANCHO}x${medida.height}` +
      ` · ${pesos.length} archivos · ${(total / 1024).toFixed(0)} KB` +
      `   →  cover('${nombre}', '…', ${medida.height})`,
  );
}

/* ------------------------------------------------------------------ main */

const pedidas = process.argv.slice(2);
await mkdir(SALIDA, { recursive: true });
await mkdir(FUENTES, { recursive: true });

const trabajo = [];

for (const [nombre, def] of Object.entries(DIBUJADAS)) {
  if (pedidas.length && !pedidas.includes(nombre)) continue;
  trabajo.push([nombre, Buffer.from(def.svg()), 'dibujada']);
}

for (const f of await readdir(FUENTES).catch(() => [])) {
  const nombre = basename(f, extname(f));
  if (!/\.(png|jpe?g|webp|avif|tiff?)$/i.test(f)) continue;
  if (DIBUJADAS[nombre]) continue; // lo dibujado manda sobre la foto
  if (pedidas.length && !pedidas.includes(nombre)) continue;
  trabajo.push([nombre, join(FUENTES, f), 'fotografía']);
}

if (trabajo.length === 0) {
  console.log('  nada que hacer: deja las fotografías en .design/secciones/');
} else {
  for (const [nombre, entrada, clase] of trabajo) {
    console.log(`\n· ${nombre} (${clase})`);
    await exportar(nombre, entrada);
  }
}

console.log('\nListo. Las rutas van en `covers` dentro de src/site.config.ts');
if (!existsSync(join(SALIDA, 'radar.jpg'))) console.log('AVISO: falta radar.jpg');
