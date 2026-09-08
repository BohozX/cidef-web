# -*- coding: utf-8 -*-
"""
Prueba de humo de las interacciones del sitio.

Requiere el servidor de vista previa corriendo:
    npm run preview -- --port 4321

Uso:
    python tools/smoke_test.py
"""

from __future__ import annotations

import sys

from playwright.sync_api import sync_playwright

# La consola de Windows puede venir en cp1252: se fuerza UTF-8 en la salida.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # noqa: BLE001 - intérpretes sin reconfigure
    pass

BASE = "http://localhost:4321"
results: list[tuple[bool, str]] = []


def check(ok: bool, label: str) -> None:
    results.append((ok, label))
    print(f"  {'OK  ' if ok else 'FALLA'} {label}")


def main() -> int:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="es-BO")
        page = ctx.new_page()

        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on(
            "console",
            lambda m: errors.append(m.text) if m.type == "error" else None,
        )

        # --- portada -------------------------------------------------------
        print("Portada")
        page.goto(f"{BASE}/", wait_until="networkidle")
        check(page.locator(".ind-card").count() == 6, "seis indicadores en el Radar de portada")
        check(page.locator("header img").count() == 1, "logo presente en el header")
        check(
            page.locator(".hero-img").get_attribute("src").endswith(".jpg"),
            "fotografía de portada cargada",
        )

        # --- buscador global ----------------------------------------------
        print("Buscador global")
        page.click("[data-search-toggle]")
        page.wait_for_timeout(300)
        page.fill("#q", "usdt")
        page.wait_for_timeout(250)
        hits = page.locator("[data-search-results] li").count()
        check(hits > 0, f"buscador devuelve resultados ({hits})")
        page.keyboard.press("Escape")
        page.wait_for_timeout(250)
        check(
            page.get_attribute("[data-search-panel]", "data-open") == "false",
            "Escape cierra el buscador",
        )

        # --- análisis: filtros y vista -------------------------------------
        print("Análisis")
        page.goto(f"{BASE}/analisis", wait_until="networkidle")
        total = page.locator("[data-an-list] .an-entry").count()
        page.select_option("[data-an-type]", "Working Paper")
        page.wait_for_timeout(250)
        visible = page.locator("[data-an-list] .an-entry:not([hidden])").count()
        check(0 < visible < total, f"filtro por tipo reduce el listado ({total} → {visible})")

        page.select_option("[data-an-type]", "")
        page.fill("[data-an-query]", "informalidad")
        page.wait_for_timeout(250)
        check(
            page.locator("[data-an-list] .an-entry:not([hidden])").count() >= 1,
            "búsqueda por texto encuentra el policy brief",
        )

        page.fill("[data-an-query]", "")
        page.click('[data-view="grid"]')
        page.wait_for_timeout(200)
        check(page.locator("[data-an-grid]").is_visible(), "vista de cuadrícula se activa")

        # --- radar: filtros -------------------------------------------------
        print("Radar Económico")
        page.goto(f"{BASE}/radar", wait_until="networkidle")
        page.select_option("[data-rd-cat]", "centro")
        page.wait_for_timeout(250)
        vis = page.locator(".ind-entry:not([hidden])").count()
        check(vis == 3, f"filtro por categoría deja los 3 indicadores propios ({vis})")

        page.goto(f"{BASE}/radar?cat=precios", wait_until="networkidle")
        page.wait_for_timeout(500)
        check(
            page.input_value("[data-rd-cat]") == "precios",
            "enlace directo ?cat= aplica el filtro",
        )

        # --- ficha de indicador: gráfico ------------------------------------
        print("Ficha de indicador")
        page.goto(f"{BASE}/radar/nowcast-pib", wait_until="networkidle")
        page.wait_for_selector("[data-chart] canvas", timeout=15000)
        check(True, "ECharts dibuja el gráfico")
        page.click('[data-range="1"]')
        page.wait_for_timeout(400)
        check(
            page.get_attribute('[data-range="1"]', "aria-pressed") == "true",
            "selector de rango responde",
        )
        check(
            page.locator("table").count() == 1 and page.locator("tbody tr").count() == 3,
            "historial de versiones (vintages) presente",
        )

        # --- publicación: cita ---------------------------------------------
        print("Publicación")
        page.goto(f"{BASE}/analisis/wp-001-usdt-incertidumbre", wait_until="networkidle")
        page.click('[data-cite-tab="bibtex"]')
        page.wait_for_timeout(200)
        bib = page.inner_text('[data-cite-panel="bibtex"]')
        check("@techreport" in bib and "Oros" in bib, "cita BibTeX se genera")

        # --- archivo vivo ----------------------------------------------------
        print("Archivo Vivo")
        page.goto(f"{BASE}/archivo", wait_until="networkidle")
        before = page.locator(".archive-item:not([hidden])").count()
        page.select_option("[data-archive-kind]", "Base de datos")
        page.wait_for_timeout(250)
        after = page.locator(".archive-item:not([hidden])").count()
        check(0 < after < before, f"filtro por tipo funciona ({before} → {after})")

        # --- 404 --------------------------------------------------------------
        # La navegación a una ruta inexistente produce un 404 esperado: se
        # limpia el registro para no confundirlo con un error real.
        errors.clear()
        print("404")
        page.goto(f"{BASE}/no-existe", wait_until="networkidle")
        check("404" in page.content(), "página 404 se sirve")
        errors[:] = [e for e in errors if "404" not in e]

        browser.close()

    print()
    real_errors = [e for e in errors if "favicon" not in e.lower()]
    if real_errors:
        print("Errores de consola:")
        for e in real_errors[:10]:
            print("  -", e)
    else:
        print("Sin errores de consola.")

    failed = [label for ok, label in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} comprobaciones correctas")
    return 1 if failed or real_errors else 0


if __name__ == "__main__":
    sys.exit(main())
