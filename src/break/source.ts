// Ce que la scène de fracture a besoin de la scène précédente : l'image à briser (le vortex noir), la taille de l'écran et le personnage dessiné qui tombe.
// C'est tout ce qui reste de l'ancienne bande 2D du début : elle n'existe plus, ni son décor, ni son héros en pixels.
import { Container, Sprite, type Texture } from 'pixi.js';

/** Le personnage dessiné qui culbute dans le vide : quelques poses de chute qui se fondent l'une dans l'autre (affiché par le moteur de la fracture). */
export class HerosChute extends Container {
  /** Hauteur de référence du personnage à l'écran (px). */
  hauteur = 0;
  private poses: Texture[] = [];
  private a: Sprite | null = null; private b: Sprite | null = null;

  definirPoses(poses: Texture[] | null) {
    this.poses = poses ?? [];
    if (poses && !this.a) {
      this.a = new Sprite(poses[0]); this.b = new Sprite(poses[0]);
      for (const s of [this.a, this.b]) { s.anchor.set(0.5); s.visible = false; this.addChild(s); }
    }
    if (!poses && this.a) { this.a.destroy(); this.b?.destroy(); this.a = null; this.b = null; }
  }

  /** `a` : degré de chute de 0 à 1 (surprise, puis chute) ; `t` : temps en secondes. */
  poseChute(a: number, t: number) {
    if (a < 0.12 || !this.a || !this.b || !this.poses.length) return;
    // D'abord la surprise (image 4), puis trois images de chute (5, 6, 7) qui s'enchaînent, en fondu et avec un léger balancement.
    const cycle = [5, 6, 7, 6], periode = 0.28;
    let courant: number, suivant: number, mix = 0;
    if (a < 0.4) { courant = 4; suivant = 5; mix = Math.min(1, Math.max(0, (a - 0.12) / 0.28)); }
    else { const x = t / periode, k = Math.floor(x); courant = cycle[k % 4]; suivant = cycle[(k + 1) % 4]; mix = x - k; mix = mix * mix * (3 - 2 * mix); }
    const n = this.poses.length, d = this.a, d2 = this.b;
    d.texture = this.poses[Math.min(courant, n - 1)]; d2.texture = this.poses[Math.min(suivant, n - 1)];
    d.visible = true; d2.visible = true; d.alpha = 1; d2.alpha = mix;
    const h = this.hauteur * 1.35, bal = Math.sin(t * 2.2) * 0.06;
    for (const sp of [d, d2]) { sp.height = h; sp.width = h; sp.position.set(0, -this.hauteur / 2); sp.rotation = bal; }
  }
}

export class SourceBrisure {
  readonly heros = new HerosChute();
  /** L'image à briser : le vortex noir du portail (canevas animé). */
  capturePerso: HTMLCanvasElement | null = null;
  constructor(private hote: HTMLElement) {}

  get taille() { return { largeur: this.hote.clientWidth, hauteur: this.hote.clientHeight }; }

  /** Où le personnage commence sa chute : un peu à gauche du centre, vers le bas de l'écran ; sa hauteur est de 30 % de l'écran. */
  get placeHeros() {
    const { largeur: W, hauteur: H } = this.taille;
    this.heros.hauteur = H * 0.3;
    return { x: W * 0.47, y: H * 0.816, hauteur: H * 0.3, sens: 1 as const };
  }

  capturer(): HTMLCanvasElement {
    if (this.capturePerso) return this.capturePerso;
    const c = document.createElement('canvas'); c.width = Math.max(2, this.hote.clientWidth); c.height = Math.max(2, this.hote.clientHeight);
    const g = c.getContext('2d')!; g.fillStyle = '#05000f'; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
}
