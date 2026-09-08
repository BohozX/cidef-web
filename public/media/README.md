# Recursos gráficos

## 1. Fotografía de portada

Coloca aquí la fotografía nocturna de La Paz con el Illimani:

```
public/media/lapaz-illimani.jpg      (o .webp / .avif)
```

Luego actualiza la ruta en `src/site.config.ts`:

```ts
heroImage: '/media/lapaz-illimani.jpg',
```

Recomendaciones:

- Exportar a **2400 px** de ancho como máximo, calidad 78–82.
- Preferir **AVIF** o **WebP**; si se usan varias, declararlas en el `<picture>`
  de `src/components/Hero.astro`.
- La portada aplica un velo azul petróleo por CSS: **no** oscurecer la foto en
  el editor de imágenes, se vería doblemente apagada.

Mientras no exista el archivo, el sitio usa `lapaz-illimani.svg`, un respaldo
vectorial que reproduce la composición (cielo nocturno, macizo nevado, luces de
la hoyada). Se regenera con:

```
python tools/generate_hero_fallback.py
```

## 2. Logo institucional

Coloca el archivo oficial —**sin rediseñarlo ni reinterpretarlo**— en:

```
public/media/logo-cidef.png     (fondo transparente, alto mínimo 240 px)
```

y actualiza `src/site.config.ts`:

```ts
logo: '/media/logo-cidef.png',
```

Mientras `logo` sea `null`, el header y el pie usan el logotipo tipográfico
(«CIDEF» en Newsreader), que funciona correctamente sobre fondo oscuro y claro.

## 3. Retratos del equipo

```
public/media/equipo/<slug>.jpg
```

Formato **cuadrado**, 800×800 px, encuadre a la altura del pecho. El tratamiento
uniforme (desaturación parcial y velo petróleo) lo aplica el componente
`ResearcherCard.astro`; no hace falta editar las fotos.

## 4. Logotipos de las instituciones que respaldan

```
public/media/aliados/
```

Los declara `src/components/PartnersStrip.astro`, en el array `partners`:
pon la ruta en `logo` y aparece; déjala en `null` y esa entrada muestra un
sello con las iniciales.

| Institución | Estado |
|---|---|
| Universidad Franz Tamayo | `unifranz-logo-dark.svg`, descargado de `unifranz.edu.bo` |
| Colegio de Economistas de La Paz | **falta** — su dominio `economistas.org.bo` no resuelve |
| Escuela de Postgrado MSC | **falta** — sin sitio oficial localizable |

Para los que faltan: deja el archivo en esa carpeta (SVG preferible, o PNG con
fondo transparente y 300 px de ancho mínimo) y apunta la ruta en `logo`. La
caja de marca mide 134×50 px y encaja el logotipo por dentro, así que sirve
tanto un logotipo horizontal como uno cuadrado.

Son marcas de terceros: úsalas solo con autorización de cada institución.
