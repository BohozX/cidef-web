# CIDEF — sitio web

Sitio del **Centro de Inteligencia en Desarrollo Económico y Financiero**.
Astro 5 + TypeScript + Tailwind 4, con GSAP/ScrollTrigger para el movimiento y
Apache ECharts para los gráficos históricos. Salida estática, preparada para
Cloudflare Pages.

---

## 1. Arranque

Node.js 20+ (el proyecto se desarrolló con la 24 LTS).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/
npm run preview    # sirve dist/
npm run check      # astro check (tipos)
```

> En este equipo Node no estaba instalado en el sistema. Se descargó la versión
> portable oficial (verificada contra el `SHASUMS256.txt` de nodejs.org) en
> `.tools/node-v24.20.0-win-x64/`. Para usarla en una terminal nueva:
>
> ```powershell
> $env:Path = "D:\PYTHON CODES VS\WEB CIDEF\.tools\node-v24.20.0-win-x64;" + $env:Path
> ```
>
> `.tools/` está en `.gitignore`. Si prefieres una instalación normal:
> `winget install OpenJS.NodeJS.LTS` y borra la carpeta.

---

## 2. Sistema visual

Paleta derivada del logo y de la fotografía nocturna de La Paz.
Los tokens viven en `src/styles/global.css` (`@theme`).

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#031a24` | Azul noche. Fondo oscuro dominante |
| `--color-ink-700` | `#04313a` | Azul petróleo. Degradados |
| `--color-teal-900` / `--color-teal` | `#005c59` / `#008c85` | Verde petróleo y turquesa. Datos y enlaces |
| `--color-teal-300` | `#4fb3ac` | Turquesa claro sobre fondo oscuro |
| `--color-gold` | `#d29a28` | **Solo acento**: números, líneas, botón principal, hover |
| `--color-paper` | `#f5f3ed` | Blanco cálido. Fondo claro |
| `--color-paper-200` | `#ece9e0` | Segundo tono claro, para el ritmo entre secciones |

**Tipografía.** *Newsreader* (serif editorial) para títulos, cifras y citas;
*Inter* para interfaz y texto corrido. Los datos usan cifras tabulares
(`.tnum`).

**Recursos editoriales.** Líneas de 1 px (`.rule`), etiquetas en versalitas
(`.eyebrow`), numeración de sección (`.index-num`), superficies alternas
(`.surface-light` / `.surface-tint` / `.surface-deep` / `.surface-dark`) para
crear ritmo. Radios pequeños (2–5 px) y muy pocas tarjetas: la mayor parte del
diseño es tipografía, línea y espacio.

---

## 3. Arquitectura

```
src/
├── site.config.ts          Identidad, navegación, contacto, rutas de marca
├── content.config.ts       Esquemas de las colecciones (Zod)
├── styles/global.css       Sistema visual completo
├── scripts/motion.ts       GSAP + ScrollTrigger (reveal, contadores, parallax)
├── lib/
│   ├── format.ts           Formato es-BO de números y fechas, citas
│   ├── indicators.ts       Capa de acceso al Radar (hoy JSON, mañana API)
│   ├── sparkline.ts        Sparklines SVG generadas en build
│   └── echarts.ts          Registro único y tree-shakeable de ECharts
├── data/
│   ├── indicators.json     20 indicadores DEMO con serie histórica
│   ├── categories.json     Categorías del Radar
│   └── archivo.json        Recursos del Archivo Vivo
├── content/
│   ├── publicaciones/      Análisis (Markdown)
│   ├── eventos/            Agenda
│   ├── investigadores/     Equipo
│   └── formacion/          Diplomados
├── components/             (ver abajo)
├── layouts/BaseLayout.astro
└── pages/
```

### Componentes

`Header` · `Footer` · `Logo` · `SearchOverlay` · `Hero` · `FeaturedResearch` ·
`EconomicRadar` · `IndicatorCard` · `Sparkline` · `IndicatorChart` ·
`OwnIndicatorSpotlight` · `ResearchCard` · `ArchiveSearch` · `AgendaItem` ·
`ResearcherCard` · `ProgramCard` · `InstitutionalStrip` · `Newsletter` ·
`SectionHeader` · `PageHero`

### Rutas

| Ruta | Contenido |
|---|---|
| `/` | Portada |
| `/radar` | Plataforma de indicadores (panorama + categorías + filtros) |
| `/radar/[id]` | Ficha del indicador: serie histórica, metadatos, descargas, vintages |
| `/analisis` | Listado con buscador, filtros y vista lista/cuadrícula |
| `/analisis/[id]` | Publicación: resumen, hallazgos, descargas, cita APA/BibTeX/RIS |
| `/archivo` | Archivo Vivo: buscador, filtros y orden |
| `/formacion` | Oferta académica |
| `/formacion/[id]` | Programa: malla, claustro, costo, requisitos |
| `/agenda` | Próximas y realizadas |
| `/agenda/[id]` | Evento con materiales |
| `/nosotros` | Quiénes somos, misión, áreas, equipo, alianzas, contacto |
| `/404` | Página no encontrada |

---

## 4. Datos

### Estado actual: DEMO

**Los 20 indicadores del Radar son series sintéticas**, generadas con
`tools/generate_demo_data.py`. Cada uno lleva `"demo": true` y la interfaz lo
muestra con la etiqueta *Demo*. El pie de página repite el aviso. Ninguna cifra
debe presentarse como oficial.

```bash
python tools/generate_demo_data.py     # regenera src/data/*.json
```

### Conectar datos reales

`src/lib/indicators.ts` es el único punto de acceso. Reemplaza la lectura de
`indicators.json` por la respuesta de tu API manteniendo el esquema:

```jsonc
{
  "id": "inflacion-interanual",
  "name": "Inflación interanual",
  "shortName": "Inflación",
  "category": "precios",          // ver categories.json
  "unit": "%", "decimals": 2,
  "frequency": "Mensual", "periodicity": "Mensual",
  "source": "INE", "sourceUrl": "https://www.ine.gob.bo/",
  "own": false,                    // true = estimación del centro
  "demo": false,
  "featured": true,                // aparece en la portada
  "description": "…", "methodology": "…",
  "history": [{ "d": "2019-09-01", "v": 1.82 }],
  "value": 6.64, "change": -0.52, "changeUnit": "pp",
  "date": "2026-08-01", "updated": "2026-09-01",

  // solo indicadores propios
  "ciLow": -1.94, "ciHigh": 0.36,
  "version": "v2026.08",
  "authors": ["Equipo de Coyuntura CIDEF"],
  "vintages": [{ "version": "v2026.07", "date": "2026-07-31", "value": -0.48, "note": "…" }]
}
```

### Indicadores del Centro

La categoría `centro` está separada visualmente (borde dorado y aviso
explícito) y cada ficha publica metodología, versión, autores, intervalo de
confianza e **historial de vintages**: una revisión nunca sobrescribe a la
anterior.

### Contenido de ejemplo

- **Real:** el Working Paper Nº 001 (MPRA 130426) y los tres diplomados
  (datos tomados de los brochures).
- **De ejemplo (`demo: true`):** las otras cinco publicaciones, los cinco
  eventos, los cinco perfiles de investigador y casi todo el Archivo Vivo.
  Los perfiles aparecen con el nombre «Nombre Apellido» y la etiqueta
  *Perfil de ejemplo*: **hay que reemplazarlos antes de publicar.**

> Nota sobre el brochure de Modelación Macroeconómica: su página de
> certificación repite por error las certificaciones intermedias del diplomado
> de minería. No se replicó ese error; el campo `certificates` quedó vacío para
> ese programa. Complétalo cuando tengas el texto correcto.

---

## 5. Marca y fotografía

Los recursos se generan del archivo original con:

```bash
python tools/prepare_assets.py
python tools/prepare_assets.py --logo RUTA.png --foto RUTA.jpg
```

Produce en `public/media/`:

| Archivo | Uso |
|---|---|
| `logo-cidef.png` | Lockup apilado a color (fondo claro) |
| `logo-cidef-inv.png` | Lockup apilado, versión reversa (fondo oscuro) |
| `logo-cidef-h.png` | Lockup horizontal a color |
| `logo-cidef-h-inv.png` | Lockup horizontal reverso — header y pie |
| `logo-cidef-mark.png` | Solo el símbolo |
| `lapaz-illimani{,-1200,-800}.{jpg,webp}` | Portada, tres anchos |
| `favicon.png` (en `public/`) | Icono |

El script **no rediseña la marca**: recorta el margen, genera transparencia,
compone en horizontal los dos elementos que ya existen en el original
(símbolo + logotipo) y produce la versión reversa a dos tintas —papel cálido
con el dorado conservado— porque las letras del original van de negro a
turquesa y recolorearlas píxel a píxel las rompía.

Las rutas se declaran en `site.logos` (`src/site.config.ts`). Si cambias el
archivo fuente, vuelve a ejecutar el script.

---

## 6. Movimiento

`src/scripts/motion.ts`, con `gsap.matchMedia()`:

- **Entrada del hero:** secuencia escalonada de ~1,2 s que no bloquea nada.
- **Reveal en scroll:** fade + `translateY` de 16–26 px, 600–620 ms, stagger de
  40–100 ms, **una sola vez** (`once: true`).
- **Contadores:** `count-up` de 0,9 s al entrar en viewport.
- **Sparklines:** el trazo se dibuja con `stroke-dashoffset`.
- **Líneas:** se expanden horizontalmente (`.rule-draw`).
- **Parallax:** solo en escritorio, `scrub` suave; la portada además escala de
  1 → 1,1 (`data-parallax` / `data-parallax-scale`).

Salvaguardas: `prefers-reduced-motion` desactiva todo; sin JavaScript el CSS
deja el contenido visible (`.no-js`); y una red de seguridad revela cualquier
bloque que quedara en opacidad 0 dentro del viewport.

---

## 7. Gráficos

Todos comparten lenguaje: fondo transparente, rejilla muy tenue, sin ruido,
Inter, tooltip sobrio, un solo color por serie (turquesa para fuentes
oficiales, dorado para estimaciones propias) y pie con fuente y elaboración.

ECharts se registra en `src/lib/echarts.ts` con importaciones estáticas
(tree-shaking) y se carga **de forma diferida** cuando el gráfico entra en
viewport: ~157 kB gzip en un chunk aparte que nunca bloquea el renderizado.
Para añadir otro tipo de gráfico, regístralo ahí y no en cada componente.

Las sparklines de las tarjetas son SVG generado en build: **cero JavaScript**.

---

## 8. Accesibilidad y SEO

HTML semántico, `lang="es-BO"`, enlace de salto al contenido, foco visible en
dorado, `aria-*` en menús, buscador, pestañas de cita y filtros, contraste AA,
`prefers-reduced-motion`, y hoja de impresión.

`title`/`description` por página, canónica, OpenGraph, Twitter cards, sitemap
(`@astrojs/sitemap`), `robots.txt`, y JSON-LD: `ResearchOrganization` global,
`ScholarlyArticle` en publicaciones, `Dataset` en indicadores, `Event` en
agenda y `Course` en programas.

---

## 9. Despliegue en Cloudflare Pages

| Ajuste | Valor |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `20` o superior (variable `NODE_VERSION`) |

`public/_headers` ya define el cacheo (`/_astro/*` inmutable, HTML revalidado)
y cabeceras de seguridad básicas.

**Antes de publicar:**

1. Cambiar `site` en `astro.config.mjs` y `site.url` en `src/site.config.ts`
   por el dominio real (también en `public/robots.txt`).
2. Reemplazar los perfiles de investigador de ejemplo.
3. Conectar el formulario del boletín (`src/components/Newsletter.astro`).
4. Sustituir las series demo por datos reales, o dejar el aviso visible.
5. Revisar `site.contact.email`: hoy es un marcador.

---

## 10. Revisión visual

Con el servidor de vista previa corriendo:

```bash
npm run preview -- --port 4321
python tools/screenshots.py                    # escritorio, 1440×900
python tools/screenshots.py --mobile           # 390×844
python tools/screenshots.py --full --only home # página completa
```

Las capturas van a `.preview/` (ignorada por git). El modo `--full` desactiva
el movimiento para que la revisión estructural sea fiable.
