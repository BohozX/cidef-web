# Base de datos del CIDEF

PostgreSQL 18 local (`D:\SQL`, puerto 5432). Una base, `cidef`, con dos esquemas:

- `atlas`: fuentes, sectores, indicadores, archivos originales, versiones y observaciones.
- `contenido`: publicaciones, personas, eventos, programas, aliados, imágenes y textos institucionales.

## Archivos

| Archivo | Qué hace |
|---|---|
| `01_atlas.sql` | Tablas y tipos del esquema `atlas` |
| `02_contenido.sql` | Tablas y tipos del esquema `contenido` |
| `03_enlaces_y_vistas.sql` | Enlaces entre esquemas y las vistas `version_vigente`, `serie_vigente` y `ultimo_dato` |
| `04_roles.sql` | Roles sin inicio de sesión: `cidef_lector`, `atlas_editor`, `contenido_editor` |
| `cargar_atlas.mjs` | Genera el SQL que carga fuentes, sectores, fichas de indicadores y el registro de `datos/manifiesto.csv` |
| `cargar_series.mjs` | Genera el SQL que carga `datos/series/*.csv` como versiones y observaciones |

## Crear la base desde cero

```bash
export PGCLIENTENCODING=UTF8
psql -U postgres -h localhost -d postgres -c "CREATE DATABASE cidef ENCODING 'UTF8' TEMPLATE template0;"
psql -U postgres -h localhost -d cidef -v ON_ERROR_STOP=1 -1 -f db/01_atlas.sql -f db/02_contenido.sql -f db/03_enlaces_y_vistas.sql -f db/04_roles.sql
```

## Cargar o actualizar los metadatos

```bash
node db/cargar_atlas.mjs > carga.sql
psql -U postgres -h localhost -d cidef -v ON_ERROR_STOP=1 -f carga.sql
```

Se puede repetir: actualiza lo que existe y no duplica nada.

## Cargar las series

```bash
python datos/extraer.py
node db/cargar_series.mjs > series.sql
psql -U postgres -h localhost -d cidef -f series.sql
```

Cada indicador queda con una `version` cuya etiqueta es el nombre del archivo original y el inicio
de su SHA-256. Si se vuelve a cargar el mismo archivo, esa versión se reemplaza; si la fuente
publicó un archivo nuevo, entra como versión nueva y la anterior se conserva.

La contraseña de `postgres` la lee `psql` de `%APPDATA%\postgresql\pgpass.conf`; nunca va en el repositorio.

## Dónde verla

pgAdmin 4 → servidor *PostgreSQL 18* → `cidef` → *Schemas* → `atlas` o `contenido` → *Tables*.
Clic derecho en una tabla → *View/Edit Data → All Rows*. Para el diagrama: clic derecho en `cidef` → *ERD For Database*.

## Reglas

- `observacion.valor` es `numeric` exacto y `valor_literal` guarda la cifra tal como aparece en el archivo original.
- Una revisión de la fuente entra como `version` nueva; nunca reemplaza a la anterior.
- Último dato y variación salen de las vistas, no se guardan.
- Las imágenes y los PDF no van dentro de la base: `contenido.archivo` guarda su ruta y su huella.
