# Datos del Atlas Económico

Archivos originales de cada indicador, tal como los publica la fuente. Ningún archivo de
`originales/` se edita: si la fuente publica una versión nueva, se descarga de nuevo.

## Estructura

| Ruta | Qué es |
|---|---|
| `fuentes.tsv` | La lista de lo que se descarga: fuente, carpeta, indicadores que cubre, página de origen y enlace directo |
| `descargar.mjs` | Baja cada archivo de la lista y registra su huella |
| `manifiesto.csv` | Un renglón por archivo bajado: tamaño, SHA-256, fecha de descarga y fecha de modificación en origen |
| `originales/<fuente>/<tema>/` | Los archivos tal cual (no se suben a GitHub: se bajan con el script y se verifican con el manifiesto) |
| `extraer.py` | Lee cada archivo original y escribe una serie por indicador |
| `series/<indicador>.csv` | Fecha, cifra literal, archivo, hoja y celda de origen de cada observación |

Para actualizar todo:

```bash
node datos/descargar.mjs
python datos/extraer.py
node db/cargar_atlas.mjs > carga.sql && psql -U postgres -h localhost -d cidef -f carga.sql
node db/cargar_series.mjs > series.sql && psql -U postgres -h localhost -d cidef -f series.sql
```

Lo ya bajado no se repite; con `--forzar` se vuelve a bajar todo, y con `--solo bcb` (o `ine`,
`mefp`...) solo una fuente.

La cifra se lee del XML interno del Excel, que es exactamente lo que guardó la fuente: no pasa
por la conversión a decimal de una librería ni se redondea. Cada fila de `series/` dice de qué
hoja y celda salió, para poder comprobarla abriendo el original.

## De dónde sale cada indicador

| Indicador | Fuente | Archivo |
|---|---|---|
| Inflación interanual | INE | IPC nacional, índice general (`Nal-2026_09_1`) y por división (`_2`) |
| Inflación de alimentos | INE | IPC nacional de alimentos (`Nal-2026_09_5`) |
| Inflación núcleo | BCB | `Inflacion nucleo.xlsx` (también la subyacente) |
| Tipo de cambio | BCB | Tipo de cambio oficial diario, serie histórica, operaciones de 2026 (CSV) y PDF anual |
| Reservas Internacionales | BCB | RIN por componentes y planilla de reservas; también en la estadística semanal |
| Base monetaria | BCB | `1. Base Monetaria.xlsx` y agregados monetarios |
| Crédito al sector privado | BCB | Financiamiento por destino del crédito (entidades de depósito) |
| Depósitos | BCB | Depósitos totales por monedas (serie) |
| Tasa activa | BCB | Tasas activas y pasivas efectivas, publicación del 28/09/2026 |
| Exportaciones, importaciones, saldo comercial | INE | Comercio exterior según año y mes, 1992-2026; el BCB, para contrastar |
| IGAE | INE | IGAE por mes y sus variaciones, 2008-2024 |
| PIB trimestral | INE | PIB a precios constantes por actividad, 1990-2024, y sus variaciones |
| Industria manufacturera | INE | Índice de volumen de producción, trimestral 2017-2026 |
| Desocupación e informalidad | INE | Indicadores de empleo urbano por trimestre, 2015-2026, y boletín ECE |
| Pobreza, pobreza extrema, Gini | INE | Encuesta de Hogares, 2016-2025 (Gini desde 2005) |
| Resultado fiscal | MEFP | Operaciones consolidadas del SPNF 2024, 2025 y 2026 (a julio) |
| Recaudación | MEFP | Ingresos tributarios dentro de las operaciones del SPNF |
| Deuda pública | MEFP | Deuda externa e interna del TGN a julio de 2026 |
| Deuda externa | BCB | Coeficientes de endeudamiento, saldo por acreedor y posición al II trim. 2026 |
| Petróleo Brent | EIA | Precio spot diario; mensual en el Pink Sheet del Banco Mundial |
| Oro | Banco Mundial | Pink Sheet, precio mensual |
| Índice del dólar | Reserva Federal | Índice nominal amplio (H.10) y las 6 monedas con que se calcula el DXY |
| Tasa de la Fed | Fed de Nueva York | Tasa efectiva con rango objetivo, diaria desde 2000 |

## Qué serie se tomó de cada archivo

| Indicador | Serie exacta | Unidad | Desde → hasta |
|---|---|---|---|
| inflacion-interanual | Cuadro 1.4, variación a 12 meses del IPC | % | 2018-01 → 2026-09 |
| inflacion-alimentos | Cuadro 1.4 del índice de alimentos | % | 2019-01 → 2026-09 |
| inflacion-nucleo | Índice núcleo, variación a 12 meses | % | 1994-01 → 2026-08 |
| imae | IGAE, índice general, variación a 12 meses | % | 2008-01 → 2024-12 |
| pib-trimestral | Variación respecto a similar período, PIB | % | 1991-T1 → 2024-T4 |
| exportaciones, importaciones, saldo-comercial | Comercio exterior según año y mes | millones de USD | 1992-01 → 2026-08 |
| desocupacion | Tasa de desocupación urbana (PD/PEA) | % | 2015-T4 → 2026-T2 |
| informalidad | Tasa de ocupación en el sector informal | % | 2015-T4 → 2026-T2 |
| industria | Índice de volumen de producción manufacturera | índice (ref. 2017) | 2017-T1 → 2026-T2 |
| reservas-internacionales | Reservas Internacionales Netas | millones de USD | 2002-01 → 2026-09 |
| base-monetaria | Base monetaria (BM) | miles de Bs | 1989-01 → 2026-08 |
| credito-privado | Crédito del sistema financiero al sector privado (estadística semanal) | millones de USD | 1998-03 → 2026-08 |
| depositos | Depósitos en entidades de intermediación financiera (estadística semanal) | millones de USD | 1987-12 → 2026-08 |
| tipo-cambio | Tipo de cambio oficial, columna Compra, diario | Bs | 1990-01-01 → 2026-09-30 |
| deuda-externa | Deuda pública externa / PIB | % del PIB | 2017 → 2026 (p) |
| resultado-fiscal | Superávit (déficit) global del SPNF, mensual | millones de Bs | 2024-01 → 2026-07 |
| recaudacion | Ingresos tributarios del SPNF, mensual | millones de Bs | 2024-01 → 2026-07 |
| pobreza, pobreza-extrema | Incidencia, Bolivia | % de la población | 2016 → 2025 |
| gini | Índice de Gini del ingreso per cápita, Bolivia | índice | 2005 → 2025 |
| petroleo-brent | Europe Brent Spot Price FOB, diario | USD por barril | 1987-05-20 → 2026-10-06 |
| oro | Gold, Pink Sheet | USD por onza troy | 1960-01 → 2026-09 |
| dxy | Índice nominal amplio del dólar (H.10) | índice (enero 1997 = 100) | 2006-01-02 → 2026-10-02 |
| fed-funds | Tasa efectiva de fondos federales, con rango objetivo como límites | % | 2000-07-03 → 2026-10-09 |

## Lo que cambia respecto del sitio

- El IGAE y el PIB trimestral del INE llegan a 2024: el INE no publicó cifras más nuevas.
- La industria manufacturera del INE es trimestral (el sitio la mostraba mensual).
- La base monetaria se publica en miles de bolivianos; crédito y depósitos, como saldos en
  millones de USD (el sitio mostraba variaciones).
- El resultado fiscal y la recaudación se publican como montos mensuales en millones de Bs; el
  sitio los mostraba como % del PIB, que sería un cálculo propio.
- El tipo de cambio oficial que publica el BCB es la columna Compra; desde el 27/06/2026 el BCB
  publica un solo valor.
- El oro diario de Londres (LBMA) no permite descarga; se usa el promedio mensual del Banco Mundial.
- El DXY es de ICE y no es público; se usa el índice amplio del dólar de la Reserva Federal.
- La tasa de la Fed es la efectiva diaria (EFFR); el rango objetivo queda como límites inferior
  y superior de cada observación.

## Pendiente

- **Tasa activa**: el BCB solo la publica por entidad y tipo de crédito (archivo semanal en
  `bcb/tasas/`); no hay un promedio del sistema que tomar sin calcularlo.
- **Deuda pública total**: el MEFP publica dos fotos (31/12/2025 y 31/07/2026), la externa en USD y
  la interna en Bs; una serie sobre el PIB sería un cálculo propio.
- **ASFI**: su serie histórica de depósitos y cartera solo se exporta con un clic en
  `appweb2.asfi.gob.bo/paginaspublicas2/VistaCartera/Cartera.aspx` ("Bajar a Excel") y llega a 04-2025.
- **Salario mínimo**: el decreto de 2026 (Bs 3.300) no está en el sitio del Ministerio de
  Trabajo; hay que bajarlo de la Gaceta Oficial. La prensa cita el DS 5503 y el DS 5516.
- **Recaudación del SIN**: el SIN no publica una tabla descargable, solo folletos en PDF.
- **Estimaciones del Centro** (nowcast, incertidumbre, inflación esperada, paralelo, brecha,
  volumen P2P): todavía no existen; no salen de ninguna fuente externa.
