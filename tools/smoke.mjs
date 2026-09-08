/**
 * Prueba de humo de las interacciones del sitio.
 *
 * Requiere el servidor de vista previa corriendo:
 *   node node_modules/astro/astro.js preview --port 4321
 *
 * Uso:
 *   node tools/smoke.mjs
 *
 * Traducción de `smoke_test.py`, que dejó de poder ejecutarse: el intérprete
 * de Python vive en el disco D y su Playwright ya no arranca.
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';
const resultados = [];

const check = (ok, etiqueta) => {
  resultados.push([ok, etiqueta]);
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta}`);
};

const navegador = await chromium.launch();
const ctx = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'es-BO',
});
const pagina = await ctx.newPage();

let errores = [];
pagina.on('pageerror', (e) => errores.push(String(e)));
pagina.on('console', (m) => {
  if (m.type() === 'error') errores.push(m.text());
});

const ir = (ruta) => pagina.goto(BASE + ruta, { waitUntil: 'networkidle' });
const esperar = (ms) => pagina.waitForTimeout(ms);

/* --- portada ---------------------------------------------------------- */
console.log('Portada');
await ir('/');
check((await pagina.locator('.ind-card').count()) === 6, 'seis indicadores en el Radar de portada');
check((await pagina.locator('header img').count()) === 1, 'logo presente en el header');
check(
  (await pagina.locator('.hero-img').getAttribute('src')).endsWith('.jpg'),
  'fotografía de portada cargada',
);
check(
  (await pagina.locator('.hero-veil').count()) === 1 &&
    (await pagina.locator('.hero-vignette, .hero-grain, .hero-glow').count()) === 0,
  'la fotografía va sin capas de filtro encima',
);

/* --- buscador global --------------------------------------------------- */
console.log('Buscador global');
// La portada entra con animación: si se pulsa antes de que asiente, el clic
// se queda esperando a que el elemento deje de moverse.
await esperar(700);
await pagina.click('[data-search-toggle]');
await esperar(300);
await pagina.fill('#q', 'usdt');
await esperar(250);
const hits = await pagina.locator('[data-search-results] li').count();
check(hits > 0, `buscador devuelve resultados (${hits})`);
await pagina.keyboard.press('Escape');
await esperar(250);
check(
  (await pagina.getAttribute('[data-search-panel]', 'data-open')) === 'false',
  'Escape cierra el buscador',
);

/* --- publicaciones: viñetas, búsqueda y portadas ------------------------ */
console.log('Publicaciones');
await ir('/publicaciones');
const total = await pagina.locator('.pub-item').count();
check(total === 9, `las nueve familias tienen documento (${total})`);
check(
  (await pagina.locator('.pub-familia').count()) === 10,
  'una viñeta por familia, más la de todas',
);

await pagina.click('[data-familia="Working Paper"]');
await esperar(250);
const visibles = await pagina.locator('.pub-item:not([hidden])').count();
check(visibles > 0 && visibles < total, `la viñeta filtra el listado (${total} → ${visibles})`);

await pagina.click('[data-familia=""]');
await pagina.fill('[data-pub-query]', 'informalidad');
await esperar(250);
check(
  (await pagina.locator('.pub-item:not([hidden])').count()) >= 1,
  'la búsqueda encuentra el policy brief',
);

await pagina.fill('[data-pub-query]', '');
await esperar(200);
await pagina.locator('.pub-item').last().scrollIntoViewIfNeeded();
await esperar(900);
check(
  await pagina.$$eval('.pub-portada img', (imgs) => imgs.every((i) => i.naturalWidth > 0)),
  'todas las portadas cargan',
);

/* --- formación: clases de programa -------------------------------------- */
console.log('Formación');
await ir('/formacion');
const programas = await pagina.locator('.form-item').count();
check(programas === 6, `la oferta tiene seis programas (${programas})`);
check(
  (await pagina.locator('.form-clase').count()) === 5,
  'una viñeta por clase de programa, más la de todas',
);

await pagina.locator('.form-item').last().scrollIntoViewIfNeeded();
await esperar(1200);
check(
  await pagina.$$eval('.program-banda img', (imgs) => imgs.every((i) => i.naturalWidth > 0)),
  'todas las bandas de los programas cargan',
);

await pagina.click('[data-clase="Taller"]');
await esperar(300);
check(
  (await pagina.locator('.form-item:not([hidden])').count()) === 1,
  'la viñeta filtra la oferta',
);

/* --- ficha rotativa ----------------------------------------------------- */
console.log('Ficha rotativa');
await ir('/');
await pagina.locator("section[aria-labelledby='analisis-title']").scrollIntoViewIfNeeded();
await esperar(600);
check(
  (await pagina.getAttribute("section[aria-labelledby='analisis-title'] .sec-link", 'href')) ===
    '/publicaciones',
  'el título de sección es el enlace',
);
const antes = await pagina.innerText('.rot-slide.is-active .rot-title');
await esperar(9500);
const despues = await pagina.innerText('.rot-slide.is-active .rot-title');
check(antes !== despues, 'la ficha cambia sola a los ocho segundos');

/* --- agenda y equipo de la portada -------------------------------------- */
// El dorado del calendario depende de la clase de superficie de la página, y
// eso, dentro de un componente, Astro lo rompe si no se marca como global.
console.log('Agenda y equipo');
await pagina.locator("section[aria-labelledby='agenda-title']").scrollIntoViewIfNeeded();
await esperar(400);
check(
  (await pagina.$eval('.cal', (el) => getComputedStyle(el).borderTopColor)) === 'rgb(210, 154, 40)',
  'el calendario se remata en dorado',
);

await pagina.locator("section[aria-labelledby='nosotros-title']").scrollIntoViewIfNeeded();
await esperar(400);
const desplazado = await pagina.$eval('[data-team-track]', (el) => el.scrollLeft);
await pagina.click('[data-team-next]');
await esperar(800);
check(
  (await pagina.$eval('[data-team-track]', (el) => el.scrollLeft)) > desplazado,
  'las zonas laterales mueven el estante del equipo',
);

/* --- radar: el tablero --------------------------------------------------- */
console.log('Radar Económico');
await ir('/radar');
check((await pagina.locator('.radar-tira li').count()) === 6, 'seis atajos en la cabecera');
check(
  (await pagina.innerText('.radar-tira li')).includes('2026'),
  'cada atajo declara su período de referencia',
);

await pagina.locator('#panorama').scrollIntoViewIfNeeded();
await esperar(600);
check(
  (await pagina.locator('[data-panel="panorama"] .panel-ind').count()) === 10,
  'diez piezas en el tablero del panorama',
);
check(
  (await pagina.locator('.tab-sector').count()) === 11,
  'el panorama y los diez sectores tienen su pestaña',
);

await pagina.click('[data-tablero="precios"]');
await esperar(300);
check(
  (await pagina.$eval('[data-panel="panorama"]', (e) => e.hidden)) &&
    (await pagina.locator('[data-panel="precios"] .panel-ind').count()) === 3,
  'cambiar de sector intercambia el tablero',
);
check(
  (await pagina.locator('[data-panel="precios"] .panel-dona').count()) === 1,
  'el sector cierra con su composición en dona',
);
// El tablero de un sector es un rectángulo: dos filas, y la segunda la
// cierran las dos medianas más la dona.
const anchos = await pagina.$$eval('[data-panel="precios"] .tablero > *', (els) => {
  const filas = {};
  els.forEach((e) => {
    const r = e.getBoundingClientRect();
    filas[Math.round(r.top)] = (filas[Math.round(r.top)] || 0) + Math.round(r.width);
  });
  return Object.values(filas);
});
check(anchos.length === 2, `el tablero del sector cierra en dos filas (${anchos.length})`);
check(
  (await pagina.$$eval('.panel-ind svg path, .panel-ind svg rect', (e) => e.length)) > 20,
  'los gráficos del tablero se dibujan en el servidor',
);
check(
  (await pagina.locator('.pi-sello').first().innerText()).length > 0,
  'cada pieza declara si el dato es oficial o del centro',
);

check((await pagina.locator('.sellos li').count()) === 3, 'el Radar explica los tres sellos del dato');
check(
  (await pagina.locator('.mapa-card').count()) === 0,
  'el mapa de sectores no está en la parte gratuita',
);
check(
  (await pagina.getAttribute('.radar-mas a', 'href')) === '/base',
  'el botón «ver más datos» lleva a la base profesional',
);

await ir('/radar#sector-fiscal');
await esperar(500);
check(
  await pagina.locator('[data-panel="fiscal"]').isVisible(),
  'el enlace directo a un sector abre su tablero',
);
check(
  (await pagina.locator('[data-panel="fiscal"] .panel-dona .pd-arco').count()) > 0,
  'la dona del sector se dibuja por arcos animados',
);

/* --- base profesional ----------------------------------------------------
   Es donde empieza la capa premium: el mapa lleva al catálogo, el catálogo
   trae todas las series por sector y el filtrado ocurre en el navegador. */
console.log('Base de Datos Profesional');
await ir('/base');
check((await pagina.locator('.acceso-marca').count()) === 1, 'la página declara que es acceso profesional');
check((await pagina.locator('.mapa-card').count()) === 10, 'el mapa presenta los diez sectores');
check(
  (await pagina.getAttribute('.mapa-card', 'href')) === '#seccion-actividad',
  'cada tarjeta del mapa lleva a su bloque del catálogo',
);
const enCatalogo = await pagina.locator('[data-serie]').count();
check(enCatalogo === 35, `el catálogo lista las ${enCatalogo} series`);
check(
  (await pagina.locator('[data-grupo]').count()) === 10,
  'el catálogo agrupa las series por sector',
);

await pagina.fill('[data-cat-buscar]', 'pobreza');
await esperar(400);
check(
  (await pagina.$$eval('[data-serie]', (n) => n.filter((e) => !e.hidden).length)) === 2 &&
    (await pagina.$$eval('[data-grupo]', (n) => n.filter((e) => !e.hidden).length)) === 1,
  'la búsqueda filtra las series y oculta los sectores vacíos',
);
await pagina.fill('[data-cat-buscar]', '');
await pagina.selectOption('[data-cat-tipo]', 'proyeccion');
await esperar(400);
check(
  (await pagina.$$eval('[data-serie]', (n) => n.filter((e) => !e.hidden).length)) === 2,
  'el filtro por tipo de dato deja solo las proyecciones',
);

/* --- ficha de indicador: gráfico ---------------------------------------- */
console.log('Ficha de indicador');
await ir('/radar/nowcast-pib');
await pagina.waitForSelector('[data-chart] canvas', { timeout: 15000 });
check(true, 'ECharts dibuja el gráfico');
await pagina.click('[data-range="1"]');
await esperar(400);
check(
  (await pagina.getAttribute('[data-range="1"]', 'aria-pressed')) === 'true',
  'selector de rango responde',
);
check(
  (await pagina.locator('table').count()) === 1 && (await pagina.locator('tbody tr').count()) === 3,
  'historial de versiones (vintages) presente',
);

/* --- ficha de un documento ---------------------------------------------- */
console.log('Ficha del documento');
await ir('/publicaciones/wp-001-usdt-incertidumbre');
check(
  await pagina.$eval('.doc-portada img', (i) => i.naturalWidth > 0),
  'la portada del documento carga',
);
check(
  (await pagina.locator('.doc-datos dt').count()) >= 3 &&
    (await pagina.locator('.doc-descargas a').count()) >= 1,
  'la ficha muestra sus datos y su descarga',
);
check(
  (await pagina.locator('.rel-grid a').count()) > 0,
  'hay publicaciones relacionadas',
);

/* --- archivo vivo -------------------------------------------------------- */
console.log('Archivo Vivo');
await ir('/archivo');
const antesArchivo = await pagina.locator('.archive-item:not([hidden])').count();
await pagina.selectOption('[data-archive-kind]', 'Base de datos');
await esperar(250);
const despuesArchivo = await pagina.locator('.archive-item:not([hidden])').count();
check(
  despuesArchivo > 0 && despuesArchivo < antesArchivo,
  `filtro por tipo funciona (${antesArchivo} → ${despuesArchivo})`,
);

/* --- 404 ----------------------------------------------------------------- */
// La navegación a una ruta inexistente produce un 404 esperado: se limpia el
// registro para no confundirlo con un error real.
errores = [];
console.log('404');
await ir('/no-existe');
check((await pagina.content()).includes('404'), 'página 404 se sirve');
errores = errores.filter((e) => !e.includes('404'));

await navegador.close();

console.log();
const reales = errores.filter((e) => !e.toLowerCase().includes('favicon'));
if (reales.length) {
  console.log('Errores de consola:');
  for (const e of reales.slice(0, 10)) console.log('  -', e);
} else {
  console.log('Sin errores de consola.');
}

const fallos = resultados.filter(([ok]) => !ok);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas`);
process.exit(fallos.length || reales.length ? 1 : 0);
