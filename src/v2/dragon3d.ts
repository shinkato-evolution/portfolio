// Dragon en 3D construit en code, peint avec les dessins de Tristan : la membrane des ailes est son dessin d'aile (os, nervures, bord festonné, par transparence),
// la peau reprend ses écailles. Il regarde vers -z, le dos vers +y. Proportions : tronc ~16, cou ~10, tête ~4, envergure ~36.
// Le cavalier est assis sur le dos, derrière les ailes : `siege` donne la position de ses yeux dans le repère du dragon.
import * as THREE from 'three';

const IVOIRE = 0xf4e8c9, BLOND = 0xf0e0a4;
const BASE = `${import.meta.env.BASE_URL}sprites/v2/`;

/** Dégradé à trois paliers : l'ombrage « dessin animé » de la grotte. */
function degrade() {
  const t = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}

// L'aile dessinée (mario-aile.webp, 1106 × 1187 px) : points d'ancrage en fractions de l'image (x, y). Le dessin est une aile GAUCHE, épaule en bas à droite, poignet vers le haut.
const IMG_L = 1106, IMG_H = 1187, ECHELLE = 17 / 1028; // unités de scène par pixel (l'aile mesure ~17 de l'épaule au bout du plus long doigt)
const PT = {
  S: [0.929, 0.965], E: [0.716, 0.72], W: [0.95, 0.43],
  T: [[0.136, 0.006], [0.006, 0.29], [0.086, 0.67], [0.32, 0.99]], Mt: [0.6, 0.965],
};
const px = (f: number[]) => [f[0] * IMG_L, f[1] * IMG_H];
/** Position 3D (plan de l'aile : x vers l'extérieur, z vers l'arrière) d'un point du dessin, relative à `ref`. */
function rel(f: number[], ref: number[]) { const [a, b] = px(f), [c, d] = px(ref); return new THREE.Vector3((c - a) * ECHELLE, 0, (b - d) * ECHELLE); }

interface Aile { cote: number; racine: THREE.Object3D; epaule: THREE.Object3D; coude: THREE.Object3D; poignet: THREE.Object3D; doigts: THREE.Object3D[]; pts: THREE.Object3D[]; tris: number[][]; geo: THREE.BufferGeometry }

export class Dragon3D {
  readonly groupe = new THREE.Group();
  /** Position des yeux du cavalier dans le repère du dragon. */
  readonly siege = new THREE.Vector3(0, 5.2, 12.5);
  private ailes: Aile[] = [];
  private crinieres: THREE.Mesh[] = [];
  private grad = degrade();
  private charge = new THREE.TextureLoader();

  constructor() { this.construire(); }

  private texture(nom: string, repete = false) {
    const t = this.charge.load(`${BASE}${nom}`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (repete) { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; }
    return t;
  }
  private toon(couleur: number, extra: THREE.MeshToonMaterialParameters = {}) { return new THREE.MeshToonMaterial({ color: couleur, gradientMap: this.grad, ...extra }); }
  private ajouter(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, parent: THREE.Object3D = this.groupe) {
    const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
  }

  private construire() {
    // Peau : les écailles dessinées, répétées ; la teinte reste turquoise grisé.
    const ecailles = this.texture('dragon-ecailles.webp', true); ecailles.repeat.set(1.6, 1.6);
    const peau = this.toon(0xffffff, { map: ecailles }), ventre = this.toon(0xdff3ee, { map: ecailles }), ivoire = this.toon(IVOIRE), blond = this.toon(BLOND);
    const sphere = new THREE.SphereGeometry(1, 28, 20), cone = new THREE.ConeGeometry(1, 1, 12);

    // Tronc : un grand ellipsoïde ; le cavalier est assis derrière les ailes.
    this.ajouter(sphere, peau, 0, 0, 5.0, 2.1, 1.8, 8.4);
    this.ajouter(sphere, ventre, 0, -0.85, 5.2, 1.75, 1.25, 7.8);

    // Cou : une chaîne de sphères le long d'une courbe, épais à la base, plus fin vers la tête, légèrement relevé.
    const cou = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.5, -1.5), new THREE.Vector3(0, 1.3, -5), new THREE.Vector3(0, 2.4, -8.5), new THREE.Vector3(0, 3.0, -11.5)]);
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = cou.getPoint(t), r = 1.95 - 0.9 * t;
      this.ajouter(sphere, peau, p.x, p.y, p.z, r, r * 0.92, r * 1.2);
      if (i % 2 === 0 && i < N) { const h = 0.8 - 0.4 * t; this.ajouter(cone, ivoire, p.x, p.y + r * 0.92, p.z, 0.44 - 0.14 * t, h, 0.95); } // plaques dorsales ivoire
      if (i % 3 === 0 && i < N) for (const s of [-1, 1]) this.ajouter(cone, ivoire, p.x + s * r * 0.55, p.y + r * 0.75, p.z, 0.2, 0.36 - 0.12 * t, 0.4); // petites pointes de chaque côté
    }
    // Plaques dorsales sur le tronc, jusqu'à l'arrière.
    for (let i = 0; i < 11; i++) { const z = -0.2 + i * 1.4, h = 1.05 - Math.abs(i - 3) * 0.07; this.ajouter(cone, ivoire, 0, 2.05 - i * 0.05, z, 0.52, h, 1.15); }

    // Tête : crâne, museau, cornes à anneaux, nageoires, crinière.
    const tete = cou.getPoint(1);
    this.ajouter(sphere, peau, tete.x, tete.y + 0.1, tete.z - 0.6, 1.3, 1.1, 1.75);
    this.ajouter(sphere, peau, tete.x, tete.y - 0.1, tete.z - 2.7, 0.85, 0.65, 1.8);
    for (const s of [-1, 1]) {
      const corne = this.ajouter(new THREE.ConeGeometry(1, 1, 12, 6), ivoire, tete.x + s * 1.0, tete.y + 0.75, tete.z - 0.2, 0.38, 3.2, 0.38);
      corne.rotation.set(-0.95, 0, -s * 0.5);
      for (let k = 1; k <= 4; k++) { // anneaux de la corne
        const anneau = this.ajouter(new THREE.TorusGeometry(1, 0.12, 6, 14), ivoire, 0, -0.5 + k * 0.2, 0, 0.5 - k * 0.07, 0.5 - k * 0.07, 0.5 - k * 0.07, corne); anneau.rotation.x = Math.PI / 2;
      }
      const aileron = this.ajouter(cone, this.toon(0x7cc7c2), tete.x + s * 1.25, tete.y - 0.1, tete.z - 0.5, 0.2, 1.5, 0.55); aileron.rotation.set(-1.2, 0, -s * 1.15);
    }
    for (let i = 0; i < 9; i++) { // crinière : mèches flottantes le long de la nuque
      const t = 1 - i * 0.06, p = cou.getPoint(Math.max(0, t));
      const m = this.ajouter(cone, blond, p.x, p.y + 1.25 - i * 0.05, p.z + 0.3, 0.34, 2.4 - i * 0.1, 0.12); m.rotation.x = 1.35; this.crinieres.push(m);
    }

    // Ailes : le même dessin, retourné pour l'autre côté.
    const dessin = this.texture('mario-aile.webp');
    for (const cote of [-1, 1]) this.ailes.push(this.construireAile(cote, dessin));
  }

  private construireAile(cote: number, dessin: THREE.Texture): Aile {
    const racine = new THREE.Object3D(); racine.position.set(cote * 1.9, 1.6, 2.2); racine.scale.x = cote; this.groupe.add(racine);
    // Articulations placées d'après le dessin : épaule → coude → poignet, puis les quatre bouts de doigts depuis le poignet.
    const epaule = new THREE.Object3D(); epaule.rotation.order = 'ZYX'; racine.add(epaule); // ZYX : d'abord l'inclinaison, puis le battement autour de l'axe avant
    const coude = new THREE.Object3D(); coude.position.copy(rel(PT.E, PT.S)); epaule.add(coude);
    const poignet = new THREE.Object3D(); poignet.position.copy(rel(PT.W, PT.E)); coude.add(poignet);
    const doigts = PT.T.map((t) => { const d = new THREE.Object3D(); poignet.add(d); const bout = new THREE.Object3D(); bout.position.copy(rel(t, PT.W)); d.add(bout); return d; });
    const mid = (i: number, j: number) => { const o = new THREE.Object3D(); o.position.copy(rel(PT.T[i], PT.W).lerp(rel(PT.T[j], PT.W), 0.5).multiplyScalar(0.8)); poignet.add(o); return o; }; // festons : creux entre deux doigts
    const m01 = mid(0, 1), m12 = mid(1, 2), m23 = mid(2, 3);
    const mt = new THREE.Object3D(); mt.position.copy(rel(PT.Mt, PT.S)); epaule.add(mt);
    // Points de la membrane, avec leur position dans le dessin (UV).
    const pts = [poignet, doigts[0].children[0], m01, doigts[1].children[0], m12, doigts[2].children[0], m23, doigts[3].children[0], mt, epaule, coude];
    const mil = (i: number, j: number) => [(PT.T[i][0] + PT.T[j][0]) / 2 * 0.8 + PT.W[0] * 0.2, (PT.T[i][1] + PT.T[j][1]) / 2 * 0.8 + PT.W[1] * 0.2];
    const uv = [PT.W, PT.T[0], mil(0, 1), PT.T[1], mil(1, 2), PT.T[2], mil(2, 3), PT.T[3], PT.Mt, PT.S, PT.E];
    const tris = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 6], [0, 6, 7], [0, 7, 8], [0, 8, 9], [0, 9, 10]];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris.length * 9), 3));
    const uvs = new Float32Array(tris.length * 6); tris.forEach((t, k) => t.forEach((v, c) => { uvs[k * 6 + c * 2] = uv[v][0]; uvs[k * 6 + c * 2 + 1] = 1 - uv[v][1]; }));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    // alphaTest : le contour, les festons et les trous du dessin viennent de sa transparence.
    const membrane = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: dessin, gradientMap: this.grad, side: THREE.DoubleSide, alphaTest: 0.5, emissive: 0xf0d2b0, emissiveIntensity: 0.12 }));
    membrane.frustumCulled = false; this.groupe.add(membrane);
    return { cote, racine, epaule, coude, poignet, doigts, pts, tris, geo };
  }

  /** Bat des ailes : `w` = phase (radians). L'articulation suit l'épaule avec un retard (coude, poignet, doigts) : l'aile se plie comme une vraie aile. */
  battre(w: number, tm: number) {
    for (const a of this.ailes) {
      a.epaule.rotation.set(0.85, -0.15, -0.28 + 0.4 * Math.sin(w)); // l'aile est inclinée vers le haut (bord d'attaque en l'air) : sa membrane fait face au cavalier
      a.coude.rotation.set(0, 0, -0.32 * Math.sin(w - 0.9));
      a.poignet.rotation.set(0, 0, -0.36 * Math.sin(w - 1.5));
      a.doigts.forEach((d, i) => { d.rotation.z = -0.2 * Math.sin(w - 1.9 - i * 0.3) * (1 + i * 0.25); });
    }
    this.crinieres.forEach((c, i) => { c.rotation.z = Math.sin(tm * 3 + i * 0.7) * 0.18; });
    this.groupe.updateMatrixWorld(true);
    for (const a of this.ailes) this.mettreAJourMembrane(a);
  }

  private mettreAJourMembrane(a: Aile) {
    const pos = a.geo.getAttribute('position') as THREE.BufferAttribute;
    const v = a.pts.map((o) => this.groupe.worldToLocal(o.getWorldPosition(new THREE.Vector3())));
    let n = 0;
    for (const t of a.tris) for (const i of t) pos.setXYZ(n++, v[i].x, v[i].y, v[i].z);
    pos.needsUpdate = true; a.geo.computeVertexNormals();
  }
}
