# -*- coding: utf-8 -*-
"""
Genera un respaldo vectorial de la portada.

Reproduce la COMPOSICIÓN de la fotografía nocturna de La Paz con el Illimani
(cielo nocturno, macizo nevado, cordones oscuros y luces cálidas de la ciudad)
para que la maqueta funcione antes de colocar la fotografía definitiva.

Sustituir por la fotografía real en `public/media/lapaz-illimani.jpg`
y actualizar `site.heroImage` en `src/site.config.ts`.

Uso:
    python tools/generate_hero_fallback.py
"""

from __future__ import annotations

import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "media" / "lapaz-illimani.svg"

W, H = 2000, 1328
random.seed(11)


def peaks() -> str:
    """Silueta del macizo nevado."""
    return (
        "M540 700 L640 470 L700 400 L742 342 L790 268 L826 214 L860 190 "
        "L900 222 L938 268 L980 244 L1030 212 L1080 196 L1136 224 "
        "L1196 268 L1250 322 L1310 392 L1372 452 L1440 520 L1520 604 "
        "L1600 700 Z"
    )


def ridge(y_base: int, amp: int, seed: int, points: int = 26) -> str:
    rnd = random.Random(seed)
    step = W / points
    parts = [f"M0 {y_base}"]
    for i in range(1, points + 1):
        x = round(i * step)
        y = round(y_base + rnd.uniform(-amp, amp))
        parts.append(f"L{x} {y}")
    parts.append(f"L{W} {H} L0 {H} Z")
    return " ".join(parts)


def city_lights() -> str:
    """Luces cálidas dispersas por las laderas de la hoyada."""
    rnd = random.Random(7)
    dots: list[str] = []
    for _ in range(850):
        # Concentradas en la mitad inferior, más densas hacia el centro-abajo.
        y = rnd.triangular(620, H - 10, H - 260)
        x = rnd.uniform(-20, W + 20)
        r = rnd.choice([1.1, 1.3, 1.6, 1.9, 2.4])
        depth = (y - 600) / (H - 600)
        o = round(min(0.95, 0.16 + depth * rnd.uniform(0.3, 0.95)), 2)
        color = rnd.choice(["#ffb257", "#ff9d3d", "#ffcf8a", "#ffd9a8", "#f9a03f"])
        dots.append(
            f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="{color}" opacity="{o}"/>'
        )
    # Ejes viales: hileras de luces más alineadas.
    for k in range(9):
        rnd2 = random.Random(200 + k)
        x0 = rnd2.uniform(0, W)
        y0 = rnd2.uniform(760, H - 60)
        dx = rnd2.uniform(-160, 160)
        dy = rnd2.uniform(40, 150)
        for j in range(26):
            t = j / 25
            x = x0 + dx * t + rnd2.uniform(-6, 6)
            y = y0 + dy * t + rnd2.uniform(-4, 4)
            dots.append(
                f'<circle cx="{x:.0f}" cy="{y:.0f}" r="1.5" fill="#ffc477" opacity="0.75"/>'
            )
    return "".join(dots)


def stars() -> str:
    rnd = random.Random(31)
    out: list[str] = []
    for _ in range(90):
        x = rnd.uniform(0, W)
        y = rnd.uniform(0, 420)
        r = rnd.choice([0.8, 1.0, 1.3])
        o = round(rnd.uniform(0.12, 0.5), 2)
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="#dbe8f2" opacity="{o}"/>')
    return "".join(out)


SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Vista nocturna de La Paz con el Illimani">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#04131f"/>
      <stop offset="42%" stop-color="#0a2739"/>
      <stop offset="72%" stop-color="#0d3040"/>
      <stop offset="100%" stop-color="#061c26"/>
    </linearGradient>
    <linearGradient id="snow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e9f3fb"/>
      <stop offset="45%" stop-color="#bcd6ea"/>
      <stop offset="100%" stop-color="#7fa5c0"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d3040" stop-opacity="0"/>
      <stop offset="100%" stop-color="#c0703a" stop-opacity="0.16"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
    <filter id="haze" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>

  <rect width="{W}" height="{H}" fill="url(#sky)"/>
  {stars()}

  <!-- macizo nevado -->
  <path d="{peaks()}" fill="url(#snow)" opacity="0.95"/>
  <path d="{peaks()}" fill="none" stroke="#f2f8ff" stroke-opacity="0.35" stroke-width="2"/>
  <path d="M860 190 L900 222 L938 268 L900 300 L862 250 Z" fill="#8fb2ca" opacity="0.5"/>
  <path d="M1080 196 L1136 224 L1196 268 L1140 296 L1092 244 Z" fill="#8fb2ca" opacity="0.42"/>

  <!-- cordones intermedios -->
  <path d="{ridge(700, 26, 3)}" fill="#0a2231" opacity="0.94"/>
  <path d="{ridge(800, 34, 5)}" fill="#071b27" opacity="0.95"/>

  <!-- resplandor urbano -->
  <ellipse cx="1000" cy="1180" rx="1120" ry="330" fill="#c9793c" opacity="0.10" filter="url(#haze)"/>

  <!-- hoyada -->
  <path d="{ridge(920, 30, 9)}" fill="#061620" opacity="0.92"/>
  <g>{city_lights()}</g>
  <path d="{ridge(1210, 26, 13)}" fill="#03101a" opacity="0.9"/>
  <rect width="{W}" height="{H}" fill="url(#glow)"/>
</svg>
"""


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(SVG, encoding="utf-8")
    print(f"escrito: {OUT.relative_to(ROOT)}  ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
