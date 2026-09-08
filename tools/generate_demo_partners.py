# -*- coding: utf-8 -*-
"""
Logotipos de asociados PARA LA DEMOSTRACIÓN.

La franja «Nuestros asociados» rota entre más logotipos de los que caben en
pantalla, así que necesita un conjunto mayor que las tres instituciones
reales. Estos archivos rellenan ese hueco.

Son ficticios a propósito y lo dicen: todos llevan la palabra «Demo» en el
nombre y una línea «logotipo de demostración» al pie, para que ninguno pueda
confundirse con una institución real ni sugerir un convenio inexistente.

Al incorporar asociados de verdad, añádelos en `PartnersStrip.astro` y borra
los que sobren de `public/media/aliados/demo-*.png`.

Uso:
    python tools/generate_demo_partners.py
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "media" / "aliados"

W, H = 560, 240
SCALE = 2

INK = (4, 49, 58)
TEAL = (0, 122, 117)
GOLD = (168, 121, 28)
MUTED = (4, 49, 58, 110)

FONTS = Path("C:/Windows/Fonts")
SANS_B = FONTS / "seguisb.ttf"
SANS = FONTS / "segoeui.ttf"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size * SCALE)


# ------------------------------------------------------------------ marcas --

def mark_arc(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    d.arc([cx - r, cy - r, cx + r, cy + r], 150, 30, fill=INK, width=int(7 * SCALE))
    d.arc([cx - r * 0.6, cy - r * 0.6, cx + r * 0.6, cy + r * 0.6], 200, 80, fill=TEAL, width=int(5 * SCALE))
    d.ellipse([cx + r * 0.42, cy - r * 0.16, cx + r * 0.72, cy + r * 0.14], fill=GOLD)


def mark_columns(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    top = cy - r * 0.72
    d.polygon([(cx - r, top + r * 0.34), (cx, top), (cx + r, top + r * 0.34)], fill=INK)
    for i in range(4):
        x = cx - r * 0.66 + i * (r * 0.44)
        d.rectangle([x, top + r * 0.46, x + r * 0.2, cy + r * 0.62], fill=TEAL if i % 2 else INK)
    d.rectangle([cx - r, cy + r * 0.62, cx + r, cy + r * 0.82], fill=INK)


def mark_bars(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    base = cy + r * 0.8
    for i, hgt in enumerate((0.5, 0.85, 0.62, 1.0)):
        x = cx - r * 0.86 + i * (r * 0.48)
        col = GOLD if i == 3 else (TEAL if i % 2 else INK)
        d.rectangle([x, base - r * 1.3 * hgt, x + r * 0.28, base], fill=col)


def mark_network(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    pts = [
        (cx - r * 0.8, cy + r * 0.5), (cx - r * 0.1, cy - r * 0.75),
        (cx + r * 0.72, cy - r * 0.1), (cx + r * 0.2, cy + r * 0.78),
    ]
    for i, a in enumerate(pts):
        for b in pts[i + 1:]:
            d.line([a, b], fill=(*TEAL, 90), width=int(2.4 * SCALE))
    for i, (px, py) in enumerate(pts):
        rad = r * (0.2 if i == 1 else 0.15)
        d.ellipse([px - rad, py - rad, px + rad, py + rad], fill=GOLD if i == 1 else INK)


MARKS = (mark_arc, mark_columns, mark_bars, mark_network)


# ----------------------------------------------------------------- logotipo --

def build(slug: str, line1: str, line2: str, mark_index: int) -> None:
    img = Image.new("RGBA", (W * SCALE, H * SCALE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")

    cx, cy, r = int(92 * SCALE), int(H * SCALE / 2 - 12 * SCALE), int(52 * SCALE)
    MARKS[mark_index % len(MARKS)](d, cx, cy, r)

    x = int(178 * SCALE)
    f1 = font(SANS_B, 27)
    f2 = font(SANS_B, 27)
    f3 = font(SANS, 12)

    y = int(H * SCALE / 2 - 46 * SCALE)
    d.text((x, y), line1, font=f1, fill=INK)
    d.text((x, y + int(33 * SCALE)), line2, font=f2, fill=TEAL)

    d.line([(x, y + int(76 * SCALE)), (x + int(46 * SCALE), y + int(76 * SCALE))], fill=GOLD, width=int(2 * SCALE))
    d.text((x, y + int(86 * SCALE)), "LOGOTIPO DE DEMOSTRACIÓN", font=f3, fill=MUTED)

    box = img.getbbox()
    if box:
        img = img.crop(box)
    img.thumbnail((520, 260), Image.LANCZOS)
    img.save(OUT / f"{slug}.png", optimize=True)
    print(f"  {slug}.png  {img.size}  {(OUT / f'{slug}.png').stat().st_size / 1024:.0f} KB")


DEMOS = [
    ("demo-instituto", "Instituto Demo", "de Economía", 0),
    ("demo-fundacion", "Fundación Demo", "Altiplano", 1),
    ("demo-observatorio", "Observatorio Demo", "de Datos", 2),
    ("demo-red", "Red Demo de", "Investigación", 3),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print("Logotipos de demostración:")
    for slug, l1, l2, m in DEMOS:
        build(slug, l1, l2, m)


if __name__ == "__main__":
    main()
