/**
 * Motor de animación del sitio.
 *
 * Principios:
 *  - El contenido nunca depende de JS para ser legible (`no-js` se retira
 *    en el <head>, y el CSS deja todo visible si el script no corre).
 *  - Las animaciones se ejecutan UNA sola vez.
 *  - `prefers-reduced-motion` desactiva todo movimiento.
 *  - En móvil se reduce el trabajo: sin parallax, distancias más cortas.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'power2.out';

/* ------------------------------------------------------------------ header */

function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  let compact = false;
  const threshold = 40;

  const update = (): void => {
    const next = window.scrollY > threshold;
    if (next !== compact) {
      compact = next;
      header.classList.toggle('is-compact', compact);
    }
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* --------------------------------------------------------- menú y buscador */

function initOverlays(): void {
  const body = document.body;

  const bind = (triggerSel: string, panelSel: string, focusSel?: string): void => {
    const triggers = document.querySelectorAll<HTMLElement>(triggerSel);
    const panel = document.querySelector<HTMLElement>(panelSel);
    if (!panel || triggers.length === 0) return;

    const close = (): void => {
      panel.dataset.open = 'false';
      panel.setAttribute('aria-hidden', 'true');
      triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
      body.style.removeProperty('overflow');
    };

    const open = (): void => {
      panel.dataset.open = 'true';
      panel.setAttribute('aria-hidden', 'false');
      triggers.forEach((t) => t.setAttribute('aria-expanded', 'true'));
      body.style.overflow = 'hidden';
      if (focusSel) {
        window.setTimeout(() => panel.querySelector<HTMLElement>(focusSel)?.focus(), 60);
      }
    };

    triggers.forEach((t) =>
      t.addEventListener('click', () => (panel.dataset.open === 'true' ? close() : open())),
    );
    panel.querySelectorAll<HTMLElement>('[data-close]').forEach((b) =>
      b.addEventListener('click', close),
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.dataset.open === 'true') close();
    });
  };

  bind('[data-menu-toggle]', '[data-menu-panel]');
  bind('[data-search-toggle]', '[data-search-panel]', 'input');
}

/* ------------------------------------------------------------- count-up  */

function animateCounter(el: HTMLElement, reduced: boolean): void {
  const target = Number(el.dataset.count ?? '0');
  const decimals = Number(el.dataset.countDecimals ?? '0');
  const prefix = el.dataset.countPrefix ?? '';
  const suffix = el.dataset.countSuffix ?? '';

  const render = (v: number): void => {
    el.textContent =
      prefix +
      new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(v) +
      suffix;
  };

  if (reduced) {
    render(target);
    return;
  }

  const state = { v: 0 };
  gsap.to(state, {
    v: target,
    duration: 0.9,
    ease: 'power2.out',
    onUpdate: () => render(state.v),
    onComplete: () => render(target),
  });
}

/* ------------------------------------------------------------------ init  */

function init(): void {
  initHeader();
  initOverlays();

  const mm = gsap.matchMedia();

  /* --- sin movimiento --------------------------------------------------- */
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-reveal]', { opacity: 1, y: 0, clearProps: 'transform' });
    gsap.set('.rule-draw', { scaleX: 1 });
    gsap.set('.spark-path', { strokeDashoffset: 0 });
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => animateCounter(el, true));
  });

  /* --- con movimiento --------------------------------------------------- */
  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 768px)',
    },
    (ctx) => {
      const conditions = ctx.conditions as { motion: boolean; desktop: boolean };
      if (!conditions.motion) return;

      const isDesktop = conditions.desktop;
      const shift = isDesktop ? 26 : 16;

      /* Hero: secuencia de entrada, no bloqueante. */
      const heroItems = gsap.utils.toArray<HTMLElement>('[data-hero-item]');
      if (heroItems.length > 0) {
        gsap.set(heroItems, { opacity: 0, y: 22 });
        gsap.to(heroItems, {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: EASE,
          stagger: 0.11,
          delay: 0.12,
        });
      }

      const heroBackdrop = document.querySelector<HTMLElement>('[data-hero-backdrop]');
      if (heroBackdrop) {
        gsap.fromTo(
          heroBackdrop,
          { opacity: 0, scale: 1.06 },
          { opacity: 1, scale: 1, duration: 1.5, ease: 'power2.out' },
        );
      }

      /* Reveal individual y en grupo. */
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        if (el.closest('[data-reveal-group]') && !el.hasAttribute('data-reveal-group')) return;
        gsap.fromTo(
          el,
          { opacity: 0, y: shift },
          {
            opacity: 1,
            y: 0,
            duration: 0.62,
            ease: EASE,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
        const kids = gsap.utils.toArray<HTMLElement>('[data-reveal]', group);
        if (kids.length === 0) return;
        gsap.fromTo(
          kids,
          { opacity: 0, y: shift },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: EASE,
            stagger: Number(group.dataset.revealStagger ?? '0.07'),
            scrollTrigger: { trigger: group, start: 'top 85%', once: true },
          },
        );
      });

      /* Líneas que se dibujan. */
      gsap.utils.toArray<HTMLElement>('.rule-draw').forEach((line) => {
        gsap.to(line, {
          scaleX: 1,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: { trigger: line, start: 'top 92%', once: true },
        });
      });

      /* Sparklines: trazo progresivo. */
      gsap.utils.toArray<SVGPathElement>('.spark-path').forEach((path) => {
        const len = path.getTotalLength ? path.getTotalLength() : 0;
        if (!len) {
          gsap.set(path, { strokeDashoffset: 0 });
          return;
        }
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 1.1,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: path, start: 'top 96%', once: true },
        });
      });

      /* Contadores. */
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 92%',
          once: true,
          onEnter: () => animateCounter(el, false),
        });
      });

      /* Parallax + expansión suave de imágenes (solo escritorio). */
      if (isDesktop) {
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
          const distance = Number(el.dataset.parallax ?? '8');
          const scaleTo = Number(el.dataset.parallaxScale ?? '1');
          gsap.fromTo(
            el,
            { yPercent: -distance / 2, scale: 1 },
            {
              yPercent: distance / 2,
              scale: scaleTo,
              ease: 'none',
              scrollTrigger: {
                trigger: el.closest('[data-parallax-scope]') ?? el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            },
          );
        });

        /* Bloques que se expanden al entrar (media reveal cinematográfico). */
        gsap.utils.toArray<HTMLElement>('[data-expand]').forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 1.14, opacity: 0.55 },
            {
              scale: 1,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: el.closest('[data-expand-scope]') ?? el,
                start: 'top 95%',
                end: 'top 35%',
                scrub: 0.5,
              },
            },
          );
        });
      } else {
        gsap.set('[data-expand]', { scale: 1, opacity: 1 });
      }

      return () => {
        gsap.set('[data-reveal]', { opacity: 1, y: 0 });
      };
    },
  );

  /* Reajuste tras cargar tipografías (evita triggers desalineados). */
  if (document.fonts?.ready) {
    void document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());

  /* Red de seguridad: el contenido nunca debe quedarse invisible.
     Si un bloque está dentro del viewport y sigue en opacidad 0 —por un
     trigger desalineado, un viewport inusualmente alto o una captura
     automatizada— se muestra de todas formas. */
  const failsafe = (): void => {
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 1.1 && rect.bottom > -200;
      if (inView && window.getComputedStyle(el).opacity === '0') {
        gsap.set(el, { opacity: 1, y: 0 });
      }
    });
  };

  window.setTimeout(failsafe, 2500);
  window.addEventListener('resize', () => window.setTimeout(failsafe, 400), { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
