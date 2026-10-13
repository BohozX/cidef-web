import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'src', 'data', 'indicadores-reales.json');
const PSQL = process.env.PSQL || 'D:/SQL/bin/psql.exe';

const SQL = `
WITH fuente_visible(id, texto) AS (VALUES
  ('ine', 'INE'), ('bcb', 'BCB'), ('mefp', 'MEFP'), ('asfi', 'ASFI'), ('sin', 'SIN'),
  ('mintrabajo', 'Ministerio de Trabajo'), ('eia', 'EIA'), ('fed', 'Reserva Federal'),
  ('nyfed', 'Fed de Nueva York'), ('bancomundial', 'Banco Mundial'), ('cidef', 'Estimación CIDEF')
)
SELECT coalesce(json_object_agg(i.id, json_build_object(
  'name', i.nombre,
  'shortName', i.nombre_corto,
  'unit', i.unidad,
  'changeUnit', i.unidad_cambio,
  'frequency', initcap(i.frecuencia::text),
  'source', coalesce(fv.texto, f.sigla),
  'sourceUrl', (SELECT a.pagina FROM atlas.carga c JOIN atlas.archivo_fuente a ON a.id = c.archivo_id
                WHERE c.version_id = vv.id ORDER BY c.id DESC LIMIT 1),
  'demo', false,
  'history', (SELECT json_agg(json_build_object('d', to_char(s.fecha, 'YYYY-MM-DD'), 'v', s.valor::float8) ORDER BY s.fecha)
              FROM atlas.serie_vigente s WHERE s.indicador_id = i.id),
  'value', u.valor::float8,
  'change', coalesce(u.variacion::float8, 0),
  'date', to_char(u.fecha, 'YYYY-MM-DD'),
  'updated', to_char(vv.publicado_en, 'YYYY-MM-DD')
) ORDER BY i.id), '{}'::json)
FROM atlas.indicador i
JOIN atlas.ultimo_dato u ON u.indicador_id = i.id
JOIN atlas.version_vigente vv ON vv.indicador_id = i.id
JOIN atlas.fuente f ON f.id = i.fuente_id
LEFT JOIN fuente_visible fv ON fv.id = i.fuente_id;
`;

const r = spawnSync(PSQL, ['-U', 'postgres', '-h', 'localhost', '-d', 'cidef', '-w', '-At', '-v', 'ON_ERROR_STOP=1'], {
  input: SQL,
  env: { ...process.env, PGCLIENTENCODING: 'UTF8' },
  maxBuffer: 256 * 1024 * 1024,
  encoding: 'utf8',
});
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(1);
}
const datos = JSON.parse(r.stdout);
await writeFile(DESTINO, JSON.stringify(datos) + '\n');
const ids = Object.keys(datos);
const puntos = ids.reduce((n, id) => n + datos[id].history.length, 0);
console.log(`${ids.length} indicadores reales, ${puntos} observaciones -> src/data/indicadores-reales.json`);
