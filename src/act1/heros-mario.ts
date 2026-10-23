// Le héros : la marionnette pixel pour marcher et se tenir debout ; les images de surprise et de chute (heros-pixel.ts)
// pour la scène du portail « ??? » (c'est la chute que tu aimes). Même interface que les anciennes classes du héros.
import { Container, Sprite, type Renderer, type Texture } from 'pixi.js';
import { HerosPixel } from './heros-pixel';
import { MarionnettePixel } from './marionnette-pixel';

export class HerosMario extends Container {
  private mario: MarionnettePixel;
  private chute: HerosPixel;
  /** Personnage dessiné (Phase 1 V2) : poses de chute qui défilent à la place des images pixel. */
  private dessin: Sprite | null = null; private dessin2: Sprite | null = null; private poses: Texture[] = [];
  definirDessin(poses: Texture[] | null) {
    this.poses = poses ?? [];
    if (poses && !this.dessin) { this.dessin = new Sprite(poses[0]); this.dessin2 = new Sprite(poses[0]); for (const d of [this.dessin, this.dessin2]) { d.anchor.set(0.5); d.visible = false; this.addChild(d); } }
    if (!poses && this.dessin) { this.dessin.destroy(); this.dessin2?.destroy(); this.dessin = null; this.dessin2 = null; }
  }

  constructor(tex: Record<string, Texture>, renderer: Renderer) {
    super();
    this.mario = new MarionnettePixel(tex, renderer);
    this.chute = new HerosPixel(tex);
    this.chute.visible = false;
    this.addChild(this.mario, this.chute);
  }

  /** Taille voulue à l'écran (px) ; la marionnette s'agrandit par un nombre entier, les images de chute suivent sa taille réelle. */
  fixerHauteur(px: number) { const h = this.mario.fixerHauteur(px); this.chute.fixerHauteur(h); }
  get hauteur() { return this.mario.hauteur; }

  maj(phase: number, marche: boolean, reduit: boolean, t: number, dtMs: number) {
    if (this.dessin) { this.chute.visible = false; this.mario.visible = false; this.dessin.visible = false; if (this.dessin2) this.dessin2.visible = false; return; } // jamais le héros pixel de la phase 1
    this.chute.visible = false; this.mario.visible = true;
    this.mario.maj(phase, marche, reduit, t, dtMs);
  }

  /** Surprise puis chute : à partir d'un certain degré, les images de chute prennent le relais. */
  poseChute(a: number, t: number) {
    if (a < 0.12) return;
    this.mario.visible = false;
    if (this.dessin && this.poses.length) { // le personnage dessiné : quelques poses de chute lentes ; le tour du conteneur est annulé pour qu'il ne tourne pas de partout
      this.chute.visible = false; this.dessin.visible = true;
      // Comme le héros pixel : d'abord la surprise (image 4), puis trois images de chute (5, 6, 7) qui s'enchaînent ; la rotation du conteneur est conservée.
      // Fondu enchaîné entre deux poses voisines (pas de saut d'image) et léger balancement : la chute est continue.
      const cycle = [5, 6, 7, 6], periode = 0.28;
      let courant: number, suivant: number, mix = 0;
      if (a < 0.4) { courant = 4; suivant = 5; mix = Math.min(1, Math.max(0, (a - 0.12) / 0.28)); }
      else { const x = t / periode, k = Math.floor(x); courant = cycle[k % 4]; suivant = cycle[(k + 1) % 4]; mix = x - k; mix = mix * mix * (3 - 2 * mix); }
      const n = this.poses.length, d = this.dessin, d2 = this.dessin2!;
      d.texture = this.poses[Math.min(courant, n - 1)]; d2.texture = this.poses[Math.min(suivant, n - 1)];
      d.visible = true; d2.visible = true; d.alpha = 1; d2.alpha = mix;
      const h = this.hauteur * 1.35, bal = Math.sin(t * 2.2) * 0.06;
      for (const sp of [d, d2]) { sp.height = h; sp.width = h; sp.position.set(0, -this.hauteur / 2); sp.rotation = bal; }
      return;
    }
    this.chute.visible = true;
    this.chute.poseChute(a, t);
  }

  utiliserRenderer(r: Renderer) { this.mario.utiliserRenderer(r); }
}
