CREATE SCHEMA IF NOT EXISTS atlas;
COMMENT ON SCHEMA atlas IS 'Datos económicos del Atlas: fuentes, sectores, indicadores, versiones y observaciones';

CREATE OR REPLACE FUNCTION public.tocar_actualizado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

CREATE TYPE atlas.tipo_fuente AS ENUM ('oficial', 'internacional', 'propia');
CREATE TYPE atlas.frecuencia AS ENUM ('diaria', 'semanal', 'mensual', 'trimestral', 'anual');
CREATE TYPE atlas.clase_dato AS ENUM ('oficial', 'estimacion', 'proyeccion');
CREATE TYPE atlas.acceso AS ENUM ('publico', 'profesional');
CREATE TYPE atlas.grafico AS ENUM ('linea', 'area', 'barras', 'divergente', 'proyeccion');

CREATE TABLE atlas.fuente (
  id          text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  sigla       text NOT NULL,
  nombre      text NOT NULL,
  sitio_web   text,
  tipo        atlas.tipo_fuente NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE atlas.fuente IS 'Institución que publica la serie: INE, BCB, ASFI, MEFP, CIDEF, etc.';

CREATE TABLE atlas.sector (
  id          text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  nombre      text NOT NULL,
  pregunta    text,
  descripcion text,
  orden       smallint NOT NULL DEFAULT 99
);
COMMENT ON TABLE atlas.sector IS 'Los sectores del Atlas (actividad, precios, cambiario...)';

CREATE TABLE atlas.sector_tema (
  sector_id   text NOT NULL REFERENCES atlas.sector (id) ON DELETE CASCADE,
  orden       smallint NOT NULL,
  tema        text NOT NULL,
  PRIMARY KEY (sector_id, orden)
);

CREATE TABLE atlas.indicador (
  id              text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  nombre          text NOT NULL,
  nombre_corto    text NOT NULL,
  sector_id       text NOT NULL REFERENCES atlas.sector (id),
  fuente_id       text NOT NULL REFERENCES atlas.fuente (id),
  url_fuente      text,
  unidad          text NOT NULL,
  unidad_cambio   text,
  decimales       smallint NOT NULL DEFAULT 2 CHECK (decimales BETWEEN 0 AND 6),
  frecuencia      atlas.frecuencia NOT NULL,
  periodicidad    text,
  clase           atlas.clase_dato NOT NULL DEFAULT 'oficial',
  acceso          atlas.acceso NOT NULL DEFAULT 'publico',
  grafico         atlas.grafico NOT NULL DEFAULT 'linea',
  subir_es_bueno  boolean,
  descripcion     text,
  metodologia     text,
  destacado       boolean NOT NULL DEFAULT false,
  demo            boolean NOT NULL DEFAULT false,
  activo          boolean NOT NULL DEFAULT true,
  publicacion_id  text,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE atlas.indicador IS 'Una fila por serie del Atlas';
COMMENT ON COLUMN atlas.indicador.subir_es_bueno IS 'Si un aumento es una buena noticia (colorea la variación)';
COMMENT ON COLUMN atlas.indicador.demo IS 'Serie de demostración, no publicar como dato real';
CREATE INDEX ON atlas.indicador (sector_id);
CREATE INDEX ON atlas.indicador (fuente_id);
CREATE TRIGGER indicador_actualizado BEFORE UPDATE ON atlas.indicador
  FOR EACH ROW EXECUTE FUNCTION public.tocar_actualizado();

CREATE TABLE atlas.archivo_fuente (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fuente_id             text NOT NULL REFERENCES atlas.fuente (id),
  ruta                  text NOT NULL UNIQUE,
  url                   text NOT NULL,
  pagina                text,
  bytes                 bigint NOT NULL CHECK (bytes > 0),
  sha256                char(64) NOT NULL,
  tipo_mime             text,
  descargado_en         timestamptz NOT NULL,
  modificado_en_origen  timestamptz
);
COMMENT ON TABLE atlas.archivo_fuente IS 'Cada archivo original descargado de la fuente, tal cual (ver datos/manifiesto.csv)';
CREATE INDEX ON atlas.archivo_fuente (sha256);

CREATE TABLE atlas.archivo_indicador (
  archivo_id    bigint NOT NULL REFERENCES atlas.archivo_fuente (id) ON DELETE CASCADE,
  indicador_id  text NOT NULL REFERENCES atlas.indicador (id) ON DELETE CASCADE,
  PRIMARY KEY (archivo_id, indicador_id)
);

CREATE TABLE atlas.version (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  indicador_id  text NOT NULL REFERENCES atlas.indicador (id) ON DELETE CASCADE,
  etiqueta      text NOT NULL,
  publicado_en  date NOT NULL,
  nota          text,
  UNIQUE (indicador_id, etiqueta),
  UNIQUE (id, indicador_id)
);
COMMENT ON TABLE atlas.version IS 'Cada publicación o revisión de una serie; una revisión nunca reemplaza a la anterior';

CREATE TABLE atlas.carga (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id    bigint NOT NULL REFERENCES atlas.version (id) ON DELETE CASCADE,
  indicador_id  text NOT NULL REFERENCES atlas.indicador (id),
  archivo_id    bigint REFERENCES atlas.archivo_fuente (id),
  hoja          text,
  filas         integer CHECK (filas >= 0),
  cargado_en    timestamptz NOT NULL DEFAULT now(),
  nota          text
);
COMMENT ON TABLE atlas.carga IS 'Bitácora: qué archivo y qué hoja alimentaron cada versión de una serie';
CREATE INDEX ON atlas.carga (version_id);

CREATE TABLE atlas.observacion (
  indicador_id     text NOT NULL,
  version_id       bigint NOT NULL,
  fecha            date NOT NULL,
  valor            numeric NOT NULL,
  valor_literal    text NOT NULL,
  limite_inferior  numeric,
  limite_superior  numeric,
  preliminar       boolean NOT NULL DEFAULT false,
  PRIMARY KEY (version_id, fecha),
  FOREIGN KEY (version_id, indicador_id) REFERENCES atlas.version (id, indicador_id) ON DELETE CASCADE,
  CHECK (limite_inferior IS NULL OR limite_superior IS NULL OR limite_inferior <= limite_superior)
);
COMMENT ON TABLE atlas.observacion IS 'El dato: valor exacto (numeric) y el texto literal tal como lo publica la fuente';
COMMENT ON COLUMN atlas.observacion.valor_literal IS 'Cifra como aparece en el archivo original, sin redondear';
CREATE INDEX ON atlas.observacion (indicador_id, fecha);

CREATE TABLE atlas.composicion (
  id            text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  indicador_id  text NOT NULL REFERENCES atlas.indicador (id) ON DELETE CASCADE,
  titulo        text NOT NULL,
  unidad        text NOT NULL,
  fecha         date,
  demo          boolean NOT NULL DEFAULT false
);
COMMENT ON TABLE atlas.composicion IS 'Repartos que suman un total (los gráficos de dona)';

CREATE TABLE atlas.composicion_parte (
  composicion_id  text NOT NULL REFERENCES atlas.composicion (id) ON DELETE CASCADE,
  orden           smallint NOT NULL,
  nombre          text NOT NULL,
  valor           numeric NOT NULL,
  PRIMARY KEY (composicion_id, orden)
);
