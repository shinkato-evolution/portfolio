// Phase 1 V2 (version de test) : on ouvre les yeux en pleine chute dans le ciel des rêves, on s'accroche, puis on vole sur un dragon
// en suivant le défilement jusqu'aux portails des projets. Tout est provisoire : décor en cartes, dragon en formes simples, mains agitées par le code.
// Ce module ne gère que l'image et les textes de la scène ; main.ts décide de ce qui se passe avant et après.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Dragon3D } from './dragon3d';
import { son } from '../son';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { POSITIONS_PORTAILS } from '../act1/chemin';

const IMG = `${import.meta.env.BASE_URL}sprites/`;
const LONGUEUR_VOL = Math.round(1500 * 8 / 7); // la route s'allonge avec le nombre de portails : l'écart entre deux portails reste celui d'avant                 // distance parcourue de p = 0 à p = 1 (unités de la scène)
const TEXTE_1 = 'Ne renonce pas à tes rêves.\nAccroche-toi.';
const TEXTE_2 = 'Croire en tes rêves\npeut te donner des ailes.';
const COUPS_POUR_SACCROCHER = 8;
/** Couleur de chaque portail de projet : 0 = jaune doré (principale), 1 = bleu ; le portail du fond est noir (2). À changer ici pour tester. */
const COULEURS_PORTAILS = [0, 1, 0, 1, 0, 1, 0];
const RATIO_INTERIEUR = 0.65; // rayon intérieur de l'anneau / rayon extérieur (mesuré sur les images)
/** Mouvements de l'anneau runique, en tours (positif = vers la gauche) : [déplacement, durée du mouvement, pause après]. */
const MOUVEMENTS_ANNEAU: [number, number, number][] = [[0.07, 0.9, 1.0], [-0.25, 1.2, 1.1], [0.5, 1.7, 1.3], [0.25, 1.2, 1.5]];
/** Décor de roche du vol : 'grotte' = les blocs de la phase 2 (même géométrie, même texture, même matériau) ; 'scans' = modèles Poly Haven. */
const STYLE_ROCHE: 'grotte' | 'scans' = 'grotte';
/** Dragon vu du dos : 'trois' = modèle 3D construit en code (dragon3d.ts), 'marionnette' = pièces à plat articulées, 'images' = 6 images à plat. */
const DRAGON_MODE = 'aucun' as 'aucun' | 'trois' | 'marionnette' | 'images'; // 'aucun' : vue à la première personne comme en phase 2, on ne voit pas le dragon
/** Oiseaux, petits dragons, cascades, brumes, fleurs, pétales : désactivés (ils traversaient les rochers et n'étaient pas beaux). */
const AVEC_VIE = false;
const DRAGON_MARIONNETTE = DRAGON_MODE === 'marionnette';
/** Pièces du dragon marionnette (tailles des images en px ; points d'articulation et d'alignement en fractions de l'image). L'aile dessinée est la GAUCHE, pivot à l'épaule en bas à droite ; la droite en est le miroir. */
const M_CORPS = [813, 1133], M_AILE = [1106, 1187], M_MAIN = [596, 523];
const P_EPAULE = [0.929, 0.965];     // dans l'aile : l'épaule
const EPAULE_CORPS = [0.05, 0.8];    // sur le corps : l'épaule gauche (la droite est symétrique)
const CEINTURE_CORPS = 0.466;        // sur le corps : hauteur de la ceinture du harnais
const SANGLE_MAIN = 0.222;           // sur la main : hauteur de la sangle
const ZOOM_CORPS = 0.72;             // hauteur du corps en hauteurs d'écran (> 1 : le bas du dragon est hors cadre)
const HAUT_CEINTURE = 0.93;          // la ceinture est à cette hauteur de l'écran
const ECHELLE_AILE = 1.3, ECHELLE_MAIN = 0.62;
const DUREE_PUITS = 3.4; // secondes de chute dans le puits
const MAINS_TENDUES = true; // `main-droite-1..3.webp` : main droite qui se tend vers l'intérieur puis attrape
const COTE_PORTAIL = 12.5, RAYON_PORTAIL = 5.5, HAUT_PORTAIL = 9, DECALAGE_DRAGON = 3;

function hasard(graine: number) { let s = graine >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

interface Station { x: number; z: number; yHaut: number; }
interface Flottant { sp: THREE.Sprite; x: number; y: number; z: number; x0: number; z0: number; vx: number; vz: number; bat: number; base: number; }

export class PhaseV2 {
  private racine = document.createElement('div');
  private canvas = document.createElement('canvas');
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1200);
  private yeux = document.createElement('div');
  private texte = document.createElement('p');
  private texteNoir = document.createElement('p');
  private flash = document.createElement('div'); private noir = document.createElement('div');
  private magie = document.createElement('div');
  private mains: HTMLImageElement[] = [];
  private anim = document.createElement('div'); private images: HTMLImageElement[] = []; private cases: HTMLElement[] = [];
  private vue = document.createElement('div'); private vueImages: HTMLImageElement[] = []; private vueActive = -1;
  private dragon3d = new Dragon3D();
  private mario = document.createElement('div'); private mAileG!: { racine: HTMLElement; aile: HTMLElement }; private mAileD!: { racine: HTMLElement; aile: HTMLElement }; private mCorps!: HTMLImageElement; private mMain!: HTMLImageElement;
  private tendues: HTMLImageElement[] = []; private mainsTendues = false;
  private orbeUi = document.createElement('div');
  private barre = document.createElement('i');
  private boutonOrbe = document.createElement('button');
  private grpChute = new THREE.Group();
  private grpVol = new THREE.Group();
  private flottants: Flottant[] = [];
  private mer!: THREE.Mesh; private tChute = 0; private portails: THREE.ShaderMaterial[] = [];
  private lignes!: THREE.LineSegments; private lignesDonnees: { x: number; y: number; z: number; l: number; v: number }[] = [];
  private etincelles!: THREE.Points; private etincellesPos!: Float32Array;
  private dragon = new THREE.Group(); private dragonSp!: THREE.Sprite; private fond!: THREE.Mesh; private sauveur!: THREE.Sprite; private sauveurT = -1;
  private fabrique!: (nom: string, largeur: number, ancre?: number) => THREE.Sprite;
  private portailsFx: { vortex: THREE.Sprite; anneau: THREE.Sprite; lueur: THREE.Sprite; base: number; etat: { angle: number }; phase: number }[] = [];
  private assets: Record<string, { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial; l: number; h: number; p: number }> = {};
  private solVol = false; private para = { x: 0, y: 0 }; private vitLat = 0; private vitVert = 0; private dernier = { x: 0, y: 0 };
  private stations: Station[] = [];
  private cotes: number[] = [];
  /** Décalage vertical (px) que le balancement de la caméra donne à la scène : la fiche et l'aperçu des portails le suivent. */
  bobPx = 0;
  private poussiere!: THREE.Points; private poussierePos!: Float32Array; private poussiereDer = new THREE.Vector3(); private poussiereInit = false;
  private mode: 'ferme' | 'chute' | 'vol' | 'puits' = 'ferme';
  private grpPuits = new THREE.Group(); private puitsCrist: THREE.InstancedMesh | null = null; private puitsDebris: THREE.InstancedMesh | null = null; private puitsLueur!: THREE.Sprite; private puitsLum!: THREE.PointLight;
  private tPuits = 0; private profondeur = 0; private resolvePuits: (() => void) | null = null; private debris: { x: number; y: number; z: number; s: number; v: number; r: number }[] = [];
  private boucle = 0; private tPrec = 0; private temps = 0; private actif = false;
  private lisse: { x: number; y: number } | null = null; private zoom = 0; private coups = 0; private secousse = 0; private plongee = 0;
  private resolvePret: (() => void) | null = null;
  private tex: Record<string, THREE.Texture> = {};

  constructor(private hote: HTMLElement, private lireP: () => number) {}

  async init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0xf8d4e2, 1);
    const charge = new THREE.TextureLoader();
    const v2 = (n: string) => `${IMG}v2/${n}.webp`;
    const noms: [string, string][] = [['sol-chute', `${IMG}sol-chute.webp`], ['panorama', v2('panorama')]];
    for (let i = 1; i <= 17; i++) noms.push([`haut-${i}`, v2(`haut-${i}`)]);
    for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 19]) noms.push([`montagne-${i}`, v2(`montagne-${i}`)]);
    for (let i = 0; i < 8; i++) noms.push([`dragon-${i}`, v2(`dragon-${i}`)]);
    for (let i = 1; i <= 3; i++) { noms.push([`anneau-${i}`, v2(`anneau-${i}`)]); noms.push([`vortex-${i}`, v2(`vortex-${i}`)]); }
    for (let i = 1; i <= 2; i++) noms.push([`roche-${i}`, v2(`roche-${i}`)]);
    noms.push(['grotte-roche', `${IMG}break/roche.webp`]);
    for (let i = 1; i <= 36; i++) noms.push([`vie-${i}`, v2(`vie-${i}`)]);
    const textures = await Promise.all(noms.map(([, f]) => charge.loadAsync(f)));
    noms.forEach(([n], i) => { textures[i].colorSpace = THREE.SRGBColorSpace; this.tex[n] = textures[i]; });
    for (const n of ['roche-1', 'roche-2', 'grotte-roche']) { const t = this.tex[n]; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
    await this.chargerModeles();
    this.interface();
    this.construireScene();
    window.addEventListener('resize', this.redim);
    this.redim();
  }

  /** Masque d'opacité rond aux bords flous : plein jusqu'à `dur` du rayon, puis transparent vers le bord. */
  private alphaFlou(dur: number) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!, d = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    d.addColorStop(0, '#fff'); d.addColorStop(Math.max(0.01, dur), '#fff');
    for (let k = 1; k <= 10; k++) { const t = k / 10, v = Math.round(255 * (0.5 + 0.5 * Math.cos(Math.PI * t))); d.addColorStop(dur + (1 - dur) * t, `rgb(${v},${v},${v})`); } // retombée douce en cosinus : aucune limite nette
    g.fillStyle = d; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  }
  private eauMat: THREE.MeshBasicMaterial | null = null;
  /** L'eau du bas : une peinture à plat, comme un fond de dessin animé. Une tuile dessinée en code (aplats de trois tons, traits de vagues blancs tracés à la main, petites étincelles),
   *  répétée sur le sol, qui coule lentement ; la brume l'efface vers l'horizon. Aucun reflet ni relief : pas d'effet 3D. */
  private matEau() {
    if (this.eauMat) return this.eauMat;
    const T = 1024, c = document.createElement('canvas'); c.width = c.height = T;
    const g = c.getContext('2d')!, r = hasard(31);
    g.fillStyle = '#6a97d6'; g.fillRect(0, 0, T, T);
    const toutes = (fn: (dx: number, dy: number) => void) => { for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) fn(dx, dy); }; // la tuile se raccorde sur ses bords
    const taches = (couleur: string, n: number, tmin: number, tmax: number) => {
      for (let i = 0; i < n; i++) {
        const x = r() * T, y = r() * T, rx = tmin + r() * (tmax - tmin), ry = rx * (0.28 + r() * 0.25), pts = 9;
        const poly = Array.from({ length: pts }, (_, k) => { const a = (k / pts) * Math.PI * 2, j = 0.8 + r() * 0.4; return [Math.cos(a) * rx * j, Math.sin(a) * ry * j]; });
        g.fillStyle = couleur;
        toutes((dx, dy) => { g.beginPath(); poly.forEach(([px2, py2], k) => (k ? g.lineTo(x + dx + px2, y + dy + py2) : g.moveTo(x + dx + px2, y + dy + py2))); g.closePath(); g.fill(); });
      }
    };
    taches('#4d66b8', 26, 60, 190);   // creux plus sombres
    taches('#8cc6e4', 30, 50, 170);   // reflets clairs
    taches('#aedcee', 14, 30, 90);
    // Traits de vagues blancs, courts, ondulés, tracés d'un geste.
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 150; i++) {
      const x = r() * T, y = r() * T, l = 40 + r() * 130, h = 5 + r() * 9, ep = 2.5 + r() * 3.5;
      g.strokeStyle = r() < 0.78 ? 'rgba(255,255,255,0.92)' : 'rgba(214,236,255,0.9)'; g.lineWidth = ep;
      toutes((dx, dy) => { g.beginPath(); g.moveTo(x + dx, y + dy); g.quadraticCurveTo(x + dx + l * 0.25, y + dy - h, x + dx + l * 0.5, y + dy); g.quadraticCurveTo(x + dx + l * 0.75, y + dy + h, x + dx + l, y + dy); g.stroke(); });
    }
    for (let i = 0; i < 26; i++) { // petites étincelles dorées
      const x = r() * T, y = r() * T, d = 5 + r() * 6;
      g.fillStyle = 'rgba(255,238,170,0.95)';
      toutes((dx, dy) => { g.beginPath(); g.moveTo(x + dx, y + dy - d); g.lineTo(x + dx + d * 0.3, y + dy); g.lineTo(x + dx, y + dy + d); g.lineTo(x + dx - d * 0.3, y + dy); g.closePath(); g.fill(); });
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(16, 16); tex.anisotropy = 8;
    this.eauMat = new THREE.MeshBasicMaterial({ map: tex, fog: true });
    return this.eauMat;
  }

  private matCommun: THREE.MeshStandardMaterial | null = null;
  /** Matériau des rochers : les textures peintes (falaise, roche usée) projetées selon les trois axes dans l'espace du monde,
   *  de la mousse verte sur les pentes douces en bas, de la neige en haut : comme les montagnes de ton panorama. Les UV des scans ne servent plus. */
  private matRoche() {
    if (this.matCommun) return this.matCommun;
    const m = new THREE.MeshStandardMaterial({ color: 0xe4daf6, roughness: 1, metalness: 0, emissive: 0x6a5890, emissiveIntensity: 0.18, side: THREE.DoubleSide, map: this.tex['roche-1'], emissiveMap: this.tex['roche-2'] }); // les deux textures passent par les emplacements `map` et `emissiveMap` : three sait les lier
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
varying vec3 vWPos; varying vec3 vWN;`)
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 wpos = vec4(transformed, 1.0);
          vec3 wn = objectNormal;
          #ifdef USE_INSTANCING
            wpos = instanceMatrix * wpos; wn = mat3(instanceMatrix) * wn;
          #endif
          vWPos = (modelMatrix * wpos).xyz; vWN = normalize(mat3(modelMatrix) * wn);`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWPos; varying vec3 vWN;
          vec3 tri(sampler2D t, vec3 p, vec3 w, float sc) { return texture2D(t, p.zy * sc).rgb * w.x + texture2D(t, p.xz * sc).rgb * w.y + texture2D(t, p.xy * sc).rgb * w.z; }`)
        .replace('#include <map_fragment>', `
          vec3 n = normalize(vWN); vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
          vec3 a = tri(map, vWPos, w, 0.011); a = mix(a, tri(map, vWPos.zxy + 13.0, w, 0.0037), 0.45);
          vec3 b = tri(emissiveMap, vWPos, w, 0.012);
          vec3 col = mix(a, b, smoothstep(0.35, 0.75, n.y));
          float mousse = smoothstep(0.45, 0.85, n.y) * (1.0 - smoothstep(-30.0, 30.0, vWPos.y));
          col = mix(col, col * vec3(0.72, 1.05, 0.68) + vec3(0.02, 0.07, 0.0), mousse * 0.75);
          float neige = smoothstep(0.35, 0.8, n.y) * smoothstep(40.0, 90.0, vWPos.y);
          col = mix(col, vec3(0.96, 0.94, 1.0), neige);
          diffuseColor.rgb *= col;`);
    };
    this.matCommun = m;
    return m;
  }

  /** Les modèles Poly Haven allégés (public/models/v2/*.glb) : géométrie, matériau repeint en pastel, dimensions en mètres. */
  private async chargerModeles() {
    const ids = ['namaqualand_cliff_01', 'namaqualand_cliff_02', 'rock_face_01', 'rock_face_02', 'mountainside'];
    const gl = new GLTFLoader();
    const gltfs = await Promise.all(ids.map((id) => gl.loadAsync(`${import.meta.env.BASE_URL}models/v2/${id}.glb`)));
    gltfs.forEach((g, i) => {
      let mesh: THREE.Mesh | null = null;
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((o) => { if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh; });
      const mm = mesh as unknown as THREE.Mesh;
      const geo = mm.geometry.clone().applyMatrix4(mm.matrixWorld);
      geo.computeBoundingBox();
      const bb = geo.boundingBox as THREE.Box3;
      const mat = this.matRoche();
      this.assets[ids[i]] = { geo, mat, l: bb.max.x - bb.min.x, h: bb.max.y - bb.min.y, p: bb.max.z - bb.min.z };
    });
  }

  // ---------- Dragon marionnette (vue de dos) : le corps (cou épais, harnais), une aile entière par côté (la droite est le miroir de la gauche), la main sur la sangle
  private construireMario() {
    const r = this.mario; r.className = 'v2-mario';
    const img = (nom: string) => { const im = new Image(); im.src = `${IMG}v2/mario-${nom}.webp`; im.alt = ''; im.draggable = false; return im; };
    const aile = (miroir: boolean) => {
      const racine = document.createElement('div'); racine.className = 'v2-m-pt'; if (miroir) racine.style.transform = 'scaleX(-1)';
      const el = document.createElement('div'); el.className = 'v2-m-pt'; const im = img('aile'); im.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%'; el.append(im); racine.append(el);
      return { racine, aile: el };
    };
    this.mAileG = aile(false); this.mAileD = aile(true);
    this.mCorps = img('corps'); this.mCorps.className = 'v2-m-pt'; this.mMain = img('main'); this.mMain.className = 'v2-m-pt v2-m-main';
    r.append(this.mAileG.racine, this.mAileD.racine, this.mCorps, this.mMain);
    this.mario.style.display = 'none';
  }

  /** Place les pièces. La marionnette est volontairement ZOOMÉE : le corps dépasse du bas de l'écran, les épaules sont hors cadre et les ailes sortent d'en bas ; seule la partie haute du dragon est visible. */
  private miseEnPageMario() {
    const W = this.hote.clientWidth, H = this.hote.clientHeight, k = (ZOOM_CORPS * H) / M_CORPS[1];
    const bw = M_CORPS[0] * k, bh = M_CORPS[1] * k, gauche = W / 2 - bw / 2;
    const ceinture = HAUT_CEINTURE * H, haut = ceinture - CEINTURE_CORPS * bh; // la ceinture du harnais se trouve à HAUT_CEINTURE de la hauteur d'écran
    const place = (el: HTMLElement, x: number, y: number, w: number, h: number) => { el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.width = `${w}px`; el.style.height = `${h}px`; };
    place(this.mCorps, gauche, haut, bw, bh);
    const kw = k * ECHELLE_AILE, aw = M_AILE[0] * kw, ah = M_AILE[1] * kw;
    const monte = (a: { racine: HTMLElement; aile: HTMLElement }, ex: number, ey: number) => {
      place(a.racine, ex, ey, 0, 0);
      place(a.aile, -P_EPAULE[0] * aw, -P_EPAULE[1] * ah, aw, ah); a.aile.style.transformOrigin = `${P_EPAULE[0] * aw}px ${P_EPAULE[1] * ah}px`;
    };
    monte(this.mAileG, gauche + EPAULE_CORPS[0] * bw, haut + EPAULE_CORPS[1] * bh);
    monte(this.mAileD, gauche + (1 - EPAULE_CORPS[0]) * bw, haut + EPAULE_CORPS[1] * bh);
    // La main : sa sangle se superpose à la ceinture du harnais.
    const hk = k * ECHELLE_MAIN, mw = M_MAIN[0] * hk, mh = M_MAIN[1] * hk;
    place(this.mMain, W / 2 - mw / 2, ceinture - SANGLE_MAIN * mh, mw, mh);
  }

  // ---------- Éléments de vie : oiseaux, petits dragons, rapaces, cascades, brumes, fleurs, branches, pétales
  private vie: { sp: THREE.Sprite; x0: number; y0: number; z: number; vx: number; bob: number; ph: number; plage: number }[] = [];
  private ajouterVie() {
    const r = hasard(909), L = LONGUEUR_VOL, BAS = -66;
    const pt = (p: number) => ({ x: this.xChemin(p), y: this.yChemin(p), z: -p * L });
    const cote = () => (r() < 0.5 ? -1 : 1);
    const mettre = (idx: number, p: number, lat: number, dy: number, larg: number, o: { vx?: number; bob?: number; ancre?: number; opa?: number; y?: number; add?: boolean; plage?: number } = {}) => {
      const c = pt(p), sp = this.fabrique(`vie-${idx}`, larg, o.ancre ?? 0.5);
      const m = sp.material as THREE.SpriteMaterial; m.opacity = o.opa ?? 1; if (o.add) m.blending = THREE.AdditiveBlending;
      const x = c.x + lat, y = o.y ?? (c.y + dy);
      sp.position.set(x, y, c.z); this.grpVol.add(sp);
      this.vie.push({ sp, x0: x, y0: y, z: c.z, vx: o.vx ?? 0, bob: o.bob ?? 0, ph: r() * 6.28, plage: o.plage ?? 120 });
    };
    const groupes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    for (let i = 0; i < 20; i++) { // oiseaux : volées lointaines qui dérivent en volant
      const k = groupes[Math.floor(r() * groupes.length)], gros = k === 4 || k === 5;
      mettre(k, 0.03 + r() * 0.92, cote() * (26 + r() * 60), 6 + r() * 34, gros ? 28 + r() * 14 : 12 + r() * 10, { vx: (r() < 0.5 ? -1 : 1) * (2 + r() * 3), bob: 1.2 + r() * 1.5 });
    }
    for (let i = 0; i < 9; i++) { // petits dragons et rapaces, qui traversent de gauche à droite (ils regardent à droite)
      mettre(13 + (i % 6), 0.05 + r() * 0.9, cote() * (45 + r() * 70), 12 + r() * 30, 28 + r() * 14, { vx: 5 + r() * 4, bob: 1.5, plage: 220 });
    }
    for (let i = 0; i < 5; i++) { // cascades posées au sol, loin sur les flancs
      mettre(19 + (i % 4), 0.06 + r() * 0.88, cote() * (105 + r() * 40), 0, 90 + r() * 40, { ancre: 0, y: BAS - 3 });
    }
    for (let i = 0; i < 9; i++) { // brumes basses et voiles
      mettre(23 + (i % 6), 0.03 + r() * 0.94, cote() * (20 + r() * 80), 0, 90 + r() * 60, { y: BAS + 8 + r() * 28, vx: (r() - 0.5) * 2, opa: 0.55, bob: 0.8, plage: 40 });
    }
    // Fleurs et branches accrochées aux parois (juste devant la face intérieure de la paroi).
    for (let i = 0; i < 22; i++) {
      const p = 0.04 + r() * 0.9, c = cote(), interieur = 34 + 8 * (0.5 + 0.5 * Math.sin(p * 41 + c * 1.7));
      if (POSITIONS_PORTAILS.some((q) => Math.abs(q - p) < 0.05)) continue;
      const branche = r() < 0.55;
      mettre(branche ? 33 + Math.floor(r() * 3) : 29 + Math.floor(r() * 4), p, c * (interieur + 1.5), -4 + r() * 22, branche ? 10 + r() * 6 : 11 + r() * 6, { bob: 0.15 });
    }
    for (let i = 0; i < 12; i++) { // pétales lumineux qui flottent près de la route
      mettre(36, 0.03 + r() * 0.93, cote() * (17 + r() * 12), -6 + r() * 16, 9 + r() * 5, { vx: (r() - 0.5) * 1.5, bob: 1.6, add: true, opa: 0.85 });
    }
  }

  // ---------- Interface (calques HTML par-dessus la scène)
  private interface() {
    const r = this.racine; r.className = 'v2'; r.setAttribute('aria-hidden', 'true');
    this.canvas.className = 'v2-canvas';
    this.yeux.className = 'v2-yeux ferme';
    this.texte.className = 'v2-texte'; this.texteNoir.className = 'v2-texte v2-texte-noir';
    this.noir.className = 'v2-noir'; this.noir.style.display = 'none';
    this.flash.className = 'v2-flash'; this.magie.className = 'v2-magie';
    for (const cote of ['g', 'd']) {
      const im = new Image(); im.src = `${IMG}mains/main-ouverte.webp`; im.alt = ''; im.draggable = false; im.className = `v2-main v2-main-${cote}`;
      this.mains.push(im);
    }
    this.vue.className = 'v2-vue';
    for (let k = 1; k <= 6; k++) { const im = new Image(); im.src = `${IMG}v2/vue-dragon-${k}.webp`; im.alt = ''; im.draggable = false; this.vueImages.push(im); this.vue.append(im); }
    for (let k = 1; k <= 3; k++) { const im = new Image(); if (MAINS_TENDUES) im.src = `${IMG}v2/main-droite-${k}.webp`; this.tendues.push(im); }
    this.anim.className = 'v2-anim';
    for (let k = 1; k <= 5; k++) { const im = new Image(); im.src = `${IMG}v2/transition-${k}.webp`; im.alt = ''; im.draggable = false; this.images.push(im); const cs = document.createElement('div'); cs.className = 'v2-case'; cs.append(im); this.anim.append(cs); this.cases.push(cs); }
    this.orbeUi.className = 'v2-orbe';
    this.boutonOrbe.type = 'button'; this.boutonOrbe.className = 'v2-bouton'; this.boutonOrbe.textContent = "S'accrocher";
    const aide = document.createElement('p'); aide.className = 'v2-aide'; aide.textContent = 'Appuie, appuie, appuie !';
    const rail = document.createElement('div'); rail.className = 'v2-rail'; rail.append(this.barre);
    this.orbeUi.append(aide, this.boutonOrbe, rail);
    this.boutonOrbe.addEventListener('click', () => this.accrocher());
    for (let k = 0; k < 28; k++) {
      const e = document.createElement('i'); e.className = 'v2-etincelle';
      const a = (k / 28) * Math.PI * 2, d = 26 + (k % 5) * 9;
      e.style.setProperty('--dx', `${(Math.cos(a) * d).toFixed(1)}vmin`); e.style.setProperty('--dy', `${(Math.sin(a) * d).toFixed(1)}vmin`);
      this.magie.append(e);
    }
    this.construireMario();
    r.append(this.canvas, this.vue, this.mario, ...this.mains, this.anim, this.texte, this.orbeUi, this.magie, this.flash, this.yeux, this.noir, this.texteNoir);
    this.hote.append(r);
  }

  // ---------- Textures dessinées en code : disque lumineux, oiseau
  private disque() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!; const d = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.4, 'rgba(255,244,214,0.8)'); d.addColorStop(1, 'rgba(255,244,214,0)');
    g.fillStyle = d; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  private oiseau() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const g = c.getContext('2d')!; g.strokeStyle = '#4b2d7a'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(8, 18); g.quadraticCurveTo(34, 8, 64, 44); g.quadraticCurveTo(94, 8, 120, 18); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // ---------- Portail vortex : disque qui tourne + anneau doré
  private vortex(rayon: number, a: number, b: number, c: number, anneau: number) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { t: { value: 0 }, a: { value: new THREE.Color(a) }, b: { value: new THREE.Color(b) }, c: { value: new THREE.Color(c) } },
      vertexShader: 'varying vec2 v; void main(){ v = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 v; uniform float t; uniform vec3 a; uniform vec3 b; uniform vec3 c;
        void main(){
          float d = length(v); if (d > 1.0) discard;
          float ang = atan(v.y, v.x);
          float s = sin(ang * 3.0 + 9.0 * d - t * 2.2) * 0.5 + 0.5;
          float s2 = sin(ang * 5.0 - 14.0 * d + t * 1.6) * 0.5 + 0.5;
          vec3 col = mix(a, b, s);
          col = mix(col, c, s2 * 0.5 * (1.0 - d));
          col = mix(c, col, smoothstep(0.0, 0.5, d));
          gl_FragColor = vec4(col, smoothstep(1.0, 0.9, d));
        }`,
    });
    this.portails.push(mat);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(rayon * 2, rayon * 2), mat));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(rayon, rayon * 0.07, 12, 56), new THREE.MeshBasicMaterial({ color: anneau })));
    return g;
  }

  // ---------- Décor 3D : chute = sol vu de dessus + nuages, brumes, oiseaux et dragons vus de dessus ; vol = panorama + reliefs peints le long de la route
  private construireScene() {
    const r = hasard(77);
    this.scene.fog = new THREE.Fog(0xf9d3e3, 90, 700);
    // Sol de la chute : l'archipel vu de dessus ; il grandit en approchant.
    const ts = this.tex['sol-chute']; ts.wrapS = ts.wrapT = THREE.MirroredRepeatWrapping; ts.repeat.set(3, 3); ts.offset.set(-1, -1);
    this.mer = new THREE.Mesh(new THREE.PlaneGeometry(4500, 2541), new THREE.MeshBasicMaterial({ map: ts, fog: false }));
    this.mer.rotation.x = -Math.PI / 2; this.mer.position.y = -520;
    this.scene.add(this.mer);

    const sprite = (nom: string, largeur: number, ancre = 0.5) => {
      const t = this.tex[nom];
      const img = t.image as { width: number; height: number };
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
      s.center.set(0.5, ancre); s.scale.set(largeur, largeur * img.height / img.width, 1);
      return s;
    };
    this.fabrique = sprite;
    const ajouter = (s: THREE.Sprite, x: number, y: number, z: number, vx = 0, vz = 0, bat = 0) => {
      s.position.set(x, y, z); this.grpChute.add(s);
      this.flottants.push({ sp: s, x, y, z, x0: x, z0: z, vx, vz, bat, base: s.scale.x });
    };
    const opacite = (s: THREE.Sprite, o: number) => { (s.material as THREE.SpriteMaterial).opacity = o; };
    const tourner = (s: THREE.Sprite) => { (s.material as THREE.SpriteMaterial).rotation = r() * Math.PI * 2; };
    const cote = () => (r() < 0.5 ? -1 : 1);

    // Chute : peu d'éléments, vus de dessus, répartis à gauche et à droite et légèrement transparents.
    for (let i = 0; i < 16; i++) {
      const s = sprite(`haut-${1 + (i % 6)}`, 24 + r() * 36); opacite(s, 0.5 + r() * 0.2); tourner(s);
      ajouter(s, cote() * (10 + r() * 70), -330 + r() * 400, (r() - 0.5) * 120);
    }
    for (let i = 0; i < 7; i++) {
      const s = sprite(`haut-${7 + (i % 4)}`, 40 + r() * 30); opacite(s, 0.35 + r() * 0.15);
      (s.material as THREE.SpriteMaterial).rotation = (r() - 0.5) * 0.8;
      ajouter(s, cote() * (6 + r() * 60), -330 + r() * 400, (r() - 0.5) * 120);
    }
    for (let i = 0; i < 6; i++) { // oiseaux vus de dessus, qui filent vers l'avant
      const s = sprite(`haut-${14 + (i % 4)}`, 5 + r() * 3);
      ajouter(s, cote() * (6 + r() * 40), -330 + r() * 400, (r() - 0.5) * 80, (r() - 0.5) * 3, -(9 + r() * 6), 1);
    }
    // Le dragon qui nous rattrape : grand, tout près, il arrive sur le côté quand on s'accroche.
    this.sauveur = sprite('haut-11', 34); this.sauveur.position.set(70, -48, 8); this.grpChute.add(this.sauveur);
    // Traînées de vent
    const nl = 110, lp = new Float32Array(nl * 6), lc = new Float32Array(nl * 8);
    for (let i = 0; i < nl; i++) {
      const a = r() * Math.PI * 2, d = 3 + r() * 16;
      this.lignesDonnees.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, y: -60 + r() * 120, l: 5 + r() * 16, v: 1 + r() * 1.5 });
      for (let j = 0; j < 2; j++) lc.set([1, 0.95, 1, j ? 0.0 : 0.5], i * 8 + j * 4);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 4));
    this.lignes = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false }));
    this.lignes.frustumCulled = false; this.grpChute.add(this.lignes);
    // Étincelles rondes de lumière
    const ne = 140; this.etincellesPos = new Float32Array(ne * 3);
    for (let i = 0; i < ne; i++) this.etincellesPos.set([(r() - 0.5) * 70, -40 + r() * 100, (r() - 0.5) * 70], i * 3);
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(this.etincellesPos, 3));
    this.etincelles = new THREE.Points(eg, new THREE.PointsMaterial({ map: this.disque(), color: 0xfff6d8, size: 3.4, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false }));
    this.grpChute.add(this.etincelles);
    this.scene.add(this.grpChute);

    // Vol : panorama fixé devant la caméra, portails, reliefs et dragon.
    const pano = this.tex['panorama'];
    this.fond = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: pano, fog: false, depthTest: false, depthWrite: false, toneMapped: false }));
    this.fond.renderOrder = -100; this.fond.position.z = -350; this.fond.visible = false;
    this.camera.add(this.fond); this.scene.add(this.camera);
    POSITIONS_PORTAILS.forEach((pp, i) => {
      const dernier = i === POSITIONS_PORTAILS.length - 1;
      const z = -pp * LONGUEUR_VOL, cote2 = dernier ? 0 : (i % 2 ? 1 : -1);
      this.cotes.push(cote2);
      // Un portail = deux calques : le vortex derrière (il tourne en spirale), l'anneau runique devant (il bouge par à-coups).
      // Un portail sans anneau : le disque de vortex aux bords fondus, un halo flou qui tourne en sens inverse et une lueur : le portail « attire », sans rune.
      const c = dernier ? 2 : COULEURS_PORTAILS[i % COULEURS_PORTAILS.length], largeur = dernier ? 26 : 15;
      const vortex = this.fabrique(`vortex-${c + 1}`, largeur * 0.92, 0.5), halo = this.fabrique(`vortex-${c + 1}`, largeur * 1.5, 0.5), lueur = this.fabrique(`vortex-${c + 1}`, largeur * 2.1, 0.5);
      const flou = this.alphaFlou(0.35), flouFort = this.alphaFlou(0.05);
      (vortex.material as THREE.SpriteMaterial).alphaMap = this.alphaFlou(0.55); (halo.material as THREE.SpriteMaterial).alphaMap = flou; (lueur.material as THREE.SpriteMaterial).alphaMap = flouFort;
      (halo.material as THREE.SpriteMaterial).opacity = 0.38; (halo.material as THREE.SpriteMaterial).blending = THREE.AdditiveBlending;
      (lueur.material as THREE.SpriteMaterial).opacity = 0.28; (lueur.material as THREE.SpriteMaterial).blending = THREE.AdditiveBlending;
      for (const sp of [lueur, halo, vortex]) { (sp.material as THREE.SpriteMaterial).fog = false; (sp.material as THREE.SpriteMaterial).depthWrite = false; sp.position.set(cote2 * COTE_PORTAIL, dernier ? 11 : HAUT_PORTAIL, z); this.grpVol.add(sp); }
      lueur.renderOrder = 1; halo.renderOrder = 2; vortex.renderOrder = 3;
      const fx = { vortex, anneau: halo, lueur, base: largeur, etat: { angle: 0 }, phase: i * 0.9 };
      this.portailsFx.push(fx);
      if (dernier) {
        const mot = this.etiquette('???'); mot.position.set(0, 27, z); this.grpVol.add(mot);
        this.stations.push({ x: 0, z, yHaut: 20 });
      } else {
        this.stations.push({ x: cote2 * COTE_PORTAIL, z, yHaut: HAUT_PORTAIL + RAYON_PORTAIL });
      }
    });
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const soleil = new THREE.DirectionalLight(0xfff1dc, 1.3); soleil.position.set(-30, 60, 40); this.scene.add(soleil);
    this.construireRelief();
    this.construirePuits();
    this.construirePoussiere();
    if (AVEC_VIE) this.ajouterVie();
    this.construireDragon();
    if (DRAGON_MODE === 'trois') this.grpVol.add(this.dragon3d.groupe);
    this.grpVol.visible = false;
    this.scene.add(this.grpVol);
  }

  /** Le sol du vol : l'archipel vu de dessus, fixe dans le monde et noyé dans la brume au loin ; les reliefs y plantent leur base, il n'y a plus de vide. */
  private sol() {
    this.mer.material = this.matEau(); // l'archipel de la chute est remplacé par l'eau
    this.mer.rotation.z = 0; this.mer.position.set(0, -67, -750); this.mer.visible = true; this.solVol = true;
  }

  private etiquette(txt: string) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d')!; g.font = '700 96px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = '#2a1450'; g.strokeText(txt, 128, 70); g.fillStyle = '#e9dcff'; g.fillText(txt, 128, 70);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(16, 8, 1); return s;
  }

  /** Le dragon et son cavalier, vus de dos : une carte qui change de pose (battement, virages, plané, piqué). */
  private construireDragon() {
    const t = this.tex['dragon-0'], img = t.image as { width: number; height: number };
    this.dragonSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    this.dragonSp.scale.set(12, 12 * img.height / img.width, 1);
    this.dragon.add(this.dragonSp);
    this.grpVol.add(this.dragon);
  }

  private redim = () => {
    const W = this.hote.clientWidth, H = this.hote.clientHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(W, H, false);
    this.camera.aspect = W / H; this.camera.updateProjectionMatrix();
    const h = 2 * 350 * Math.tan(THREE.MathUtils.degToRad(36)) * 1.3, w = Math.max(h * (2720 / 1536), h * this.camera.aspect);
    this.fond.scale.set(w, w * 1536 / 2720, 1);
    this.miseEnPageMario();
  };

  // ---------- Séquence
  /** Lance la séquence d'ouverture ; la promesse se résout quand le vol commence (le défilement est alors rendu). */
  demarrer(): Promise<void> {
    this.actif = true; this.mode = 'chute';
    this.hote.classList.add('v2-chute');
    this.racine.style.display = 'block';
    this.tPrec = performance.now(); this.boucle = requestAnimationFrame(this.tic);
    gsap.set(this.canvas, { filter: 'blur(14px) brightness(1.05)' });
    gsap.set(this.yeux, { '--rx': '130%', '--ry': '0.5%' });
    return new Promise((resolve) => {
      this.resolvePret = resolve;
      const tl = gsap.timeline();
      tl.call(() => this.yeux.classList.remove('ferme'), undefined, 0.35)
        .to(this.yeux, { '--ry': '22%', duration: 0.6, ease: 'power1.out' }, 0.4)     // il se réveille : les paupières s'entrouvrent…
        .to(this.yeux, { '--ry': '2%', duration: 0.28, ease: 'power1.in' })            // …se referment un peu…
        .to(this.yeux, { '--rx': '210%', '--ry': '175%', duration: 2.0, ease: 'power2.inOut' }) // …puis s'ouvrent en grand
        .to(this.canvas, { filter: 'blur(0px) brightness(1)', duration: 2.2, ease: 'power2.out' }, '<0.1')
        .call(() => { this.dire(TEXTE_1); son.vent(0.4, 2.5); }, undefined, '+=0.3')
        .call(() => this.cacherTexte(), undefined, '+=4.2')
        .call(() => { this.orbeUi.classList.add('visible'); this.sauveurT = 0; }, undefined, '+=0.9');
    });
  }

  private dire(txt: string, noir = false) {
    const el = noir ? this.texteNoir : this.texte;
    el.textContent = txt; gsap.killTweensOf(el); gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out' });
  }
  private cacherTexte(noir = false) { gsap.to(noir ? this.texteNoir : this.texte, { opacity: 0, duration: 1.0 }); }

  /** Seule la main droite change : 0 = ouverte comme au début, 1 = tendue vers l'intérieur, 2 = bras tout tendu.
   *  Les images `main-droite-<n>.webp` sont des mains droites (pouce à gauche), avant-bras entrant par le bas-droite, comme la main de départ. */
  private mainsPose(n: number) {
    if (!MAINS_TENDUES) return;
    const m = this.mains[1];
    this.mainsTendues = n > 0;
    if (n === 0) { m.src = `${IMG}mains/main-ouverte.webp`; m.style.cssText = ''; return; }
    const im = this.tendues[n - 1];
    m.src = im.src;
    // Même échelle que la main de départ (890 px de large à min(44vw, 64vh)), avant-bras qui sort du coin bas-droit.
    const f = Math.min(0.44 * this.hote.clientWidth, 0.64 * this.hote.clientHeight) / 890;
    m.style.width = `${((im.naturalWidth || 770) * f).toFixed(0)}px`;
    m.style.left = 'auto'; m.style.right = '-1%'; m.style.bottom = '-15%'; // plus bas : la main tendue n'est plus coupée
  }

  /** Un appui sur le bouton : la barre se remplit, la scène tremble ; à la fin, les yeux se ferment. */
  private accrocher() {
    if (this.mode !== 'chute') return;
    this.coups += 1; // un appui ne fait bouger que la barre et le bouton : ni zoom ni secousse
    son.jouer('compte_tick', 0.7, 0.85 + this.coups * 0.07); son.coeur(70 + this.coups * 14); son.vent(0.4 + this.coups * 0.04, 0.4); son.tension(Math.min(1, 0.4 + this.coups * 0.08), 0.6);
    if (this.coups === 3) this.mainsPose(1);
    if (this.coups >= COUPS_POUR_SACCROCHER) { this.mainsPose(2); gsap.delayedCall(0.25, () => this.mainsPose(3)); }
    this.barre.style.width = `${Math.min(100, (this.coups / COUPS_POUR_SACCROCHER) * 100)}%`;
    gsap.fromTo(this.boutonOrbe, { scale: 1.12 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
    if (this.coups >= COUPS_POUR_SACCROCHER) this.croire();
  }

  /** Barre pleine : six images enchaînées vite (il tombe, le dragon le rattrape, il monte dessus), puis les yeux s'ouvrent sur le vol. */
  private croire() {
    this.orbeUi.classList.remove('visible'); son.coeur(0); son.tension(0, 1.5); son.jouer('ui_clic', 0.55, 0.65); // la barre est pleine : un simple coup sourd, sans fanfare
    const tl = gsap.timeline({ delay: 0.4 }); // le temps de voir le bras tendu
    // Animation fluide : chaque image se fond dans la suivante (fondu long, pas de coupe) pendant qu'un lent zoom avec dérive donne le mouvement de la chute et de la prise.
    const PAS = 0.4, FONDU = 0; // une case toutes les 0,4 s
    // Page de manga : les six images arrivent chacune dans sa case, en glissant depuis le côté (colonne de gauche depuis la gauche, colonne de droite depuis la droite), toutes les 0,2 s.
    this.cases.forEach((cs, k) => {
      const t = k * PAS, gauche = k % 2 === 0, im = this.images[k];
      tl.set(cs, { opacity: 0, xPercent: gauche ? -115 : 115, zIndex: k + 1 }, 0).set(im, { scale: 1.18 }, 0)
        .to(cs, { opacity: 1, xPercent: 0, duration: 0.3, ease: 'power3.out' }, t)
        .to(im, { scale: 1.0, duration: 0.9, ease: 'power2.out' }, t)
        .call(() => son.whoosh(k % 2 === 0 ? 1 : -1, 0.9), undefined, t + 0.01); // un balayage de vent à chaque case, dans le sens où elle glisse
    });
    const FIN = this.images.length * PAS + 0.3;
    const T = (this.cases.length - 1) * PAS + 0.22; // fin de la pause sur la dernière case
    tl.set(this.anim, { opacity: 1, display: 'block' }, 0)
      .set(this.noir, { display: 'block', opacity: 0 }, T).to(this.noir, { opacity: 1, duration: 0.4, ease: 'none' }, T) // fondu au noir de 0,4 s
      .call(() => {
        this.noir.style.display = 'none'; this.yeux.classList.add('ferme'); this.anim.style.display = 'none'; 
        this.mode = 'vol'; this.grpChute.visible = false; this.sol(); this.grpVol.visible = true; this.fond.visible = true; this.camera.fov = 72; this.camera.updateProjectionMatrix();
        this.mains.forEach((m) => { m.style.display = 'none'; }); if (DRAGON_MODE === 'marionnette') { this.mario.style.display = 'block'; this.miseEnPageMario(); } else if (DRAGON_MODE === 'images') this.vue.style.display = 'block'; this.dragonSp.visible = false; this.hote.classList.remove('v2-chute'); this.hote.classList.add('v2-vol');
      }, undefined, T + 0.4)
      .call(() => this.ouvrirYeux(), undefined, T + 0.45);
  }

  /** Après l'animation : écran noir, puis les yeux s'ouvrent sur le vol (clignement puis ouverture complète), sans éclair blanc. */
  private ouvrirYeux() {
    gsap.set(this.yeux, { '--rx': '130%', '--ry': '0.5%' });
    this.yeux.classList.remove('ferme');
    this.yeux.style.display = 'block';
    son.vent(0, 1.5); son.musique('menu', 0.3, 3); // le vol : pas de vent, on explore
    gsap.timeline()
      .to(this.yeux, { '--ry': '20%', duration: 0.4, ease: 'power1.out' })
      .to(this.yeux, { '--ry': '2%', duration: 0.2, ease: 'power1.in' })
      .to(this.yeux, { '--rx': '210%', '--ry': '175%', duration: 1.1, ease: 'power3.out' })
      .call(() => { this.resolvePret?.(); this.resolvePret = null; });
  }

  /** Les yeux se rouvrent avec un éclair de magie : on est sur le dos du dragon. */
  private reveil() {
    gsap.set(this.yeux, { '--rx': '130%', '--ry': '0.5%' });
    this.yeux.classList.remove('ferme');
    const tl = gsap.timeline();
    tl.call(() => { this.magie.classList.remove('eclate'); void this.magie.offsetWidth; this.magie.classList.add('eclate'); })
      .set(this.magie, { opacity: 0.55, scale: 0.15 })
      .to(this.yeux, { '--ry': '20%', duration: 0.5, ease: 'power1.out' })
      .to(this.yeux, { '--ry': '2%', duration: 0.25, ease: 'power1.in' })
      .to(this.yeux, { '--rx': '210%', '--ry': '175%', duration: 1.5, ease: 'power3.out' })
      .to(this.magie, { scale: 2.4, opacity: 0, duration: 1.1, ease: 'power2.out' }, '<')
      .fromTo(this.flash, { opacity: 0.6 }, { opacity: 0, duration: 1.0, ease: 'power2.out' }, '<')
      .call(() => { this.resolvePret?.(); this.resolvePret = null; });
  }

  /** Cinématique finale devant le portail noir : le dragon plonge, la scène tremble, éclair blanc. Se résout quand l'écran est blanc. */
  cinematique(): Promise<void> {
    return new Promise((resolve) => {
      // La caméra traverse le portail noir : il grossit jusqu'à remplir l'écran (c'est ton dessin), on le franchit, puis seulement l'écran devient noir.
      son.jouer('chute', 0.8, 0.9); son.vent(0.6, 2); son.musique(null, 0, 2); son.tension(0.8, 1); son.coeur(100); // la musique s'éteint, la tension revient avec le vent
      window.setTimeout(() => son.aspire(1.3), 1000); // on entre dans le portail : il aspire
      this.noir.style.display = 'block'; gsap.set(this.noir, { opacity: 0 });
      gsap.to(this, { plongee: 1, duration: 2.6, ease: 'power2.in' });
      gsap.to(this, { secousse: 1.4, duration: 2.4, ease: 'power1.in' });
      gsap.to(this.noir, { opacity: 1, duration: 0.45, delay: 2.15, ease: 'power1.in', onComplete: () => resolve() });
    });
  }
  /** Après l'éclair : la 3D disparaît derrière le blanc, qui se dissipe sur la scène 2D (le bandeau se brise ensuite). */
  fondreVers2D(): Promise<void> {
    this.canvas.style.display = 'none';
    return new Promise((resolve) => { gsap.to(this.flash, { opacity: 0, duration: 1.0, ease: 'power1.out', onComplete: () => { this.masquer(); this.canvas.style.display = ''; resolve(); } }); });
  }

  /** Après un passage par le puits (retour de la phase 2) : on retrouve le chemin tel qu'il était. */
  private restaurerVol() {
    if (this.mode !== 'puits') return;
    this.mode = 'vol'; this.grpPuits.visible = false; this.grpVol.visible = true; this.fond.visible = true; this.mer.visible = true;
    this.scene.fog = new THREE.Fog(0xf9d3e3, 90, 700); this.renderer.setClearColor(0xf8d4e2, 1); this.camera.fov = 72; this.camera.updateProjectionMatrix();
    this.mains.forEach((mm) => { mm.style.display = 'none'; }); this.hote.classList.remove('v2-chute'); this.plongee = 0;
  }
  masquer() { this.noir.style.display = 'none'; this.actif = false; cancelAnimationFrame(this.boucle); this.racine.style.display = 'none'; }
  afficher() { if (this.mode === 'ferme') return; this.restaurerVol(); this.noir.style.display = 'none'; this.actif = true; this.racine.style.display = 'block'; this.plongee = 0; this.secousse = 0; gsap.set(this.flash, { opacity: 0 }); this.tPrec = performance.now(); this.boucle = requestAnimationFrame(this.tic); }

  /** Côté du portail i : -1 gauche, 1 droite, 0 au centre. */
  coteStation(i: number) { return this.cotes[i] ?? 0; }

  /** Position écran (px dans la scène) du haut de la station i ; `visible` est faux si elle est derrière nous ou trop près. */
  projeter(i: number) {
    const s = this.stations[i];
    const v = new THREE.Vector3(s.x, s.yHaut, s.z);
    const profondeur = -v.clone().applyMatrix4(this.camera.matrixWorldInverse).z;
    v.project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.hote.clientWidth, haut: (-v.y * 0.5 + 0.5) * this.hote.clientHeight, visible: profondeur > 6 };
  }

  /** Décor de roche : les cinq modèles Poly Haven (CC0), allégés dans Blender, plantés dans le sol. Les falaises et flancs de montagne bordent le ciel de chaque côté, des piliers de roche
   *  sont posés en quinconce de part et d'autre de la route : le dragon slalome entre eux. Rien ne flotte. Aucun bloc ne passe à moins de MARGE de la trace du dragon et de la caméra
   *  (testé sur 27 points du volume de chaque bloc : trop près, il est repoussé vers l'extérieur, sinon retiré). */
  private construireRelief() {
    if (STYLE_ROCHE === 'grotte') { this.reliefGrotte(); return; }
    const r = hasard(4242), L = LONGUEUR_VOL, BAS = -66, MARGE = 24;
    const mobile = window.matchMedia('(max-width: 800px)').matches;
    const prochePortail = (p: number, d = 0.045) => POSITIONS_PORTAILS.some((q) => Math.abs(q - p) < d);
    const cotePortail = (p: number) => { let c = 0, dmin = 0.05; POSITIONS_PORTAILS.forEach((q, i) => { if (Math.abs(q - p) < dmin) { dmin = Math.abs(q - p); c = this.cotes[i]; } }); return c; };

    // Trace du dragon et de la caméra.
    const trace: THREE.Vector3[] = [];
    for (let z = 40; z > -L - 60; z -= 1.8) {
      const p = Math.min(1, Math.max(0, -z / L)), x = this.xChemin(p), y = this.yChemin(p), zz = -p * L;
      trace.push(new THREE.Vector3(x, y, zz), new THREE.Vector3(x * 0.8, y + 2.5, zz + 12.5));
    }
    const grille: THREE.Vector3[] = [];
    for (let a = -1; a <= 1; a++) for (let b = 0; b <= 2; b++) for (let c = -1; c <= 1; c++) grille.push(new THREE.Vector3(a, b / 2, c)); // 27 points de la boîte (b : 0 = base, 1 = sommet)
    const pt = new THREE.Vector3();
    interface Inst { id: string; x: number; z: number; ry: number; s: number }
    const insts: Inst[] = [];
    const ids = Object.keys(this.assets);
    const boite = (i: Inst) => {
      const a = this.assets[i.id]; return { w: a.l * i.s, h: a.h * i.s, d: a.p * i.s };
    };
    // Distance exacte entre un point et la boîte orientée du modèle (jamais plus approximative qu'un échantillonnage).
    const distMin = (i: Inst) => {
      const { w, h, d } = boite(i);
      const c = Math.cos(i.ry), sn = Math.sin(i.ry), bas = BAS - 4, haut = bas + h;
      const rayon = Math.max(w, d) * 0.75 + h * 0.2;
      let m = 1e9;
      for (const t of trace) {
        if (Math.abs(t.z - i.z) > rayon + MARGE + 10 && Math.abs(t.x - i.x) > rayon + MARGE + 10) continue;
        const dx = t.x - i.x, dz = t.z - i.z;
        const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
        const ex = Math.max(Math.abs(lx) - w / 2, 0), ez = Math.max(Math.abs(lz) - d / 2, 0), ey = Math.max(t.y - haut, bas - t.y, 0);
        m = Math.min(m, Math.hypot(ex, ey, ez));
      }
      return m;
    };
    const place = (id: string, x: number, z: number, haut: number) => {
      const a = this.assets[id];
      const inst: Inst = { id, x, z, ry: r() * Math.PI * 2, s: haut / a.h };
      const p = Math.min(1, Math.max(0, -z / L)), centre = this.xChemin(p), sens = Math.sign(x - centre) || 1;
      for (let k = 0; k < 10; k++) { if (distMin(inst) >= MARGE) { insts.push(inst); return true; } inst.x += sens * 4; }
      return false;
    };
    const choisir = (l: string[]) => l[Math.floor(r() * l.length)];
    const grands = ['mountainside', 'namaqualand_cliff_02', 'namaqualand_cliff_01'];
    const moyens = ['rock_face_01', 'rock_face_02', 'namaqualand_cliff_01'];

    // Rang lointain : flancs de montagne et grandes falaises, de chaque côté.
    for (let z = 20; z > -L - 40; z -= mobile ? 150 : 100) {
      for (const cote of [-1, 1]) {
        const zz = z - r() * 40, p = Math.min(1, Math.max(0, -zz / L));
        const portail = cotePortail(p);
        place(choisir(grands), this.xChemin(p) + cote * (95 + r() * 55 + (portail === cote ? 30 : 0)), zz, 110 + r() * 80);
      }
    }
    // Rang proche : falaises et rochers, en quinconce (jamais face à face), plus loin du côté des portails.
    let cote = 1;
    for (let z = -30; z > -L - 30; z -= mobile ? 110 : 75) {
      cote = -cote;
      const zz = z - r() * 20, p = Math.min(1, Math.max(0, -zz / L)), portail = cotePortail(p);
      const lat = 40 + r() * 16 + (portail === cote ? 28 : 0);
      if (!prochePortail(p, 0.03) || portail !== cote) place(choisir(moyens.concat(grands)), this.xChemin(p) + cote * lat, zz, 52 + r() * 36);
    }
    // Piliers de roche, du côté opposé au dernier : le dragon passe d'un côté à l'autre pour les contourner.
    cote = -1;
    for (let z = -60; z > -L; z -= mobile ? 120 : 90) {
      cote = -cote;
      const zz = z - r() * 25, p = Math.min(1, Math.max(0, -zz / L));
      if (prochePortail(p, 0.04)) continue;
      place(choisir(['rock_face_02', 'rock_face_01']), this.xChemin(p) + cote * (27 + r() * 6), zz, 34 + r() * 20);
    }

    // Un maillage instancié par modèle.
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const id of ids) {
      const liste = insts.filter((i) => i.id === id);
      if (!liste.length) continue;
      const a = this.assets[id];
      const im = new THREE.InstancedMesh(a.geo, a.mat, liste.length);
      liste.forEach((i, k) => { e.set(0, i.ry, 0); q.setFromEuler(e); pos.set(i.x, BAS - 4, i.z); sc.set(i.s, i.s, i.s); m.compose(pos, q, sc); im.setMatrixAt(k, m); });
      im.frustumCulled = false;
      this.grpVol.add(im);
    }
    // Montagnes peintes tout au fond, derrière le décor.
    const peintes = [1, 2, 3, 4, 19];
    for (let i = 0; i < 24; i++) {
      const c = r() < 0.5 ? -1 : 1, hh = 170 + r() * 200, nom = `montagne-${peintes[Math.floor(r() * peintes.length)]}`;
      const img = this.tex[nom].image as { width: number; height: number };
      const s = this.fabrique(nom, hh * img.width / img.height, 0);
      s.position.set(c * (260 + r() * 200), BAS - 60, 60 - r() * (L + 300)); (s.material as THREE.SpriteMaterial).opacity = 0.9; this.grpVol.add(s);
    }
    console.info(`[V2] relief : ${insts.length} modèles Poly Haven placés (marge ${MARGE})`);
  }

  /** Rochers de la phase 2 : les mêmes blocs que la grotte (icosaèdres aux angles vifs, `break/roche.webp`, teinte lilas, ombrage facetté), en parois continues de chaque côté de la route,
   *  plantées dans le sol, avec des ponts de pierre reliés aux deux parois. Marge de sécurité : aucun bloc à moins de MARGE du dragon ni de la caméra. */
  private reliefGrotte() {
    const r = hasard(2026), L = LONGUEUR_VOL, BAS = -66, MARGE = 30;
    const mobile = window.matchMedia('(max-width: 800px)').matches;
    const blocs: { p: THREE.Vector3; s: number; rot: THREE.Euler; v: number; pont: boolean }[] = [];
    const prochePortail = (p: number, d = 0.045) => POSITIONS_PORTAILS.some((q) => Math.abs(q - p) < d);
    const clairiere = (p: number, cote: number) => {
      let w = 0;
      POSITIONS_PORTAILS.forEach((q, i) => { const c = this.cotes[i], t = Math.max(0, 1 - Math.abs(p - q) / 0.05), e = t * t * (3 - 2 * t); w = Math.max(w, e * (c === 0 ? 0.6 : (c === cote ? 1 : 0.35))); });
      return w;
    };
    const trace: THREE.Vector3[] = [];
    for (let z = 40; z > -L - 60; z -= 1.8) {
      const p = Math.min(1, Math.max(0, -z / L)), x = this.xChemin(p), y = this.yChemin(p), zz = -p * L;
      trace.push(new THREE.Vector3(x, y, zz), new THREE.Vector3(x * 0.8, y + 2.5, zz + 12.5));
    }
    const bloc = (x: number, y: number, z: number, s: number, pont = false) => blocs.push({ p: new THREE.Vector3(x, y, z), s, rot: new THREE.Euler(r() * 3, r() * 3, r() * 3), v: 0.45 + r() * 0.5, pont });
    const pas = mobile ? 11 : 7.5, n = Math.ceil(L / pas);
    for (let i = 1; i < n; i++) {
      const p = i / n, z = -p * L, x = this.xChemin(p), y = this.yChemin(p);
      const pont = i % 12 === 6 && !prochePortail(p, 0.05);
      for (const cote of [-1, 1]) {
        const cl = clairiere(p, cote), interieur = 34 + 8 * (0.5 + 0.5 * Math.sin(p * 41 + cote * 1.7)) + cl * 22;
        const sommet = y + (pont ? 38 : 12 + r() * 30 - cl * 14);
        // Colonne de blocs : gros en bas (enfoncés dans le sol), plus petits en haut.
        for (let h = BAS - 4; h < sommet; h += 8 + r() * 5) {
          const t = (h - BAS) / (sommet - BAS + 1), s = 12 - 6 * t + r() * 4;
          bloc(x + cote * (interieur + s * 0.55 + r() * 5), h, z + (r() - 0.5) * pas * 0.9, s);
        }
        if (i % 2 === 0) for (let h = BAS; h < sommet + 18; h += 16) bloc(x + cote * (interieur + 22 + r() * 8), h + r() * 6, z + (r() - 0.5) * pas, 17 + r() * 6); // second rang
      }
      if (pont) for (let k = -5; k <= 5; k++) bloc(x + (k / 5) * 31, y + 29 + (1 - Math.abs(k) / 5) * 3, z, 6.5 + r() * 1.5, true);
    }
    const sphere = (b: { p: THREE.Vector3; s: number }) => {
      let m = 1e9; const ray = b.s * 1.2;
      for (const t of trace) { if (Math.abs(t.z - b.p.z) > ray + MARGE + 4) continue; m = Math.min(m, t.distanceTo(b.p) - ray); }
      return m;
    };
    const gardes = blocs.filter((b) => {
      if (sphere(b) >= MARGE) return true;
      if (b.pont) return false;
      const sens = Math.sign(b.p.x - this.xChemin(Math.min(1, Math.max(0, -b.p.z / L)))) || 1;
      for (let t = 0; t < 8; t++) { b.p.x += sens * 3; if (sphere(b) >= MARGE) return true; }
      return false;
    });
    // Même matériau que la grotte (texture `break/roche.webp`, lilas, facettes). La teinte est éclaircie : on est en plein jour, pas à la lueur d'une torche.
    const mat = new THREE.MeshStandardMaterial({ map: this.tex['grotte-roche'], color: 0xb8a8e8, roughness: 0.92, flatShading: true, emissive: 0x7a68aa, emissiveIntensity: 0.5 });
    const rochers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, gardes.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), sc = new THREE.Vector3();
    gardes.forEach((b, i) => {
      q.setFromEuler(b.rot); sc.set(b.s, b.s * (0.8 + r() * 0.5), b.s); m.compose(b.p, q, sc); rochers.setMatrixAt(i, m);
      col.setRGB(b.v * 3.2, b.v * 3.2 * 0.88, b.v * 3.2 * 1.12); rochers.setColorAt(i, col);
    });
    rochers.frustumCulled = false;
    this.grpVol.add(rochers);
    console.info(`[V2] relief grotte : ${gardes.length}/${blocs.length} blocs (marge ${MARGE})`);
  }

  /** Poussière en suspension autour de la caméra, très peu opaque : de petits grains clairs qui dérivent lentement et défilent quand on avance. */
  private construirePoussiere() {
    const N = 260, r = hasard(5);
    this.poussierePos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) this.poussierePos.set([(r() - 0.5) * 70, (r() - 0.5) * 36, -r() * 90 + 20], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.poussierePos, 3));
    this.poussiere = new THREE.Points(g, new THREE.PointsMaterial({ map: this.disque(), color: 0xfff4e0, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.34, depthWrite: false, fog: false }));
    this.poussiere.frustumCulled = false; this.poussiere.visible = false; this.scene.add(this.poussiere);
  }

  /** Le puits : on est tombé à travers le portail noir. Un long tube de roche violette et de cristaux qui brillent, des éclats qui filent, une lumière violette tout en bas qui grossit. */
  private construirePuits() {
    const r = hasard(1313), LONG = 1100, RAYON = 15;
    this.grpPuits.visible = false; this.scene.add(this.grpPuits);
    // Parois : blocs de roche (même géométrie et même texture que la grotte) disposés en anneaux sur toute la hauteur.
    const blocs: { p: THREE.Vector3; s: number; rot: THREE.Euler; v: number }[] = [];
    for (let y = 20; y > -LONG; y -= 3.2) {
      const n = 9 + Math.floor(r() * 3), dec = r() * 6.28;
      for (let k = 0; k < n; k++) {
        const a = dec + (k / n) * Math.PI * 2 + (r() - 0.5) * 0.25, rr = RAYON + r() * 5 + Math.sin(y * 0.04 + a * 2) * 2.5;
        blocs.push({ p: new THREE.Vector3(Math.cos(a) * rr, y + (r() - 0.5) * 2, Math.sin(a) * rr), s: 3.2 + r() * 3.4, rot: new THREE.Euler(r() * 3, r() * 3, r() * 3), v: 0.4 + r() * 0.5 });
      }
    }
    const mat = new THREE.MeshStandardMaterial({ map: this.tex['grotte-roche'], color: 0xb8a8e8, roughness: 0.92, flatShading: true });
    const rocs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, blocs.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), sc = new THREE.Vector3();
    blocs.forEach((b, i) => { q.setFromEuler(b.rot); sc.set(b.s, b.s * 1.2, b.s); m.compose(b.p, q, sc); rocs.setMatrixAt(i, m); c.setRGB(b.v, b.v * 0.85, b.v * 1.15); rocs.setColorAt(i, c); });
    rocs.frustumCulled = false; this.grpPuits.add(rocs);
    // Cristaux violets lumineux plantés dans les parois, pointe vers l'intérieur.
    const NC = 260, cm = new THREE.MeshBasicMaterial({ color: 0xc9a4ff });
    this.puitsCrist = new THREE.InstancedMesh(new THREE.ConeGeometry(0.7, 3.4, 6), cm, NC);
    for (let i = 0; i < NC; i++) {
      const y = 10 - r() * (LONG - 40), a = r() * 6.28, rr = RAYON - 1.2, up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(-Math.cos(a), 0.3 * (r() - 0.5), -Math.sin(a)).normalize();
      q.setFromUnitVectors(up, dir); const k = 0.6 + r() * 1.1; sc.set(k, k, k); m.compose(new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr), q, sc); this.puitsCrist.setMatrixAt(i, m);
    }
    this.puitsCrist.frustumCulled = false; this.grpPuits.add(this.puitsCrist);
    // Éclats de pierre et de verre qui filent autour de nous.
    const ND = 160; this.puitsDebris = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0x9d7be8 }), ND);
    for (let i = 0; i < ND; i++) { const a = r() * 6.28, rr = 2 + r() * (RAYON - 5); this.debris.push({ x: Math.cos(a) * rr, y: -r() * 400, z: Math.sin(a) * rr, s: 0.18 + r() * 0.6, v: 10 + r() * 30, r: r() * 6.28 }); }
    this.puitsDebris.frustumCulled = false; this.grpPuits.add(this.puitsDebris);
    // La lumière tout en bas, qui grossit quand on approche.
    this.puitsLueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.disque(), color: 0xa57cff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.puitsLueur.position.set(0, -LONG + 20, 0); this.puitsLueur.scale.set(120, 120, 1); this.grpPuits.add(this.puitsLueur);
    this.puitsLum = new THREE.PointLight(0xcdb8ff, 2600, 120, 1.5); this.grpPuits.add(new THREE.AmbientLight(0x6a58a8, 0.7)); this.grpPuits.add(this.puitsLum);
  }

  /** Chute dans le puits, à travers les yeux du personnage : ses mains devant lui, des parois qui défilent de plus en plus vite, la lumière violette qui grossit. Se résout sur un éclair blanc. */
  puits(): Promise<void> {
    return new Promise((resolve) => {
      this.mode = 'puits'; this.tPuits = 0; this.profondeur = 0; this.resolvePuits = resolve;
      this.grpVol.visible = false; this.fond.visible = false; this.mer.visible = false; this.grpChute.visible = false; this.grpPuits.visible = true;
      this.scene.fog = new THREE.Fog(0x05000f, 6, 170); this.renderer.setClearColor(0x05000f, 1);
      this.camera.fov = 84; this.camera.updateProjectionMatrix();
      this.mains.forEach((mm) => { mm.style.display = 'block'; }); this.mainsPose(0);
      this.hote.classList.add('v2-chute'); // masque l'interface du chemin
      gsap.to(this.noir, { opacity: 0, duration: 0.7, ease: 'power1.out', onComplete: () => { this.noir.style.display = 'none'; } });
      gsap.set(this.flash, { opacity: 0 });
    });
  }

  private imagePuits(dt: number) {
    this.tPuits += dt; const t = this.tPuits, u = Math.min(1, t / DUREE_PUITS);
    const vit = 60 + 260 * u * u; this.profondeur += vit * dt;
    const sx = Math.sin(t * 47) * 0.04 * (0.4 + u), sy = Math.cos(t * 53) * 0.04 * (0.4 + u);
    this.camera.position.set(sx, -this.profondeur, sy);
    this.camera.rotation.set(-Math.PI / 2 + Math.sin(t * 0.9) * 0.05, 0, t * 0.35 + Math.sin(t * 1.7) * 0.06, 'YXZ'); // le puits tourne lentement : spirale de la chute
    this.puitsLum.position.set(0, -this.profondeur - 4, 0); // la lumière descend avec nous, comme la torche de la grotte
    const k = 120 + 520 * Math.pow(u, 3); this.puitsLueur.scale.set(k, k, 1);
    (this.puitsLueur.material as THREE.SpriteMaterial).opacity = 0.55 + 0.45 * u;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    this.debris.forEach((d, i) => { // les éclats remontent par rapport à nous et rebouclent plus bas
      d.y += d.v * dt;
      if (d.y + this.profondeur > 40) d.y -= 300;
      e.set(d.r + t, d.r * 2 + t * 1.3, 0); q.setFromEuler(e); p.set(d.x, d.y, d.z); sc.set(d.s, d.s * 1.6, d.s); m.compose(p, q, sc); this.puitsDebris!.setMatrixAt(i, m);
    });
    this.puitsDebris!.instanceMatrix.needsUpdate = true;
    // Mains : elles tremblent de plus en plus.
    this.mains.forEach((mm, i) => { const s = i ? -1 : 1, tr = Math.sin(t * 9 + i * 2) * 5 * (0.4 + u); mm.style.transform = `scaleX(${s}) translate(${tr.toFixed(1)}px, ${(Math.cos(t * 7 + i) * 4 - u * 20).toFixed(1)}px) rotate(${(Math.sin(t * 5 + i) * 3).toFixed(1)}deg)`; });
    if (t > DUREE_PUITS - 0.7) gsap.set(this.flash, { opacity: Math.min(1, (t - DUREE_PUITS + 0.7) / 0.7) });
    if (t >= DUREE_PUITS && this.resolvePuits) { const rr = this.resolvePuits; this.resolvePuits = null; rr(); }
  }

  /** Poids du détour : 0 près d'un portail (le dragon y suit son couloir), 1 entre deux. */
  private libre(p: number) {
    const d = Math.min(...POSITIONS_PORTAILS.map((q) => Math.abs(q - p)));
    const t = Math.min(1, Math.max(0, (d - 0.012) / 0.025));
    return t * t * (3 - 2 * t);
  }
  /** Hauteur du dragon : il monte et descend entre les portails. */
  private yChemin(p: number) {
    return 6 + this.libre(p) * (4.2 * Math.sin(p * 46) + 2.2 * Math.sin(p * 113));
  }

  /** Abscisse du dragon le long du chemin : il passe du côté opposé au portail, en ondulant. */
  private xChemin(p: number) {
    const pts = [0, ...POSITIONS_PORTAILS], xs = [0, ...this.cotes.map((c) => -c * DECALAGE_DRAGON)];
    let k = 0; while (k < pts.length - 2 && p > pts[k + 1]) k++;
    const t = Math.min(1, Math.max(0, (p - pts[k]) / (pts[k + 1] - pts[k])));
    const u = (1 - Math.cos(t * Math.PI)) / 2;
    return xs[k] + (xs[k + 1] - xs[k]) * u + this.libre(p) * (2.2 * Math.sin(p * 30) + 8 * Math.sin(p * 13));
  }

  // ---------- Image
  private tic = (t: number) => {
    if (!this.actif) return;
    const dt = Math.min(0.05, (t - this.tPrec) / 1000); this.tPrec = t; this.temps += dt;
    this.image(dt);
    this.boucle = requestAnimationFrame(this.tic);
  };

  private image(dt: number) {
    const tm = this.temps;
    this.secousse = Math.max(0, this.secousse - dt * 2.2);
    this.zoom = Math.max(0, this.zoom - dt * 2.4);
    const fov = 72 + this.zoom * 9 + (this.mode === 'vol' ? this.plongee * 34 : Math.min(1, this.tChute / 22) * 6);
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    const sx = (Math.sin(tm * 61) + Math.sin(tm * 97)) * 0.12 * this.secousse, sy = (Math.cos(tm * 73) + Math.sin(tm * 111)) * 0.1 * this.secousse;
    for (const m of this.portails) m.uniforms.t.value = tm;
    if (this.mode !== 'vol') this.poussiere.visible = false;
    if (this.mode === 'puits') { this.imagePuits(dt); this.renderer.render(this.scene, this.camera); return; }
    if (this.eauMat && this.eauMat.map) { this.eauMat.map.offset.y = (tm * 0.03) % 1; this.eauMat.map.offset.x = (tm * 0.012) % 1; } // l'eau coule doucement
    for (const f of this.portailsFx) {
      const aspire = 1 + 0.045 * Math.sin(tm * 2.2 + f.phase); // l'intérieur « respire » comme s'il aspirait
      const lv = f.base * 0.92 * aspire;
      f.vortex.scale.set(lv, lv * (1 + 0.03 * Math.sin(tm * 3.1 + f.phase)), 1); (f.vortex.material as THREE.SpriteMaterial).rotation = -tm * 0.9 + f.phase; // spirale vers le centre
      const lh = f.base * (1.5 + 0.1 * Math.sin(tm * 1.7 + f.phase)); f.anneau.scale.set(lh, lh * (1 - 0.04 * Math.sin(tm * 2.3 + f.phase)), 1);
      (f.anneau.material as THREE.SpriteMaterial).rotation = tm * 0.5 + f.phase; // le halo flou tourne en sens inverse : distorsion
      const ll = f.base * (2.1 + 0.2 * Math.sin(tm * 1.1 + f.phase)); f.lueur.scale.set(ll, ll, 1); (f.lueur.material as THREE.SpriteMaterial).rotation = -tm * 0.25;
    }

    if (this.mode !== 'vol') {
      // Chute : on tombe la tête en avant, le regard vers le bas ; le monde monte autour de nous et la mer grandit au fond.
      this.tChute += dt;
      const v = 78;
      for (const n of this.flottants) {
        n.y += v * dt; n.x += n.vx * dt; n.z += n.vz * dt;
        if (n.y > 60) { n.y -= 400; n.x = n.x0; n.z = n.z0; }
        n.sp.position.set(n.x, n.y, n.z);
        if (n.bat) n.sp.scale.x = n.base * (0.8 + 0.2 * Math.sin(tm * 11 + n.x));
      }
      if (this.sauveurT >= 0) { // le grand dragon vient se placer à côté de nous
        this.sauveurT += dt;
        const k = Math.min(1, this.sauveurT / 3.4), e = 1 - Math.pow(1 - k, 3);
        this.sauveur.position.set(70 + (12 - 70) * e + Math.sin(tm * 1.3) * 1.2, -48 + Math.sin(tm * 1.1) * 1.5, 8 + Math.sin(tm * 0.9) * 1.5);
        (this.sauveur.material as THREE.SpriteMaterial).rotation = -0.18 * (1 - e) + Math.sin(tm * 0.8) * 0.03;
        this.sauveur.scale.x = 34 * (1 + 0.04 * Math.sin(tm * 6));
      }
      if (!this.solVol) {
        this.mer.position.y = -430 + Math.min(1, this.tChute / 22) * 290; // on s'en approche : l'image grandit
        this.mer.rotation.z = tm * 0.04; // et tourne lentement, comme le tourbillon de l'archipel
      }
      const lp = this.lignes.geometry.getAttribute('position') as THREE.BufferAttribute;
      this.lignesDonnees.forEach((l, i) => { l.y += v * l.v * 1.6 * dt; if (l.y > 70) l.y -= 140; lp.setXYZ(i * 2, l.x, l.y, l.z); lp.setXYZ(i * 2 + 1, l.x, l.y - l.l, l.z); });
      lp.needsUpdate = true;
      for (let i = 0; i < this.etincellesPos.length; i += 3) { this.etincellesPos[i + 1] += v * 1.3 * dt; if (this.etincellesPos[i + 1] > 60) this.etincellesPos[i + 1] -= 100; }
      (this.etincelles.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      this.camera.position.set(sx, sy, 0);
      this.camera.rotation.set(-1.52 + Math.sin(tm * 0.9) * 0.03, Math.sin(tm * 0.6) * 0.08, Math.sin(tm * 1.1) * 0.06);
      // Mains agitées : provisoire. Écartées et plus bas que l'écran pour ne jamais montrer leur bord coupé.
      this.mains.forEach((m, k) => {
        const s = k ? (this.mainsTendues ? 1 : -1) : 1, ph = k * 1.7;
        const rot = Math.sin(tm * 6.2 + ph) * 8 + Math.sin(tm * 11 + ph) * 3, dx = Math.sin(tm * 4.1 + ph) * 12, dy = Math.abs(Math.sin(tm * 5.3 + ph)) * -16 + Math.sin(tm * 9 + ph) * 4;
        m.style.transform = `scaleX(${s}) translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${(rot * s).toFixed(1)}deg)`;
      });
    } else {
      // Vol : le défilement fait avancer le dragon le long de la route, en slalomant entre les reliefs.
      const p = this.lireP();
      const z = -p * LONGUEUR_VOL, cx = this.xChemin(p), cy = this.yChemin(p);
      if (!this.lisse) { this.lisse = { x: cx, y: cy }; this.dernier = { x: cx, y: cy }; }
      const k = 1 - Math.exp(-dt * 2.6); this.lisse.x += (cx - this.lisse.x) * k; this.lisse.y += (cy - this.lisse.y) * k;
      const x = this.lisse.x, y = this.lisse.y - this.plongee * 18;
      this.vitLat += (((this.lisse.x - this.dernier.x) / Math.max(dt, 0.001)) - this.vitLat) * Math.min(1, dt * 6);
      this.vitVert += (((this.lisse.y - this.dernier.y) / Math.max(dt, 0.001)) - this.vitVert) * Math.min(1, dt * 6);
      this.dernier = { x: this.lisse.x, y: this.lisse.y };
      this.dragon.position.set(x, y, z);
      // Vue à la première personne : le dragon est une image fixée à l'écran (battement d'ailes en boucle) ; la caméra seule avance.
      const dxdpLisse = this.vitLat * 6, dydpLisse = this.vitVert * 6; // vitesses (unités/s) mises à l'échelle des anciennes pentes
      let bob = 0;
      if (DRAGON_MARIONNETTE) {
        // Battement : l'épaule monte et descend, l'avant-bras suit avec un léger retard (comme une vraie aile).
        const w = tm * Math.PI * 2 * 2.3, angle = -4 + 20 * Math.sin(w), raccourci = 1 - 0.07 * (0.5 + 0.5 * Math.sin(w));
        for (const a2 of [this.mAileG, this.mAileD]) a2.aile.style.transform = `rotate(${angle.toFixed(2)}deg) scaleX(${raccourci.toFixed(3)})`;
        bob = -Math.sin(w) * 5;
      } else {
      // Cycle trié par hauteur d'aile (haut → bas → haut) : les images voisines se ressemblent, le fondu devient un vrai mouvement.
        const ORDRE = [0, 5, 4, 2, 1, 3, 1, 2, 4, 5];
        const ph = tm * 13, n = Math.floor(ph) % ORDRE.length, f = ORDRE[n], g = ORDRE[(n + 1) % ORDRE.length], mix = ph - Math.floor(ph);
        const lisseMix = mix * mix * (3 - 2 * mix);
        this.vueImages.forEach((im, i) => { const actif = i === f || i === g; im.style.display = actif ? 'block' : 'none'; im.style.opacity = i === f ? '1' : String(lisseMix); });
        bob = -Math.cos((ph / ORDRE.length) * Math.PI * 2) * 7; // le corps monte quand les ailes descendent
      }
      const incl = Math.max(-5, Math.min(5, -this.vitLat * 0.35));
      const posture = `translateY(${(bob + this.plongee * 55).toFixed(1)}px) rotate(${incl.toFixed(2)}deg)`;
      if (DRAGON_MARIONNETTE) this.mario.style.transform = posture; else this.vue.style.transform = `translateX(-50%) ${posture}`;
      for (const v of this.vie) { // éléments de vie : dérive lente, balancement ; les créatures qui sortent de leur plage reviennent de l'autre côté
        let dx = v.vx * tm; if (v.vx) { const p = v.plage; dx = ((dx + p) % (2 * p) + 2 * p) % (2 * p) - p; }
        v.sp.position.set(v.x0 + dx, v.y0 + Math.sin(tm * 0.9 + v.ph) * v.bob, v.z);
      }
      if (DRAGON_MODE === 'trois') {
        // Vue à la place des yeux du cavalier : le dragon s'incline avec les virages et les montées, la caméra suit.
        const inclinaison = new THREE.Euler(Math.max(-0.2, Math.min(0.2, dydpLisse * 0.004)) - this.plongee * 0.5, -dxdpLisse * 0.003, Math.max(-0.16, Math.min(0.16, -dxdpLisse * 0.005)), 'YXZ');
        const oeil = new THREE.Vector3(x * 0.8 + sx, y + 2.5 + sy - this.plongee * 6, z + 12.5);
        this.dragon3d.groupe.rotation.copy(inclinaison);
        this.dragon3d.groupe.position.copy(oeil).sub(this.dragon3d.siege.clone().applyEuler(inclinaison));
        this.dragon3d.battre(tm * Math.PI * 2 * 1.9, tm);
        this.camera.position.copy(oeil); this.camera.rotation.copy(inclinaison); this.camera.rotateX(-0.12);
      } else {
        // Traversée : la caméra file vers le centre du portail noir et le franchit.
        const zP = this.stations[this.stations.length - 1].z, k = this.plongee * this.plongee;
        // Le dos du dragon, sans le voir : un battement d'ailes lent qui fait monter et descendre la caméra, un léger tangage et un roulis qui respire (s'efface à la traversée).
        const bat = Math.sin(tm * Math.PI * 2 * 1.3), houle = Math.sin(tm * 0.55 + 1.1), vive = 1 - Math.min(1, this.plongee * 2);
        const dy = (bat * 0.42 + houle * 0.3) * vive, tangage = (bat * 0.7 + houle * 0.25) * vive;
        this.camera.position.set((x * 0.8 + sx) * (1 - k), y + 2.5 + sy + dy + (11 - y - 2.5) * k, z + 12.5 + (zP + 0.5 - z - 12.5) * k);
        this.camera.lookAt(x * (1 - k), y + 0.8 + tangage + (11 - y - 0.8) * k, z - 14 + (zP - 30 - z + 14) * k);
        this.camera.rotateZ((Math.sin(tm * 0.8) * 0.012 + bat * 0.004) * vive);
        this.bobPx = ((this.hote.clientHeight / 2) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / 26) * (dy + tangage);
      }
      // Poussière : posée dans le monde autour de nous, qui dérive doucement ; les grains sortis du champ reviennent de l'autre côté.
      this.poussiere.visible = true; this.poussiere.position.set(0, 0, 0);
      { const cp = this.camera.position, P = this.poussierePos;
        for (let i = 0; i < P.length; i += 3) {
          P[i] += Math.sin(tm * 0.4 + i) * 0.5 * dt; P[i + 1] += (0.25 + Math.sin(tm * 0.3 + i * 0.7) * 0.2) * dt;
          P[i] = cp.x + ((((P[i] - cp.x) + 35) % 70) + 70) % 70 - 35;
          P[i + 1] = cp.y + ((((P[i + 1] - cp.y) + 18) % 36) + 36) % 36 - 18;
          P[i + 2] = cp.z + ((((P[i + 2] - cp.z) + 80) % 100) + 100) % 100 - 80;
        }
        (this.poussiere.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true; }
      (this.poussiere.material as THREE.PointsMaterial).opacity = 0.34 * (1 - Math.min(1, this.plongee * 2));
      // Le panorama bouge un peu moins que la route : l'impression de profondeur.
      this.para.x += ((-this.vitLat * 0.9) - this.para.x) * Math.min(1, dt * 2); this.para.y += ((-this.vitVert * 1.4) - this.para.y) * Math.min(1, dt * 2);
      this.fond.position.set(Math.max(-30, Math.min(30, this.para.x)), Math.max(-20, Math.min(20, this.para.y)), -350);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

