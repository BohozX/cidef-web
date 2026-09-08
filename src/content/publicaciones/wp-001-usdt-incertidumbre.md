---
title: "La dinámica del precio del USDT en Bolivia ante episodios de incertidumbre interna, 2023–2026"
type: "Working Paper"
serial: "Nº 001"
date: 2026-08-10
authors:
  - "Daniel Bohoz Oros Trujillo"
abstract: >-
  El mercado cambiario boliviano llegó a 2023 tras varios años de menor
  disponibilidad de divisas, con caída de los ingresos por exportaciones y
  reducción sostenida de las reservas internacionales. Desde ese año, el mercado
  paralelo se consolidó y la cotización del USDT adquirió mayor importancia como
  referencia del valor del dólar. Sin embargo, episodios de conflictividad
  similar —e incluso más intensa— coincidieron con respuestas muy distintas de
  esa cotización. El documento examina si el efecto de la incertidumbre cambiaria
  y de la conflictividad social sobre el retorno diario del precio del USDT
  cambió entre julio de 2023 y junio de 2026, mediante un modelo de parámetros
  variables con volatilidad estocástica (TVP-SV) y un eGARCH estimado sobre
  ventanas móviles.
findings:
  - "Inicialmente, una mayor conflictividad social estuvo asociada con mayores presiones al alza sobre la cotización del USDT."
  - "Junio de 2025 marca el punto de transición: la evidencia positiva sostenida se pierde el 12 de junio para el índice de incertidumbre cambiaria y el 25 de junio para el indicador de conflictividad social."
  - "Desde fines de 2025 la relación llega a invertirse, en un contexto de cambio de gobierno y publicación del Valor Referencial del Dólar."
  - "Bajo un mismo escenario de incremento de la incertidumbre interna, la respuesta estimada pasa de +Bs 0,029 diarios a −Bs 0,031 diarios entre etapas."
  - "La volatilidad no respondió mecánicamente a la intensidad del conflicto: los prolongados bloqueos de 2026 no generaron picos comparables a los de agosto de 2024 o mayo de 2025."
topics:
  - "Sector externo"
  - "Macroeconomía"
  - "Econometría financiera"
keywords:
  - "dólar digital"
  - "mercado cambiario paralelo"
  - "incertidumbre cambiaria"
  - "conflictividad social"
  - "parámetros variables en el tiempo"
jel:
  - "E31"
  - "F31"
  - "G15"
  - "C22"
pages: 34
externalUrl: "https://mpra.ub.uni-muenchen.de/130426/"
files:
  - label: "Documento completo (MPRA)"
    href: "https://mpra.ub.uni-muenchen.de/130426/"
    kind: "pdf"
    note: "MPRA Paper No. 130426"
featured: true
demo: false
---

## Planteamiento

Entre 2023 y 2026 el mercado cambiario boliviano atravesó una transformación
marcada por crecientes dificultades de acceso a dólares al tipo de cambio
oficial y por la consolidación de cotizaciones alternativas. En ese entorno, el
Tether USD (USDT) adquirió relevancia como activo digital vinculado al dólar
estadounidense y su cotización pasó a constituir una de las referencias más
visibles del valor de la divisa fuera del mercado oficial.

El precio del USDT no respondió de manera uniforme ante los episodios de
conflictividad del período. Algunos estuvieron acompañados por fuertes presiones
al alza; otros, incluso de mayor duración o intensidad, coincidieron con efectos
mucho más moderados o con descensos del precio. Esa heterogeneidad es el punto
de partida del trabajo.

## Datos

- **Precio del USDT.** Cotización diaria del mercado P2P de Binance, promedio
  simple de las cinco mejores ofertas del día.
- **Índice de incertidumbre cambiaria (IIC).** Construido con búsquedas de
  Google Trends para Bolivia, empalmando doce ventanas diarias superpuestas y
  reescalándolas mediante factores calculados sobre los días comunes.
- **Indicador de conflictividad social (ICS).** Número diario de puntos
  geográficos con al menos un bloqueo activo clasificado como *No transitable
  por conflictos sociales* en el Mapa de Transitabilidad de la ABC, recopilado
  mediante *web scraping*.

La muestra efectiva comprende 1.067 observaciones diarias entre el 30 de julio
de 2023 y el 30 de junio de 2026.

## Estrategia econométrica

Se combinan dos enfoques complementarios. El **TVP-SV** describe la evolución
gradual de los coeficientes y de la volatilidad a lo largo de toda la muestra,
sin imponer una fecha de quiebre. El **eGARCH sobre ventanas móviles** de 250
observaciones señala en qué tramos esa relación alcanza significancia
estadística, exigiendo además el cumplimiento simultáneo de la batería de
diagnósticos residuales.

## Resultado principal

No cambió necesariamente la existencia ni la intensidad de la incertidumbre,
sino la forma en que esta se relacionó con el precio del USDT. La cotización
aparece como una referencia cuya sensibilidad frente a la incertidumbre depende
del contexto institucional en el que esta se produce.
