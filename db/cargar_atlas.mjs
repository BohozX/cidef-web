import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const leerJson = async (r) => JSON.parse(await readFile(join(RAIZ, r), 'utf8'));
const q = (v) => (v === null || v === undefined || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v ? 'true' : 'false');

const FUENTES = [
  ['ine', 'INE', 'Instituto Nacional de Estadística', 'https://www.ine.gob.bo/', 'oficial'],
  ['bcb', 'BCB', 'Banco Central de Bolivia', 'https://www.bcb.gob.bo/', 'oficial'],
  ['asfi', 'ASFI', 'Autoridad de Supervisión del Sistema Financiero', 'https://www.asfi.gob.bo/', 'oficial'],
  ['mefp', 'MEFP', 'Ministerio de Economía y Finanzas Públicas', 'https://www.economiayfinanzas.gob.bo/', 'oficial'],
  ['sin', 'SIN', 'Servicio de Impuestos Nacionales', 'https://www.impuestos.gob.bo/', 'oficial'],
  ['mintrabajo', 'MTEPS', 'Ministerio de Trabajo, Empleo y Previsión Social', 'https://www.mintrabajo.gob.bo/', 'oficial'],
  ['eia', 'EIA', 'U.S. Energy Information Administration', 'https://www.eia.gov/', 'internacional'],
  ['fed', 'FRB', 'Junta de la Reserva Federal de EE. UU.', 'https://www.federalreserve.gov/', 'internacional'],
  ['nyfed', 'FRBNY', 'Reserva Federal de Nueva York', 'https://www.newyorkfed.org/', 'internacional'],
  ['bancomundial', 'BM', 'Banco Mundial (Commodity Markets, Pink Sheet)', 'https://www.worldbank.org/en/research/commodity-markets', 'internacional'],
  ['cidef', 'CIDEF', 'Centro de Inteligencia en Desarrollo Económico y Financiero', null, 'propia'],
];

const FUENTE_DE = {
  'petroleo-brent': 'eia', oro: 'bancomundial', dxy: 'fed', 'fed-funds': 'nyfed',
  'credito-privado': 'bcb', depositos: 'bcb', 'tasa-activa': 'bcb', 'inflacion-nucleo': 'bcb',
  recaudacion: 'mefp', 'deuda-publica': 'mefp', 'resultado-fiscal': 'mefp', 'salario-minimo': 'mintrabajo',
};
const POR_NOMBRE = { INE: 'ine', BCB: 'bcb', ASFI: 'asfi', MEFP: 'mefp', SIN: 'sin', 'Ministerio de Economía': 'mefp', 'Ministerio de Trabajo': 'mintrabajo', 'Estimación CIDEF': 'cidef', 'Reserva Federal': 'fed' };
const FRECUENCIA_REAL = { industria: 'trimestral', oro: 'mensual' };
const FRECUENCIA = { Diaria: 'diaria', Semanal: 'semanal', Mensual: 'mensual', Trimestral: 'trimestral', Anual: 'anual' };
const SUBIR_BUENO = ['reservas-internacionales', 'exportaciones', 'saldo-comercial', 'imae', 'pib-trimestral', 'credito-privado', 'depositos', 'industria', 'recaudacion', 'salario-minimo', 'nowcast-pib', 'resultado-fiscal'];

const REAL = {
  'base-monetaria': { unidad: 'miles de Bs' },
  'credito-privado': { nombre: 'Crédito del sistema financiero al sector privado', nombre_corto: 'Crédito', unidad: 'millones de USD', unidad_cambio: 'millones de USD' },
  depositos: { nombre: 'Depósitos en entidades de intermediación financiera', nombre_corto: 'Depósitos', unidad: 'millones de USD', unidad_cambio: 'millones de USD' },
  'deuda-externa': { frecuencia: 'anual', unidad: '% del PIB', unidad_cambio: 'pp' },
  'resultado-fiscal': { nombre: 'Superávit (déficit) global del SPNF', frecuencia: 'mensual', unidad: 'millones de Bs', unidad_cambio: 'millones de Bs' },
  recaudacion: { nombre: 'Ingresos tributarios del SPNF', unidad: 'millones de Bs' },
  'fed-funds': { nombre: 'Tasa efectiva de fondos federales (EFFR)', frecuencia: 'diaria' },
  dxy: { nombre: 'Índice nominal amplio del dólar (Reserva Federal)', nombre_corto: 'Dólar', unidad: 'índice (enero 1997 = 100)' },
  oro: { unidad: 'USD por onza troy' },
  industria: { unidad: 'índice (año de referencia 2017)' },
  imae: { nombre: 'Índice Global de Actividad Económica (IGAE), variación a 12 meses' },
  'tipo-cambio': { nombre: 'Tipo de cambio oficial (compra)' },
};

const conDatos = new Set(
  existsSync(join(RAIZ, 'datos', 'series'))
    ? (await readdir(join(RAIZ, 'datos', 'series'))).filter((f) => f.endsWith('.csv')).map((f) => f.slice(0, -4))
    : [],
);

const sectores = await leerJson('src/data/categories.json');
const indicadores = await leerJson('src/data/indicators.json');

const salida = ['BEGIN;', "SET client_encoding = 'UTF8';"];

for (const f of FUENTES) {
  salida.push(`INSERT INTO atlas.fuente (id, sigla, nombre, sitio_web, tipo) VALUES (${f.map(q).join(', ')})
  ON CONFLICT (id) DO UPDATE SET sigla = EXCLUDED.sigla, nombre = EXCLUDED.nombre, sitio_web = EXCLUDED.sitio_web, tipo = EXCLUDED.tipo;`);
}

sectores.forEach((s, i) => {
  salida.push(`INSERT INTO atlas.sector (id, nombre, pregunta, descripcion, orden) VALUES (${q(s.id)}, ${q(s.name)}, ${q(s.pregunta)}, ${q(s.description)}, ${i})
  ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, pregunta = EXCLUDED.pregunta, descripcion = EXCLUDED.descripcion, orden = EXCLUDED.orden;`);
  salida.push(`DELETE FROM atlas.sector_tema WHERE sector_id = ${q(s.id)};`);
  (s.temas || []).forEach((t, j) => salida.push(`INSERT INTO atlas.sector_tema (sector_id, orden, tema) VALUES (${q(s.id)}, ${j}, ${q(t)});`));
});

for (const i of indicadores) {
  const fuente = FUENTE_DE[i.id] || POR_NOMBRE[i.source];
  if (!fuente) throw new Error(`sin fuente para ${i.id} (${i.source})`);
  const r = REAL[i.id] || {};
  const frecuencia = r.frecuencia || FRECUENCIA_REAL[i.id] || FRECUENCIA[i.frequency];
  const campos = {
    id: q(i.id), nombre: q(r.nombre || i.name), nombre_corto: q(r.nombre_corto || i.shortName), sector_id: q(i.category), fuente_id: q(fuente),
    url_fuente: q(i.sourceUrl), unidad: q(r.unidad || i.unit), unidad_cambio: q(r.unidad_cambio || i.changeUnit), decimales: i.decimals,
    frecuencia: q(frecuencia), periodicidad: q(i.periodicity), clase: q(i.kind), acceso: q(i.access), grafico: q(i.viz),
    subir_es_bueno: b(SUBIR_BUENO.includes(i.id)), descripcion: q(i.description), metodologia: q(i.methodology),
    destacado: b(i.featured), demo: b(!conDatos.has(i.id) && i.demo),
  };
  const cols = Object.keys(campos);
  salida.push(`INSERT INTO atlas.indicador (${cols.join(', ')}) VALUES (${Object.values(campos).join(', ')})
  ON CONFLICT (id) DO UPDATE SET ${cols.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(', ')};`);
}

const manifiesto = join(RAIZ, 'datos', 'manifiesto.csv');
if (existsSync(manifiesto)) {
  const lineas = (await readFile(manifiesto, 'utf8')).split(/\r?\n/).slice(1).filter(Boolean);
  const ids = new Set(indicadores.map((i) => i.id));
  for (const l of lineas) {
    const c = [];
    let actual = '', dentro = false;
    for (let k = 0; k < l.length; k++) {
      const ch = l[k];
      if (dentro && ch === '"' && l[k + 1] === '"') { actual += '"'; k++; }
      else if (ch === '"') dentro = !dentro;
      else if (ch === ',' && !dentro) { c.push(actual); actual = ''; }
      else actual += ch;
    }
    c.push(actual);
    const [fuente, carpeta, archivo, inds, , url, pagina, bytes, sha, descargado, modificado, tipo] = c;
    const ruta = `originales/${fuente}/${carpeta}/${archivo}`;
    const mod = modificado ? q(new Date(modificado).toISOString()) : 'NULL';
    salida.push(`INSERT INTO atlas.archivo_fuente (fuente_id, ruta, url, pagina, bytes, sha256, tipo_mime, descargado_en, modificado_en_origen)
  VALUES (${q(fuente)}, ${q(ruta)}, ${q(url)}, ${q(pagina)}, ${bytes}, ${q(sha)}, ${q(tipo)}, ${q(descargado)}, ${mod})
  ON CONFLICT (ruta) DO UPDATE SET url = EXCLUDED.url, pagina = EXCLUDED.pagina, bytes = EXCLUDED.bytes, sha256 = EXCLUDED.sha256,
    tipo_mime = EXCLUDED.tipo_mime, descargado_en = EXCLUDED.descargado_en, modificado_en_origen = EXCLUDED.modificado_en_origen;`);
    for (const ind of inds.split(';').filter((x) => ids.has(x))) {
      salida.push(`INSERT INTO atlas.archivo_indicador (archivo_id, indicador_id)
  SELECT id, ${q(ind)} FROM atlas.archivo_fuente WHERE ruta = ${q(ruta)} ON CONFLICT DO NOTHING;`);
    }
  }
}

salida.push('COMMIT;');
process.stdout.write(salida.join('\n') + '\n');
