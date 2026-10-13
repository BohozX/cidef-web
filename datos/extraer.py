import csv
import datetime as dt
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation
from pathlib import Path

import xlrd

RAIZ = Path(__file__).resolve().parent
ORIGINALES = RAIZ / "originales"
SALIDA = RAIZ / "series"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7,
    "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "sep": 9,
    "set": 9, "oct": 10, "nov": 11, "dic": 12,
}
TRIMESTRES = {"i": 1, "ii": 4, "iii": 7, "iv": 10}


def norm(s):
    if s is None:
        return ""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()


def letras(c):
    s = ""
    c += 1
    while c:
        c, r = divmod(c - 1, 26)
        s = chr(65 + r) + s
    return s


def ref_a_rc(ref):
    m = re.match(r"([A-Z]+)(\d+)", ref)
    col = 0
    for ch in m.group(1):
        col = col * 26 + ord(ch) - 64
    return int(m.group(2)) - 1, col - 1


class Hoja:
    def __init__(self, nombre, celdas):
        self.nombre = nombre
        self.celdas = celdas
        self.filas = max((r for r, _ in celdas), default=-1) + 1
        self.columnas = max((c for _, c in celdas), default=-1) + 1

    def lit(self, r, c):
        v = self.celdas.get((r, c))
        return None if v is None else v[1]

    def txt(self, r, c):
        return norm(self.lit(r, c))

    def es_numero(self, r, c):
        v = self.celdas.get((r, c))
        return v is not None and v[0] == "n"

    def buscar(self, patron, col=None):
        rx = re.compile(patron)
        return [(r, c) for (r, c) in sorted(self.celdas) if (col is None or c == col) and rx.search(self.txt(r, c))]


def leer_xlsx(ruta):
    z = zipfile.ZipFile(ruta)
    nombres = {n.lower(): n for n in z.namelist()}
    compartidas = []
    if "xl/sharedstrings.xml" in nombres:
        for si in ET.fromstring(z.read(nombres["xl/sharedstrings.xml"])).iter(NS + "si"):
            compartidas.append("".join(t.text or "" for t in si.iter(NS + "t")))
    libro = ET.fromstring(z.read(nombres["xl/workbook.xml"]))
    rels = ET.fromstring(z.read(nombres["xl/_rels/workbook.xml.rels"]))
    destino = {r.get("Id"): r.get("Target") for r in rels}
    hojas = {}
    for s in libro.iter(NS + "sheet"):
        objetivo = destino[s.get(NS_REL + "id")].lstrip("/")
        objetivo = objetivo if objetivo.startswith("xl/") else "xl/" + objetivo
        celdas = {}
        for ev, el in ET.iterparse(z.open(nombres[objetivo.lower()]), events=("end",)):
            if el.tag != NS + "c":
                continue
            t = el.get("t", "n")
            v = el.find(NS + "v")
            if t == "inlineStr":
                texto = "".join(x.text or "" for x in el.iter(NS + "t"))
                celdas[ref_a_rc(el.get("r"))] = ("s", texto)
            elif v is not None and v.text is not None:
                if t == "s":
                    celdas[ref_a_rc(el.get("r"))] = ("s", compartidas[int(v.text)])
                elif t in ("str", "e", "b"):
                    celdas[ref_a_rc(el.get("r"))] = ("s", v.text)
                else:
                    celdas[ref_a_rc(el.get("r"))] = ("n", v.text)
            el.clear()
        hojas[s.get("name")] = Hoja(s.get("name"), celdas)
    return hojas


def leer_xls(ruta):
    libro = xlrd.open_workbook(str(ruta))
    hojas = {}
    for h in libro.sheets():
        celdas = {}
        for r in range(h.nrows):
            for c in range(h.ncols):
                x = h.cell(r, c)
                if x.ctype in (xlrd.XL_CELL_NUMBER, xlrd.XL_CELL_DATE):
                    celdas[(r, c)] = ("n", repr(x.value))
                elif x.ctype == xlrd.XL_CELL_TEXT and x.value.strip():
                    celdas[(r, c)] = ("s", x.value)
        hojas[h.name] = Hoja(h.name, celdas)
    return hojas


def leer_csv(ruta):
    celdas = {}
    with open(ruta, encoding="utf-8-sig", newline="") as f:
        for r, fila in enumerate(csv.reader(f)):
            for c, v in enumerate(fila):
                if v.strip():
                    tipo = "n" if re.fullmatch(r"-?\d+(\.\d+)?([eE][-+]?\d+)?", v.strip()) else "s"
                    celdas[(r, c)] = (tipo, v.strip())
    return {"csv": Hoja("csv", celdas)}


def abrir(rel):
    ruta = ORIGINALES / rel
    suf = ruta.suffix.lower()
    if suf == ".xls":
        return leer_xls(ruta)
    if suf == ".csv":
        return leer_csv(ruta)
    return leer_xlsx(ruta)


def hoja(libro, patron):
    for n, h in libro.items():
        if re.search(patron, norm(n)):
            return h
    raise LookupError(f"no hay hoja que coincida con {patron}: {list(libro)}")


def es_valor(lit):
    if lit is None:
        return False
    try:
        Decimal(lit)
        return True
    except InvalidOperation:
        return False


def serial(lit):
    return (dt.date(1899, 12, 30) + dt.timedelta(days=float(lit))).isoformat()


def anio_de(txt):
    m = re.search(r"(19|20)\d{2}", txt or "")
    return int(m.group(0)) if m else None


class Serie:
    def __init__(self, indicador, archivo):
        self.indicador = indicador
        self.archivo = archivo
        self.filas = []

    def agregar(self, fecha, h, r, c, preliminar=False, inferior=None, superior=None):
        lit = h.lit(r, c)
        if not es_valor(lit):
            return
        self.filas.append({
            "indicador": self.indicador, "fecha": fecha, "valor_literal": lit,
            "limite_inferior": inferior or "", "limite_superior": superior or "",
            "preliminar": "true" if preliminar else "false",
            "archivo": self.archivo, "hoja": h.nombre, "celda": f"{letras(c)}{r + 1}",
        })


def tabla_mes_por_anio(serie, h, desde=0, hasta=None):
    hasta = hasta or h.filas
    cab = next(r for r in range(desde, hasta) if h.txt(r, 0) == "mes" or h.txt(r, 1) == "mes")
    col_mes = 0 if h.txt(cab, 0) == "mes" else 1
    anios = {c: anio_de(h.lit(cab, c)) for c in range(col_mes + 1, h.columnas) if anio_de(h.lit(cab, c))}
    for r in range(cab + 1, hasta):
        mes = MESES.get(h.txt(r, col_mes))
        if not mes:
            if h.txt(r, col_mes).startswith(("fuente", "prom", "acum")):
                break
            continue
        for c, a in anios.items():
            serie.agregar(f"{a}-{mes:02d}-01", h, r, c, preliminar="(p)" in h.txt(cab, c))


def ipc_interanual():
    rel = "ine/ipc/" + next(p.name for p in (ORIGINALES / "ine/ipc").glob("Nal-*_1_*.xlsx"))
    s = Serie("inflacion-interanual", rel)
    tabla_mes_por_anio(s, hoja(abrir(rel), r"1\.4"))
    return s


def ipc_alimentos():
    rel = "ine/ipc/" + next(p.name for p in (ORIGINALES / "ine/ipc").glob("Nal-*_5_*.xlsx"))
    h = hoja(abrir(rel), r"bolivia")
    s = Serie("inflacion-alimentos", rel)
    inicio = next(r for r, _ in h.buscar(r"cuadro n.? ?1\.4"))
    tabla_mes_por_anio(s, h, desde=inicio)
    return s


def inflacion_nucleo():
    rel = "bcb/precios/Inflacion nucleo.xlsx"
    h = hoja(abrir(rel), r"mensual")
    s = Serie("inflacion-nucleo", rel)
    col = next(c for r, c in h.buscar(r"a 12 meses"))
    for r in range(h.filas):
        if h.es_numero(r, 0) and float(h.lit(r, 0)) > 20000:
            s.agregar(serial(h.lit(r, 0))[:8] + "01", h, r, col)
    return s


def igae():
    rel = "ine/igae/01.05.xlsx"
    h = hoja(abrir(rel), r"01\.05")
    s = Serie("imae", rel)
    fila_anio = next(r for r, _ in h.buscar(r"actividad economica", col=0))
    fila_mes = fila_anio + 1
    fila = next(r for r, _ in h.buscar(r"^indice general", col=0))
    anio, prelim = None, False
    for c in range(1, h.columnas):
        t = h.lit(fila_anio, c)
        if anio_de(t) and not (h.es_numero(fila_anio, c) and float(t) == 0):
            anio, prelim = anio_de(t), "(p)" in norm(t)
        mes = MESES.get(h.txt(fila_mes, c)[:3])
        if anio and mes:
            s.agregar(f"{anio}-{mes:02d}-01", h, fila, c, preliminar=prelim)
    return s


def pib_trimestral():
    rel = "ine/pib-trimestral/01.01.04.xlsx"
    h = hoja(abrir(rel), r"01\.01\.04")
    s = Serie("pib-trimestral", rel)
    cab = next(r for r, _ in h.buscar(r"^periodo", col=0))
    col = next(c for c in range(h.columnas) if re.search(r"producto interno bruto|^p\.?i\.?b", h.txt(cab, c)))
    anio, prelim = None, False
    for r in range(cab + 1, h.filas):
        t = h.txt(r, 0)
        if re.fullmatch(r"(19|20)\d{2}.*", t):
            anio, prelim = anio_de(t), "(p)" in t
            continue
        m = re.match(r"(iv|iii|ii|i)\s+trimestre", t)
        if anio and m:
            s.agregar(f"{anio}-{TRIMESTRES[m.group(1)]:02d}-01", h, r, col, preliminar=prelim or "(p)" in t)
    return s


def comercio():
    rel = "ine/comercio-exterior/" + next(p.name for p in (ORIGINALES / "ine/comercio-exterior").glob("*Comercio Exterior segun A*"))
    h = hoja(abrir(rel), r"mensual")
    cab = next(r for r, c in h.buscar(r"^exportaciones"))
    cols = {}
    for c in range(h.columnas):
        t = h.txt(cab, c)
        if t.startswith("exportaciones"):
            cols["exportaciones"] = c
        elif t.startswith("importaciones"):
            cols["importaciones"] = c
        elif t.startswith("saldo"):
            cols["saldo-comercial"] = c
    col_anio = next(c for c in range(h.columnas) if h.txt(cab, c) == "ano")
    col_mes = next(c for c in range(h.columnas) if h.txt(cab, c) == "mes")
    series = {k: Serie(k, rel) for k in cols}
    anio, prelim = None, False
    for r in range(cab + 1, h.filas):
        if anio_de(h.lit(r, col_anio)):
            anio, prelim = anio_de(h.lit(r, col_anio)), "(p)" in h.txt(r, col_anio)
        mes = MESES.get(h.txt(r, col_mes).replace("(p)", "").strip())
        if anio and mes:
            for k, c in cols.items():
                series[k].agregar(f"{anio}-{mes:02d}-01", h, r, c, preliminar=prelim or "(p)" in h.txt(r, col_mes))
    return list(series.values())


def desocupacion():
    rel = "ine/empleo/3.05.01.11.xlsx"
    h = hoja(abrir(rel), r"3\.05")
    cab = next(r for r, _ in h.buscar(r"^indicadores de empleo", col=0))
    salida = []
    for indicador, patron in (("desocupacion", r"^tasa de desocupacion"), ("informalidad", r"informal")):
        filas = h.buscar(patron, col=0)
        if not filas:
            continue
        fila = filas[0][0]
        s = Serie(indicador, rel)
        for c in range(1, h.columnas):
            m = re.match(r"([1-4])t-((19|20)\d{2})", h.txt(cab, c))
            if m:
                s.agregar(f"{m.group(2)}-{(int(m.group(1)) - 1) * 3 + 1:02d}-01", h, fila, c, preliminar="(p)" in h.txt(cab, c))
        salida.append(s)
    return salida


def industria():
    rel = "ine/industria/" + next(p.name for p in (ORIGINALES / "ine/industria").iterdir())
    h = hoja(abrir(rel), r"^indice")
    s = Serie("industria", rel)
    cab = next(r for r, c in h.buscar(r"^periodo"))
    col_per = next(c for r, c in h.buscar(r"^periodo"))
    anio, prelim = None, False
    for r in range(cab + 1, h.filas):
        t = h.txt(r, col_per)
        if re.fullmatch(r"(19|20)\d{2}.*", t):
            anio, prelim = anio_de(t), "(p)" in t
            continue
        m = re.match(r"(iv|iii|ii|i)\s+trimestre", t)
        if anio and m:
            s.agregar(f"{anio}-{TRIMESTRES[m.group(1)]:02d}-01", h, r, col_per + 1, preliminar=prelim or "(p)" in t)
    return s


def por_fecha_serial(indicador, rel, patron_hoja, col_valor, mensual=True):
    h = hoja(abrir(rel), patron_hoja)
    s = Serie(indicador, rel)
    for r in range(h.filas):
        if h.es_numero(r, 0) and float(h.lit(r, 0)) > 20000:
            f = serial(h.lit(r, 0))
            s.agregar(f[:8] + "01" if mensual else f, h, r, col_valor)
    return s


def reservas():
    rel = "bcb/reservas/Reservas_Internacionales_Netas_del_Banco_Central_de_Bolivia_por_componentes.xlsx"
    h = hoja(abrir(rel), r"mens")
    col = next(c for r, c in h.buscar(r"^reservas interna") if c > 0)
    return por_fecha_serial("reservas-internacionales", rel, r"mens", col)


def base_monetaria():
    rel = "bcb/monetario/1. Base Monetaria.xlsx"
    h = hoja(abrir(rel), r"^1$")
    col = next(c for r, c in h.buscar(r"^\(bm\)$"))
    return por_fecha_serial("base-monetaria", rel, r"^1$", col)


def tipo_cambio():
    rel = "bcb/tipo-cambio/Tipo de Cambio Oficial .xlsx"
    h = hoja(abrir(rel), r"diaria")
    col = next(c for r, c in h.buscar(r"^compra$"))
    return por_fecha_serial("tipo-cambio", rel, r"diaria", col, mensual=False)


def brent():
    rel = "eia/brent/RBRTEd.xls"
    return por_fecha_serial("petroleo-brent", rel, r"data 1", 1, mensual=False)


def fed_funds():
    rel = "nyfed/fed-funds/Search.xlsx"
    h = hoja(abrir(rel), r"results")
    s = Serie("fed-funds", rel)
    col = lambda prefijo: next(c for c in range(h.columnas) if h.txt(0, c).startswith(prefijo))
    tipo, tasa, desde, hasta = col("rate type"), col("rate (%)"), col("target rate from"), col("target rate to")
    for r in range(1, h.filas):
        m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", h.lit(r, 0) or "")
        if m and h.txt(r, tipo) == "effr":
            s.agregar(f"{m.group(3)}-{m.group(1)}-{m.group(2)}", h, r, tasa, inferior=h.lit(r, desde), superior=h.lit(r, hasta))
    return s


def dolar():
    rel = "fed/indice-dolar/FRB_H10.csv"
    h = abrir(rel)["csv"]
    s = Serie("dxy", rel)
    for r in range(h.filas):
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", h.lit(r, 0) or ""):
            s.agregar(h.lit(r, 0), h, r, 1)
    return s


def oro():
    rel = "bancomundial/pink-sheet/CMO-Historical-Data-Monthly.xlsx"
    h = hoja(abrir(rel), r"monthly prices")
    cab = next(r for r, c in h.buscar(r"^gold$"))
    col = next(c for r, c in h.buscar(r"^gold$"))
    s = Serie("oro", rel)
    for r in range(cab + 1, h.filas):
        m = re.fullmatch(r"(\d{4})m(\d{2})", h.txt(r, 0))
        if m:
            s.agregar(f"{m.group(1)}-{m.group(2)}-01", h, r, col)
    return s


def encuesta_hogares(indicador, archivo, patron_fila, col_etiqueta=0):
    rel = "ine/pobreza/" + archivo
    h = next(iter(abrir(rel).values()))
    cab = next(r for r in range(h.filas) if sum(1 for c in range(h.columnas) if anio_de(h.lit(r, c))) >= 5)
    fila = next(r for r, _ in h.buscar(patron_fila, col=col_etiqueta) if r > cab)
    s = Serie(indicador, rel)
    for c in range(col_etiqueta + 1, h.columnas):
        a = anio_de(h.lit(cab, c))
        if a:
            s.agregar(f"{a}-01-01", h, fila, c, preliminar="(p)" in h.txt(cab, c))
    return s


def semanal(indicador, patron):
    rel = "bcb/estadisticas-semanales/" + max(p.name for p in (ORIGINALES / "bcb/estadisticas-semanales").glob("Semanal *.xlsx"))
    h = next(iter(abrir(rel).values()))
    fila = next(r for r, _ in h.buscar(patron, col=3))
    s = Serie(indicador, rel)
    for c in range(4, h.columnas):
        if h.es_numero(2, c):
            s.agregar(serial(h.lit(2, c))[:8] + "01", h, fila, c)
    return s


def deuda_externa():
    rel = "bcb/deuda-externa/Coeficientes de endeudamiento externo publico a mediano y largo plazo.xlsx"
    h = next(iter(abrir(rel).values()))
    cab = next(r for r in range(h.filas) if sum(1 for c in range(h.columnas) if anio_de(h.lit(r, c))) >= 5)
    fila = next(r for r, _ in h.buscar(r"^7\.?- de/pib|de/pib$"))
    s = Serie("deuda-externa", rel)
    for c in range(h.columnas):
        a = anio_de(h.lit(cab, c))
        if a:
            s.agregar(f"{a}-01-01", h, fila, c, preliminar="p" in h.txt(cab, c).replace(str(a), ""))
    return s


def spnf():
    resultado, recaudacion = Serie("resultado-fiscal", ""), Serie("recaudacion", "")
    for p in sorted((ORIGINALES / "mefp/fiscal").glob("SPNFGOBEMP*.xlsx")):
        rel = f"mefp/fiscal/{p.name}"
        h = hoja(abrir(rel), r"^spnf")
        anio = next(anio_de(h.lit(r, 0)) for r in range(6) if anio_de(h.lit(r, 0)))
        prelim = any("(p)" in h.txt(r, 0) for r in range(6))
        cab = next(r for r in range(12) if MESES.get(h.txt(r, 1)))
        meses = {c: MESES[h.txt(cab, c)] for c in range(1, h.columnas) if MESES.get(h.txt(cab, c))}
        for serie, patron in ((resultado, r"^sup \(def\) global"), (recaudacion, r"^ingresos tributarios")):
            fila = next(r for r, _ in h.buscar(patron, col=0))
            parcial = Serie(serie.indicador, rel)
            for c, m in meses.items():
                parcial.agregar(f"{anio}-{m:02d}-01", h, fila, c, preliminar=prelim)
            serie.filas.extend(parcial.filas)
    return [resultado, recaudacion]


EXTRACTORES = [
    lambda: semanal("credito-privado", r"^credito del sistema financiero al sector privado"),
    lambda: semanal("depositos", r"^depositos en entidades de intermediacion financiera"),
    deuda_externa, spnf,
    ipc_interanual, ipc_alimentos, inflacion_nucleo, igae, pib_trimestral, comercio, desocupacion,
    industria, reservas, base_monetaria, tipo_cambio, brent, fed_funds, dolar, oro,
    lambda: encuesta_hogares("pobreza", "09.3060101-rev25.xlsx", r"^incidencia de pobreza"),
    lambda: encuesta_hogares("pobreza-extrema", "07.3060102-rev25.xlsx", r"^incidencia de pobreza"),
    lambda: encuesta_hogares("gini", "11.3060103-rev25.xlsx", r"^bolivia"),
]


def main():
    SALIDA.mkdir(exist_ok=True)
    pedidos = set(sys.argv[1:])
    campos = ["indicador", "fecha", "valor_literal", "limite_inferior", "limite_superior", "preliminar", "archivo", "hoja", "celda"]
    for ext in EXTRACTORES:
        try:
            res = ext()
        except Exception as e:
            print(f"  FALLO {getattr(ext, '__name__', 'extractor')}: {type(e).__name__}: {e}")
            continue
        for s in res if isinstance(res, list) else [res]:
            if pedidos and s.indicador not in pedidos:
                continue
            filas = sorted({f["fecha"]: f for f in s.filas}.values(), key=lambda f: f["fecha"])
            with open(SALIDA / f"{s.indicador}.csv", "w", encoding="utf-8", newline="") as f:
                w = csv.DictWriter(f, fieldnames=campos)
                w.writeheader()
                w.writerows(filas)
            if filas:
                print(f"  ok    {s.indicador:26s} {len(filas):6d} obs  {filas[0]['fecha']} -> {filas[-1]['fecha']}  ultimo {filas[-1]['valor_literal']}  ({filas[-1]['hoja']}!{filas[-1]['celda']})")
            else:
                print(f"  VACIA {s.indicador}")


if __name__ == "__main__":
    main()
