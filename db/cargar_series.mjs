import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SERIES = join(RAIZ, 'datos', 'series');
const archivos = (await readdir(SERIES)).filter((f) => f.endsWith('.csv')).sort();

const sql = [
  "SET client_encoding = 'UTF8';",
  '\\set ON_ERROR_STOP on',
  'BEGIN;',
  `CREATE TEMP TABLE stg (
  indicador text, fecha date, valor_literal text, limite_inferior text, limite_superior text,
  preliminar boolean, archivo text, hoja text, celda text
) ON COMMIT DROP;`,
  ...archivos.map((f) => `\\copy stg FROM '${join(SERIES, f).replace(/\\/g, '/')}' WITH (FORMAT csv, HEADER true)`),
  `DO $$
DECLARE faltan text;
BEGIN
  SELECT string_agg(DISTINCT s.archivo, ', ') INTO faltan
  FROM stg s LEFT JOIN atlas.archivo_fuente a ON a.ruta = 'originales/' || s.archivo
  WHERE a.id IS NULL;
  IF faltan IS NOT NULL THEN RAISE EXCEPTION 'archivos sin registrar en atlas.archivo_fuente: %', faltan; END IF;
  SELECT string_agg(DISTINCT s.indicador, ', ') INTO faltan
  FROM stg s LEFT JOIN atlas.indicador i ON i.id = s.indicador WHERE i.id IS NULL;
  IF faltan IS NOT NULL THEN RAISE EXCEPTION 'indicadores sin ficha: %', faltan; END IF;
END $$;`,
  `CREATE TEMP TABLE ver ON COMMIT DROP AS
SELECT s.indicador,
       string_agg(DISTINCT regexp_replace(a.ruta, '^.*/', '') || ' · ' || left(a.sha256, 12), ' + ') AS etiqueta,
       max(coalesce(a.modificado_en_origen, a.descargado_en))::date AS publicado_en
FROM stg s JOIN atlas.archivo_fuente a ON a.ruta = 'originales/' || s.archivo
GROUP BY s.indicador;`,
  `DELETE FROM atlas.version v USING ver WHERE v.indicador_id = ver.indicador AND v.etiqueta = ver.etiqueta;`,
  `INSERT INTO atlas.version (indicador_id, etiqueta, publicado_en, nota)
SELECT ver.indicador, ver.etiqueta, ver.publicado_en, 'Extraído tal cual del archivo original' FROM ver;`,
  `INSERT INTO atlas.carga (version_id, indicador_id, archivo_id, hoja, filas, nota)
SELECT v.id, s.indicador, a.id, min(s.hoja), count(*), 'datos/extraer.py'
FROM stg s
JOIN atlas.archivo_fuente a ON a.ruta = 'originales/' || s.archivo
JOIN ver ON ver.indicador = s.indicador
JOIN atlas.version v ON v.indicador_id = s.indicador AND v.etiqueta = ver.etiqueta
GROUP BY v.id, s.indicador, a.id;`,
  `INSERT INTO atlas.observacion (indicador_id, version_id, fecha, valor, valor_literal, limite_inferior, limite_superior, preliminar)
SELECT s.indicador, v.id, s.fecha, s.valor_literal::numeric, s.valor_literal,
       nullif(s.limite_inferior, '')::numeric, nullif(s.limite_superior, '')::numeric, s.preliminar
FROM stg s
JOIN ver ON ver.indicador = s.indicador
JOIN atlas.version v ON v.indicador_id = s.indicador AND v.etiqueta = ver.etiqueta;`,
  'COMMIT;',
  'ANALYZE atlas.observacion;',
];

process.stdout.write(sql.join('\n') + '\n');
