// Image du vortex noir (sans dépendance, pour ne pas alourdir le chargement initial).
/** Image du vortex noir du portail, avec ses spirales violettes : c'est elle que la brisure fissure (on ne voit jamais la bande 2D de la phase 1). */
export function vortexNoir(largeur: number, hauteur: number, image?: HTMLImageElement | null): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = largeur; c.height = hauteur;
  const g = c.getContext('2d')!;
  g.fillStyle = '#05000f'; g.fillRect(0, 0, largeur, hauteur);
  if (image && image.naturalWidth) { // ton vortex noir dessiné, agrandi pour remplir l'écran, centré sur son cœur
    const R = Math.max(largeur, hauteur) * 1.25;
    g.drawImage(image, largeur / 2 - R / 2, hauteur * 0.5 - R / 2, R, R);
    return c;
  }
  const cx = largeur / 2, cy = hauteur * 0.44, R = Math.max(largeur, hauteur) * 0.8;
  const lueur = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5); lueur.addColorStop(0, 'rgba(120,60,220,0.32)'); lueur.addColorStop(1, 'rgba(120,60,220,0)');
  g.fillStyle = lueur; g.fillRect(0, 0, largeur, hauteur);
  for (let k = 0; k < 6; k++) {
    g.beginPath();
    for (let i = 0; i <= 100; i++) { const t = i / 100, a = k * (Math.PI / 3) + t * 5.2, rad = t * R; const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.85; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.strokeStyle = `rgba(150,92,255,${0.16 + (k % 2) * 0.08})`; g.lineWidth = Math.max(2, largeur / 260); g.stroke();
  }
  return c;
}

/** Vortex noir ANIMÉ : l'illustration tourne dans les deux sens, du chaos violet crépite, l'obscurité pulse au centre. `maj(t, tension)` redessine le canvas (tension 0 → 1 : de plus en plus de chaos). */
export class VortexAnime {
  readonly canvas: HTMLCanvasElement; private g: CanvasRenderingContext2D; private traits: { a: number; l: number; w: number; o: number; v: number }[] = [];
  constructor(l: number, h: number, private image: HTMLImageElement | null) {
    this.canvas = document.createElement('canvas'); this.canvas.width = l; this.canvas.height = h; this.g = this.canvas.getContext('2d')!;
    for (let i = 0; i < 16; i++) this.traits.push({ a: Math.random() * 6.28, l: 0.3 + Math.random() * 0.7, w: 1 + Math.random() * 3, o: Math.random(), v: 0.5 + Math.random() * 2 });
    this.maj(0, 0);
  }
  maj(t: number, tension: number) {
    const g = this.g, W = this.canvas.width, H = this.canvas.height, cx = W / 2 + Math.sin(t * 37) * tension * W * 0.004, cy = H * 0.5 + Math.cos(t * 41) * tension * H * 0.004, R = Math.max(W, H) * 1.4;
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#05000f'; g.fillRect(0, 0, W, H);
    if (this.image && this.image.naturalWidth) {
      g.save(); g.translate(cx, cy); g.rotate(t * (0.55 + tension * 1.6)); g.drawImage(this.image, -R / 2, -R / 2, R, R); g.restore();
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.45; g.translate(cx, cy); g.rotate(-t * (0.9 + tension * 1.2) + 1); g.scale(1.18, 1.18); g.drawImage(this.image, -R / 2, -R / 2, R, R); g.restore();
    }
    // Chaos : traînées violettes qui jaillissent du centre et crépitent.
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const s of this.traits) {
      const k = (Math.sin(t * s.v * 5 + s.o * 40) * 0.5 + 0.5) * (0.35 + tension * 0.65); if (k < 0.18) continue;
      const a = s.a + t * 0.4 * (s.o - 0.5) + Math.sin(t * 3 + s.o * 9) * 0.15, r0 = R * 0.05, r1 = R * 0.5 * s.l * (0.6 + k * 0.6);
      g.strokeStyle = `rgba(${170 + Math.round(60 * s.o)}, ${110 + Math.round(60 * s.o)}, 255, ${0.35 * k})`; g.lineWidth = s.w * (1 + tension * 2) * (W / 1400);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.quadraticCurveTo(cx + Math.cos(a + 0.25) * r1 * 0.5, cy + Math.sin(a + 0.25) * r1 * 0.5, cx + Math.cos(a + 0.1) * r1, cy + Math.sin(a + 0.1) * r1); g.stroke();
    }
    g.restore();
    // L'obscurité pulse au centre et se resserre sur les bords.
    g.globalCompositeOperation = 'source-over';
    const p = 0.55 + 0.25 * Math.sin(t * 2.3) + tension * 0.2, noir = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3);
    noir.addColorStop(0, `rgba(2, 0, 8, ${Math.min(0.95, p + 0.3)})`); noir.addColorStop(1, 'rgba(2, 0, 8, 0)');
    g.fillStyle = noir; g.fillRect(0, 0, W, H);
    const bord = g.createRadialGradient(cx, cy, R * 0.28, cx, cy, R * 0.62); bord.addColorStop(0, 'rgba(3, 0, 10, 0)'); bord.addColorStop(1, `rgba(3, 0, 10, ${0.35 + tension * 0.4})`);
    g.fillStyle = bord; g.fillRect(0, 0, W, H);
  }
}
