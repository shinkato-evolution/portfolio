// Découpe d'un rectangle en cellules de Voronoï (éclats de l'écran brisé), plus denses autour d'un épicentre.
// Pas de dépendance : chaque cellule est le rectangle rogné par les demi-plans « plus proche de moi que du voisin ».
export type Pt = [number, number];

export interface Eclat {
  poly: Pt[];       // sommets en ordre, repère de la bande (x vers la droite, y vers le bas)
  centre: Pt;       // centroïde
  distance: number; // distance du centroïde à l'épicentre
}

function hasard(graine: number) {
  let s = graine >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Rogne un polygone convexe par le demi-plan {p : (p - m)·n <= 0}. */
function rogner(poly: Pt[], m: Pt, n: Pt): Pt[] {
  const sortie: Pt[] = [];
  const d = (p: Pt) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = d(a), db = d(b);
    if (da <= 0) sortie.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      sortie.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return sortie;
}

function aire(poly: Pt[]) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}

export function decouper(largeur: number, hauteur: number, epicentre: Pt, nombre: number, graine = 7): Eclat[] {
  const r = hasard(graine);
  const coins: Pt[] = [[0, 0], [largeur, 0], [largeur, hauteur], [0, hauteur]];
  const rayonMax = Math.max(...coins.map((c) => Math.hypot(c[0] - epicentre[0], c[1] - epicentre[1])));
  // Germes : spirale dorée resserrée près de l'épicentre, rejet des germes hors du rectangle.
  const germes: Pt[] = [];
  for (let i = 0, essais = 0; germes.length < nombre && essais < nombre * 40; i++, essais++) {
    const u = (i + 0.5) / (nombre * 1.7);
    const rayon = rayonMax * Math.pow(u, 0.62);
    const ang = i * 2.39996 + r() * 0.5;
    const x = epicentre[0] + Math.cos(ang) * rayon * 1.25; // un peu étiré : la bande est large et basse
    const y = epicentre[1] + Math.sin(ang) * rayon * 0.8;
    if (x > 4 && x < largeur - 4 && y > 4 && y < hauteur - 4) germes.push([x, y]);
  }
  const eclats: Eclat[] = [];
  germes.forEach((g, i) => {
    let poly = coins.map((c) => [c[0], c[1]] as Pt);
    for (let j = 0; j < germes.length && poly.length >= 3; j++) {
      if (j === i) continue;
      const h = germes[j];
      const m: Pt = [(g[0] + h[0]) / 2, (g[1] + h[1]) / 2];
      poly = rogner(poly, m, [h[0] - g[0], h[1] - g[1]]);
    }
    if (poly.length < 3 || Math.abs(aire(poly)) < 40) return;
    const A = aire(poly);
    let cx = 0, cy = 0;
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length], f = a[0] * b[1] - b[0] * a[1];
      cx += (a[0] + b[0]) * f; cy += (a[1] + b[1]) * f;
    }
    const centre: Pt = [cx / (6 * A), cy / (6 * A)];
    eclats.push({ poly: A < 0 ? poly.reverse() : poly, centre, distance: Math.hypot(centre[0] - epicentre[0], centre[1] - epicentre[1]) });
  });
  return eclats;
}
