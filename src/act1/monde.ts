// Acte 1 — rendu PixiJS v8 : l'archipel des rêves (ciel pastel, nuages et îles qui dérivent), sol de pierre lunaire au bas du bandeau,
// arches-portails (le dernier est le portail « ??? »), poussières de lumière, étalonnage chaud.
// Le héros est en pixel art (heros-pixel.ts). Ce module ne connaît pas le défilement :
// il reçoit p (0..1), la vitesse et l'état, et dessine.
import { Application, Assets, Container, FillGradient, Graphics, Rectangle, Sprite, Text, TilingSprite, Texture } from 'pixi.js';
import { POSITIONS_PORTAILS } from './chemin';
import { NOMS_HEROS_PIXEL } from './heros-pixel';
import { HerosMario } from './heros-mario';
import { NOMS_MARIO } from './marionnette-pixel';
import { PortailFx, PALETTE_MYSTERE, PALETTE_PORTAIL } from './portail-fx';

export interface EtatMonde {
  p: number;            // progression 0..1
  vitesse: number;      // px/s de défilement (signée)
  reduit: boolean;      // réduire les animations
  proche: number;       // index du portail le plus proche
  devant: boolean;      // héros devant ce portail
}

interface Couche { conteneur: Container; facteur: number; }
interface Flottant { sp: Sprite; x0: number; y0: number; vx: number; amp: number; phase: number; longueur: number; }
interface Vortex { fx: PortailFx; a: number; rx: number; ry: number; cy: number; fixe: boolean; }
interface Poussiere { x: number; y: number; r: number; v: number; ph: number; fx: number; }

const BASE = `${import.meta.env.BASE_URL}sprites/`;
const NOMS = [
  'fond-ciel', 'plateforme',
  ...[1, 2].map((n) => `elements/arches-${n}`),
  ...[1, 2, 3, 4].map((n) => `elements/bannieres-${n}`),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `elements/nuages-${n}`),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `elements/herbes-${n}`),
];
/** Un seul type de portail pour tous les projets (l'arche en ogive fleurie) ; le dernier, mystérieux, est à linteau et sombre. */
const ARCHE_PROJET = 'arches-1';

// Pseudo-aléatoire déterministe : le décor est identique à chaque chargement.
function hasard(graine: number) {
  let s = graine >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const degrade = (haut: string, bas: string) => new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: haut }, { offset: 1, color: bas }] });

export class Monde {
  app = new Application();
  tex: Record<string, Texture> = {};
  private couches: Couche[] = [];
  private portails: Container[] = [];
  private flottants: Flottant[] = [];
  heros!: HerosMario;
  /** Vrai quand la brisure a pris le héros : le monde ne le déplace ni ne l'anime plus. */
  heroConfie = false;
  private W = 0; private H = 0; private sol = 0; private largeurMonde = 0;
  private phase = 0; private dernierX = 0; private marche = false; private tempsArret = 0; private temps = 0;
  private vitLisse = 0; private sens: 1 | -1 = 1; private initialise = false;
  private vortex: Vortex[] = [];
  private rayons: Graphics[] = []; private soleil!: Graphics;
  private poussieres: Poussiere[] = []; private gPoussiere!: Graphics;
  private auras: Graphics[] = [];
  private teinte!: Graphics; private baseY = 0; private hArche = 0; private decPortail = 0;
  surClicPortail: (i: number) => void = () => {};
  surEtatHeros: (etat: 'marche' | 'attente') => void = () => {};

  async init(hote: HTMLElement) {
    await this.app.init({
      resizeTo: hote,
      background: 0xcdeefa,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
    });
    this.app.canvas.setAttribute('aria-hidden', 'true');
    hote.prepend(this.app.canvas);
    const charges = await Promise.all([
      ...NOMS.map((n) => Assets.load<Texture>(`${BASE}${n}.webp`)),
      ...NOMS_HEROS_PIXEL.map((n) => Assets.load<Texture>(`${BASE}heros-pixel/${n}.png`)),
      ...NOMS_MARIO.map((n) => Assets.load<Texture>(`${BASE}mario/${n}.png`)),
    ]);
    NOMS.forEach((n, i) => { this.tex[n.replace('elements/', '')] = charges[i]; });
    NOMS_HEROS_PIXEL.forEach((n, i) => { this.tex[`heros-pixel/${n}`] = charges[NOMS.length + i]; });
    NOMS_MARIO.forEach((n, i) => { this.tex[`mario/${n}`] = charges[NOMS.length + NOMS_HEROS_PIXEL.length + i]; });
    this.heros = new HerosMario(this.tex, this.app.renderer);
    this.construire();
    this.app.renderer.on('resize', () => this.construire());
  }

  /** Position du portail i dans le monde, en pixels. */
  /** Le héros s'arrête à côté du portail (pas devant) : on voit tout l'effet et la sphère du trailer juste au-dessus. */
  private xPortail(i: number) { return POSITIONS_PORTAILS[i] * this.largeurMonde + this.decPortail; }

  /** Sprite posé par le bas (anchor bas-centre), hauteur donnée. */
  private poser(nom: string, hauteur: number, x: number, y: number) {
    const t = this.tex[nom];
    const sp = new Sprite(t);
    sp.anchor.set(0.5, 1);
    sp.scale.set(hauteur / t.height);
    sp.position.set(x, y);
    return sp;
  }

  private construire() {
    const { width: W, height: H } = this.app.screen;
    this.W = W; this.H = H;
    this.largeurMonde = Math.max(W * 3.7, 2800);
    const tA = this.tex['arches-1'];
    this.decPortail = H * 0.46 * (tA.width / tA.height) * 0.6;
    this.app.stage.removeChild(this.heros); // le héros est réutilisé, ne pas le détruire
    this.app.stage.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.couches = []; this.portails = []; this.flottants = []; this.vortex = []; this.rayons = []; this.auras = []; this.poussieres = [];
    const r = hasard(2026);
    const nouvelleCouche = (facteur: number) => {
      const c = new Container();
      this.app.stage.addChild(c);
      this.couches.push({ conteneur: c, facteur });
      return c;
    };
    const fin = this.largeurMonde + W * 0.06; // bord visible à la fin du chemin

    // Le sol occupe le bas du bandeau, jusqu'au bord : la face avant de la plateforme touche le bas de l'écran.
    const tp = this.tex['plateforme'];
    const hPlat = H * 0.34, echelle = hPlat / tp.height;
    const dessus = H - hPlat;
    this.sol = dessus + hPlat * 0.46;      // les pieds du héros
    const base = this.sol - hPlat * 0.08;  // pied des objets, juste derrière le héros

    // 1. Ciel : le fond, répété en miroir pour qu'aucune couture ne se voie.
    {
      const c = nouvelleCouche(0.04);
      const tf = this.tex['fond-ciel'];
      const s = H / tf.height, lf = tf.width * s;
      const total = this.largeurMonde * 0.04 + W * 2;
      for (let k = 0; k * lf < total; k++) {
        const sp = new Sprite(tf);
        sp.scale.set(k % 2 ? -s : s, s);
        sp.x = k % 2 ? (k + 1) * lf : k * lf;
        c.addChild(sp);
      }
    }

    this.soleil = new Graphics(); // (le ciel peint porte sa propre lune : plus de soleil ni de rayons dessinés par le code)

    // 2. Nuages et îles qui dérivent doucement (un peu plus près que le ciel).
    {
      const facteur = 0.12;
      const c = nouvelleCouche(facteur);
      const longueur = this.largeurMonde * facteur + W * 2;
      const nuages = [1, 2, 3, 4, 5, 6];
      for (let i = 0; i < 11; i++) {
        const t = this.tex[`nuages-${nuages[i % nuages.length]}`];
        const h = H * (0.07 + r() * 0.1);
        const sp = new Sprite(t);
        sp.anchor.set(0.5);
        sp.scale.set(h / t.height);
        sp.alpha = 0.92;
        c.addChild(sp);
        this.flottants.push({ sp, x0: (i / 11) * longueur + r() * 120, y0: H * (0.06 + r() * 0.36), vx: 6 + r() * 9, amp: 3, phase: r() * 6, longueur });
      }
      [7, 8, 9, 7, 8].forEach((n, i) => {
        const t = this.tex[`nuages-${n}`];
        const h = H * (0.17 + r() * 0.06); // les îles sont des petites scènes : assez grandes pour voir la maison et l'arbre
        const sp = new Sprite(t);
        sp.anchor.set(0.5);
        sp.scale.set(h / t.height);
        c.addChild(sp);
        this.flottants.push({ sp, x0: ((i + 0.5) / 5) * longueur, y0: H * (0.16 + r() * 0.22), vx: 2 + r() * 2, amp: 9 + r() * 5, phase: r() * 6, longueur });
      });
    }

    // Ambiance 2 : brume claire sur l'horizon, juste derrière le sol (profondeur).
    {
      const brume = new Graphics().rect(0, dessus - H * 0.2, W, H * 0.2 + 2).fill(degrade('rgba(255,238,248,0)', 'rgba(255,238,248,0.5)'));
      brume.eventMode = 'none';
      this.app.stage.addChild(brume);
    }

    // 3. Le sol : plateforme, quelques lanternes et touffes, arches-portails (facteur 1 : défile avec le héros).
    const sol = nouvelleCouche(1);
    const plat = new TilingSprite({ texture: tp, width: fin + W, height: hPlat });
    plat.tileScale.set(echelle);
    plat.position.set(-W, dessus);
    sol.addChild(plat);

    // Décor : peu d'éléments, pour laisser respirer les portails (lanternes et cristaux entre eux, touffes, champignons, fleurs).
    const dernier = POSITIONS_PORTAILS.length - 1;
    for (let i = 0; i < dernier - 1; i += 2) {
      const milieu = (this.xPortail(i) + this.xPortail(i + 1)) / 2;
      sol.addChild(this.poser(`bannieres-${1 + ((i / 2) % 4)}`, H * 0.31, milieu, base));
    }
    const herbes = [1, 2, 3, 4, 5], champignons = [6, 7, 8, 9], fleurs = [10, 11, 12];
    for (let x = W * 0.3; x < fin; x += 650 + r() * 750) {
      if (POSITIONS_PORTAILS.some((_, i) => Math.abs(this.xPortail(i) - x) < H * 0.5)) continue; // jamais devant une arche
      const v = r();
      const nom = v < 0.5 ? `herbes-${herbes[(r() * 5) | 0]}` : v < 0.78 ? `herbes-${champignons[(r() * 4) | 0]}` : `herbes-${fleurs[(r() * 3) | 0]}`;
      const taille = v < 0.5 ? 0.05 + r() * 0.02 : v < 0.78 ? 0.06 + r() * 0.02 : 0.04 + r() * 0.015;
      sol.addChild(this.poser(nom, H * taille, x, base + (r() - 0.5) * hPlat * 0.04));
    }

    // Les arches : un seul type de portail pour les projets, cliquables ; le dernier, sombre, est celui des projets à venir.
    this.baseY = base;
    POSITIONS_PORTAILS.forEach((_, i) => {
      const portail = new Container();
      const mystere = i === dernier;
      const hArche = H * (mystere ? 0.5 : 0.46);
      this.hArche = this.hArche || hArche;
      const arche = this.poser(mystere ? 'arches-2' : ARCHE_PROJET, hArche, 0, 0);
      // Ouverture de l'arche (mesurée sur l'image) : largeur, hauteur et position par rapport au bas-centre du sprite.
      const l = arche.width;
      const rx = l * (mystere ? 0.195 : 0.15), haut = hArche * (mystere ? 0.8 : 0.62);
      const ouv = new Container();
      ouv.position.set(l * (mystere ? 0 : 0.03), -hArche * (mystere ? 0.02 : 0.16));
      const cy = -haut * 0.5;
      const lueur = new Graphics();
      lueur.ellipse(0, cy, rx * 1.2, haut * 0.55).fill({ color: mystere ? 0xa06bff : 0xffe3f6, alpha: mystere ? 0.3 : 0.36 });
      lueur.alpha = mystere ? 1 : 0;
      const fx = new PortailFx(rx, haut, mystere ? PALETTE_MYSTERE : PALETTE_PORTAIL, mystere ? 'rect' : 'ogive');
      this.vortex.push({ fx, a: 0, rx, ry: haut * 0.5, cy, fixe: mystere });
      if (mystere) {
        const fond = new Graphics().rect(-rx, -haut, rx * 2, haut).fill(0x07030f);
        const aura = new Graphics();
        this.auras.push(aura);
        const point = new Text({ text: '???', style: { fontFamily: 'Georgia, "Times New Roman", serif', fontSize: Math.round(H * 0.075), fontWeight: '700', fill: 0xe9dcff, stroke: { color: 0x2a1450, width: 5 }, letterSpacing: 6 } });
        point.anchor.set(0.5, 1); point.position.set(0, -hArche - H * 0.02);
        ouv.addChild(lueur, fond, fx.g);
        portail.addChild(aura, ouv, arche, point);
        aura.position.copyFrom(ouv.position);
      } else {
        ouv.addChild(lueur, fx.g);
        portail.addChild(ouv, arche);
      }
      portail.position.set(this.xPortail(i), base);
      portail.eventMode = 'static'; portail.cursor = 'pointer';
      portail.on('pointertap', () => this.surClicPortail(i));
      sol.addChild(portail);
      this.portails.push(portail);
    });

    this.heros.fixerHauteur(H * 0.3);
    if (!this.heroConfie) this.app.stage.addChild(this.heros);

    // Ambiance 3 : poussières de lumière qui flottent devant, et étalonnage chaud (soleil en haut, ombre en bas, bords adoucis).
    {
      const c = nouvelleCouche(0.55);
      c.blendMode = 'add'; c.eventMode = 'none';
      this.gPoussiere = new Graphics();
      c.addChild(this.gPoussiere);
      const longueur = this.largeurMonde * 0.55 + W * 2;
      for (let i = 0; i < 70; i++) this.poussieres.push({ x: r() * longueur, y: r() * H, r: 1 + r() * 2.2, v: 5 + r() * 10, ph: r() * 6.28, fx: 12 + r() * 20 });
      const grade = new Container(); grade.eventMode = 'none';
      // Le jour avance avec le chemin : aube dorée, plein jour, fin d'après-midi, crépuscule violet devant le portail « ??? ».
      this.teinte = new Graphics().rect(0, 0, W, H).fill(0xffffff); this.teinte.alpha = 0; grade.addChild(this.teinte);
      grade.addChild(new Graphics().rect(0, 0, W, H).fill(degrade('rgba(255,222,160,0.14)', 'rgba(255,222,160,0)')));
      grade.addChild(new Graphics().rect(0, H * 0.55, W, H * 0.45).fill(degrade('rgba(20,30,80,0)', 'rgba(20,30,80,0.3)')));
      const gauche = new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, colorStops: [{ offset: 0, color: 'rgba(15,25,60,0.2)' }, { offset: 1, color: 'rgba(15,25,60,0)' }] });
      const droite = new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, colorStops: [{ offset: 0, color: 'rgba(15,25,60,0)' }, { offset: 1, color: 'rgba(15,25,60,0.2)' }] });
      grade.addChild(new Graphics().rect(0, 0, W * 0.16, H).fill(gauche), new Graphics().rect(W * 0.84, 0, W * 0.16, H).fill(droite));
      this.app.stage.addChild(grade);
    }
  }

  dessiner(e: EtatMonde, dtMs: number) {
    const W = this.W;
    const heroMonde = e.p * this.largeurMonde;
    const heroEcran = W * (0.2 + 0.3 * e.p);   // le héros avance aussi à l'écran, de gauche vers le centre
    const camera = heroMonde - heroEcran;
    if (!e.reduit) this.temps += dtMs / 1000;
    const t = this.temps;

    this.couches.forEach(({ conteneur, facteur }) => {
      // Réduire les animations : pas de parallaxe, seuls le sol et ses portails défilent.
      const f = e.reduit && facteur !== 1 ? 0 : facteur;
      conteneur.x = -camera * f;
    });

    // Vie du décor : nuages et îles dérivent, rayons respirent, poussières flottent (figés si on réduit les animations).
    this.flottants.forEach((f) => {
      f.sp.x = (((f.x0 + t * f.vx) % f.longueur) + f.longueur) % f.longueur;
      f.sp.y = f.y0 + Math.sin(t * 0.6 + f.phase) * f.amp;
    });
    this.rayons.forEach((g, i) => { g.alpha = 0.15 + 0.08 * Math.sin(t * 0.35 + i * 1.7); });
    this.soleil.alpha = 0.85 + 0.15 * Math.sin(t * 0.5);
    this.dessinerPoussieres(t, camera * 0.55);
    this.auras.forEach((a, i) => {
      a.clear();
      const v = this.vortex[this.vortex.length - 1];
      const k = 0.5 + 0.5 * Math.sin(t * 1.3 + i);
      a.ellipse(0, v.cy, v.rx * (1.55 + 0.12 * k), v.ry * (1.3 + 0.1 * k)).fill({ color: 0x7a3cff, alpha: 0.16 + 0.1 * k });
      a.ellipse(0, v.cy, v.rx * (1.25 + 0.08 * k), v.ry * (1.12 + 0.06 * k)).fill({ color: 0xb48cff, alpha: 0.14 });
    });

    // Marche / attente : mesurées sur le déplacement réel du héros (pas sur la vitesse de la molette).
    if (!this.initialise) { this.initialise = true; this.dernierX = heroMonde; }
    const dx = heroMonde - this.dernierX;
    const vitPx = Math.abs(dx) / Math.max(1, dtMs) * 1000;
    this.vitLisse += (vitPx - this.vitLisse) * Math.min(1, dtMs / 70);
    const enMouvement = this.vitLisse > 8 || Math.abs(dx) > 0.05;
    if (enMouvement) this.tempsArret = 0; else this.tempsArret += dtMs;
    const marche = enMouvement || this.tempsArret < 220;
    if (marche !== this.marche) { this.marche = marche; this.surEtatHeros(marche ? 'marche' : 'attente'); }
    if (Math.abs(dx) > 0.3) this.sens = dx < 0 ? -1 : 1;

    if (!this.heroConfie) {
      this.heros.x = heroEcran; this.heros.y = this.sol;
      this.heros.scale.x = this.sens;
      // Un cycle de marche (deux pas) couvre environ 0,9 fois la taille du héros : les pieds ne glissent pas.
      if (!e.reduit) this.phase += Math.abs(dx) * (Math.PI * 2) / (this.heros.hauteur * 0.9);
      this.heros.maj(this.phase, marche, e.reduit, this.temps, dtMs);
    }
    this.dernierX = heroMonde;

    // Portails : ni grossissement ni changement d'opacité ; devant lui, la lueur s'allume et le tourbillon d'énergie se lève.
    this.portails.forEach((pt, i) => {
      const v = this.vortex[i];
      const actif = i === e.proche && e.devant;
      if (!v.fixe) (pt.children[0] as Container).children[0].alpha = actif ? 1 : 0;
      v.a += ((v.fixe ? (e.reduit ? 0.6 : 1) : (actif ? 1 : 0)) - v.a) * Math.min(1, dtMs / (actif ? 220 : 160));
      v.fx.maj(t, v.a);
    });
    this.appliquerJour(e.p);
  }

  /** Teinte de la lumière selon l'avancée : du matin doré au crépuscule violet. */
  private appliquerJour(p: number) {
    const cles: [number, number, number, number][] = [ // p, rouge, vert, bleu (0-255) + alpha en dernier via tableau parallèle
      [0, 255, 211, 160], [0.35, 255, 255, 255], [0.7, 255, 181, 102], [0.915, 90, 58, 160],
    ];
    const alphas = [0.12, 0, 0.12, 0.24];
    let i = 0;
    while (i < cles.length - 2 && p > cles[i + 1][0]) i++;
    const [p0, r0, g0, b0] = cles[i], [p1, r1, g1, b1] = cles[i + 1];
    const k = Math.min(1, Math.max(0, (p - p0) / (p1 - p0)));
    this.teinte.tint = (Math.round(r0 + (r1 - r0) * k) << 16) | (Math.round(g0 + (g1 - g0) * k) << 8) | Math.round(b0 + (b1 - b0) * k);
    this.teinte.alpha = alphas[i] + (alphas[i + 1] - alphas[i]) * k;
  }

  private dessinerPoussieres(t: number, decalage: number) {
    const g = this.gPoussiere, W = this.W, H = this.H;
    g.clear();
    for (const p of this.poussieres) {
      const x = ((p.x - decalage + Math.sin(t * 0.5 + p.ph) * p.fx) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * 0.1 + decalage;
      const y = (((p.y - t * p.v) % H) + H) % H;
      const a = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 1.4 + p.ph));
      g.circle(x, y, p.r).fill({ color: 0xfff3cf, alpha: a });
    }
  }

  /** Position du héros dans la bande (px) : x au centre, y aux pieds ; taille en pixels. */
  get placeHeros() { return { x: this.heros.x, y: this.heros.y, hauteur: this.heros.hauteur, sens: this.heros.scale.x < 0 ? -1 : 1 }; }
  get taille() { return { largeur: this.W, hauteur: this.H }; }
  /** Haut de l'arche (y dans la bande, px) : pour poser la sphère du trailer juste au-dessus du portail. */
  get hautPortail() { return this.baseY - this.hArche; }
  /** Une image de la bande sans le héros (texture des éclats de l'écran brisé), à la résolution d'affichage. */
  /** Image à briser à la place de la bande 2D (Phase 1 V2 : le vortex noir du portail). */
  capturePerso: HTMLCanvasElement | null = null;
  capturer(): HTMLCanvasElement {
    if (this.capturePerso) return this.capturePerso;
    const visible = this.heros.visible;
    this.heros.visible = false;
    const cadre = new Rectangle(0, 0, this.W, this.H);
    this.app.renderer.render({ container: this.app.stage });
    const toile = this.app.renderer.extract.canvas({ target: this.app.stage, frame: cadre, resolution: Math.min(window.devicePixelRatio || 1, 2), clearColor: '#cdeefa' }) as HTMLCanvasElement;
    this.heros.visible = visible;
    return toile;
  }
  /** Montre ou cache la bande 2D (la brisure la remplace par ses éclats 3D). */
  afficher(oui: boolean) { this.app.canvas.style.visibility = oui ? 'visible' : 'hidden'; }
  /** La brisure prend le héros (la bande ne l'affiche plus) ou le rend. */
  confierHeros(oui: boolean) {
    this.heroConfie = oui;
    if (oui) this.app.stage.removeChild(this.heros); else this.app.stage.addChild(this.heros);
  }

  /** Position horizontale à l'écran (px) du portail i, pour placer l'invite HTML. */
  xEcranPortail(i: number, p: number) {
    const camera = p * this.largeurMonde - this.W * (0.2 + 0.3 * p);
    return this.xPortail(i) - camera;
  }
}
