// Isometrische Zeichnung für die Leistung Solarpark-Monitoring: Ausschnitt einer Freifläche mit
// Wechselrichtern, Einstrahlungssensor, Übergabestation und Messschrank mit Antenne. Eigenes
// Modul, damit iso.js und die Prüfsumme der bestehenden Zeichnungen unverändert bleiben.
import { IsoScene } from './iso.js';

export function drawMonitoring({ title = 'Solarpark mit Einstrahlungssensor, Übergabestation und Messschrank', animate = true } = {}) {
  const sc = new IsoScene();
  sc.poly([[-3, 0, -3], [36, 0, -3], [36, 0, 21], [-3, 0, 21]], 'ground', [], -60);

  // Modultische in drei Reihen, je zwei Tische
  const tilt = (20 * Math.PI) / 180;
  const tiefe = 4.6;
  for (let r = 0; r < 3; r++) {
    const z0 = r * 6.2;
    for (let t = 0; t < 2; t++) {
      const x0 = t * 13;
      const o = [x0, 0.8, z0 + tiefe * Math.cos(tilt)];
      const u = [12, 0, 0];
      const v = [0, tiefe * Math.sin(tilt), -tiefe * Math.cos(tilt)];
      for (const fx of [0.15, 0.85]) {
        sc.line([x0 + fx * 12, 0, z0 + tiefe * Math.cos(tilt) - 0.4], [x0 + fx * 12, 0.8, z0 + tiefe * Math.cos(tilt) - 0.4], 'line', -0.5);
        sc.line([x0 + fx * 12, 0, z0 + 0.5], [x0 + fx * 12, 0.8 + tiefe * Math.sin(tilt) - 0.2, z0 + 0.5], 'line', -0.5);
      }
      sc.panels(o, u, v, 10, 2, { bias: 0.2 });
    }
    // Wechselrichter am Reihenende
    sc.box(25.4, 0.3, z0 + 1.6, 0.4, 0.9, 1);
  }

  // Einstrahlungssensor in Modulneigung
  sc.line([27.6, 0, 1.6], [27.6, 2.2, 1.6], 'line');
  sc.panels([27, 2.2, 2], [1.2, 0, 0], [0, 0.4, -0.8], 1, 1, { bias: 0.3 });

  // Übergabestation mit Messschrank und Antenne
  sc.box(30, 0, 7.5, 3.4, 2.6, 2.6);
  sc.box(30.6, 0, 10.6, 1.3, 1.8, 0.7);
  sc.line([31.25, 1.8, 10.95], [31.25, 4.4, 10.95], 'line', 2);
  sc.line([30.75, 4.0, 10.95], [31.75, 4.0, 10.95], 'line', 2);
  sc.dot([31.25, 4.4, 10.95]);

  // Kabelweg von den Wechselrichtern zur Station
  sc.line([26, 0, 3], [26, 0, 15.2], 'fence', -40);
  sc.line([26, 0, 9], [30, 0, 9], 'fence', -40);
  return sc.render({ title, animate });
}
