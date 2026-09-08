# -*- coding: utf-8 -*-
"""
Capturas de revisión visual.

Requiere el servidor de vista previa corriendo:
    npm run preview -- --port 4321

Uso:
    python tools/screenshots.py
    python tools/screenshots.py --mobile
"""

from __future__ import annotations

import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".preview"
BASE = "http://localhost:4321"

PAGES = [
    ("home", "/"),
    ("radar", "/radar"),
    ("radar-indicador", "/radar/nowcast-pib"),
    ("analisis", "/analisis"),
    ("publicacion", "/analisis/wp-001-usdt-incertidumbre"),
    ("archivo", "/archivo"),
    ("formacion", "/formacion"),
    ("programa", "/formacion/diplomado-modelacion-econometrica"),
    ("agenda", "/agenda"),
    ("nosotros", "/nosotros"),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mobile", action="store_true")
    ap.add_argument("--only", nargs="*", default=None)
    ap.add_argument("--full", action="store_true", help="página completa en vez de pantalla")
    args = ap.parse_args()

    OUT.mkdir(exist_ok=True)
    width, height = (390, 844) if args.mobile else (1440, 900)
    tag = "m" if args.mobile else "d"

    pages = [p for p in PAGES if not args.only or p[0] in args.only]

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=1,
            locale="es-BO",
            # En captura de pagina completa se desactiva el movimiento: el CSS
            # deja todo visible y la revision estructural es fiable.
            reduced_motion="reduce" if args.full else "no-preference",
        )
        page = ctx.new_page()

        for name, path in pages:
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            # Se deja terminar la secuencia de entrada y el scroll-reveal.
            page.wait_for_timeout(1400)
            if args.full:
                page.evaluate(
                    "async () => { for (let y = 0; y < document.body.scrollHeight; y += 600)"
                    " { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }"
                    " window.scrollTo(0, 0); }"
                )
                page.wait_for_timeout(700)
            out = OUT / f"{tag}-{name}.png"
            page.screenshot(path=str(out), full_page=args.full)
            print(f"  {out.relative_to(ROOT)}")

        browser.close()


if __name__ == "__main__":
    main()
