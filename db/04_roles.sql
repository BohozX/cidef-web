DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cidef_lector') THEN CREATE ROLE cidef_lector NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'atlas_editor') THEN CREATE ROLE atlas_editor NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'contenido_editor') THEN CREATE ROLE contenido_editor NOLOGIN; END IF;
END;
$$;

GRANT USAGE ON SCHEMA atlas, contenido TO cidef_lector, atlas_editor, contenido_editor;
GRANT SELECT ON ALL TABLES IN SCHEMA atlas, contenido TO cidef_lector, atlas_editor, contenido_editor;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA atlas TO atlas_editor;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA contenido TO contenido_editor;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA atlas TO atlas_editor;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA contenido TO contenido_editor;

ALTER DEFAULT PRIVILEGES IN SCHEMA atlas, contenido GRANT SELECT ON TABLES TO cidef_lector, atlas_editor, contenido_editor;
ALTER DEFAULT PRIVILEGES IN SCHEMA atlas GRANT INSERT, UPDATE, DELETE ON TABLES TO atlas_editor;
ALTER DEFAULT PRIVILEGES IN SCHEMA contenido GRANT INSERT, UPDATE, DELETE ON TABLES TO contenido_editor;
