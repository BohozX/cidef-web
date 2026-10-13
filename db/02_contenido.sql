CREATE SCHEMA IF NOT EXISTS contenido;
COMMENT ON SCHEMA contenido IS 'Publicaciones, personas, eventos, formación, imágenes y textos institucionales';

CREATE TYPE contenido.tipo_archivo AS ENUM ('imagen', 'pdf', 'datos', 'codigo', 'presentacion', 'documento', 'otro');
CREATE TYPE contenido.tipo_publicacion AS ENUM (
  'Informe', 'Reporte', 'Working Paper', 'Boletín', 'Nota técnica', 'Policy Brief',
  'Memoria institucional', 'Estudio especial', 'Documento metodológico'
);
CREATE TYPE contenido.estado AS ENUM ('borrador', 'publicada', 'retirada');
CREATE TYPE contenido.tipo_enlace AS ENUM ('pdf', 'datos', 'codigo', 'anexo', 'presentacion', 'enlace');
CREATE TYPE contenido.tipo_evento AS ENUM ('Seminario', 'Conferencia', 'Webinar', 'Presentación', 'Curso', 'Call for Papers');
CREATE TYPE contenido.modalidad AS ENUM ('Presencial', 'Virtual', 'Híbrido');
CREATE TYPE contenido.clase_programa AS ENUM ('Diplomado', 'Curso de experto', 'Curso', 'Curso rápido', 'Taller');
CREATE TYPE contenido.tipo_alianza AS ENUM ('academica', 'institucional', 'colaboracion');
CREATE TYPE contenido.lista_programa AS ENUM ('herramienta', 'publico', 'requisito', 'horario', 'certificado', 'contacto');

CREATE TABLE contenido.archivo (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ruta               text NOT NULL UNIQUE,
  tipo               contenido.tipo_archivo NOT NULL,
  tipo_mime          text,
  bytes              bigint CHECK (bytes > 0),
  ancho              integer CHECK (ancho > 0),
  alto               integer CHECK (alto > 0),
  sha256             char(64),
  texto_alternativo  text,
  creditos           text,
  creado_en          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE contenido.archivo IS 'Ficha de cada imagen o documento; el archivo vive en el almacenamiento, aquí solo su ruta';

CREATE TABLE contenido.persona (
  id              text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  nombre          text NOT NULL,
  cargo           text,
  area            text,
  biografia       text,
  foto_id         bigint REFERENCES contenido.archivo (id),
  orcid           text,
  scholar         text,
  repec           text,
  linkedin        text,
  correo          text,
  es_equipo       boolean NOT NULL DEFAULT false,
  orden           smallint NOT NULL DEFAULT 99,
  demo            boolean NOT NULL DEFAULT false,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE contenido.persona IS 'Investigadores, autores, ponentes y docentes en una sola tabla';
CREATE TRIGGER persona_actualizado BEFORE UPDATE ON contenido.persona
  FOR EACH ROW EXECUTE FUNCTION public.tocar_actualizado();

CREATE TABLE contenido.institucion (
  id          text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  nombre      text NOT NULL,
  rol         text,
  tipo        contenido.tipo_alianza NOT NULL,
  sitio_web   text,
  logo_id     bigint REFERENCES contenido.archivo (id),
  orden       smallint NOT NULL DEFAULT 99,
  activa      boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE contenido.institucion IS 'Aliados del centro';

CREATE TABLE contenido.publicacion (
  id              text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  tipo            contenido.tipo_publicacion NOT NULL,
  serie           text,
  titulo          text NOT NULL,
  fecha           date NOT NULL,
  resumen         text NOT NULL,
  cuerpo_md       text,
  doi             text,
  url_externa     text,
  paginas         integer CHECK (paginas > 0),
  portada_id      bigint REFERENCES contenido.archivo (id),
  destacado       boolean NOT NULL DEFAULT false,
  estado          contenido.estado NOT NULL DEFAULT 'borrador',
  demo            boolean NOT NULL DEFAULT false,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON contenido.publicacion (fecha DESC);
CREATE TRIGGER publicacion_actualizado BEFORE UPDATE ON contenido.publicacion
  FOR EACH ROW EXECUTE FUNCTION public.tocar_actualizado();

CREATE TABLE contenido.publicacion_autor (
  publicacion_id  text NOT NULL REFERENCES contenido.publicacion (id) ON DELETE CASCADE,
  persona_id      text NOT NULL REFERENCES contenido.persona (id),
  orden           smallint NOT NULL,
  PRIMARY KEY (publicacion_id, orden),
  UNIQUE (publicacion_id, persona_id)
);

CREATE TABLE contenido.publicacion_hallazgo (
  publicacion_id  text NOT NULL REFERENCES contenido.publicacion (id) ON DELETE CASCADE,
  orden           smallint NOT NULL,
  texto           text NOT NULL,
  PRIMARY KEY (publicacion_id, orden)
);

CREATE TABLE contenido.tema (
  id      text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  nombre  text NOT NULL UNIQUE
);

CREATE TABLE contenido.publicacion_tema (
  publicacion_id  text NOT NULL REFERENCES contenido.publicacion (id) ON DELETE CASCADE,
  tema_id         text NOT NULL REFERENCES contenido.tema (id),
  orden           smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (publicacion_id, tema_id)
);

CREATE TABLE contenido.publicacion_palabra (
  publicacion_id  text NOT NULL REFERENCES contenido.publicacion (id) ON DELETE CASCADE,
  orden           smallint NOT NULL,
  palabra         text NOT NULL,
  PRIMARY KEY (publicacion_id, orden)
);

CREATE TABLE contenido.publicacion_jel (
  publicacion_id  text NOT NULL REFERENCES contenido.publicacion (id) ON DELETE CASCADE,
  codigo          text NOT NULL CHECK (codigo ~ '^[A-Z][0-9]{0,2}$'),
  PRIMARY KEY (publicacion_id, codigo)
);

CREATE TABLE contenido.publicacion_enlace (
  publicacion_id  text NOT NULL REFERENCES contenido.publicacion (id) ON DELETE CASCADE,
  orden           smallint NOT NULL,
  etiqueta        text NOT NULL,
  tipo            contenido.tipo_enlace NOT NULL DEFAULT 'enlace',
  href            text,
  archivo_id      bigint REFERENCES contenido.archivo (id),
  nota            text,
  PRIMARY KEY (publicacion_id, orden),
  CHECK (href IS NOT NULL OR archivo_id IS NOT NULL)
);

CREATE TABLE contenido.evento (
  id               text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  tipo             contenido.tipo_evento NOT NULL,
  titulo           text NOT NULL,
  fecha_inicio     date NOT NULL,
  fecha_fin        date,
  hora             time,
  lugar            text NOT NULL,
  modalidad        contenido.modalidad NOT NULL DEFAULT 'Híbrido',
  resumen          text NOT NULL,
  cuerpo_md        text,
  url_inscripcion  text,
  demo             boolean NOT NULL DEFAULT false,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now(),
  CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);
CREATE INDEX ON contenido.evento (fecha_inicio DESC);
CREATE TRIGGER evento_actualizado BEFORE UPDATE ON contenido.evento
  FOR EACH ROW EXECUTE FUNCTION public.tocar_actualizado();

CREATE TABLE contenido.evento_ponente (
  evento_id   text NOT NULL REFERENCES contenido.evento (id) ON DELETE CASCADE,
  orden       smallint NOT NULL,
  persona_id  text REFERENCES contenido.persona (id),
  nombre      text,
  afiliacion  text,
  PRIMARY KEY (evento_id, orden),
  CHECK (persona_id IS NOT NULL OR nombre IS NOT NULL)
);

CREATE TABLE contenido.evento_enlace (
  evento_id   text NOT NULL REFERENCES contenido.evento (id) ON DELETE CASCADE,
  orden       smallint NOT NULL,
  etiqueta    text NOT NULL,
  tipo        contenido.tipo_enlace NOT NULL DEFAULT 'enlace',
  href        text,
  archivo_id  bigint REFERENCES contenido.archivo (id),
  nota        text,
  PRIMARY KEY (evento_id, orden),
  CHECK (href IS NOT NULL OR archivo_id IS NOT NULL)
);

CREATE TABLE contenido.programa (
  id                  text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  titulo              text NOT NULL,
  titulo_corto        text NOT NULL,
  clase               contenido.clase_programa NOT NULL DEFAULT 'Diplomado',
  modalidad           text NOT NULL,
  semanas             smallint NOT NULL CHECK (semanas > 0),
  resumen             text NOT NULL,
  objetivo            text NOT NULL,
  certificacion       text NOT NULL,
  cuerpo_md           text,
  precio_matricula    numeric(12, 2) NOT NULL CHECK (precio_matricula >= 0),
  precio_colegiatura  numeric(12, 2) NOT NULL CHECK (precio_colegiatura >= 0),
  precio_total        numeric(12, 2) NOT NULL CHECK (precio_total >= 0),
  precio_promocion    numeric(12, 2) CHECK (precio_promocion >= 0),
  nota_promocion      text,
  moneda              text NOT NULL DEFAULT 'Bs',
  abierto             boolean NOT NULL DEFAULT true,
  orden               smallint NOT NULL DEFAULT 99,
  demo                boolean NOT NULL DEFAULT false,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE contenido.programa IS 'Diplomados, cursos y talleres';
CREATE TRIGGER programa_actualizado BEFORE UPDATE ON contenido.programa
  FOR EACH ROW EXECUTE FUNCTION public.tocar_actualizado();

CREATE TABLE contenido.programa_modulo (
  programa_id  text NOT NULL REFERENCES contenido.programa (id) ON DELETE CASCADE,
  orden        smallint NOT NULL,
  numero       text NOT NULL,
  titulo       text NOT NULL,
  PRIMARY KEY (programa_id, orden)
);

CREATE TABLE contenido.programa_modulo_tema (
  programa_id   text NOT NULL,
  modulo_orden  smallint NOT NULL,
  orden         smallint NOT NULL,
  texto         text NOT NULL,
  PRIMARY KEY (programa_id, modulo_orden, orden),
  FOREIGN KEY (programa_id, modulo_orden) REFERENCES contenido.programa_modulo (programa_id, orden) ON DELETE CASCADE
);

CREATE TABLE contenido.programa_docente (
  programa_id  text NOT NULL REFERENCES contenido.programa (id) ON DELETE CASCADE,
  orden        smallint NOT NULL,
  persona_id   text REFERENCES contenido.persona (id),
  nombre       text,
  PRIMARY KEY (programa_id, orden),
  CHECK (persona_id IS NOT NULL OR nombre IS NOT NULL)
);

CREATE TABLE contenido.programa_docente_merito (
  programa_id    text NOT NULL,
  docente_orden  smallint NOT NULL,
  orden          smallint NOT NULL,
  texto          text NOT NULL,
  PRIMARY KEY (programa_id, docente_orden, orden),
  FOREIGN KEY (programa_id, docente_orden) REFERENCES contenido.programa_docente (programa_id, orden) ON DELETE CASCADE
);

CREATE TABLE contenido.programa_lista (
  programa_id  text NOT NULL REFERENCES contenido.programa (id) ON DELETE CASCADE,
  lista        contenido.lista_programa NOT NULL,
  orden        smallint NOT NULL,
  texto        text NOT NULL,
  PRIMARY KEY (programa_id, lista, orden)
);
COMMENT ON TABLE contenido.programa_lista IS 'Herramientas, público objetivo, requisitos, horarios, certificados y contactos de cada programa';

CREATE TABLE contenido.programa_aliado (
  programa_id     text NOT NULL REFERENCES contenido.programa (id) ON DELETE CASCADE,
  institucion_id  text NOT NULL REFERENCES contenido.institucion (id),
  PRIMARY KEY (programa_id, institucion_id)
);

CREATE TABLE contenido.linea_investigacion (
  id           text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  nombre       text NOT NULL,
  descripcion  text NOT NULL,
  icono        text,
  orden        smallint NOT NULL
);

CREATE TABLE contenido.principio (
  id           text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  nombre       text NOT NULL,
  descripcion  text NOT NULL,
  icono        text,
  orden        smallint NOT NULL
);

CREATE TABLE contenido.texto_institucional (
  clave           text PRIMARY KEY CHECK (clave ~ '^[a-z0-9-]+$'),
  titulo          text,
  texto           text NOT NULL,
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE contenido.texto_institucional IS 'Misión, visión, quiénes somos y demás textos fijos del sitio';
CREATE TRIGGER texto_actualizado BEFORE UPDATE ON contenido.texto_institucional
  FOR EACH ROW EXECUTE FUNCTION public.tocar_actualizado();
