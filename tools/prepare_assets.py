# -*- coding: utf-8 -*-
"""
Prepara los recursos gráficos oficiales para la web.

Toma el logo y la fotografía originales y produce las variantes que consume
el sitio. NO rediseña la marca: solo recorta el margen blanco, genera
transparencia, arma un bloque horizontal con los dos elementos que ya existen
en el original (símbolo + logotipo) y produce una versión clara para fondos
oscuros.

Uso:
    python tools/prepare_assets.py
    python tools/prepare_assets.py --logo RUTA --foto RUTA
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public" / "media"

DEFAULT_LOGO = Path.home() / "Downloads" / "ChatGPT Image Sep 3, 2026, 11_41_23 PM.png"
DEFAULT_FOTO = Path.home() / "Downloads" / "88947bc6-53eb-4ea4-ad8b-e3af0a612f1d.png"

PAPER = (245, 243, 237)
WHITE_CUTOFF = 238   # por encima de esto se considera fondo
DARK_CUTOFF = 96     # por debajo de esto se considera "negro" de la marca


# --------------------------------------------------------------------- logo --

def to_transparent(img: Image.Image) -> Image.Image:
    """Convierte el fondo blanco en transparencia con borde suave."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            m = min(r, g, b)
            if m >= WHITE_CUTOFF:
                px[x, y] = (r, g, b, 0)
            elif m > 200:
                # Antialias del borde: opacidad proporcional.
                px[x, y] = (r, g, b, int(a * (WHITE_CUTOFF - m) / (WHITE_CUTOFF - 200)))
    return img


def reversed_variant(img: Image.Image) -> Image.Image:
    """Versión reversa (para fondos oscuros).

    El original combina negro, verde petróleo y dorado, con degradados
    verticales de negro a turquesa en las letras. Recolorear píxel a píxel
    por luminancia rompe esos degradados, así que se usa la solución
    habitual de identidad: una versión reversa a dos tintas —papel cálido
    para toda la marca y dorado conservado en los elementos que ya son
    dorados—. La geometría del logo no se altera.
    """
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            goldish = r > b + 45 and g > b + 22 and max(r, g, b) > 105
            if not goldish:
                px[x, y] = (*PAPER, a)
    return img


def trim(img: Image.Image, pad: int = 6) -> Image.Image:
    box = img.getbbox()
    if not box:
        return img
    x0, y0, x1, y1 = box
    w, h = img.size
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))


def split_lockup(img: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Separa símbolo (arriba) y logotipo (abajo) por la franja vacía."""
    w, h = img.size
    alpha = img.split()[3]
    rows = [sum(alpha.crop((0, y, w, y + 1)).getdata()) for y in range(h)]
    peak = max(rows) or 1

    # Se busca la banda vacía más ancha dentro del 55–90 % de la altura.
    best: tuple[int, int] | None = None
    run_start: int | None = None
    for y in range(int(h * 0.55), int(h * 0.92)):
        if rows[y] < peak * 0.012:
            if run_start is None:
                run_start = y
        else:
            if run_start is not None:
                if best is None or (y - run_start) > (best[1] - best[0]):
                    best = (run_start, y)
                run_start = None
    if run_start is not None and (best is None or (int(h * 0.92) - run_start) > (best[1] - best[0])):
        best = (run_start, int(h * 0.92))

    cut = (best[0] + best[1]) // 2 if best else int(h * 0.78)
    return trim(img.crop((0, 0, w, cut))), trim(img.crop((0, cut, w, h)))


def horizontal_lockup(mark: Image.Image, word: Image.Image, target_h: int = 220) -> Image.Image:
    """Compone símbolo + logotipo en una sola línea, centrados verticalmente."""
    mark_h = target_h
    mark_w = max(1, round(mark.width * mark_h / mark.height))
    mark_r = mark.resize((mark_w, mark_h), Image.LANCZOS)

    word_h = round(target_h * 0.40)
    word_w = max(1, round(word.width * word_h / word.height))
    word_r = word.resize((word_w, word_h), Image.LANCZOS)

    gap = round(target_h * 0.16)
    canvas = Image.new("RGBA", (mark_w + gap + word_w, target_h), (0, 0, 0, 0))
    canvas.paste(mark_r, (0, 0), mark_r)
    canvas.paste(word_r, (mark_w + gap, (target_h - word_h) // 2), word_r)
    return canvas


def build_logo(src: Path) -> None:
    original = Image.open(src)
    clean = trim(to_transparent(original), pad=10)

    stacked = clean.copy()
    stacked.thumbnail((720, 720), Image.LANCZOS)
    stacked.save(MEDIA / "logo-cidef.png", optimize=True)

    stacked_inv = reversed_variant(clean.copy())
    stacked_inv.thumbnail((720, 720), Image.LANCZOS)
    stacked_inv.save(MEDIA / "logo-cidef-inv.png", optimize=True)

    mark, word = split_lockup(clean)
    mark_only = mark.copy()
    mark_only.thumbnail((512, 512), Image.LANCZOS)
    mark_only.save(MEDIA / "logo-cidef-mark.png", optimize=True)

    horizontal_lockup(mark, word).save(MEDIA / "logo-cidef-h.png", optimize=True)
    horizontal_lockup(reversed_variant(mark.copy()), reversed_variant(word.copy())).save(
        MEDIA / "logo-cidef-h-inv.png", optimize=True
    )

    # Favicon a partir del símbolo, sobre el azul noche institucional.
    fav = Image.new("RGBA", (512, 512), (3, 26, 36, 255))
    m = reversed_variant(mark.copy())
    m.thumbnail((392, 392), Image.LANCZOS)
    fav.paste(m, ((512 - m.width) // 2, (512 - m.height) // 2), m)
    fav.convert("RGB").save(ROOT / "public" / "favicon.png", optimize=True)

    for name in (
        "logo-cidef.png",
        "logo-cidef-inv.png",
        "logo-cidef-h.png",
        "logo-cidef-h-inv.png",
        "logo-cidef-mark.png",
    ):
        f = MEDIA / name
        im = Image.open(f)
        print(f"  {name:<24} {im.width}x{im.height}  {f.stat().st_size / 1024:.0f} KB")


# ------------------------------------------------------------------ portada --

def build_hero(src: Path) -> None:
    """Exporta la portada en varios anchos y tres formatos.

    El original mide 2048 px de ancho: no se reescala por encima de eso
    (ampliar no añade detalle, solo peso y suavizado). La calidad es alta
    porque la fotografía es nocturna y los degradados del cielo delatan
    enseguida cualquier compresión agresiva.
    """
    img = Image.open(src).convert("RGB")
    native = img.width

    widths = [w for w in (2048, 1600, 1200, 800) if w <= native]
    if native not in widths:
        widths.insert(0, native)

    for width in widths:
        suffix = "" if width == widths[0] else f"-{width}"
        h = round(img.height * width / img.width)
        r = img if width == img.width else img.resize((width, h), Image.LANCZOS)
        r.save(MEDIA / f"lapaz-illimani{suffix}.jpg", quality=86, optimize=True,
               progressive=True, subsampling=0)
        r.save(MEDIA / f"lapaz-illimani{suffix}.webp", quality=80, method=6)
        try:
            r.save(MEDIA / f"lapaz-illimani{suffix}.avif", quality=56)
        except Exception as exc:  # noqa: BLE001 - AVIF es opcional
            print(f"  (sin AVIF: {exc})")

    print(f"  ancho original: {native} px")
    for pattern in ("*.avif", "*.webp", "*.jpg"):
        for f in sorted(MEDIA.glob(f"lapaz-illimani{pattern[1:]}")):
            pass
    for f in sorted(MEDIA.glob("lapaz-illimani*")):
        print(f"  {f.name:<28} {f.stat().st_size / 1024:.0f} KB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--logo", type=Path, default=DEFAULT_LOGO)
    ap.add_argument("--foto", type=Path, default=DEFAULT_FOTO)
    args = ap.parse_args()

    MEDIA.mkdir(parents=True, exist_ok=True)

    print("Logo:")
    if args.logo.exists():
        build_logo(args.logo)
    else:
        print(f"  no encontrado: {args.logo}")

    print("Portada:")
    if args.foto.exists():
        build_hero(args.foto)
    else:
        print(f"  no encontrado: {args.foto}")


if __name__ == "__main__":
    main()
