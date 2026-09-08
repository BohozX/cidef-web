# -*- coding: utf-8 -*-
"""
Genera las portadas de publicaciones y programas.

El centro no tiene todavía portadas diseñadas para cada documento, así que se
componen aquí a partir del propio contenido: tipo, número de serie, título,
autoría y fecha, sobre el azul noche institucional y con un motivo de datos
distinto para cada pieza. Así la cuadrícula de publicaciones se lee como una
colección editorial y no como una lista de texto.

Cuando existan portadas reales, basta con dejarlas en `public/media/portadas/`
con el mismo nombre de archivo (el `id` de la entrada) y no volver a ejecutar
este script.

Uso:
    python tools/generate_covers.py
"""

from __future__ import annotations

import math
import random
import textwrap
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "media" / "portadas"

W, H = 760, 1074  # proporción A4
SCALE = 2         # se dibuja al doble y se reduce: bordes limpios

INK = (3, 26, 36)
INK_2 = (4, 49, 58)
TEAL = (0, 140, 133)
TEAL_L = (79, 179, 172)
GOLD = (210, 154, 40)
PAPER = (245, 243, 237)

FONTS = Path("C:/Windows/Fonts")
SERIF = FONTS / "georgia.ttf"
SERIF_B = FONTS / "georgiab.ttf"
SERIF_I = FONTS / "georgiai.ttf"
SANS = FONTS / "segoeui.ttf"
SANS_B = FONTS / "segoeuib.ttf"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size * SCALE)


# ------------------------------------------------------------------ fondo --

def background(seed: int) -> Image.Image:
    w, h = W * SCALE, H * SCALE
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img)

    # Degradado vertical hacia el petróleo.
    for y in range(h):
        t = (y / h) ** 1.15
        d.line(
            [(0, y), (w, y)],
            fill=(
                round(INK[0] + (INK_2[0] - INK[0]) * t),
                round(INK[1] + (INK_2[1] - INK[1]) * t),
                round(INK[2] + (INK_2[2] - INK[2]) * t),
            ),
        )

    # Arco del símbolo, sangrado por la esquina inferior derecha.
    rnd = random.Random(seed)
    cx, cy = w * 0.92, h * 0.87
    for i, r in enumerate((0.42, 0.33, 0.25)):
        rad = w * r
        d.arc(
            [cx - rad, cy - rad, cx + rad, cy + rad],
            start=140 + i * 6,
            end=340 + i * 6,
            fill=(
                round(INK_2[0] + (TEAL[0] - INK_2[0]) * 0.30),
                round(INK_2[1] + (TEAL[1] - INK_2[1]) * 0.30),
                round(INK_2[2] + (TEAL[2] - INK_2[2]) * 0.30),
            ),
            width=int(4 * SCALE),
        )
    return img


# ------------------------------------------------------------- motivos ----

def motif(d: ImageDraw.ImageDraw, kind: int, box: tuple[int, int, int, int], seed: int) -> None:
    """Motivo de datos. Uno distinto por publicación."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    rnd = random.Random(seed)
    lw = int(2.4 * SCALE)

    if kind == 0:  # serie temporal con área
        n = 44
        vals, v = [], 0.5
        for _ in range(n):
            v = min(0.95, max(0.05, v + rnd.gauss(0, 0.09)))
            vals.append(v)
        pts = [(x0 + i * w / (n - 1), y1 - v * h) for i, v in enumerate(vals)]
        d.polygon([(x0, y1), *pts, (x1, y1)], fill=(6, 44, 52))
        d.line(pts, fill=GOLD, width=lw, joint="curve")

    elif kind == 1:  # barras
        n = 14
        gap = w / n
        for i in range(n):
            bh = h * (0.25 + 0.7 * abs(math.sin(i * 0.7 + seed)))
            bx = x0 + i * gap
            d.rectangle([bx, y1 - bh, bx + gap * 0.55, y1], fill=TEAL if i % 3 else GOLD)

    elif kind == 2:  # dispersión con recta de ajuste
        for _ in range(70):
            px = x0 + rnd.random() * w
            t = (px - x0) / w
            py = y1 - (0.18 + t * 0.6 + rnd.gauss(0, 0.11)) * h
            r = 3 * SCALE
            d.ellipse([px - r, py - r, px + r, py + r], fill=TEAL_L)
        d.line([(x0, y1 - 0.18 * h), (x1, y1 - 0.78 * h)], fill=GOLD, width=lw)

    elif kind == 3:  # abanico de proyección
        base = y1 - 0.42 * h
        d.line([(x0, y1 - 0.2 * h), (x0 + w * 0.45, base)], fill=PAPER, width=lw)
        for k, spread in enumerate((0.34, 0.22, 0.10)):
            d.polygon(
                [
                    (x0 + w * 0.45, base),
                    (x1, base - h * spread),
                    (x1, base + h * spread * 0.7),
                ],
                fill=(
                    round(INK_2[0] + (TEAL[0] - INK_2[0]) * (0.16 + k * 0.12)),
                    round(INK_2[1] + (TEAL[1] - INK_2[1]) * (0.16 + k * 0.12)),
                    round(INK_2[2] + (TEAL[2] - INK_2[2]) * (0.16 + k * 0.12)),
                ),
            )
        d.line([(x0 + w * 0.45, base), (x1, base - h * 0.06)], fill=GOLD, width=lw)

    elif kind == 4:  # red de nodos
        nodes = [(x0 + rnd.random() * w, y0 + rnd.random() * h) for _ in range(12)]
        for i, a in enumerate(nodes):
            for b in nodes[i + 1 :]:
                if math.dist(a, b) < w * 0.31:
                    d.line([a, b], fill=(10, 74, 78), width=int(1.4 * SCALE))
        for i, (px, py) in enumerate(nodes):
            r = (7 if i % 4 else 11) * SCALE * 0.6
            d.ellipse([px - r, py - r, px + r, py + r], fill=GOLD if i % 5 == 0 else TEAL_L)

    else:  # kind == 5: distribución
        n = 34
        gap = w / n
        for i in range(n):
            t = (i - n / 2) / (n / 5.5)
            bh = h * math.exp(-t * t / 2) * 0.92
            bx = x0 + i * gap
            col = GOLD if abs(i - n / 2) < 2.5 else TEAL
            d.rectangle([bx, y1 - bh, bx + gap * 0.62, y1], fill=col)


# ------------------------------------------------------------- portada ----

def wrap(text: str, fnt: ImageFont.FreeTypeFont, max_w: int, draw: ImageDraw.ImageDraw) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for word in words:
        test = f"{cur} {word}".strip()
        if draw.textlength(test, font=fnt) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def cover(
    slug: str,
    kicker: str,
    title: str,
    meta: str,
    footer: str,
    kind: int,
) -> None:
    img = background(kind)
    d = ImageDraw.Draw(img)

    pad = int(56 * SCALE)
    inner = W * SCALE - pad * 2

    # Regla dorada superior.
    d.rectangle([pad, int(64 * SCALE), pad + int(58 * SCALE), int(64 * SCALE) + int(2.5 * SCALE)], fill=GOLD)

    # Kicker.
    f_kick = font(SANS_B, 12)
    d.text((pad, int(84 * SCALE)), kicker.upper(), font=f_kick, fill=GOLD, spacing=0)

    # Título: se ajusta el cuerpo para que no pase de 6 líneas.
    size = 40
    while size > 22:
        f_title = font(SERIF, size)
        lines = wrap(title, f_title, inner, d)
        if len(lines) <= 6:
            break
        size -= 2
    f_title = font(SERIF, size)
    lines = wrap(title, f_title, inner, d)

    y = int(132 * SCALE)
    lh = int(size * 1.24 * SCALE)
    for line in lines:
        d.text((pad, y), line, font=f_title, fill=PAPER)
        y += lh

    # Metadatos.
    y += int(18 * SCALE)
    f_meta = font(SANS, 12)
    for line in meta.split("\n"):
        d.text((pad, y), line, font=f_meta, fill=(150, 200, 198))
        y += int(20 * SCALE)

    # Motivo de datos.
    top = max(y + int(44 * SCALE), int(H * 0.40) * SCALE)
    motif(d, kind, (pad, top, W * SCALE - pad, int(H * 0.80) * SCALE), kind * 7 + 3)

    # Pie.
    fy = int(H * 0.875) * SCALE
    d.rectangle([pad, fy, W * SCALE - pad, fy + int(1.2 * SCALE)], fill=(30, 78, 84))
    f_foot = font(SANS, 11)
    d.text((pad, fy + int(16 * SCALE)), footer, font=f_foot, fill=(150, 200, 198))
    f_mark = font(SERIF_B, 17)
    mark = "CIDEF"
    mw = d.textlength(mark, font=f_mark)
    d.text((W * SCALE - pad - mw, fy + int(12 * SCALE)), mark, font=f_mark, fill=PAPER)

    out = img.resize((W, H), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    out.save(OUT / f"{slug}.jpg", quality=88, optimize=True, progressive=True)
    out.save(OUT / f"{slug}.webp", quality=82, method=6)


# ---------------------------------------------------------------- datos ---

def frontmatter(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        return {}
    _, fm, *_ = raw.split("---", 2)
    return yaml.safe_load(fm) or {}


MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def main() -> None:
    n = 0

    for i, f in enumerate(sorted((ROOT / "src/content/publicaciones").glob("*.md"))):
        fm = frontmatter(f)
        date = fm.get("date")
        fecha = f"{MONTHS[date.month - 1].capitalize()} {date.year}" if date else ""
        authors = fm.get("authors", [])
        kicker = fm["type"] + (f" · {fm['serial']}" if fm.get("serial") else "")
        cover(
            slug=f.stem,
            kicker=kicker,
            title=fm["title"],
            meta="\n".join(authors[:3]),
            footer=f"{fecha}  ·  La Paz, Bolivia",
            kind=i % 6,
        )
        n += 1
        print(f"  {f.stem}")

    for i, f in enumerate(sorted((ROOT / "src/content/formacion").glob("*.md"))):
        fm = frontmatter(f)
        cover(
            slug=f.stem,
            kicker=f"{fm['kind']} · {fm['modality']}",
            title=fm["title"],
            meta=f"{fm['weeks']} semanas  ·  {len(fm.get('modules', []))} módulos\n"
                 f"{len(fm.get('faculty', []))} docentes",
            footer="Certificación UNIFRANZ  ·  La Paz",
            kind=(i + 3) % 6,
        )
        n += 1
        print(f"  {f.stem}")

    print(f"\n{n} portadas en public/media/portadas/")


if __name__ == "__main__":
    main()
