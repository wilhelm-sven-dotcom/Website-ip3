// Globales Verhalten aller Seiten: Header, Navigation, Scroll-Reveals, Parallaxe.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

/* ---------- Header: Farbthema nach darunterliegender Fläche ---------- */
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const initial = header.dataset.initialTheme || 'dark';
  const zones = () => [...document.querySelectorAll('[data-header-zone]')];
  let ticking = false;

  const update = () => {
    ticking = false;
    const probeY = header.offsetHeight * 0.5;
    let theme = initial;
    let overStory = false;
    for (const z of zones()) {
      const r = z.getBoundingClientRect();
      if (r.top <= probeY && r.bottom > probeY) {
        theme = z.dataset.headerZone;
        overStory = z.hasAttribute('data-story') && z.classList.contains('is-live');
      }
    }
    header.dataset.headerTheme = theme;
    header.classList.toggle('is-solid', window.scrollY > 24);
    header.classList.toggle('is-over-story', overStory);
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  document.addEventListener('header:update', onScroll);
  update();
}

/* ---------- Untermenü Leistungen (Disclosure + Hover) ---------- */
function initSubnav() {
  document.querySelectorAll('[data-sub]').forEach((item) => {
    const btn = item.querySelector('[data-sub-toggle]');
    const panel = item.querySelector('[data-sub-panel]');
    let closeTimer;

    const open = () => {
      clearTimeout(closeTimer);
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      item.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', () => (item.classList.contains('is-open') ? close() : open()));

    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') open();
    });
    item.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') closeTimer = setTimeout(close, 160);
    });

    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) close();
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && item.classList.contains('is-open')) {
        close();
        btn.focus();
      }
    });

    panel.addEventListener('click', (e) => {
      if (e.target.closest('a')) close();
    });
  });
}

/* ---------- Mobile-Menü mit Fokusfalle ---------- */
function initMobileMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (!toggle || !menu) return;
  const label = toggle.querySelector('.menu-toggle__label');

  const focusables = () =>
    [toggle, ...menu.querySelectorAll('a[href], button:not([disabled])')].filter((el) => el.offsetParent !== null || el === toggle);

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Schließen' : 'Menü';
    root.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      if (!reduceMotion.matches) {
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'expo.out' });
        gsap.fromTo(
          menu.querySelectorAll('.mobile-menu__list > li, .mobile-menu__foot'),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.05, delay: 0.08 }
        );
      }
      const first = menu.querySelector('a[href]');
      first && first.focus({ preventScroll: true });
    } else {
      menu.hidden = true;
    }
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));

  document.addEventListener('keydown', (e) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') {
      setOpen(false);
      toggle.focus();
    } else if (e.key === 'Tab') {
      const els = focusables();
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  menu.addEventListener('click', (e) => {
    if (e.target.closest('a[href]')) setOpen(false);
  });

  window.matchMedia('(min-width: 1081px)').addEventListener('change', (mq) => {
    if (mq.matches) setOpen(false);
  });
}

/* ---------- Scroll-Reveals ---------- */
function initReveals() {
  if (reduceMotion.matches) {
    document.querySelectorAll('[data-draw-svg]').forEach((svg) => svg.classList.add('is-drawn'));
    root.classList.add('reveal-ready');
    return;
  }

  // Überschriften zeilenweise aus einer Maske
  document.querySelectorAll('[data-split]').forEach((el) => {
    document.fonts.ready.then(() => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit(self) {
          // Start unterhalb der Maske samt Luft für Umlautpunkte (siehe .split-line-mask);
          // danach beschneidet die Maske nichts mehr, auch keine weit ausladenden Zeichen
          return gsap.from(self.lines, {
            yPercent: 145,
            duration: 1.1,
            ease: 'expo.out',
            stagger: 0.08,
            onComplete: () => self.masks.forEach((m) => (m.style.overflow = 'visible')),
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
        },
      });
      el.dataset.splitReady = '';
      return split;
    });
  });

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => {
      // Nach einem Sprung (Anker, gespeicherte Scrollposition) sofort zeigen, was schon
      // oberhalb liegt; gestaffelt erscheint nur, was im Bild ist
      const vorbei = batch.filter((el) => el.getBoundingClientRect().bottom <= 0);
      const imBild = batch.filter((el) => !vorbei.includes(el));
      if (vorbei.length) gsap.set(vorbei, { opacity: 1, y: 0, clearProps: 'transform' });
      if (imBild.length) {
        gsap.to(imBild, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.08,
          overwrite: true,
          clearProps: 'transform',
        });
      }
    },
  });

  // Bemaßungslinien zeichnen sich
  document.querySelectorAll('.dim__line[data-draw]').forEach((line) => {
    gsap.to(line, {
      scaleX: 1,
      duration: 1.4,
      ease: 'expo.out',
      scrollTrigger: { trigger: line, start: 'top 92%', once: true },
    });
  });

  // SVG-Linienzeichnungen: Strichlänge in Bildschirmeinheiten (non-scaling-stroke)
  document.querySelectorAll('[data-draw-svg]').forEach((svg) => {
    const paths = [...svg.querySelectorAll('[data-stroke]')];
    const rendered = () => svg.getBoundingClientRect().width > 0 && !!svg.getScreenCTM();
    const prepare = () => {
      const k = Math.abs(svg.getScreenCTM().a) || 1;
      paths.forEach((p) => {
        let len = 0;
        try {
          len = p.getTotalLength() * k + 2;
        } catch {
          len = 0;
        }
        if (!len) return;
        p.style.strokeDasharray = `${len} ${len}`;
        p.style.strokeDashoffset = `${len}`;
      });
    };
    const done = () => {
      paths.forEach((p) => {
        p.style.strokeDasharray = '';
        p.style.strokeDashoffset = '';
      });
      svg.classList.add('is-drawn');
    };
    if (!paths.length) {
      svg.classList.add('is-drawn');
      return;
    }
    // Ausgangszustand sofort setzen, damit nichts aufblitzt
    const fillEls = svg.querySelectorAll('[data-fill]');
    if (rendered()) {
      prepare();
      if (fillEls.length) gsap.set(fillEls, { fillOpacity: 0 });
    }
    ScrollTrigger.create({
      trigger: svg,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        if (!rendered()) {
          done();
          return;
        }
        prepare();
        gsap.to(paths, {
          strokeDashoffset: 0,
          duration: 1.6,
          ease: 'power2.inOut',
          stagger: { amount: Math.min(1.2, paths.length * 0.012) },
          onComplete: done,
        });
        if (fillEls.length) {
          gsap.to(fillEls, { fillOpacity: 1, duration: 0.9, ease: 'power1.out', delay: 0.8, stagger: { amount: 0.4 }, clearProps: 'fillOpacity' });
        }
      },
    });
  });

  // Bildenthüllungen
  document.querySelectorAll('[data-clip]').forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(0 0 100% 0)' },
      {
        clipPath: 'inset(0 0 0% 0)',
        duration: 1.4,
        ease: 'expo.inOut',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      }
    );
  });

  // Dezente Parallaxe (nur Translation, Ausrichtung bleibt)
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || 10;
    gsap.fromTo(
      el,
      { yPercent: -amount / 2 },
      {
        yPercent: amount / 2,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });

  root.classList.add('reveal-ready');
}

/* ---------- Hover-Neigung für Planblätter (nur feiner Zeiger) ---------- */
function initTilt() {
  if (!finePointer.matches || reduceMotion.matches) return;
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = parseFloat(el.dataset.tilt) || 3;
    const qx = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    const qy = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    gsap.set(el, { transformPerspective: 1200 });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      qx(x * max);
      qy(-y * max);
    });
    el.addEventListener('pointerleave', () => {
      qx(0);
      qy(0);
    });
  });
}

function init() {
  initHeader();
  initSubnav();
  initMobileMenu();
  initReveals();
  initTilt();
  window.addEventListener('load', () => ScrollTrigger.refresh());
  // Inhalte verschieben sich (z. B. Referenzfilter): Auslöser neu berechnen. Ein künstliches
  // resize-Ereignis reicht nicht, ScrollTrigger übergeht es auf Touchgeräten.
  document.addEventListener('layout:change', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export { gsap, ScrollTrigger };
