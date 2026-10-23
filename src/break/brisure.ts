// La brisure : à la fin du chemin, l'écran se fissure, tremble, éclate en éclats 3D ; le héros tombe dans le vide.
// Tout est une fonction de q (0..1, progression du défilement dans la zone de brisure) : on peut revenir en arrière.
// Trois couches empilées au-dessus de la bande 2D : éclats et particules (Three.js), héros (PixiJS, canevas transparent).
import * as THREE from 'three';
import { Application } from 'pixi.js';
import type { Monde } from '../act1/monde';
import type { Grotte } from '../act2/grotte';
import { decouper, type Eclat, type Pt } from './voronoi';

const BASE = `${import.meta.env.BASE_URL}sprites/break/`;

// Calendrier de la scène, en progression q.
const Q_CASSURE = 0.26;  // l'écran éclate
const Q_CHUTE = 0.27;    // le héros commence à tomber
const Q_PLEIN_VIDE = 0.3; // débris et traînées commencent à monter (le héros « tombe » dans le vide)
const ECHELLE_TEMPS = 10; // 1 q = 10 s fictives pour les mouvements balistiques

const lisse = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function hasard(graine: number) {
  let s = graine >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

interface DonneesEclat { mesh: THREE.Mesh; base: THREE.Vector3; v: THREE.Vector3; w: THREE.Vector3; q0: number; tremble: THREE.Vector3; }
interface Poussiere {
  points: THREE.Points; n: number; x0: Float32Array; y0: Float32Array; z0: Float32Array; vx: Float32Array; vy: Float32Array; vz: Float32Array;
  q0: Float32Array; vie: Float32Array; couleur: Float32Array; pos: Float32Array; rgba: Float32Array; gravite: number;
}
interface Segment { ax: number; ay: number; bx: number; by: number; d: number; }

export class Brisure {
  private renderer!: THREE.WebGLRenderer;
  private pixi = new Application();
  private cvs3d!: HTMLCanvasElement;
  private flash = document.createElement('div');
  private actif = false; private pret = false; private q = 0; private derniereDemande = 0;
  private boucle = 0; private tPrec = 0;
  private Wv = 0; private Hv = 0; private k = 1;
  private rocheTex!: THREE.Texture; private snapTex: THREE.CanvasTexture | null = null;
  // Contenu reconstruit à l'activation et au redimensionnement
  private scene3 = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 1, 6000);
  private eclats: DonneesEclat[] = [];
  private poussieres: Poussiere[] = [];
  private fissures: Segment[] = []; private fissureToile!: HTMLCanvasElement; private fissureTex!: THREE.CanvasTexture; private fissurePlan!: THREE.Mesh;
  private vide!: THREE.Mesh; private debris: { m: THREE.Mesh; x: number; y: number; z: number; s: number; vit: number }[] = [];
  private traînees!: THREE.LineSegments; private traineesDonnees: { x: number; y0: number; z: number; l: number; vit: number }[] = [];
  private lueur!: THREE.Sprite;
  private depart = { x: 0, y: 0, hauteur: 0 };
  private epicentre: Pt = [0, 0]; private rayonMax = 1;
  private dernierQFissure = -1;
  private grotte: Grotte | null = null; private grotteEnCours = false; private enGrotte = false;

  constructor(private scene: HTMLElement, private monde: Monde) {}

  async init() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.cvs3d = this.renderer.domElement;
    this.cvs3d.className = 'brisure-3d';
    this.cvs3d.setAttribute('aria-hidden', 'true');
    await this.pixi.init({ backgroundAlpha: 0, resizeTo: this.scene, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' });
    this.pixi.ticker.stop();
    this.pixi.canvas.className = 'brisure-heros';
    this.pixi.canvas.setAttribute('aria-hidden', 'true');
    this.flash.className = 'brisure-flash';
    this.flash.setAttribute('aria-hidden', 'true');
    this.scene.append(this.cvs3d, this.pixi.canvas, this.flash);
    this.rocheTex = await new THREE.TextureLoader().loadAsync(`${BASE}roche.webp`);
    this.rocheTex.wrapS = this.rocheTex.wrapT = THREE.RepeatWrapping;
    this.rocheTex.colorSpace = THREE.SRGBColorSpace;
    this.pret = true;
    window.addEventListener('resize', this.surRedim);
    this.definirQ(this.derniereDemande);
  }

  /** Appelé par le défilement. */
  definirQ(q: number) {
    this.derniereDemande = q;
    if (!this.pret) return;
    this.q = q;
    if (q > 0.0005 && !this.actif) this.activer();
    else if (q <= 0.0005 && this.actif) this.desactiver();
    this.scene.style.setProperty('--q', String(q));
    if (this.actif) this.image(performance.now());
  }

  // ---------- Acte 2 : la grotte en première personne (préparée pendant la chute, révélée par un éclair)
  async preparerGrotte() {
    if (this.grotte || this.grotteEnCours || !this.pret) return;
    this.grotteEnCours = true;
    try {
      const { Grotte } = await import('../act2/grotte');
      const g = new Grotte(this.scene, this.scene.clientWidth < 700);
      await g.init();
      this.grotte = g;
    } catch (err) { console.warn('Grotte indisponible.', err); } finally { this.grotteEnCours = false; }
  }

  get grottePrete() { return !!this.grotte; }

  entrerGrotte() {
    if (!this.grotte || this.enGrotte) return !!this.grotte;
    this.enGrotte = true;
    this.pixi.canvas.style.visibility = 'hidden';
    this.grotte.redimensionner(this.scene.clientWidth, this.scene.clientHeight);
    this.grotte.montrer(true, performance.now());
    // Éclair blanc-violet puis fondu : « d'un coup, il se relève ».
    this.flash.classList.remove('fondu'); this.flash.style.opacity = '1';
    requestAnimationFrame(() => requestAnimationFrame(() => { this.flash.classList.add('fondu'); this.flash.style.opacity = '0'; }));
    return true;
  }

  sortirGrotte() {
    if (!this.enGrotte) return;
    this.enGrotte = false;
    this.grotte?.montrer(false);
    this.pixi.canvas.style.visibility = 'visible';
    this.flash.classList.remove('fondu'); this.flash.style.opacity = '0';
  }

  /** La capture fixée a changé (vortex animé) : on renvoie la texture au GPU. */
  rafraichirImage() { if (this.snapTex) this.snapTex.needsUpdate = true; }

  definirR(r: number) { this.grotte?.definirR(r); }

  // ---------- Activation : on fige la bande, on la découpe, on prend le héros
  private activer() {
    const taille = this.monde.taille;
    if (!taille.largeur) return;
    this.actif = true;
    this.scene.classList.add('brisure-actif');
    const toile = this.monde.capturer();
    this.snapTex?.dispose();
    this.snapTex = new THREE.CanvasTexture(toile);
    this.snapTex.colorSpace = THREE.SRGBColorSpace;
    this.snapTex.generateMipmaps = false; this.snapTex.minFilter = THREE.LinearFilter;
    const h = this.monde.placeHeros;
    this.depart = { x: h.x, y: h.y, hauteur: h.hauteur };
    this.monde.confierHeros(true);
    this.pixi.stage.addChild(this.monde.heros);
    this.monde.heros.utiliserRenderer(this.pixi.renderer); // la marionnette se dessine avec le moteur de la scène qui l'affiche
    this.monde.heros.scale.x = 1;
    this.monde.afficher(false);
    this.construire();
    this.tPrec = performance.now();
    this.boucle = requestAnimationFrame(this.tic);
  }

  private desactiver() {
    this.sortirGrotte();
    this.actif = false;
    cancelAnimationFrame(this.boucle);
    this.scene.classList.remove('brisure-actif');
    const hero = this.monde.heros;
    this.pixi.stage.removeChild(hero);
    hero.pivot.set(0, 0); hero.rotation = 0; hero.scale.set(1);
    hero.utiliserRenderer(this.monde.app.renderer);
    this.monde.confierHeros(false);
    this.monde.afficher(true);
    this.liberer();
    this.flash.style.opacity = '0';
  }

  private surRedim = () => {
    if (!this.actif) return;
    this.liberer();
    this.construire();
    this.grotte?.redimensionner(this.scene.clientWidth, this.scene.clientHeight);
  };

  // ---------- Construction de la scène 3D pour la taille d'écran courante
  private construire() {
    const Wv = this.Wv = this.scene.clientWidth, Hv = this.Hv = this.scene.clientHeight;
    this.k = Math.min(1.3, Math.max(0.55, Wv / 1440));
    const bande = this.monde.taille;           // taille de la bande 2D (px CSS)
    const Wb = bande.largeur, Hb = bande.hauteur;
    const mobile = Wv < 700;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    this.renderer.setSize(Wv, Hv, false);
    this.cvs3d.style.width = '100%'; this.cvs3d.style.height = '100%';
    this.camera.aspect = Wv / Hv;
    this.camera.position.set(0, 0, (Hv / 2) / Math.tan(THREE.MathUtils.degToRad(20)));
    this.camera.updateProjectionMatrix();

    this.scene3.add(new THREE.AmbientLight(0xcdb8ff, 1.1));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.6); soleil.position.set(-300, 500, 700); this.scene3.add(soleil);
    const violette = new THREE.PointLight(0xa855f7, 6e5, 1400, 1.6); violette.position.set(0, -Hv * 0.2, 260); this.scene3.add(violette);

    // Le vide : dégradé sombre derrière tout, qui apparaît avec les fissures.
    const g = document.createElement('canvas'); g.width = 8; g.height = 256;
    const cg = g.getContext('2d')!;
    const grad = cg.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#12081f'); grad.addColorStop(0.45, '#2c1052'); grad.addColorStop(0.8, '#14092a'); grad.addColorStop(1, '#05020b');
    cg.fillStyle = grad; cg.fillRect(0, 0, 8, 256);
    const videTex = new THREE.CanvasTexture(g); videTex.colorSpace = THREE.SRGBColorSpace;
    this.vide = new THREE.Mesh(new THREE.PlaneGeometry(Wv * 3.2, Hv * 3.2), new THREE.MeshBasicMaterial({ map: videTex, transparent: true, opacity: 0, depthWrite: false }));
    this.vide.position.z = -420; this.vide.renderOrder = -2;
    this.scene3.add(this.vide);

    // Éclats : la bande (image sans le héros) découpée en cellules de Voronoï autour des pieds du héros.
    this.epicentre = [this.depart.x, this.depart.y];
    this.rayonMax = Math.hypot(Math.max(this.epicentre[0], Wb - this.epicentre[0]), Math.max(this.epicentre[1], Hb - this.epicentre[1]));
    const cellules = decouper(Wb, Hb, this.epicentre, mobile ? 26 : 46);
    const r = hasard(41);
    const devant = new THREE.MeshBasicMaterial({ map: this.snapTex! });
    const derriere = new THREE.MeshLambertMaterial({ map: this.rocheTex, color: 0xb9a3dc, emissive: 0x2a0d4d });
    const materiaux = [devant, derriere];
    const vers3 = (x: number, y: number) => new THREE.Vector3(x - Wv / 2, Hv / 2 - y, 0);
    this.eclats = cellules.map((c, i) => {
      const geo = this.geometrie(c, Wb, Hb, r);
      const mesh = new THREE.Mesh(geo, materiaux);
      const base = vers3(c.centre[0], c.centre[1]);
      mesh.position.copy(base);
      this.scene3.add(mesh);
      const dx = c.centre[0] - this.epicentre[0], dy = (c.centre[1] - this.epicentre[1]);
      const dist = Math.hypot(dx, dy) || 1;
      const proche = 1 - Math.min(1, dist / this.rayonMax);
      const vitesse = (260 + 880 * proche) * (0.7 + r() * 0.6) * this.k;
      const v = new THREE.Vector3((dx / dist) * vitesse, (-dy / dist) * vitesse * 0.5 + (180 + 520 * proche) * (0.4 + r()) * this.k, (-180 + r() * 840) * this.k);
      const w = new THREE.Vector3((r() - 0.5) * 7, (r() - 0.5) * 7, (r() - 0.5) * 6);
      return { mesh, base, v, w, q0: Q_CASSURE + (dist / this.rayonMax) * 0.035 + r() * 0.006, tremble: new THREE.Vector3(r() - 0.5, r() - 0.5, r() * 0.8) };
    });

    // Fissures violettes qui partent de l'épicentre et suivent les arêtes des éclats (dessinées sur un plan transparent).
    this.fissures = [];
    cellules.forEach((c) => {
      for (let i = 0; i < c.poly.length; i++) {
        const a = c.poly[i], b = c.poly[(i + 1) % c.poly.length];
        const n = 4; let px = a[0], py = a[1];
        for (let s = 1; s <= n; s++) {
          const t = s / n;
          const nx = mix(a[0], b[0], t) + (s < n ? (r() - 0.5) * 9 : 0), ny = mix(a[1], b[1], t) + (s < n ? (r() - 0.5) * 9 : 0);
          this.fissures.push({ ax: px, ay: py, bx: nx, by: ny, d: Math.hypot((px + nx) / 2 - this.epicentre[0], (py + ny) / 2 - this.epicentre[1]) });
          px = nx; py = ny;
        }
      }
    });
    const echelleToile = Math.min(1, 1600 / Wb);
    this.fissureToile = document.createElement('canvas');
    this.fissureToile.width = Math.round(Wb * echelleToile); this.fissureToile.height = Math.round(Hb * echelleToile);
    this.fissureTex = new THREE.CanvasTexture(this.fissureToile); this.fissureTex.colorSpace = THREE.SRGBColorSpace;
    this.fissurePlan = new THREE.Mesh(new THREE.PlaneGeometry(Wb, Hb), new THREE.MeshBasicMaterial({ map: this.fissureTex, transparent: true, depthWrite: false }));
    this.fissurePlan.position.set(0, Hv / 2 - Hb / 2, 9);
    this.scene3.add(this.fissurePlan);
    this.dernierQFissure = -1;

    // Lueur au point d'impact.
    const lc = document.createElement('canvas'); lc.width = lc.height = 128;
    const lx = lc.getContext('2d')!; const lg = lx.createRadialGradient(64, 64, 0, 64, 64, 64);
    lg.addColorStop(0, 'rgba(255,245,255,1)'); lg.addColorStop(0.3, 'rgba(190,120,255,0.7)'); lg.addColorStop(1, 'rgba(120,40,220,0)');
    lx.fillStyle = lg; lx.fillRect(0, 0, 128, 128);
    this.lueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    const ep = vers3(this.epicentre[0], this.epicentre[1]); this.lueur.position.set(ep.x, ep.y + 18, 20);
    this.scene3.add(this.lueur);

    // Poussière, mottes de terre, étincelles.
    const nb = mobile ? 0.5 : 1;
    this.poussieres = [
      this.poussiere(Math.round(620 * nb), 5, [0x8a6a4a, 0xb59c7c, 0xd8cfbf, 0xb98cff], 1900, false, ep, r),
      this.poussiere(Math.round(130 * nb), 13, [0x6b4f36, 0x8d7a66, 0x9b8bb0], 2300, false, ep, r),
      this.poussiere(Math.round(150 * nb), 4, [0xd9b8ff, 0xffffff, 0xa855f7], 1200, true, ep, r),
    ];

    // Débris 3D et traînées qui montent quand le héros tombe dans le vide.
    const roc = new THREE.MeshLambertMaterial({ map: this.rocheTex, color: 0xcbb8ee, emissive: 0x1a0834, flatShading: true });
    this.debris = [];
    const nd = mobile ? 12 : 24;
    for (let i = 0; i < nd; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), roc);
      const s = (22 + r() * 80) * this.k;
      m.scale.set(s * (0.8 + r() * 0.6), s * (0.7 + r() * 0.6), s * (0.8 + r() * 0.6));
      const z = -260 + r() * 480;
      this.debris.push({ m, x: (r() - 0.5) * Wv * 1.2, y: r() * Hv * 1.9, z, s, vit: 1 + (z + 260) / 480 * 1.6 });
      m.visible = false;
      this.scene3.add(m);
    }
    const nt = mobile ? 70 : 140;
    const lp = new Float32Array(nt * 6), lcN = new Float32Array(nt * 8);
    this.traineesDonnees = [];
    for (let i = 0; i < nt; i++) {
      this.traineesDonnees.push({ x: (r() - 0.5) * Wv * 1.3, y0: r() * Hv * 1.9, z: -300 + r() * 500, l: (50 + r() * 190) * this.k, vit: 1.4 + r() * 1.6 });
      const viol = r() < 0.5;
      for (let j = 0; j < 2; j++) lcN.set([viol ? 0.75 : 1, viol ? 0.55 : 1, 1, j === 0 ? 0.0 : 0.55], i * 8 + j * 4);
    }
    const lg2 = new THREE.BufferGeometry();
    lg2.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    lg2.setAttribute('color', new THREE.BufferAttribute(lcN, 4));
    this.traînees = new THREE.LineSegments(lg2, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false }));
    this.traînees.frustumCulled = false;
    this.scene3.add(this.traînees);
  }

  private geometrie(c: Eclat, W: number, H: number, r: () => number) {
    const T = 12 * this.k + 4;
    const [cx, cy] = c.centre;
    let pts = c.poly.map(([x, y]) => ({ x: x - cx, y: -(y - cy), u: x / W, v: 1 - y / H }));
    let A = 0;
    pts.forEach((p, i) => { const b = pts[(i + 1) % pts.length]; A += p.x * b.y - b.x * p.y; });
    if (A < 0) pts = pts.reverse();
    const P: number[] = [], U: number[] = [], N: number[] = [];
    const tri = (a: number[], b: number[], c2: number[], ua: number[], ub: number[], uc: number[], n: number[]) => { P.push(...a, ...b, ...c2); U.push(...ua, ...ub, ...uc); N.push(...n, ...n, ...n); };
    const nF = pts.length - 2;
    for (let i = 1; i <= nF; i++) {
      const a = pts[0], b = pts[i], d = pts[i + 1];
      tri([a.x, a.y, T / 2], [b.x, b.y, T / 2], [d.x, d.y, T / 2], [a.u, a.v], [b.u, b.v], [d.u, d.v], [0, 0, 1]);
    }
    const nFront = nF * 3;
    const ox = r(), oy = r(), e = 1 / 256;
    for (let i = 1; i <= nF; i++) {
      const a = pts[0], b = pts[i], d = pts[i + 1];
      tri([a.x, a.y, -T / 2], [d.x, d.y, -T / 2], [b.x, b.y, -T / 2], [a.x * e + ox, a.y * e + oy], [d.x * e + ox, d.y * e + oy], [b.x * e + ox, b.y * e + oy], [0, 0, -1]);
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, n = [dy / l, -dx / l, 0];
      const af = [a.x, a.y, T / 2], ab = [a.x, a.y, -T / 2], bf = [b.x, b.y, T / 2], bb = [b.x, b.y, -T / 2];
      const ua = [ox, oy], ub = [ox + l * e, oy], uab = [ox, oy + T * e], ubb = [ox + l * e, oy + T * e];
      tri(af, ab, bb, ua, uab, ubb, n);
      tri(af, bb, bf, ua, ubb, ub, n);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.addGroup(0, nFront, 0);
    geo.addGroup(nFront, P.length / 3 - nFront, 1);
    return geo;
  }

  private poussiere(n: number, taille: number, couleurs: number[], vmax: number, etincelles: boolean, ep: THREE.Vector3, r: () => number): Poussiere {
    const x0 = new Float32Array(n), y0 = new Float32Array(n), z0 = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n), vz = new Float32Array(n);
    const q0 = new Float32Array(n), vie = new Float32Array(n), couleur = new Float32Array(n * 3), pos = new Float32Array(n * 3), rgba = new Float32Array(n * 4);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const avant = !etincelles && r() < 0.28;     // un peu de poussière avant l'éclatement
      x0[i] = ep.x + (r() - 0.5) * 300 * this.k; y0[i] = ep.y + (r() - 0.3) * 40 * this.k; z0[i] = (r() - 0.3) * 90;
      if (avant) {
        q0[i] = 0.05 + r() * (Q_CASSURE - 0.05); vie[i] = 0.08 + r() * 0.08;
        vx[i] = (r() - 0.5) * 160 * this.k; vy[i] = (40 + r() * 140) * this.k; vz[i] = (r() - 0.5) * 80;
      } else {
        const ang = Math.PI * (0.08 + 0.84 * r()), v = vmax * this.k * (0.15 + 0.85 * Math.pow(r(), 0.7));
        q0[i] = Q_CASSURE + r() * 0.015; vie[i] = (etincelles ? 0.1 : 0.14) + r() * 0.2;
        vx[i] = Math.cos(ang) * v * (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.8); vy[i] = Math.sin(ang) * v; vz[i] = (r() - 0.3) * v * 0.7;
      }
      c.setHex(couleurs[(r() * couleurs.length) | 0]); couleur.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(rgba, 4));
    const rond = document.createElement('canvas'); rond.width = rond.height = 32;
    const rx = rond.getContext('2d')!; const rg = rx.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.6, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    rx.fillStyle = rg; rx.fillRect(0, 0, 32, 32);
    const mat = new THREE.PointsMaterial({ size: taille * Math.max(0.8, this.k), sizeAttenuation: false, map: new THREE.CanvasTexture(rond), vertexColors: true, transparent: true, depthWrite: false, blending: etincelles ? THREE.AdditiveBlending : THREE.NormalBlending });
    const points = new THREE.Points(geo, mat); points.frustumCulled = false;
    this.scene3.add(points);
    return { points, n, x0, y0, z0, vx, vy, vz, q0, vie, couleur, pos, rgba, gravite: etincelles ? 500 : 1500 };
  }

  private liberer() {
    this.scene3.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => { (x as THREE.MeshBasicMaterial).map?.dispose?.(); x.dispose(); });
      else if (mat) { (mat as THREE.MeshBasicMaterial).map?.dispose?.(); mat.dispose(); }
    });
    this.scene3.clear();
    this.eclats = []; this.poussieres = []; this.debris = [];
  }

  // ---------- Image : tout est calculé depuis q
  private tic = (t: number) => {
    if (!this.actif) return;
    this.image(t);
    this.boucle = requestAnimationFrame(this.tic);
  };

  private image(tMs: number) {
    const q = this.q, Wv = this.Wv, Hv = this.Hv, k = this.k;
    const dt = Math.min(64, tMs - this.tPrec); this.tPrec = tMs;
    const tm = tMs / 1000;
    if (this.enGrotte && this.grotte) {
      this.grotte.image(tMs, dt, false);
      this.renderer.render(this.grotte.scene, this.grotte.camera);
      return;
    }

    // Tremblement : monte jusqu'à la cassure, pique, retombe, reste léger dans le vide.
    let amp = 7 * Math.pow(lisse(0.01, Q_CASSURE, q), 1.6) * k;
    if (q >= Q_CASSURE) amp = (30 * Math.exp(-(q - Q_CASSURE) * 16) + 2.4 * (q < 0.92 ? 1 : 1 - lisse(0.92, 1, q))) * k;
    const sx = (Math.sin(tm * 71) + 0.6 * Math.sin(tm * 113 + 1)) * amp * 0.6;
    const sy = (Math.cos(tm * 83) + 0.6 * Math.sin(tm * 131 + 2)) * amp * 0.6;
    this.camera.position.x = sx; this.camera.position.y = sy;
    this.camera.rotation.z = Math.sin(tm * 59) * amp * 0.0004;
    const punch = Q_CASSURE <= q ? Math.exp(-(q - Q_CASSURE) * 30) : 0;
    this.camera.position.z = (Hv / 2) / Math.tan(THREE.MathUtils.degToRad(20)) - 110 * k * punch;
    const nu = `translate(${(-sx).toFixed(1)}px, ${sy.toFixed(1)}px)`;
    this.pixi.canvas.style.transform = nu;

    // Le vide et la lueur.
    (this.vide.material as THREE.MeshBasicMaterial).opacity = lisse(0.09, 0.3, q);
    const lm = this.lueur.material as THREE.SpriteMaterial;
    const montee = lisse(0.02, Q_CASSURE, q);
    this.lueur.scale.setScalar((70 + 380 * montee + (q >= Q_CASSURE ? 900 * punch : 0)) * k);
    lm.opacity = q < Q_CASSURE ? 0.15 + 0.7 * montee : 0.85 * Math.exp(-(q - Q_CASSURE) * 22);
    this.flash.style.opacity = q >= Q_CASSURE ? String(Math.max(0, 0.9 * Math.exp(-(q - Q_CASSURE) * 55))) : '0';

    // Fissures.
    this.fissurePlan.visible = q < Q_CASSURE + 0.004;
    if (this.fissurePlan.visible && Math.abs(q - this.dernierQFissure) > 0.0004) { this.dessinerFissures(q); this.dernierQFissure = q; }

    // Éclats : au repos ils tremblent (les coutures s'ouvrent), puis vol balistique.
    const ouverture = lisse(0.04, Q_CASSURE, q);
    for (const e of this.eclats) {
      const tt = Math.max(0, (q - e.q0) * ECHELLE_TEMPS);
      if (tt <= 0) {
        const j = ouverture * 3.2 * k;
        e.mesh.position.set(e.base.x + e.tremble.x * j * Math.sin(tm * 47 + e.tremble.z * 9), e.base.y + e.tremble.y * j * Math.sin(tm * 53 + e.tremble.x * 9), e.tremble.z * ouverture * 9);
        e.mesh.rotation.set(0, 0, e.tremble.x * ouverture * 0.012 * Math.sin(tm * 41));
      } else {
        const g = 2600 * k;
        e.mesh.position.set(e.base.x + e.v.x * tt, e.base.y + e.v.y * tt - 0.5 * g * tt * tt, e.v.z * tt);
        e.mesh.rotation.set(e.w.x * tt, e.w.y * tt, e.w.z * tt);
      }
      e.mesh.visible = e.mesh.position.y > -Hv * 1.4;
    }

    // Poussière, mottes, étincelles.
    for (const p of this.poussieres) {
      for (let i = 0; i < p.n; i++) {
        const tt = (q - p.q0[i]) * ECHELLE_TEMPS, vie = p.vie[i] * ECHELLE_TEMPS;
        const o = i * 3, c = i * 4;
        if (tt < 0 || tt > vie) { p.rgba[c + 3] = 0; continue; }
        p.pos[o] = p.x0[i] + p.vx[i] * tt;
        p.pos[o + 1] = p.y0[i] + p.vy[i] * tt - 0.5 * p.gravite * k * tt * tt;
        p.pos[o + 2] = p.z0[i] + p.vz[i] * tt;
        p.rgba[c] = p.couleur[o]; p.rgba[c + 1] = p.couleur[o + 1]; p.rgba[c + 2] = p.couleur[o + 2];
        p.rgba[c + 3] = Math.min(1, (1 - tt / vie) * 1.6);
      }
      (p.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (p.points.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }

    // Débris 3D et traînées : montent de plus en plus vite pendant que le héros tombe.
    const chute = Math.max(0, q - Q_PLEIN_VIDE);
    const entree = lisse(Q_PLEIN_VIDE - 0.02, Q_PLEIN_VIDE + 0.06, q);
    const plage = Hv * 1.9;
    for (const d of this.debris) {
      d.m.visible = entree > 0.02;
      const y = ((((d.y - chute * Hv * 14 * d.vit) % plage) + plage) % plage) - plage / 2;
      d.m.position.set(d.x, y, d.z);
      d.m.rotation.set(q * 9 * d.vit + d.s, q * 7 + d.x, q * 5);
    }
    const lp = this.traînees.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.traineesDonnees.forEach((s, i) => {
      const y = ((((s.y0 - chute * Hv * 20 * s.vit) % plage) + plage) % plage) - plage / 2;
      lp.setXYZ(i * 2, s.x, y, s.z); lp.setXYZ(i * 2 + 1, s.x, y + s.l * (1 + chute * 6), s.z);
    });
    lp.needsUpdate = true;
    (this.traînees.material as THREE.LineBasicMaterial).opacity = entree * 0.8;

    // Le héros : s'inquiète pendant que ça tremble, tombe à la cassure, culbute dans le vide.
    const hero = this.monde.heros;
    const d = this.depart;
    const u = lisse(Q_CHUTE, Q_CHUTE + 0.15, q);
    const x = mix(d.x, Wv / 2, u);
    const yCentreCible = Hv * 0.5;
    const yPieds = mix(d.y, yCentreCible + d.hauteur / 2, u) + (u >= 1 ? Math.sin(tm * 2.1) * 7 : 0);
    hero.pivot.set(0, -d.hauteur / 2);
    hero.position.set(x, yPieds - d.hauteur / 2);
    hero.rotation = -0.75 * u + Math.sin(q * 30) * 0.12 * u + Math.sin(tm * 1.7) * 0.1 * u;
    hero.scale.set(1 + 0.18 * u);
    hero.maj(0, false, false, tm, dt);
    hero.poseChute(0.18 * lisse(0.06, Q_CASSURE, q) + 0.82 * lisse(Q_CASSURE, Q_CASSURE + 0.07, q), tm);

    this.renderer.render(this.scene3, this.camera);
    this.pixi.renderer.render({ container: this.pixi.stage });
    void Wv;
  }

  private dessinerFissures(q: number) {
    const c = this.fissureToile, g = c.getContext('2d')!;
    const e = c.width / this.monde.taille.largeur;
    g.clearRect(0, 0, c.width, c.height);
    const R = this.rayonMax * 1.05 * lisse(0.03, 0.24, q);
    const lots: Segment[][] = [[], [], [], []];
    for (const s of this.fissures) {
      const a = (R - s.d) / 110;
      if (a <= 0) continue;
      lots[Math.min(3, Math.floor(a * 4))].push(s);
    }
    g.lineCap = 'round';
    lots.forEach((lot, b) => {
      if (!lot.length) return;
      const alpha = (b + 1) / 4;
      for (const [largeur, couleur] of [[6 * e * this.k + 2, `rgba(168,85,247,${0.4 * alpha})`], [1.8 * e * this.k + 0.8, `rgba(255,236,255,${alpha})`]] as [number, string][]) {
        g.beginPath();
        for (const s of lot) { g.moveTo(s.ax * e, s.ay * e); g.lineTo(s.bx * e, s.by * e); }
        g.lineWidth = largeur; g.strokeStyle = couleur; g.stroke();
      }
    });
    this.fissureTex.needsUpdate = true;
  }
}
