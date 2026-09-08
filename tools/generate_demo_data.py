# -*- coding: utf-8 -*-
"""
Genera los datos DEMO del Radar Económico.

IMPORTANTE
----------
Las series producidas aquí son SINTÉTICAS y sirven únicamente para
maquetar la plataforma. Cada indicador queda marcado con `"demo": true`
y la interfaz muestra ese estado de forma explícita. Al conectar las
fuentes reales (INE, BCB, ...) basta con reemplazar el JSON manteniendo
el mismo esquema.

Uso:
    python tools/generate_demo_data.py
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "src" / "data"

random.seed(20260903)

CATEGORIES = [
    {
        "id": "panorama",
        "name": "Panorama general",
        "description": "Lectura transversal de la economía boliviana en un solo tablero.",
    },
    {
        "id": "precios",
        "name": "Precios",
        "description": "Inflación, núcleo, alimentos y expectativas de precios.",
    },
    {
        "id": "actividad",
        "name": "Actividad económica",
        "description": "Producto, índices de actividad y desempeño sectorial.",
    },
    {
        "id": "externo",
        "name": "Sector externo",
        "description": "Balanza de pagos, reservas, tipo de cambio y comercio exterior.",
    },
    {
        "id": "monetario",
        "name": "Monetario y financiero",
        "description": "Agregados monetarios, crédito, depósitos y tasas de interés.",
    },
    {
        "id": "fiscal",
        "name": "Sector fiscal",
        "description": "Resultado fiscal, deuda pública, ingresos y gasto.",
    },
    {
        "id": "laboral",
        "name": "Mercado laboral",
        "description": "Empleo, desocupación, informalidad e ingresos laborales.",
    },
    {
        "id": "comercio",
        "name": "Comercio",
        "description": "Exportaciones, importaciones y saldo comercial por sector.",
    },
    {
        "id": "centro",
        "name": "Indicadores del Centro",
        "description": "Estimaciones propias del CIDEF con metodología publicada.",
    },
]


def months(n: int, end_year: int = 2026, end_month: int = 8) -> list[str]:
    """Últimas `n` fechas mensuales terminando en end_year/end_month."""
    out: list[str] = []
    y, m = end_year, end_month
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}-01")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(out))


def quarters(n: int, end_year: int = 2026, end_q: int = 2) -> list[str]:
    out: list[str] = []
    y, q = end_year, end_q
    for _ in range(n):
        out.append(f"{y:04d}-{q * 3 - 2:02d}-01")
        q -= 1
        if q == 0:
            q = 4
            y -= 1
    return list(reversed(out))


def walk(
    start: float,
    n: int,
    drift: float = 0.0,
    vol: float = 1.0,
    floor: float | None = None,
    cap: float | None = None,
    season: float = 0.0,
    decimals: int = 2,
) -> list[float]:
    """Camino aleatorio con deriva, estacionalidad y topes suaves."""
    vals: list[float] = []
    x = start
    for i in range(n):
        x += drift + random.gauss(0, vol)
        x += season * math.sin(2 * math.pi * i / 12)
        if floor is not None:
            x = max(floor, x)
        if cap is not None:
            x = min(cap, x)
        vals.append(round(x, decimals))
    return vals


def spiky(
    n: int,
    base: float = 12.0,
    rho: float = 0.86,
    vol: float = 2.4,
    spike_prob: float = 0.06,
    spike_size: float = 26.0,
    decimals: int = 1,
) -> list[float]:
    """Proceso con reversión a la media y picos ocasionales.

    Adecuado para índices de incertidumbre o tensión, que no siguen un
    camino aleatorio sino episodios puntuales seguidos de normalización.
    """
    vals: list[float] = []
    x = base
    for _ in range(n):
        x = base + rho * (x - base) + random.gauss(0, vol)
        if random.random() < spike_prob:
            x += abs(random.gauss(spike_size, spike_size * 0.4))
        x = max(1.0, min(100.0, x))
        vals.append(round(x, decimals))
    return vals


def series(dates: list[str], values: list[float]) -> list[dict]:
    return [{"d": d, "v": v} for d, v in zip(dates, values)]


M84 = months(84)
M60 = months(60)
Q28 = quarters(28)


def build() -> list[dict]:
    inds: list[dict] = []

    # ------------------------------------------------------------ PRECIOS --
    v = walk(2.1, 84, drift=0.075, vol=0.30, floor=0.2, cap=16.0, season=0.10)
    inds.append(
        dict(
            id="inflacion-interanual",
            name="Inflación interanual",
            shortName="Inflación",
            category="precios",
            unit="%",
            decimals=2,
            frequency="Mensual",
            source="INE",
            sourceUrl="https://www.ine.gob.bo/",
            own=False,
            featured=True,
            description=(
                "Variación porcentual del Índice de Precios al Consumidor respecto "
                "del mismo mes del año anterior."
            ),
            methodology=(
                "Se calcula como la variación del IPC nacional entre el mes de "
                "referencia y el mismo mes del año previo. El IPC es elaborado por "
                "el Instituto Nacional de Estadística con base en una canasta "
                "representativa del consumo de los hogares."
            ),
            history=series(M84, v),
        )
    )

    v = walk(1.9, 84, drift=0.062, vol=0.28, floor=0.3, cap=13.0)
    inds.append(
        dict(
            id="inflacion-nucleo",
            name="Inflación núcleo",
            shortName="Núcleo",
            category="precios",
            unit="%",
            decimals=2,
            frequency="Mensual",
            source="INE",
            own=False,
            description=(
                "Inflación que excluye los componentes más volátiles de la canasta, "
                "como alimentos frescos y energía."
            ),
            methodology=(
                "Exclusión por criterio fijo de los rubros de mayor volatilidad "
                "histórica dentro del IPC."
            ),
            history=series(M84, v),
        )
    )

    v = walk(2.4, 84, drift=0.096, vol=0.42, floor=0.0, cap=24.0, season=0.35)
    inds.append(
        dict(
            id="inflacion-alimentos",
            name="Inflación de alimentos",
            shortName="Alimentos",
            category="precios",
            unit="%",
            decimals=2,
            frequency="Mensual",
            source="INE",
            own=False,
            description="Variación interanual de la división de alimentos y bebidas del IPC.",
            methodology="Subíndice de alimentos y bebidas no alcohólicas del IPC nacional.",
            history=series(M84, v),
        )
    )

    # ------------------------------------------------------- SECTOR EXTERNO --
    # (serie construida abajo: tramo fijo + flexibilizacion)
    v = [6.96] * 44 + walk(6.96, 16, drift=0.11, vol=0.05, floor=6.96, cap=9.9)
    inds.append(
        dict(
            id="tipo-cambio",
            name="Tipo de cambio de referencia",
            shortName="Tipo de cambio",
            category="externo",
            unit="Bs",
            decimals=2,
            frequency="Diaria",
            source="BCB",
            sourceUrl="https://www.bcb.gob.bo/",
            own=False,
            featured=True,
            description=(
                "Cotización de referencia del dólar estadounidense frente al "
                "boliviano publicada por la autoridad monetaria."
            ),
            methodology=(
                "Serie de la cotización oficial de venta y, desde su publicación, "
                "del valor de referencia calculado a partir de operaciones "
                "efectivas de las entidades financieras."
            ),
            history=series(M60, v),
        )
    )

    v = walk(6000, 60, drift=-62, vol=58, floor=1600, cap=6800, decimals=0)
    inds.append(
        dict(
            id="reservas-internacionales",
            name="Reservas Internacionales Netas",
            shortName="Reservas",
            category="externo",
            unit="USD MM",
            decimals=0,
            frequency="Mensual",
            source="BCB",
            own=False,
            featured=True,
            description="Saldo de Reservas Internacionales Netas del Banco Central de Bolivia.",
            methodology=(
                "Activos externos de reserva bajo control de la autoridad monetaria, "
                "netos de pasivos de corto plazo en moneda extranjera."
            ),
            history=series(M60, v),
        )
    )

    v = walk(-120, 60, drift=2.2, vol=58, floor=-900, cap=700, decimals=0)
    inds.append(
        dict(
            id="saldo-comercial",
            name="Saldo comercial",
            shortName="Saldo comercial",
            category="comercio",
            unit="USD MM",
            decimals=0,
            frequency="Mensual",
            source="INE",
            own=False,
            description="Diferencia entre el valor exportado y el valor importado de bienes.",
            methodology="Exportaciones FOB menos importaciones CIF, según registros aduaneros.",
            history=series(M60, v),
        )
    )

    v = walk(780, 60, drift=1.8, vol=26, floor=420, cap=1500, season=58, decimals=0)
    inds.append(
        dict(
            id="exportaciones",
            name="Exportaciones de bienes",
            shortName="Exportaciones",
            category="comercio",
            unit="USD MM",
            decimals=0,
            frequency="Mensual",
            source="INE",
            own=False,
            featured=True,
            description="Valor mensual de las exportaciones bolivianas de bienes.",
            methodology="Valor FOB de las exportaciones registradas por la administración aduanera.",
            history=series(M60, v),
        )
    )

    v = walk(900, 60, drift=0.5, vol=24, floor=520, cap=1500, season=48, decimals=0)
    inds.append(
        dict(
            id="importaciones",
            name="Importaciones de bienes",
            shortName="Importaciones",
            category="comercio",
            unit="USD MM",
            decimals=0,
            frequency="Mensual",
            source="INE",
            own=False,
            description="Valor mensual de las importaciones bolivianas de bienes.",
            methodology="Valor CIF de las importaciones registradas por la administración aduanera.",
            history=series(M60, v),
        )
    )

    # ------------------------------------------------------------ ACTIVIDAD --
    v = walk(3.1, 84, drift=-0.012, vol=0.28, floor=-9.0, cap=8.0, season=0.22)
    inds.append(
        dict(
            id="imae",
            name="Índice de actividad económica",
            shortName="Actividad",
            category="actividad",
            unit="%",
            decimals=2,
            frequency="Mensual",
            source="INE",
            own=False,
            featured=True,
            description="Variación interanual del índice mensual de actividad económica.",
            methodology=(
                "Agregación ponderada de indicadores sectoriales de alta frecuencia, "
                "expresada como variación respecto del mismo mes del año anterior."
            ),
            history=series(M84, v),
        )
    )

    v = walk(2.8, 28, drift=-0.02, vol=0.45, floor=-8.0, cap=7.0)
    inds.append(
        dict(
            id="pib-trimestral",
            name="PIB trimestral",
            shortName="PIB",
            category="actividad",
            unit="%",
            decimals=2,
            frequency="Trimestral",
            source="INE",
            own=False,
            description="Variación interanual del Producto Interno Bruto a precios constantes.",
            methodology="Cuentas nacionales trimestrales, serie a precios constantes de 1990.",
            history=series(Q28, v),
        )
    )

    # ------------------------------------------------------------ MONETARIO --
    v = walk(9.4, 60, drift=0.06, vol=0.35, floor=4.0, cap=18.0)
    inds.append(
        dict(
            id="tasa-activa",
            name="Tasa activa en moneda nacional",
            shortName="Tasa activa",
            category="monetario",
            unit="%",
            decimals=2,
            frequency="Mensual",
            source="ASFI",
            own=False,
            description="Tasa de interés promedio de las operaciones de crédito en bolivianos.",
            methodology="Promedio ponderado por monto de las operaciones del sistema financiero.",
            history=series(M60, v),
        )
    )

    v = walk(4.2, 60, drift=-0.02, vol=0.32, floor=-6.0, cap=14.0)
    inds.append(
        dict(
            id="credito-privado",
            name="Crédito al sector privado",
            shortName="Crédito",
            category="monetario",
            unit="%",
            decimals=2,
            frequency="Mensual",
            source="ASFI",
            own=False,
            description="Variación interanual de la cartera del sistema financiero al sector privado.",
            methodology="Cartera bruta total del sistema de intermediación financiera.",
            history=series(M60, v),
        )
    )

    v = walk(3.6, 60, drift=-0.01, vol=0.34, floor=-8.0, cap=16.0)
    inds.append(
        dict(
            id="depositos",
            name="Depósitos del público",
            shortName="Depósitos",
            category="monetario",
            unit="%",
            decimals=2,
            frequency="Mensual",
            source="ASFI",
            own=False,
            description="Variación interanual de los depósitos del público en el sistema financiero.",
            methodology="Saldo de depósitos a la vista, caja de ahorro y plazo fijo.",
            history=series(M60, v),
        )
    )

    # --------------------------------------------------------------- FISCAL --
    v = walk(-6.2, 28, drift=0.04, vol=0.50, floor=-13.0, cap=2.0)
    inds.append(
        dict(
            id="resultado-fiscal",
            name="Resultado fiscal del SPNF",
            shortName="Déficit fiscal",
            category="fiscal",
            unit="% PIB",
            decimals=2,
            frequency="Trimestral",
            source="MEFP",
            own=False,
            description="Resultado global del Sector Público No Financiero como porcentaje del PIB.",
            methodology="Ingresos totales menos gastos totales del SPNF, acumulado móvil de cuatro trimestres.",
            history=series(Q28, v),
        )
    )

    v = walk(28.5, 28, drift=0.28, vol=0.45, floor=18.0, cap=60.0)
    inds.append(
        dict(
            id="deuda-externa",
            name="Deuda externa pública",
            shortName="Deuda externa",
            category="fiscal",
            unit="% PIB",
            decimals=2,
            frequency="Trimestral",
            source="BCB",
            own=False,
            description="Saldo de la deuda externa pública como porcentaje del PIB.",
            methodology="Saldo adeudado por el sector público a acreedores externos.",
            history=series(Q28, v),
        )
    )

    # -------------------------------------------------------------- LABORAL --
    v = walk(4.8, 28, drift=-0.01, vol=0.22, floor=2.5, cap=11.0)
    inds.append(
        dict(
            id="desocupacion",
            name="Tasa de desocupación urbana",
            shortName="Desocupación",
            category="laboral",
            unit="%",
            decimals=2,
            frequency="Trimestral",
            source="INE",
            own=False,
            description="Proporción de la población económicamente activa urbana que busca empleo.",
            methodology="Encuesta continua de empleo, cobertura urbana.",
            history=series(Q28, v),
        )
    )

    v = walk(84.0, 28, drift=0.05, vol=0.28, floor=75.0, cap=90.0)
    inds.append(
        dict(
            id="informalidad",
            name="Empleo informal",
            shortName="Informalidad",
            category="laboral",
            unit="%",
            decimals=2,
            frequency="Trimestral",
            source="INE",
            own=False,
            description="Participación del empleo informal en el empleo total.",
            methodology="Clasificación de ocupados según condición de formalidad del puesto de trabajo.",
            history=series(Q28, v),
        )
    )

    # ---------------------------------------------- INDICADORES DEL CENTRO --
    v = walk(2.4, 28, drift=-0.02, vol=0.42, floor=-6.0, cap=6.5)
    inds.append(
        dict(
            id="nowcast-pib",
            name="Nowcast del PIB",
            shortName="Nowcast PIB",
            category="centro",
            unit="%",
            decimals=2,
            frequency="Semanal",
            source="Estimación CIDEF",
            own=True,
            featured=True,
            ciLow=round(v[-1] - 1.15, 2),
            ciHigh=round(v[-1] + 1.15, 2),
            version="v2026.08",
            authors=["Equipo de Coyuntura CIDEF"],
            description=(
                "Estimación en tiempo real del crecimiento interanual del PIB "
                "trimestral a partir de indicadores de alta frecuencia."
            ),
            methodology=(
                "Modelo de factores dinámicos con datos de frecuencia mixta "
                "(mensual y trimestral) estimado por máxima verosimilitud con "
                "filtro de Kalman. El conjunto de información se actualiza cada "
                "semana y la estimación se revisa a medida que se publican nuevos "
                "datos. Cada revisión se archiva como una versión (vintage) "
                "independiente: las estimaciones previas no se sobrescriben."
            ),
            history=series(Q28, v),
            vintages=[
                {"version": "v2026.08", "date": "2026-08-28", "value": v[-1], "note": "Incorpora actividad de julio."},
                {"version": "v2026.07", "date": "2026-07-31", "value": round(v[-1] + 0.31, 2), "note": "Primera estimación del trimestre."},
                {"version": "v2026.06", "date": "2026-06-26", "value": round(v[-1] + 0.58, 2), "note": "Revisión por datos de comercio exterior."},
            ],
        )
    )

    v = spiky(84, base=13.0, rho=0.85, vol=2.6, spike_prob=0.07, spike_size=30.0)
    inds.append(
        dict(
            id="indice-incertidumbre",
            name="Índice de incertidumbre económica",
            shortName="Incertidumbre",
            category="centro",
            unit="índice",
            decimals=1,
            frequency="Diaria",
            source="Estimación CIDEF",
            own=True,
            version="v3",
            authors=["Equipo de Coyuntura CIDEF"],
            description=(
                "Índice diario que aproxima la incertidumbre económica percibida "
                "a partir de la intensidad de búsquedas y cobertura informativa."
            ),
            methodology=(
                "Construcción a partir de volúmenes relativos de búsqueda "
                "normalizados por ventanas superpuestas y reescalados por factores "
                "de empalme, siguiendo la práctica habitual en la literatura de "
                "índices basados en Google Trends. La serie se normaliza a una "
                "escala de 0 a 100 sobre el período de consulta."
            ),
            history=series(M84, v),
        )
    )

    v = walk(3.4, 28, drift=0.05, vol=0.24, floor=0.5, cap=12.0)
    inds.append(
        dict(
            id="inflacion-esperada",
            name="Inflación esperada a 12 meses",
            shortName="Inflación esperada",
            category="centro",
            unit="%",
            decimals=2,
            frequency="Mensual",
            source="Estimación CIDEF",
            own=True,
            version="v2026.08",
            authors=["Equipo de Coyuntura CIDEF"],
            ciLow=round(v[-1] - 0.9, 2),
            ciHigh=round(v[-1] + 0.9, 2),
            description="Expectativa de inflación a doce meses derivada de un modelo de series de tiempo.",
            methodology=(
                "Proyección fuera de muestra de un modelo ARIMA con variables "
                "exógenas, evaluada mediante validación cruzada temporal."
            ),
            history=series(Q28, v),
        )
    )

    # --------------------------------------------------- campos derivados --

    # El saldo comercial se deriva de exportaciones e importaciones para que
    # el tablero sea internamente coherente.
    by_id = {i["id"]: i for i in inds}
    exp = {p["d"]: p["v"] for p in by_id["exportaciones"]["history"]}
    imp = {p["d"]: p["v"] for p in by_id["importaciones"]["history"]}
    by_id["saldo-comercial"]["history"] = [
        {"d": d, "v": round(exp[d] - imp[d], 0)} for d in sorted(exp) if d in imp
    ]

    for ind in inds:
        hist = ind["history"]
        last = hist[-1]["v"]
        prev = hist[-2]["v"] if len(hist) > 1 else last
        ind["value"] = last
        ind["change"] = round(last - prev, ind["decimals"])
        ind["changeUnit"] = "pp" if ind["unit"] in ("%", "% PIB") else ind["unit"]
        ind["date"] = hist[-1]["d"]
        ind["updated"] = "2026-09-01"
        ind["demo"] = True
        ind.setdefault("featured", False)
        ind.setdefault("sourceUrl", None)
        ind.setdefault("periodicity", ind["frequency"])

    return inds


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    indicators = build()

    (OUT_DIR / "indicators.json").write_text(
        json.dumps(indicators, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT_DIR / "categories.json").write_text(
        json.dumps(CATEGORIES, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"indicadores: {len(indicators)}")
    print(f"categorias : {len(CATEGORIES)}")
    for i in indicators:
        print(f"  - {i['id']:<26} {i['value']:>10} {i['unit']:<8} {i['category']}")


if __name__ == "__main__":
    main()
