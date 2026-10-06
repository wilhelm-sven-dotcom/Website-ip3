// Auswahl: Marker, Elemente der Szene und Begriffe im Text öffnen die Infokarte. Überfahren
// zeigt eine Vorschau (nur mit feinem Zeiger), Klick oder Antippen heftet die Karte an,
// Escape schließt. Die Karte selbst lässt sich überfahren, ohne zu verschwinden.
import { elementNach, elemente, ui, fuellstand, lagesatz } from '../../data/energiesystem.js';
import { BEZUG, fuellstandStufe, uhrzeit } from '../../lib/energiesystem-modell.js';

// Gruppen der Szene → wählbares Element
const KNOTEN = {
  wind: 'wind',
  pvfrei: 'pvfrei',
  nvp: 'pvfrei',
  gruenspeicher: 'gruenspeicher',
  umspannwerk: 'umspannwerk',
  hochspannung: 'umspannwerk',
  grauspeicher: 'grauspeicher',
  gewerbe: 'gewerbe',
  mfh: 'mfh',
  haus: 'haus',
  auto: 'haus',
  heimspeicher: 'heimspeicher',
};

// Element → Gruppen, die bei Auswahl hervorgehoben bleiben
const GRUPPEN = {
  wind: ['wind'],
  pvfrei: ['pvfrei', 'nvp'],
  gruenspeicher: ['gruenspeicher', 'nvp'],
  umspannwerk: ['umspannwerk', 'hochspannung'],
  grauspeicher: ['grauspeicher'],
  gewerbe: ['gewerbe'],
  mfh: ['mfh', 'ons'],
  haus: ['haus', 'auto', 'ons'],
  heimspeicher: ['heimspeicher'],
};

const VORSCHAU_MS = 80;
const SCHLIESSEN_MS = 220;

export class Auswahl {
  constructor(root, { moment, beiWechsel, daten }) {
    this.root = root;
    this.moment = moment;
    this.beiWechsel = beiWechsel;
    this.daten = daten;
    this.feinerZeiger = matchMedia('(hover: hover) and (pointer: fine)');
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
    this.rahmen = root.querySelector('[data-es-rahmen]');
    this.ebene = root.querySelector('[data-es-ebene]');
    this.szene = root.querySelector('[data-es-szene]');
    this.karte = root.querySelector('[data-es-karte]');
    this.marker = [...root.querySelectorAll('.es-marker')];
    this.begriffe = [...root.querySelectorAll('.es-begriff')];
    this.gruppen = [...this.szene.querySelectorAll('[data-node]')];
    this.kabel = [...root.querySelectorAll('.es-kabel[data-link]')];
    const k = (n) => this.karte.querySelector(`[data-es-karte-${n}]`);
    this.felder = { nr: k('nr'), titel: k('titel'), text: k('text'), uhr: k('uhr'), lage: k('lage'), fuell: k('fuell'), leistung: k('leistung'), link: k('link'), linkText: k('link-text') };
    this.fest = null;
    this.vorschau = null;
    this.gezeigt = null;
    this.tVorschau = 0;
    this.tSchliessen = 0;
    this.stumm = false;

    for (const g of this.gruppen) if (KNOTEN[g.dataset.node]) g.classList.add('is-zeiger');
    this._marker();
    this._szene();
    this._begriffe();
    this._karte();
    document.addEventListener('pointerdown', (e) => {
      if (this.fest && !e.target.closest('.es-karte, .es-marker, .es-begriff, [data-node], [data-es-zeitleiste], [data-es-play]')) this.schliessen();
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.gezeigt) {
        const zurueck = this.karte.contains(document.activeElement);
        const id = this.gezeigt;
        this.schliessen();
        if (zurueck) this._zurueckZumMarker(id);
      }
    });
    new ResizeObserver(() => this._positioniere()).observe(this.rahmen);
  }

  /* ---------- öffentliche Steuerung ---------- */

  waehle(id, { fest = true } = {}) {
    clearTimeout(this.tVorschau);
    clearTimeout(this.tSchliessen);
    if (fest) this.fest = id;
    else this.vorschau = id;
    this._zeige(this.fest ?? this.vorschau);
  }

  schliessen() {
    clearTimeout(this.tVorschau);
    clearTimeout(this.tSchliessen);
    this.fest = null;
    this.vorschau = null;
    this._zeige(null);
  }

  /** Lage in der Karte nach einem Zeitschritt */
  aktualisiere() {
    if (this.gezeigt) this._jetzt(this.gezeigt);
  }

  /* ---------- Ereignisse ---------- */

  _maus(e) {
    return e.pointerType === 'mouse' && this.feinerZeiger.matches;
  }

  _planeVorschau(id) {
    clearTimeout(this.tSchliessen);
    clearTimeout(this.tVorschau);
    if (this.fest) return;
    this.tVorschau = setTimeout(() => {
      this.vorschau = id;
      this._zeige(id);
    }, VORSCHAU_MS);
  }

  _planeSchliessen() {
    clearTimeout(this.tVorschau);
    if (this.fest) return;
    clearTimeout(this.tSchliessen);
    this.tSchliessen = setTimeout(() => {
      this.vorschau = null;
      this._zeige(null);
    }, SCHLIESSEN_MS);
  }

  _markerVon(id) {
    return this.marker.find((m) => m.dataset.element === id);
  }

  // Fokus zurück auf den Marker, ohne die eben geschlossene Karte wieder zu öffnen
  _zurueckZumMarker(id) {
    const mk = this._markerVon(id);
    if (!mk) return;
    this.stumm = true;
    mk.focus();
    this.stumm = false;
  }

  _marker() {
    this.marker.forEach((mk, i) => {
      const id = mk.dataset.element;
      mk.addEventListener('pointerenter', (e) => this._maus(e) && this._planeVorschau(id));
      mk.addEventListener('pointerleave', (e) => this._maus(e) && this._planeSchliessen());
      mk.addEventListener('focus', () => {
        this.marker.forEach((x) => x.setAttribute('tabindex', x === mk ? '0' : '-1'));
        if (this.stumm) {
          this.stumm = false;
          return;
        }
        if (!this.fest && mk.matches(':focus-visible')) {
          clearTimeout(this.tSchliessen);
          this.vorschau = id;
          this._zeige(id);
        }
      });
      mk.addEventListener('blur', () => {
        setTimeout(() => {
          const a = document.activeElement;
          if (!this.fest && !this.karte.contains(a) && !this.marker.includes(a)) this._planeSchliessen();
        }, 0);
      });
      mk.addEventListener('click', (e) => {
        const tastatur = e.detail === 0;
        if (this.fest === id) {
          this.schliessen();
          return;
        }
        this.waehle(id);
        if (tastatur) this.karte.focus();
        else this._karteInsBild();
      });
      mk.addEventListener('keydown', (e) => {
        const n = this.marker.length;
        const ziel = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
        if (ziel === undefined) return;
        e.preventDefault();
        this.marker[(ziel + n) % n].focus();
      });
    });
  }

  _szene() {
    const element = (t) => KNOTEN[t?.closest?.('[data-node]')?.dataset.node];
    this.szene.addEventListener('pointerover', (e) => {
      const id = element(e.target);
      if (id && this._maus(e)) this._planeVorschau(id);
    });
    this.szene.addEventListener('pointerout', (e) => {
      if (!this._maus(e)) return;
      if (element(e.relatedTarget) !== element(e.target)) this._planeSchliessen();
    });
    this.szene.addEventListener('click', (e) => {
      const id = element(e.target);
      if (!id) return;
      if (this.fest === id) this.schliessen();
      else {
        this.waehle(id);
        this._karteInsBild();
      }
    });
  }

  _begriffe() {
    for (const b of this.begriffe) {
      const id = b.dataset.element;
      b.addEventListener('pointerenter', (e) => this._maus(e) && this._planeVorschau(id));
      b.addEventListener('pointerleave', (e) => this._maus(e) && this._planeSchliessen());
      b.addEventListener('focus', () => {
        if (!this.fest && b.matches(':focus-visible')) {
          clearTimeout(this.tSchliessen);
          this.vorschau = id;
          this._zeige(id);
        }
      });
      b.addEventListener('blur', () => {
        if (!this.fest) this._planeSchliessen();
      });
      b.addEventListener('click', (e) => {
        e.preventDefault();
        this.waehle(id);
        this._buehneInsBild();
      });
    }
  }

  _karte() {
    this.karte.addEventListener('pointerenter', () => {
      clearTimeout(this.tSchliessen);
      clearTimeout(this.tVorschau);
    });
    this.karte.addEventListener('pointerleave', (e) => this._maus(e) && this._planeSchliessen());
    this.karte.addEventListener('focusout', () => {
      setTimeout(() => {
        const a = document.activeElement;
        if (!this.fest && !this.karte.contains(a) && !this.marker.includes(a)) this._planeSchliessen();
      }, 0);
    });
    this.karte.querySelector('[data-es-karte-zu]').addEventListener('click', (e) => {
      const id = this.gezeigt;
      this.schliessen();
      if (e.detail === 0) this._zurueckZumMarker(id);
    });
    this.karte.querySelectorAll('[data-es-karte-schritt]').forEach((t) =>
      t.addEventListener('click', () => {
        const i = elemente.findIndex((e) => e.id === this.gezeigt);
        const n = elemente.length;
        this.waehle(elemente[(i + Number(t.dataset.esKarteSchritt) + n) % n].id);
      })
    );
  }

  /* ---------- Darstellung ---------- */

  _zeige(id) {
    if (id === this.gezeigt) {
      if (id) this._positioniere();
      return;
    }
    this.gezeigt = id;
    const gruppen = new Set(id ? GRUPPEN[id] : []);
    const links = new Set(id ? BEZUG[id] : []);
    if (id) this.root.dataset.wahl = id;
    else delete this.root.dataset.wahl;
    for (const g of this.gruppen) g.classList.toggle('is-wahl', gruppen.has(g.dataset.node));
    for (const k of this.kabel) k.classList.toggle('is-wahl', links.has(k.dataset.link));
    for (const mk of this.marker) mk.setAttribute('aria-expanded', String(mk.dataset.element === id));
    for (const b of this.begriffe) b.classList.toggle('is-aktiv', b.dataset.element === id);
    if (id) {
      this._inhalt(id);
      this.karte.hidden = false;
      this._positioniere();
    } else {
      this.karte.hidden = true;
    }
    this.beiWechsel(id, links);
  }

  _inhalt(id) {
    const e = elementNach[id];
    const f = this.felder;
    f.nr.textContent = e.nr;
    f.titel.textContent = e.name;
    f.text.textContent = e.text;
    f.leistung.textContent = e.leistung;
    f.link.href = e.link.href;
    f.linkText.textContent = e.link.text;
    this._jetzt(id);
  }

  _jetzt(id) {
    const e = elementNach[id];
    const m = this.moment();
    this.felder.uhr.textContent = uhrzeit(Math.floor(m.t * 4) / 4);
    this.felder.lage.textContent = lagesatz(id, m.zustand[id]);
    this.felder.fuell.textContent = e.speicher ? `${id === 'gewerbe' ? 'Speicher' : ui.speicher}: ${fuellstand[fuellstandStufe(m.soc[e.speicher])]}` : '';
  }

  // Bereich, den die Karte nicht verdecken soll: Element, seine Leitungen und der Marker (px)
  _wichtig(id) {
    const [vx, vy, vb] = this.daten.viewBox;
    const k = this.ebene.clientWidth / vb;
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    const dazu = (x, y) => {
      box[0] = Math.min(box[0], x);
      box[1] = Math.min(box[1], y);
      box[2] = Math.max(box[2], x);
      box[3] = Math.max(box[3], y);
    };
    for (const link of BEZUG[id]) for (const z of this.daten.linien[link]) for (const [x, y] of z.p) dazu((x - vx) * k, (y - vy) * k);
    for (const g of this.gruppen) {
      if (!GRUPPEN[id].includes(g.dataset.node)) continue;
      const b = g.getBBox();
      dazu((b.x - vx) * k, (b.y - vy) * k);
      dazu((b.x + b.width - vx) * k, (b.y + b.height - vy) * k);
    }
    return box;
  }

  _positioniere() {
    const k = this.karte;
    if (!this.gezeigt || k.hidden) return;
    if (getComputedStyle(k).position !== 'absolute') {
      k.style.left = '';
      k.style.top = '';
      return;
    }
    const mk = this._markerVon(this.gezeigt);
    const W = this.rahmen.clientWidth;
    const H = this.ebene.clientHeight;
    const mx = (parseFloat(mk.style.left) / 100) * W;
    const my = (parseFloat(mk.style.top) / 100) * H;
    const w = k.offsetWidth;
    const h = k.offsetHeight;
    const r = 8;
    const klemme = ([x, y]) => [Math.min(Math.max(r, x), W - w - r), Math.min(Math.max(r, y), Math.max(r, H - h - r))];
    // Kandidaten: neben dem Marker, dann die Ecken; gewählt wird die geringste Überdeckung
    const kandidaten = [
      [mx + 30, my - h * 0.3],
      [mx - 30 - w, my - h * 0.3],
      [r, r],
      [W - w - r, r],
      [r, H - h - r],
      [W - w - r, H - h - r],
    ].map(klemme);
    const wichtig = this._wichtig(this.gezeigt);
    const flaeche = ([x, y], [a, b, c, d]) => Math.max(0, Math.min(x + w, c) - Math.max(x, a)) * Math.max(0, Math.min(y + h, d) - Math.max(y, b));
    let best = kandidaten[0];
    let bestWert = Infinity;
    for (const p of kandidaten) {
      const wert = flaeche(p, wichtig) + flaeche(p, [mx - 22, my - 22, mx + 22, my + 22]) * 40 + Math.hypot(p[0] + w / 2 - mx, p[1] + h / 2 - my) * 0.5;
      if (wert < bestWert) {
        bestWert = wert;
        best = p;
      }
    }
    k.style.left = `${Math.round(best[0])}px`;
    k.style.top = `${Math.round(best[1])}px`;
  }

  // Angedockte Karte (schmale Grafik) nach dem Antippen sichtbar machen
  _karteInsBild() {
    if (getComputedStyle(this.karte).position === 'absolute') return;
    const r = this.karte.getBoundingClientRect();
    if (r.bottom > window.innerHeight || r.top < 0) this.karte.scrollIntoView({ block: 'nearest', behavior: this.reduce.matches ? 'auto' : 'smooth' });
  }

  // Nach einem Begriff im Text: Karte bzw. Grafik ins Bild holen, falls kaum sichtbar
  _buehneInsBild() {
    if (getComputedStyle(this.karte).position !== 'absolute') {
      this._karteInsBild();
      return;
    }
    const r = this.ebene.getBoundingClientRect();
    const sichtbar = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    if (sichtbar < r.height * 0.6) this.ebene.scrollIntoView({ block: 'center', behavior: this.reduce.matches ? 'auto' : 'smooth' });
  }
}
