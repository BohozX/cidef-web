/**
 * Imágenes de sector.
 *
 * Cada tarjeta del mapa de la base lleva una imagen. Este script las produce
 * igual que `covers.mjs` produce las portadas de sección, con dos fuentes y
 * una regla de precedencia distinta:
 *
 *   1. Una fotografía en `.design/sectores/<id>.(jpg|png|webp|avif)` manda
 *      siempre. Es la imagen definitiva de ese sector.
 *   2. Si no la hay, se dibuja una aquí: el fondo petróleo de la casa, el
 *      icono del sector en marca de agua y una serie trazada en su color.
 *      Es un suplente reconocible, no un cuadro gris de «falta imagen».
 *
 * Así se pueden ir sustituyendo de una en una: se deja la foto, se vuelve a
 * correr y solo cambia ese sector.
 *
 * Uso:
 *   node tools/sectores.mjs                 todos
 *   node tools/sectores.mjs cambiario       solo uno
 *
 * Formato de las fotografías: 3:2 y cuanto más grandes, mejor. 2400 × 1600
 * es el techo útil —la cabecera de un sector se ve a sangre— y 1800 × 1200
 * basta. Lo que no se hace nunca es estirar: de un original pequeño salen
 * menos medidas, no las mismas más borrosas.
 */

import sharp from 'sharp';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUENTES = join(RAIZ, '.design', 'sectores');
const SALIDA = join(RAIZ, 'public', 'media', 'sectores');
/* Qué medidas acabó teniendo cada imagen. El sitio lo lee para escribir un
   `srcset` que no miente: si de un original solo salieron tres medidas, el
   navegador no debe creer que hay una cuarta más grande. */
const MANIFIESTO = join(RAIZ, 'src', 'data', 'sectores-imagenes.json');

/* La proporción manda; el tamaño lo pone cada original. El recorte a 3:2 se
   hace aquí, pero de ahí hacia arriba no se inventa un solo píxel. */
const PROPORCION = 3 / 2;
const TECHO = 2400;
const ESCALONES = [400, 800, 1200, 1800, 2400];

const INK = '#02141c';

/**
 * Los sectores con su color y su icono.
 *
 * El color es el mismo que `global.css` asigna a la serie de ese sector y el
 * icono es el mismo trazo que lleva su pestaña en el Atlas: la imagen no
 * introduce un código nuevo, amplía el que ya existe.
 */
const SECTORES = [
  {
    id: 'actividad',
    color: '#00907f',
    icono: `<path d="M3 20.5V9.6l5 3.4V9.6l5 3.4V4.6h3.2V13H21v7.5z"/>
            <path d="M7.4 17.4h1.4M12.4 17.4h1.4M17.2 17.4h1.4"/>`,
  },
  {
    id: 'precios',
    color: '#c0562a',
    icono: `<path d="M3.6 10.6 10.6 3.6a2 2 0 0 1 1.5-.6l5.3.4a2 2 0 0 1 1.8 1.8l.4 5.3a2 2 0 0 1-.6 1.5l-7 7a2 2 0 0 1-2.8 0l-5.6-5.6a2 2 0 0 1 0-2.8Z"/>
            <circle cx="15.5" cy="8.5" r="1.5"/>`,
  },
  {
    id: 'monetario',
    color: '#3560ad',
    icono: `<rect x="2.5" y="6" width="19" height="12" rx="2"/>
            <circle cx="12" cy="12" r="2.7"/>
            <path d="M6 9.6v4.8M18 9.6v4.8"/>`,
  },
  {
    id: 'cambiario',
    color: '#b13a44',
    icono: `<path d="M3.5 8.8h13.8M13.9 5.4l3.4 3.4-3.4 3.4"/>
            <path d="M20.5 15.2H6.7m3.4-3.4-3.4 3.4 3.4 3.4"/>`,
  },
  {
    id: 'externo',
    color: '#0b7fa5',
    icono: `<path d="M2.6 16.9h18.8l-2.3 4.1H4.9z"/>
            <path d="M5.6 16.9V11.6h12.8v5.3"/>
            <path d="M10.2 11.6V7.8h3.9v3.8"/>`,
  },
  {
    id: 'fiscal',
    color: '#6b8a2b',
    icono: `<path d="M3 9.6 12 4.2l9 5.4"/>
            <path d="M5.6 9.9v7.2M9.9 9.9v7.2M14.1 9.9v7.2M18.4 9.9v7.2"/>
            <path d="M4 17.4h16M2.8 20.6h18.4"/>`,
  },
  {
    id: 'laboral',
    color: '#9c3f86',
    icono: `<circle cx="9.2" cy="8.2" r="3.3"/>
            <path d="M3 20.4c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6"/>
            <path d="M16.4 5.4a3.3 3.3 0 0 1 0 5.9"/>
            <path d="M17.6 15.2c2.1.7 3.4 2.6 3.4 5.2"/>`,
  },
  {
    id: 'internacional',
    color: '#6a5fc0',
    icono: `<circle cx="12" cy="12" r="9"/>
            <path d="M3.2 12h17.6"/>
            <path d="M12 3a13.5 13.5 0 0 1 0 18 13.5 13.5 0 0 1 0-18Z"/>`,
  },
  {
    id: 'centro',
    color: '#d29a28',
    icono: `<circle cx="10.6" cy="10.6" r="6.7"/>
            <path d="M15.5 15.5 21 21"/>
            <path d="M7.4 12.1 9.6 9.6l1.9 1.6 2.4-3.2"/>`,
  },
];

/* ------------------------------------------------------------------ dibujo */

/** Ruido reproducible: la misma imagen en cada corrida. */
function azar(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Semilla estable a partir del nombre del sector. */
function semillaDe(id) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Curva suave que atraviesa la imagen: una serie, no una decoración. */
function serie(id) {
  const r = azar(semillaDe(id));
  const n = 34;
  const izq = -60;
  const der = ANCHO + 60;
  const base = ALTO * 0.72;
  const amplitud = ALTO * 0.19;

  let nivel = 0;
  const puntos = [];
  for (let i = 0; i < n; i++) {
    /* Paseo con tendencia leve hacia arriba: una serie plana no dice nada y
       una que se dispara tampoco. */
    nivel = nivel * 0.72 + (r() - 0.44) * 0.9;
    const x = izq + ((der - izq) * i) / (n - 1);
    const y = base - amplitud * nivel - (ALTO * 0.1 * i) / (n - 1);
    puntos.push([x, y]);
  }

  /* Catmull-Rom a Bézier: la curva pasa por cada observación en vez de
     aproximarla, que es como se traza una serie de verdad. */
  let d = `M ${puntos[0][0].toFixed(1)} ${puntos[0][1].toFixed(1)}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[Math.max(0, i - 1)];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[Math.min(puntos.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return { linea: d, area: `${d} L ${der} ${ALTO + 40} L ${izq} ${ALTO + 40} Z` };
}

/** Retícula de puntos: la textura del sitio, muy tenue. */
function reticula() {
  const paso = 46;
  const puntos = [];
  for (let y = paso; y < ALTO; y += paso) {
    for (let x = paso; x < ANCHO; x += paso) {
      puntos.push(`<circle cx="${x}" cy="${y}" r="1.6"/>`);
    }
  }
  return `<g fill="#ffffff" opacity="0.045">${puntos.join('')}</g>`;
}

const ANCHO = 1800;
const ALTO = 1200;

function dibujar({ id, color, icono }) {
  const { linea, area } = serie(id);
  /* El icono llega en una caja de 24 y se lleva a 760 px en el tercio
     derecho: grande para que se lea de un vistazo, tenue para que no compita
     con el nombre del sector que va encima en la tarjeta. */
  const lado = 760;
  const escala = lado / 24;
  const x = ANCHO * 0.62;
  const y = (ALTO - lado) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INK}"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0.42"/>
    </linearGradient>
    <linearGradient id="bajo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity="0.38"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="foco" cx="0.24" cy="0.3" r="0.8">
      <stop offset="0" stop-color="${color}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${ANCHO}" height="${ALTO}" fill="url(#fondo)"/>
  <rect width="${ANCHO}" height="${ALTO}" fill="url(#foco)"/>
  ${reticula()}

  <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${escala.toFixed(3)})"
     fill="none" stroke="#ffffff" stroke-opacity="0.13"
     stroke-width="${(1.5 / escala) * 24}" stroke-linecap="round" stroke-linejoin="round">
    ${icono}
  </g>

  <path d="${area}" fill="url(#bajo)"/>
  <path d="${linea}" fill="none" stroke="${color}" stroke-width="7"
        stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
</svg>`;
}

/* --------------------------------------------------------------- exportar */

/** El mayor 3:2 que cabe dentro del original, sin estirarlo. */
function encaje(m) {
  const ancho = m.width >= m.height * PROPORCION ? Math.round(m.height * PROPORCION) : m.width;
  const cabe = Math.min(ancho, TECHO);
  return { ancho: cabe, alto: Math.round(cabe / PROPORCION) };
}

async function exportar(id, entrada, origen) {
  const medida = encaje(await sharp(entrada).metadata());

  /* `attention` recorta por donde hay más información y no por el centro:
     en una foto apaisada, el centro geométrico suele caer en el fondo. */
  const trabajo = await sharp(entrada)
    .resize(medida.ancho, medida.alto, { fit: 'cover', position: 'attention', kernel: 'lanczos3' })
    .toBuffer();

  for (const f of await readdir(SALIDA).catch(() => [])) {
    if (f.startsWith(`${id}-`) || f.startsWith(`${id}.`)) await unlink(join(SALIDA, f));
  }

  /* Los escalones que de verdad caben, y el propio original como el mayor.
     Antes se generaban siempre cuatro y el mayor era un 1800 inventado a
     partir de 1536: en la cabecera, que va a sangre, esa medida es la que
     pide el navegador y era justo la peor de las cuatro. */
  const anchos = [...new Set([...ESCALONES.filter((w) => w < medida.ancho), medida.ancho])];
  const mayor = anchos[anchos.length - 1];

  for (const ancho of anchos) {
    const sufijo = ancho === mayor ? '' : `-${ancho}`;
    let img = sharp(trabajo).resize(ancho, null, { kernel: 'lanczos3' });
    /* Dos enfoques distintos para dos problemas distintos. Al reducir se
       pierde acutancia y hay que devolverla: radio corto y mano firme. En la
       medida mayor el original puede venir reescalado desde otro más pequeño
       —es el caso de estas nueve— y entonces lo que falta no es contraste de
       borde sino borde: radio más largo, umbral alto para no levantar el
       grano del cielo, y tope suave para no abrir halos. Medido sobre cinco
       sectores, esta combinación es la que más acutancia recupera de las
       cuatro que probé. */
    img = ancho !== mayor
      ? img.sharpen({ sigma: 0.7, m1: 0.4, m2: 0.9, x1: 3, y2: 12 })
      : img.sharpen({ sigma: 1.0, m1: 0.25, m2: 1.6, x1: 2.5, y2: 14 });
    await img.clone().avif({ quality: 72, effort: 6 }).toFile(join(SALIDA, `${id}${sufijo}.avif`));
    await img.clone().webp({ quality: 92, effort: 6 }).toFile(join(SALIDA, `${id}${sufijo}.webp`));
    await img.clone().jpeg({ quality: 94, mozjpeg: true, progressive: true }).toFile(join(SALIDA, `${id}${sufijo}.jpg`));
  }

  const suyos = (await readdir(SALIDA)).filter((f) => f.startsWith(`${id}.`) || f.startsWith(`${id}-`));
  let total = 0;
  for (const f of suyos) total += (await stat(join(SALIDA, f))).size;
  console.log(
    `  ${id.padEnd(15)} ${origen.padEnd(11)} ${String(medida.ancho).padStart(4)}x${medida.alto}` +
      ` · ${anchos.length} medidas · ${(total / 1024).toFixed(0)} KB`,
  );

  return { ancho: medida.ancho, alto: medida.alto, anchos };
}

/* ------------------------------------------------------------------- main */

const EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

const pedidos = process.argv.slice(2);
await mkdir(SALIDA, { recursive: true });
await mkdir(FUENTES, { recursive: true });

const fotos = new Map();
for (const f of await readdir(FUENTES).catch(() => [])) {
  const id = f.slice(0, f.length - extname(f).length);
  if (EXT.includes(extname(f).toLowerCase())) fotos.set(id, join(FUENTES, f));
}

const lista = pedidos.length ? SECTORES.filter((s) => pedidos.includes(s.id)) : SECTORES;
if (lista.length === 0) {
  console.log(`  ningún sector con ese nombre. Hay: ${SECTORES.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

console.log(`\n  sectores → ${SALIDA}\n`);

const medidas = JSON.parse(await readFile(MANIFIESTO, 'utf8').catch(() => '{}'));
for (const s of lista) {
  const foto = fotos.get(s.id);
  medidas[s.id] = await exportar(
    s.id,
    foto ?? Buffer.from(dibujar(s)),
    foto ? 'fotografía' : 'dibujada',
  );
}

/* Ordenado por sector para que el diff se lea. */
const ordenado = Object.fromEntries(SECTORES.map((s) => [s.id, medidas[s.id]]).filter(([, v]) => v));
await writeFile(MANIFIESTO, `${JSON.stringify(ordenado, null, 2)}\n`, 'utf8');

const sinFoto = lista.filter((s) => !fotos.has(s.id)).map((s) => s.id);
if (sinFoto.length > 0) {
  console.log(
    `\n  ${sinFoto.length} dibujadas. Para sustituirlas, deja la fotografía en` +
      `\n  .design/sectores/<id>.jpg a 1800x1200 y vuelve a correr este script.` +
      `\n  Faltan: ${sinFoto.join(', ')}\n`,
  );
}
