/**
 * Capturas de revisión visual.
 *
 * Requiere el servidor de vista previa corriendo:
 *   node .tools/node-v24.20.0-win-x64/node.exe node_modules/astro/astro.js preview --port 4321
 *
 * Uso:
 *   node tools/shot.mjs                     todas las páginas
 *   node tools/shot.mjs portada             solo la portada
 *   node tools/shot.mjs portada --ancho 1900 --alto 940
 *
 * Va en Node y no en Python porque el intérprete del disco D dejó de poder
 * arrancar el motor de Playwright.
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, '.preview');
const BASE = 'http://localhost:4321';

const PAGINAS = {
  portada: '/',
  radar: '/radar',
  indicador: '/radar/nowcast-pib',
  analisis: '/analisis',
  publicacion: '/analisis/wp-001-usdt-incertidumbre',
  archivo: '/archivo',
  formacion: '/formacion',
  programa: '/formacion/diplomado-modelacion-econometrica',
  agenda: '/agenda',
  nosotros: '/nosotros',
};

const args = process.argv.slice(2);
const opt = (nombre, def) => {
  const i = args.indexOf(`--${nombre}`);
  return i === -1 ? def : Number(args[i + 1]);
};
const pedidas = args.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));

const ancho = opt('ancho', 1600);
const alto = opt('alto', 1000);
const completa = args.includes('--completa');

const objetivo = pedidas.length
  ? Object.fromEntries(pedidas.map((n) => [n, PAGINAS[n] ?? `/${n}`]))
  : PAGINAS;

await mkdir(SALIDA, { recursive: true });
const navegador = await chromium.launch();
const ctx = await navegador.newContext({
  viewport: { width: ancho, height: alto },
  locale: 'es-BO',
  // Sin esto los bloques que aparecen al bajar salen en opacidad cero.
  reducedMotion: 'reduce',
});
const pagina = await ctx.newPage();

for (const [nombre, ruta] of Object.entries(objetivo)) {
  await pagina.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(700);
  await pagina.screenshot({
    path: join(SALIDA, `${nombre}.png`),
    fullPage: completa,
  });
  console.log(`  ${nombre.padEnd(14)} ${ruta}`);
}

await navegador.close();
