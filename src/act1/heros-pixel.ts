// Le héros en pixel art : 16 images dessinées (marche x8, repos x4, surprise x2, chute x2), choisies selon l'état.
// Même interface que l'ancienne marionnette (heros.ts) : fixerHauteur, hauteur, maj, poseChute.
// Les images sont affichées sans lissage (pixels nets) ; les pieds sont ancrés au sol, les poses de chute au centre.
import { Container, Sprite, Texture } from 'pixi.js';
import meta from '../content/heros-pixel.json';

export const NOMS_HEROS_PIXEL = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `marche-${i}`),
  ...[0, 1, 2, 3].map((i) => `repos-${i}`),
  ...[0, 1].map((i) => `surprise-${i}`),
  ...[0, 1].map((i) => `chute-${i}`),
];

interface Image { tex: Texture; ax: number; ay: number; e: number; }
const SEQUENCE_REPOS = [0, 1, 2, 3, 2, 1];

export class HerosPixel extends Container {
  private sp = new Sprite();
  private images: Record<string, Image> = {};
  private echelle = 1;   // pixels d'écran par pixel dessiné
  private hRepos = 1;    // hauteur du personnage debout, en pixels dessinés
  private amplitude = 0; // 0 = attente, 1 = marche
  private courante = '';

  constructor(tex: Record<string, Texture>) {
    super();
    const m = meta as unknown as Record<string, { w: number; h: number; ax: number; ay: number } | number>;
    const rapport = (m._rapport as number) || 1; // les poses de repos et de chute viennent d'une autre planche, un peu plus petite
    for (const nom of NOMS_HEROS_PIXEL) {
      const t = tex[`heros-pixel/${nom}`];
      t.source.scaleMode = 'nearest';
      const d = m[nom] as { ax: number; ay: number };
      this.images[nom] = { tex: t, ax: d.ax, ay: d.ay, e: nom.startsWith('marche') ? 1 : rapport };
    }
    this.hRepos = this.images['marche-2'].tex.height;
    this.addChild(this.sp);
    this.montrer('repos-0');
  }

  private montrer(nom: string) {
    if (nom === this.courante) return;
    this.courante = nom;
    const f = this.images[nom];
    this.sp.texture = f.tex;
    this.sp.anchor.set(f.ax, f.ay);
    this.sp.scale.set(this.echelle * f.e);
    this.sp.rotation = 0; this.sp.skew.x = 0;
    this.sp.y = f.ay >= 1 ? 0 : -this.hauteur / 2; // debout : pieds à l'origine ; en chute : centre à mi-hauteur
  }

  /** Taille du personnage debout à l'écran (px). */
  fixerHauteur(px: number) { this.echelle = px / this.hRepos; const c = this.courante; this.courante = ''; this.montrer(c || 'repos-0'); }
  get hauteur() { return this.hRepos * this.echelle; }

  /**
   * phase : avance de la marche (radians, un cycle = deux pas) ; marche : en mouvement ; reduit : pose fixe.
   * Provisoire : une seule image neutre (taille et style constants), animée par le code (rebond, balancement, respiration).
   */
  maj(phase: number, marche: boolean, reduit: boolean, t: number, dtMs: number) {
    this.montrer('repos-0');
    const base = this.echelle * this.images['repos-0'].e;
    this.sp.rotation = 0; this.sp.skew.x = 0; this.sp.y = 0; this.sp.scale.set(base);
    if (reduit) { this.amplitude = 0; return; }
    this.amplitude += ((marche ? 1 : 0) - this.amplitude) * Math.min(1, dtMs / 90);
    const a = this.amplitude;
    this.sp.y = -Math.abs(Math.sin(phase)) * this.hauteur * 0.014 * a;
    this.sp.rotation = Math.sin(phase) * 0.035 * a + 0.025 * a;
    this.sp.scale.y = base * (1 + 0.007 * Math.sin(t * 2.2) * (1 - a));
  }

  /** Surprise puis chute : a (0..1) choisit l'image ; t fait alterner les deux images de chute. */
  poseChute(a: number, t: number) {
    if (a < 0.12) return;
    if (a < 0.45) this.montrer('surprise-0');
    else if (a < 0.8) this.montrer('surprise-1');
    else this.montrer(`chute-${Math.floor(t * 5) % 2}`);
  }
}
