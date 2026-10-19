// Einmalige Einblendungen beim Scrollen. IntersectionObserver misst gegen das aktuelle Layout,
// ohne beim Start berechnete Positionen: Verschiebt sich die Seite danach (Schriftwechsel,
// Countdown, Bilder, Wechsel der Inszenierung), erscheint ein Element trotzdem, sobald es die
// Linie erreicht. Was schon darüber liegt (Ankersprung, gespeicherte Scrollposition), löst
// sofort aus.

const beobachter = new Map();
// Der Beobachtungsbereich reicht nach oben über jede Seitenlänge hinaus. So meldet sich auch ein
// Element, an dem schnelles Scrollen oder ein Sprung vorbeiführt, ohne dass es je im Bild war:
// Es wechselt von „unter der Linie“ zu „darüber“.
const OBEN = 100000;

/** Ruft fn(el) einmal auf, sobald el die Linie bei `linie` × Bildhöhe erreicht oder darüber liegt. */
export function beimEinblenden(el, fn, linie = 0.9) {
  const rand = `${OBEN}px 0px ${Math.round((linie - 1) * 100)}% 0px`;
  let b = beobachter.get(rand);
  if (!b) {
    const rueckrufe = new Map();
    const io = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          if (!e.isIntersecting && e.boundingClientRect.bottom > 0) continue;
          io.unobserve(e.target);
          const fs = rueckrufe.get(e.target) || [];
          rueckrufe.delete(e.target);
          fs.forEach((f) => f(e.target));
        }
      },
      { rootMargin: rand }
    );
    b = { io, rueckrufe };
    beobachter.set(rand, b);
  }
  const fs = b.rueckrufe.get(el);
  if (fs) fs.push(fn);
  else {
    b.rueckrufe.set(el, [fn]);
    b.io.observe(el);
  }
}
