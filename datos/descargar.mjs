import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

const RAIZ = dirname(fileURLToPath(import.meta.url));
const ORIGINALES = join(RAIZ, 'originales');
const LISTA = join(RAIZ, 'fuentes.tsv');
const MANIFIESTO = join(RAIZ, 'manifiesto.csv');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const CAB = ['fuente', 'carpeta', 'archivo', 'indicadores', 'descripcion', 'url', 'pagina', 'bytes', 'sha256', 'descargado_utc', 'modificado_en_origen', 'tipo'];

const args = process.argv.slice(2);
const forzar = args.includes('--forzar');
const solo = (() => { const i = args.indexOf('--solo'); return i === -1 ? null : args[i + 1]; })();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const leerLista = async () => {
  const texto = await readFile(LISTA, 'utf8');
  const [cab, ...filas] = texto.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const campos = cab.split('\t');
  return filas.map((l) => Object.fromEntries(l.split('\t').map((v, i) => [campos[i], v.trim()])));
};

const leerManifiesto = async () => {
  const mapa = new Map();
  if (!existsSync(MANIFIESTO)) return mapa;
  const lineas = (await readFile(MANIFIESTO, 'utf8')).split(/\r?\n/).slice(1).filter(Boolean);
  for (const l of lineas) {
    const celdas = [];
    let actual = '', dentro = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (dentro && c === '"' && l[i + 1] === '"') { actual += '"'; i++; }
      else if (c === '"') dentro = !dentro;
      else if (c === ',' && !dentro) { celdas.push(actual); actual = ''; }
      else actual += c;
    }
    celdas.push(actual);
    mapa.set(celdas[5], celdas);
  }
  return mapa;
};

const nombreDe = (r, url) => {
  const cd = r.headers.get('content-disposition') || '';
  const n = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i);
  if (n) return decodeURIComponent(n[1]).replace(/[\\/:*?"<>|]/g, '_');
  const tramo = basename(new URL(url).pathname);
  return tramo && tramo !== 'download' ? decodeURIComponent(tramo) : 'archivo';
};

const conCurl = async (fila) => {
  const dir = await mkdtemp(join(tmpdir(), 'cidef-'));
  const cuerpoRuta = join(dir, 'cuerpo'), cabRuta = join(dir, 'cabeceras');
  try {
    await ejecutar('curl', ['-sSL', '--fail', '--max-time', '180', '-A', UA, '-o', cuerpoRuta, '-D', cabRuta, fila.url]);
    const bloques = (await readFile(cabRuta, 'latin1')).split(/\r?\n\r?\n/).filter((x) => x.trim());
    const cab = new Map(bloques.at(-1).split(/\r?\n/).slice(1).map((l) => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]));
    const falsa = { headers: { get: (k) => cab.get(k.toLowerCase()) || null } };
    return { cuerpo: await readFile(cuerpoRuta), nombre: nombreDe(falsa, fila.url), tipo: cab.get('content-type') || '', modificado: cab.get('last-modified') || '' };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const bajar = async (fila) => {
  for (let intento = 1; intento <= 3; intento++) {
    let r;
    try {
      r = await fetch(fila.url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(180000) });
    } catch (e) {
      if (/CERT|SIGNATURE|SELF_SIGNED/i.test(String(e.cause?.code || ''))) return conCurl(fila);
      if (intento === 3) throw e;
      await esperar(15000 * intento);
      continue;
    }
    if (r.status === 429 || r.status === 503) {
      if (intento >= 2) throw new Error(`HTTP ${r.status}: el servidor limita las consultas, reintentar mas tarde`);
      await esperar(45000);
      continue;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const tipo = r.headers.get('content-type') || '';
    const cuerpo = Buffer.from(await r.arrayBuffer());
    if (/text\/html/i.test(tipo) && !/\.html?$/i.test(fila.url)) throw new Error(`devolvio HTML (${cuerpo.length} bytes)`);
    return { cuerpo, nombre: nombreDe(r, fila.url), tipo, modificado: r.headers.get('last-modified') || '' };
  }
  throw new Error('demasiados reintentos');
};

const lista = await leerLista();
const registro = await leerManifiesto();
const guardar = async () => {
  const orden = lista.map((f) => registro.get(f.url)).filter(Boolean);
  await writeFile(MANIFIESTO, [CAB.join(','), ...orden.map((f) => f.map(csv).join(','))].join('\n') + '\n');
};

let nuevos = 0, errores = 0;
for (const fila of lista) {
  if (solo && fila.fuente !== solo) continue;
  const carpeta = join(ORIGINALES, fila.fuente, fila.carpeta);
  const antes = registro.get(fila.url);
  if (antes && existsSync(join(carpeta, antes[2])) && !forzar) continue;
  try {
    const { cuerpo, nombre, tipo, modificado } = await bajar(fila);
    await mkdir(carpeta, { recursive: true });
    await writeFile(join(carpeta, nombre), cuerpo);
    const huella = createHash('sha256').update(cuerpo).digest('hex');
    registro.set(fila.url, [fila.fuente, fila.carpeta, nombre, fila.indicadores, fila.descripcion, fila.url, fila.pagina, cuerpo.length, huella, new Date().toISOString(), modificado, tipo]);
    await guardar();
    nuevos++;
    console.log(`  ok    ${fila.fuente}/${fila.carpeta}/${nombre} (${(cuerpo.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    errores++;
    console.log(`  FALLO ${fila.fuente}/${fila.carpeta} · ${fila.descripcion}: ${e.message}`);
  }
  await esperar(2500);
}

await guardar();
console.log(`\n${nuevos} descargados, ${errores} con error, ${registro.size} en el manifiesto`);
