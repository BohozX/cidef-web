ALTER TABLE atlas.indicador
  ADD CONSTRAINT indicador_publicacion_fk FOREIGN KEY (publicacion_id) REFERENCES contenido.publicacion (id) ON DELETE SET NULL;

CREATE TABLE atlas.indicador_autor (
  indicador_id  text NOT NULL REFERENCES atlas.indicador (id) ON DELETE CASCADE,
  persona_id    text NOT NULL REFERENCES contenido.persona (id),
  orden         smallint NOT NULL,
  PRIMARY KEY (indicador_id, orden),
  UNIQUE (indicador_id, persona_id)
);
COMMENT ON TABLE atlas.indicador_autor IS 'Responsables de las estimaciones propias del centro';

CREATE VIEW atlas.version_vigente AS
SELECT DISTINCT ON (v.indicador_id) v.*
FROM atlas.version v
ORDER BY v.indicador_id, v.publicado_en DESC, v.id DESC;
COMMENT ON VIEW atlas.version_vigente IS 'La versión más reciente de cada serie';

CREATE VIEW atlas.serie_vigente AS
SELECT o.indicador_id, o.fecha, o.valor, o.valor_literal, o.limite_inferior, o.limite_superior, o.preliminar,
       v.etiqueta AS version, v.publicado_en
FROM atlas.observacion o
JOIN atlas.version_vigente v ON v.id = o.version_id;
COMMENT ON VIEW atlas.serie_vigente IS 'La serie completa según su versión más reciente';

CREATE VIEW atlas.ultimo_dato AS
WITH ordenada AS (
  SELECT s.*,
         lag(s.fecha) OVER w AS fecha_anterior,
         lag(s.valor) OVER w AS valor_anterior,
         row_number() OVER (PARTITION BY s.indicador_id ORDER BY s.fecha DESC) AS posicion
  FROM atlas.serie_vigente s
  WINDOW w AS (PARTITION BY s.indicador_id ORDER BY s.fecha)
)
SELECT i.id AS indicador_id, i.nombre, i.unidad, i.frecuencia,
       o.fecha, o.valor, o.valor_literal, o.fecha_anterior, o.valor_anterior,
       o.valor - o.valor_anterior AS variacion,
       o.version, o.publicado_en
FROM ordenada o
JOIN atlas.indicador i ON i.id = o.indicador_id
WHERE o.posicion = 1;
COMMENT ON VIEW atlas.ultimo_dato IS 'Último dato de cada serie y su variación contra la observación anterior';
