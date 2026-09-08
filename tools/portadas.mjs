/**
 * Portadas de publicaciones y programas.
 *
 * El centro todavía no tiene portadas diseñadas para cada documento, así que
 * se componen aquí con su propio contenido —tipo, número de serie, título,
 * autoría y fecha— sobre el azul noche institucional, con un motivo de datos
 * distinto para cada pieza. Así el listado se lee como una colección
 * editorial y no como una lista de texto.
 *
 * Solo genera las que faltan: cuando existan portadas reales basta con
 * dejarlas en `public/media/portadas/` con el nombre del identificador.
 *
 *   node tools/portadas.mjs           las que falten
 *   node tools/portadas.mjs --todas   rehace todas
 *
 * Traducción de `generate_covers.py`, que ya no puede ejecutarse: el Python
 * del disco D dejó de arrancar.
 */

import sharp from 'sharp';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'public', 'media', 'portadas');

const W = 760;
const H = 1074; // proporción A4

const INK = '#031a24';
const INK2 = '#04313a';
const TEAL = '#008c85';
const TEAL_L = '#4fb3ac';
const ORO = '#d29a28';
const PAPEL = '#f5f3ed';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/* ------------------------------------------------------- frontmatter */

/** Lector mínimo: solo los campos que la portada necesita. */
function frontmatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const bloque = m[1];

  const campo = (nombre) => {
    const r = new RegExp(`^${nombre}:\\s*"?([^"\\n]+?)"?\\s*$`, 'm');
    return bloque.match(r)?.[1]?.trim() ?? '';
  };
  const lista = (nombre) => {
    const r = new RegExp(`^${nombre}:\\s*\\n((?:\\s+-\\s.*\\n?)+)`, 'm');
    const bruto = bloque.match(r)?.[1] ?? '';
    return bruto
      .split('\n')
      .map((l) => l.replace(/^\s*-\s*"?|"?\s*$/g, '').trim())
      .filter(Boolean);
  };

  return {
    title: campo('title'),
    type: campo('type') || campo('kind'),
    serial: campo('serial'),
    date: campo('date'),
    authors: lista('authors'),
    certification: campo('certification'),
    tools: lista('tools'),
  };
}

/* ------------------------------------------------------------ dibujo */

const escapar = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Reparte el título en líneas. Georgia ocupa ~0,47 em por carácter. */
function lineas(texto, tam, ancho, maxLineas = 5) {
  const porLinea = Math.floor(ancho / (tam * 0.47));
  const palabras = texto.split(' ');
  const salida = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (prueba.length > porLinea && actual) {
      salida.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) salida.push(actual);
  if (salida.length > maxLineas) {
    salida.length = maxLineas;
    salida[maxLineas - 1] = `${salida[maxLineas - 1].replace(/[\s,;:.]+$/, '')}…`;
  }
  return salida;
}

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

const semillaDe = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Motivo de datos de la mitad inferior. Uno distinto por documento. */
function motivo(id) {
  const r = azar(semillaDe(id));
  const tipo = Math.floor(r() * 5);
  const y0 = 700;
  const alto = 250;

  if (tipo === 0) {
    // Barras con una destacada en dorado.
    const n = 26;
    const ancho = 14;
    const hueco = 8;
    const x0 = (W - (n * ancho + (n - 1) * hueco)) / 2;
    const pico = 6 + Math.floor(r() * 14);
    return Array.from({ length: n }, (_, i) => {
      const forma = Math.exp(-((i - n / 2) ** 2) / (2 * (n / 5) ** 2));
      const h = 24 + forma * alto * (0.75 + r() * 0.3);
      const x = x0 + i * (ancho + hueco);
      const color = Math.abs(i - pico) < 2 ? ORO : TEAL;
      return `<rect x="${x.toFixed(1)}" y="${(y0 + alto - h).toFixed(1)}" width="${ancho}" height="${h.toFixed(1)}" fill="${color}" fill-opacity="0.85"/>`;
    }).join('\n    ');
  }

  if (tipo === 1) {
    // Abanico de proyección.
    const xq = 300;
    const yq = y0 + alto * 0.5;
    const capas = [1, 0.66, 0.36]
      .map(
        (k, i) =>
          `<path d="M ${xq} ${yq} L ${W - 40} ${(yq - 150 * k).toFixed(1)} L ${W - 40} ${(yq + 150 * k).toFixed(1)} Z" fill="${TEAL}" fill-opacity="${0.16 + i * 0.16}"/>`,
      )
      .join('\n    ');
    return `${capas}
    <path d="M 40 ${(yq + 120).toFixed(1)} L ${xq} ${yq}" stroke="${PAPEL}" stroke-width="3" fill="none"/>
    <path d="M ${xq} ${yq} L ${W - 40} ${(yq - 12).toFixed(1)}" stroke="${ORO}" stroke-width="3" fill="none"/>`;
  }

  if (tipo === 2) {
    // Serie con banda.
    const pts = [];
    let v = 0;
    for (let i = 0; i <= 40; i += 1) {
      v = v * 0.86 + (r() - 0.5) * 2;
      pts.push([40 + (i / 40) * (W - 80), y0 + alto / 2 - v * 26]);
    }
    const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const banda =
      `${pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${(p[1] - 34).toFixed(1)}`).join(' ')} ` +
      `${[...pts].reverse().map((p) => `L ${p[0].toFixed(1)} ${(p[1] + 34).toFixed(1)}`).join(' ')} Z`;
    return `<path d="${banda}" fill="${TEAL}" fill-opacity="0.22"/>
    <path d="${d}" stroke="${ORO}" stroke-width="3" fill="none"/>`;
  }

  if (tipo === 3) {
    // Dispersión con recta de ajuste.
    const puntos = Array.from({ length: 44 }, () => {
      const x = 60 + r() * (W - 120);
      const t = (x - 60) / (W - 120);
      const y = y0 + alto - t * alto * 0.8 - 20 + (r() - 0.5) * 70;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${TEAL_L}" fill-opacity="0.7"/>`;
    }).join('\n    ');
    return `${puntos}
    <path d="M 60 ${(y0 + alto - 20).toFixed(1)} L ${W - 60} ${(y0 + alto * 0.2 - 20).toFixed(1)}" stroke="${ORO}" stroke-width="3"/>`;
  }

  // Anillos concéntricos, el trazo del símbolo.
  return Array.from({ length: 5 }, (_, i) => {
    const rr = 90 + i * 52;
    return `<circle cx="${W - 90}" cy="${y0 + alto - 40}" r="${rr}" fill="none" stroke="${TEAL}" stroke-opacity="${0.34 - i * 0.05}" stroke-width="2.5"/>`;
  }).join('\n    ');
}

function portada(id, d) {
  const fecha = new Date(d.date);
  const pie = Number.isNaN(fecha.getTime())
    ? 'La Paz, Bolivia'
    : `${MESES[fecha.getUTCMonth()]} ${fecha.getUTCFullYear()}  ·  La Paz, Bolivia`;

  const kicker = [d.type, d.serial].filter(Boolean).join(' · ').toUpperCase();
  const tam = d.title.length > 90 ? 34 : d.title.length > 60 ? 39 : 44;
  const filas = lineas(d.title, tam, W - 110);

  const titulo = filas
    .map(
      (l, i) =>
        `<text x="55" y="${152 + i * (tam * 1.28)}" font-family="Georgia, 'Times New Roman', serif" font-size="${tam}" fill="${PAPEL}">${escapar(l)}</text>`,
    )
    .join('\n  ');

  const autoria = d.authors[0] ?? d.certification ?? '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${INK}"/>
      <stop offset="1" stop-color="${INK2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#f)"/>

  <rect x="55" y="62" width="62" height="3" fill="${ORO}"/>
  <text x="55" y="96" font-family="'DM Sans', 'Segoe UI', sans-serif" font-size="14"
        font-weight="700" letter-spacing="2.4" fill="${ORO}">${escapar(kicker)}</text>

  ${titulo}

  <text x="55" y="${168 + filas.length * (tam * 1.28)}" font-family="'DM Sans', 'Segoe UI', sans-serif"
        font-size="15" fill="${PAPEL}" fill-opacity="0.72">${escapar(autoria)}</text>

  <g>
    ${motivo(id)}
  </g>

  <line x1="55" y1="985" x2="${W - 55}" y2="985" stroke="${PAPEL}" stroke-opacity="0.18" stroke-width="1"/>
  <text x="55" y="1014" font-family="'DM Sans', 'Segoe UI', sans-serif" font-size="13"
        fill="${PAPEL}" fill-opacity="0.66">${escapar(pie)}</text>
  <text x="${W - 55}" y="1016" text-anchor="end" font-family="Georgia, serif" font-size="21"
        font-weight="700" letter-spacing="1.5" fill="${PAPEL}">CIDEF</text>
</svg>`;
}

/* ------------------------------------------------------------ banner */

const BW = 1200;
const BH = 675;

/**
 * Banda apaisada para las tarjetas de formación: el motivo de datos ocupa la
 * derecha y a la izquierda quedan las herramientas del programa, en columna.
 * Misma tipografía que el sitio, no la serif de las portadas: aquí el texto
 * es rótulo, no título.
 */
function banner(id, d, opciones = {}) {
  const { texto = true, ancho = BW, alto = BH } = opciones;
  const r = azar(semillaDe(`${id}-banda`));
  const palabras = (d.tools.length ? d.tools : [d.type]).slice(0, 4);
  const esc = ancho / BW;

  const rejilla = Array.from({ length: 9 }, (_, i) => {
    const x = (BW / 10) * (i + 1);
    return `<line x1="${x.toFixed(0)}" y1="0" x2="${x.toFixed(0)}" y2="${BH}" stroke="${PAPEL}" stroke-opacity="0.04" stroke-width="1"/>`;
  }).join('\n    ');

  /* Serie con banda de incertidumbre, ocupando la mitad derecha. */
  const pts = [];
  let v = 0;
  for (let i = 0; i <= 46; i += 1) {
    v = v * 0.87 + (r() - 0.5) * 2;
    pts.push([BW * 0.34 + (i / 46) * BW * 0.62, BH * 0.55 - v * 30]);
  }
  const linea = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area =
    `${pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${(p[1] - 46).toFixed(1)}`).join(' ')} ` +
    `${[...pts].reverse().map((p) => `L ${p[0].toFixed(1)} ${(p[1] + 46).toFixed(1)}`).join(' ')} Z`;

  const barras = Array.from({ length: 22 }, (_, i) => {
    const h = 20 + r() * 120;
    const x = BW * 0.36 + i * 34;
    return `<rect x="${x.toFixed(1)}" y="${(BH - 60 - h).toFixed(1)}" width="12" height="${h.toFixed(1)}" fill="${TEAL}" fill-opacity="0.28"/>`;
  }).join('\n    ');

  const columna = palabras
    .map(
      (p, i) =>
        `<text x="62" y="${232 + i * 46}" font-family="'DM Sans', 'Segoe UI', sans-serif" font-size="17"
        font-weight="700" letter-spacing="3.2" fill="${PAPEL}" fill-opacity="0.82">${escapar(p.toUpperCase())}</text>`,
    )
    .join('\n  ');

  /* Sin texto y a mayor tamaño, la misma banda sirve de fondo a sangre en la
     ficha del programa: ahí el título lo pone la página y las palabras
     sobrarían. */
  const rotulos = texto
    ? `<rect x="62" y="150" width="58" height="3" fill="${ORO}"/>
  <text x="62" y="192" font-family="'DM Sans', 'Segoe UI', sans-serif" font-size="15"
        font-weight="700" letter-spacing="2.6" fill="${ORO}">${escapar((d.type || '').toUpperCase())}</text>
  ${columna}`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${BW} ${BH}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INK}"/>
      <stop offset="1" stop-color="${INK2}"/>
    </linearGradient>
  </defs>
  <rect width="${BW}" height="${BH}" fill="url(#b)"/>
  <g>${rejilla}</g>
  ${barras}
  <path d="${area}" fill="${TEAL}" fill-opacity="0.2"/>
  <path d="${linea}" fill="none" stroke="${ORO}" stroke-width="${(3.5 / esc).toFixed(1)}" stroke-linecap="round"/>

  ${rotulos}
</svg>`;
}

/* -------------------------------------------------------------- main */

const todas = process.argv.includes('--todas');
await mkdir(SALIDA, { recursive: true });

const carpetas = [
  join(RAIZ, 'src', 'content', 'publicaciones'),
  join(RAIZ, 'src', 'content', 'formacion'),
];

let hechas = 0;
for (const carpeta of carpetas) {
  const esFormacion = carpeta.endsWith('formacion');

  for (const f of await readdir(carpeta).catch(() => [])) {
    if (!f.endsWith('.md')) continue;
    const id = basename(f, extname(f));
    const faltaPortada = todas || !existsSync(join(SALIDA, `${id}.jpg`));
    const faltaBanda = esFormacion && (todas || !existsSync(join(SALIDA, `${id}-banda.jpg`)));
    if (!faltaPortada && !faltaBanda) continue;

    const d = frontmatter(await readFile(join(carpeta, f), 'utf8'));
    if (!d || !d.title) {
      console.log(`  sin frontmatter legible · ${id}`);
      continue;
    }

    if (faltaPortada) {
      const svg = Buffer.from(portada(id, d));
      await sharp(svg).jpeg({ quality: 88, mozjpeg: true }).toFile(join(SALIDA, `${id}.jpg`));
      await sharp(svg).webp({ quality: 86, effort: 6 }).toFile(join(SALIDA, `${id}.webp`));
    }

    if (faltaBanda) {
      const svg = Buffer.from(banner(id, d));
      await sharp(svg).jpeg({ quality: 88, mozjpeg: true }).toFile(join(SALIDA, `${id}-banda.jpg`));
      await sharp(svg).webp({ quality: 86, effort: 6 }).toFile(join(SALIDA, `${id}-banda.webp`));

      // Y la misma banda sin rótulos, grande, para hacer de fondo a sangre en
      // la ficha del programa.
      const fondo = Buffer.from(banner(id, d, { texto: false, ancho: 2400, alto: 1350 }));
      await sharp(fondo).jpeg({ quality: 90, mozjpeg: true }).toFile(join(SALIDA, `${id}-fondo.jpg`));
      await sharp(fondo).webp({ quality: 88, effort: 6 }).toFile(join(SALIDA, `${id}-fondo.webp`));
      await sharp(fondo).avif({ quality: 68, effort: 6 }).toFile(join(SALIDA, `${id}-fondo.avif`));
    }

    hechas += 1;
    console.log(
      `  ok · ${id}  (${d.type})` +
        `${faltaPortada ? ' portada' : ''}${faltaBanda ? ' banda' : ''}`,
    );
  }
}

console.log(`\n${hechas} portadas generadas`);
