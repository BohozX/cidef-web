/**
 * Portada: fotografía nocturna de La Paz con el Illimani.
 *
 * Hace tres cosas sobre el original y exporta las variantes que consume el
 * sitio:
 *
 *  1. Prolonga el cielo hacia arriba. La foto es 16:9 y la portada es mucho
 *     más apaisada, así que al recortar a lo ancho se comía la cumbre. En vez
 *     de bajar la imagen —que dejaba el Illimani detrás de la cabecera— se
 *     añade cielo, con el color exacto de la primera fila arriba del todo y
 *     un punto más profundo según sube, que es como se comporta el cielo a
 *     esa hora.
 *  2. Amplía a 2400 px con Lanczos. No inventa detalle —eso no lo hace ningún
 *     remuestreo—, pero evita que amplíe el navegador, que lo hace peor.
 *  3. Exporta AVIF, WebP y JPEG en cuatro anchos, con calidad alta: es una
 *     fotografía nocturna y cualquier compresión agresiva se ve enseguida.
 *
 * Va en Node y no en `prepare_assets.py` porque Pillow, instalado en el disco
 * D, revienta al recortar (STATUS_IN_PAGE_ERROR).
 *
 *   node tools/hero.mjs
 */

import sharp from 'sharp';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUENTE = join(RAIZ, '.design', 'lapaz-illimani-fuente.png');
const MEDIA = join(RAIZ, 'public', 'media');
const NOMBRE = 'lapaz-illimani';

/** Cuánto cielo se añade, en proporción a la altura original. */
const CIELO = 0.15;
/** Ancho de trabajo. Cubre pantallas de escritorio con escalado del 125 %. */
const TRABAJO = 2400;
const ANCHOS = [2400, 1800, 1200, 800];

/** Color medio de las primeras filas: de ahí arranca el cielo añadido. */
async function colorSuperior(img, ancho) {
  const { data } = await img
    .clone()
    .extract({ left: 0, top: 0, width: ancho, height: 3 })
    .resize(1, 1, { kernel: 'cubic' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

/** El mismo color, un 22 % más profundo: el techo del cielo. */
function masProfundo({ r, g, b }, f = 0.78) {
  return {
    r: Math.round(r * f),
    g: Math.round(g * f),
    b: Math.round(b * f * 1.04), // el azul aguanta mejor que el resto
  };
}

async function main() {
  await mkdir(MEDIA, { recursive: true });

  const original = sharp(FUENTE);
  const meta = await original.metadata();
  console.log(`  original: ${meta.width}x${meta.height}`);

  const extra = Math.round(meta.height * CIELO);
  const base = await colorSuperior(original, meta.width);
  const techo = masProfundo(base);
  const rgb = (c) => `rgb(${c.r},${c.g},${c.b})`;

  /* Franja de cielo: degradado vertical del techo al color de la fila cero,
     con un grano finísimo encima para que no se vea a bandas. */
  const franja = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${extra}">
       <defs>
         <linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="${rgb(techo)}"/>
           <stop offset="1" stop-color="${rgb(base)}"/>
         </linearGradient>
         <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/>
           <feColorMatrix type="saturate" values="0"/>
         </filter>
       </defs>
       <rect width="100%" height="100%" fill="url(#c)"/>
       <rect width="100%" height="100%" filter="url(#g)" opacity="0.035"/>
     </svg>`,
  );

  const conCielo = await original
    .clone()
    .extend({ top: extra, background: rgb(base) })
    .composite([{ input: franja, top: 0, left: 0 }])
    .toBuffer();

  const alto = Math.round(((meta.height + extra) * TRABAJO) / meta.width);
  const trabajo = await sharp(conCielo)
    .resize(TRABAJO, alto, { kernel: 'lanczos3' })
    // Un enfoque leve devuelve el filo que se pierde al ampliar. Sin halos:
    // radio corto y umbral alto, que en una noche el ruido no se toque.
    .sharpen({ sigma: 0.7, m1: 0.4, m2: 0.9, x1: 3, y2: 12 })
    .toBuffer();

  console.log(`  trabajo:  ${TRABAJO}x${alto} (cielo añadido: ${extra} px)`);

  /* Fuera las variantes anteriores: los anchos cambian y no deben quedar
     archivos huérfanos que el srcset ya no nombra. */
  for (const f of await readdir(MEDIA)) {
    if (f.startsWith(NOMBRE)) await unlink(join(MEDIA, f));
  }

  for (const ancho of ANCHOS) {
    const sufijo = ancho === ANCHOS[0] ? '' : `-${ancho}`;
    const img = sharp(trabajo).resize(ancho, null, { kernel: 'lanczos3' });
    await img.clone().avif({ quality: 68, effort: 6 }).toFile(join(MEDIA, `${NOMBRE}${sufijo}.avif`));
    await img.clone().webp({ quality: 88, effort: 6 }).toFile(join(MEDIA, `${NOMBRE}${sufijo}.webp`));
    await img.clone().jpeg({ quality: 92, mozjpeg: true, progressive: true }).toFile(join(MEDIA, `${NOMBRE}${sufijo}.jpg`));
  }

  for (const f of (await readdir(MEDIA)).filter((f) => f.startsWith(NOMBRE)).sort()) {
    const { size } = await stat(join(MEDIA, f));
    console.log(`  ${f.padEnd(28)} ${(size / 1024).toFixed(0).padStart(5)} KB`);
  }

  const finales = await sharp(join(MEDIA, `${NOMBRE}.jpg`)).metadata();
  console.log(`\n  medidas para site.config: ${finales.width}x${finales.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
