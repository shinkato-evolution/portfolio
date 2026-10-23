// Marionnette PIXEL : 8 pièces dessinées (une seule image de référence, donc jamais de changement de taille ni de style),
// articulées par code. Le personnage est dessiné sur une petite image à la taille des pixels dessinés, puis agrandi
// sans lissage : même quand un membre tourne, les pixels restent nets et alignés sur la grille.
import { Container, RenderTexture, Sprite, Texture, type Renderer } from 'pixi.js';

export const NOMS_MARIO = ['tete', 'torse', 'bras-haut', 'avant-bras', 'cuisse', 'jambe', 'sacoche', 'avant-bras-2'] as const;
type Nom = (typeof NOMS_MARIO)[number];

const OMBRE = 0xb4b8cc; // membres du côté éloigné : un ton plus sombre

// Points d'articulation, en pixels dessinés, depuis le coin haut-gauche de chaque pièce (mesurés sur la planche).
const PIVOT: Record<Nom, [number, number]> = {
  tete: [20, 44],          // base du cou
  torse: [22, 57],         // hanche
  'bras-haut': [8, 8],     // épaule
  'avant-bras': [9, 8],    // coude
  'avant-bras-2': [9, 8],  // coude (bras éloigné)
  cuisse: [9, 9],          // hanche
  jambe: [10, 9],          // genou
  sacoche: [43, 3],        // attache de la bandoulière
};
const COU_SUR_TORSE: [number, number] = [28, 8];
const EPAULE_SUR_TORSE: [number, number] = [20, 14];
const BANDOULIERE_SUR_TORSE: [number, number] = [33, 6];
const COUDE_SUR_BRAS: [number, number] = [8, 34]; // bras raccourcis (10 lignes de manche retirées du haut du bras)
const GENOU_SUR_CUISSE: [number, number] = [9, 46];

interface Piece { c: Container; sp: Sprite; w: number; h: number; }

const LARGEUR_RT = 132, HAUTEUR_RT = 210, PIEDS_X = 66, PIEDS_Y = 200; // petite image de rendu (pixels dessinés)

export class MarionnettePixel extends Container {
  private rig = new Container();
  private rt: RenderTexture;
  private affiche = new Sprite();
  private torse!: Piece; private tete!: Piece; private sacoche!: Piece;
  private brasPres!: Piece; private avantPres!: Piece; private brasLoin!: Piece; private avantLoin!: Piece;
  private cuissePres!: Piece; private jambePres!: Piece; private cuisseLoin!: Piece; private jambeLoin!: Piece;
  private longueurJambe = 0;
  private hauteurNative = 0;
  private echelle = 1;
  private amplitude = 0;

  constructor(private tex: Record<string, Texture>, private renderer: Renderer) {
    super();
    this.rt = this.creerRT();
    this.affiche.texture = this.rt;
    this.affiche.anchor.set(PIEDS_X / LARGEUR_RT, PIEDS_Y / HAUTEUR_RT);
    this.addChild(this.affiche);
    this.rig.position.set(PIEDS_X, PIEDS_Y);
    this.assembler();
  }

  private creerRT() {
    return RenderTexture.create({ width: LARGEUR_RT, height: HAUTEUR_RT, resolution: 1, scaleMode: 'nearest' });
  }

  /** Change de moteur de rendu (le héros passe d'une application PixiJS à l'autre pendant la chute). */
  utiliserRenderer(r: Renderer) {
    if (r === this.renderer) return;
    this.renderer = r;
    this.rt.destroy(true);
    this.rt = this.creerRT();
    this.affiche.texture = this.rt;
    // Un assemblage dessiné par un moteur ne peut pas l'être par un autre : on le reconstruit (les images, elles, sont partagées).
    this.rig.destroy({ children: true });
    this.rig = new Container();
    this.rig.position.set(PIEDS_X, PIEDS_Y);
    this.assembler();
  }

  private piece(nom: Nom, teinte = 0xffffff): Piece {
    const t = this.tex[`mario/${nom}`];
    t.source.scaleMode = 'nearest';
    const sp = new Sprite(t);
    sp.position.set(-PIVOT[nom][0], -PIVOT[nom][1]);
    sp.tint = teinte;
    const c = new Container();
    c.addChild(sp);
    return { c, sp, w: t.width, h: t.height };
  }

  /** Place l'articulation enfant à un point de la pièce parent (coordonnées de la pièce, pixels dessinés). */
  private accrocher(parent: Piece, nomParent: Nom, enfant: Piece, point: [number, number], derriere = false) {
    const [px, py] = PIVOT[nomParent];
    enfant.c.position.set(point[0] - px, point[1] - py);
    parent.c.addChildAt(enfant.c, derriere ? 0 : parent.c.children.length);
  }

  private assembler() {
    const torse = this.torse = this.piece('torse');
    const tete = this.tete = this.piece('tete');
    const sacoche = this.sacoche = this.piece('sacoche');
    const brasPres = this.brasPres = this.piece('bras-haut');
    const avantPres = this.avantPres = this.piece('avant-bras');
    const brasLoin = this.brasLoin = this.piece('bras-haut', OMBRE);
    const avantLoin = this.avantLoin = this.piece('avant-bras-2', OMBRE);
    const cuissePres = this.cuissePres = this.piece('cuisse');
    const jambePres = this.jambePres = this.piece('jambe');
    const cuisseLoin = this.cuisseLoin = this.piece('cuisse', OMBRE);
    const jambeLoin = this.jambeLoin = this.piece('jambe', OMBRE);

    this.accrocher(cuissePres, 'cuisse', jambePres, GENOU_SUR_CUISSE, true);
    this.accrocher(cuisseLoin, 'cuisse', jambeLoin, GENOU_SUR_CUISSE, true);
    this.accrocher(brasPres, 'bras-haut', avantPres, COUDE_SUR_BRAS, true);
    this.accrocher(brasLoin, 'bras-haut', avantLoin, COUDE_SUR_BRAS, true);

    // Torse : bras éloigné, torse, sacoche, tête, bras proche (ordre = profondeur).
    const o = PIVOT.torse;
    const sur = (p: [number, number]): [number, number] => [p[0] - o[0], p[1] - o[1]];
    brasLoin.c.position.set(...sur(EPAULE_SUR_TORSE));
    brasPres.c.position.set(...sur(EPAULE_SUR_TORSE));
    sacoche.c.position.set(...sur(BANDOULIERE_SUR_TORSE));
    tete.c.position.set(...sur(COU_SUR_TORSE));
    torse.c.removeChild(torse.sp); torse.c.addChild(brasLoin.c, torse.sp, sacoche.c, tete.c, brasPres.c);

    this.longueurJambe = (GENOU_SUR_CUISSE[1] - PIVOT.cuisse[1]) + (jambePres.h - PIVOT.jambe[1]);
    this.hauteurNative = this.longueurJambe + PIVOT.torse[1] + (PIVOT.tete[1] - COU_SUR_TORSE[1]) + 6;
    this.rig.addChild(cuisseLoin.c, cuissePres.c, torse.c);
    torse.c.y = cuisseLoin.c.y = cuissePres.c.y = -this.longueurJambe;
  }

  /** Taille voulue à l'écran (px) : l'agrandissement est un nombre entier (pixels nets). Rend la taille réelle. */
  fixerHauteur(px: number): number {
    this.echelle = Math.max(1, Math.round(px / this.hauteurNative));
    this.affiche.scale.set(this.echelle);
    return this.hauteur;
  }
  get hauteur() { return this.hauteurNative * this.echelle; }

  /** phase : avance de la marche (radians, un cycle = deux pas) ; marche : en mouvement ; reduit : pose fixe. */
  maj(phase: number, marche: boolean, reduit: boolean, t: number, dtMs: number) {
    if (reduit) this.amplitude = 0;
    else this.amplitude += ((marche ? 1 : 0) - this.amplitude) * Math.min(1, dtMs / 100);
    const a = this.amplitude;
    const respire = reduit ? 0 : Math.sin(t * 2.2);
    const L = this.longueurJambe;

    const pose = (p: number) => ({
      cuisse: -0.5 * Math.sin(p) * a,
      genou: (0.08 + 0.85 * Math.max(0, Math.cos(p))) * a,
      bras: 0.45 * Math.sin(p) * a + 0.03 * Math.sin(t * 1.1) * (1 - a),
      coude: (-0.22 - 0.22 * (1 - Math.sin(p)) / 2) * a - 0.08 * (1 - a),
    });
    const pres = pose(phase), loin = pose(phase + Math.PI);
    this.cuissePres.c.rotation = pres.cuisse; this.jambePres.c.rotation = pres.genou;
    this.cuisseLoin.c.rotation = loin.cuisse; this.jambeLoin.c.rotation = loin.genou;
    // Chaque bras part avec la jambe opposée.
    this.brasPres.c.rotation = loin.bras; this.avantPres.c.rotation = loin.coude;
    this.brasLoin.c.rotation = pres.bras; this.avantLoin.c.rotation = pres.coude;

    // Bassin : descend quand les jambes s'écartent ; tout est arrondi au pixel dessiné.
    const bassin = Math.round(-L + Math.abs(Math.sin(phase)) * 0.09 * L * a + respire * 0.5);
    this.torse.c.y = this.cuissePres.c.y = this.cuisseLoin.c.y = bassin;
    this.torse.c.rotation = 0.04 * a;
    this.tete.c.rotation = -0.03 * a + 0.015 * respire;
    this.sacoche.c.rotation = -0.1 * Math.sin(phase * 2 - 0.6) * a + 0.02 * respire;

    // On dessine le personnage à la taille des pixels dessinés ; il est agrandi sans lissage à l'affichage.
    this.renderer.render({ container: this.rig, target: this.rt, clear: true, clearColor: [0, 0, 0, 0] });
  }
}
