// Acte 2 — la grotte runique, en première personne. Le défilement fait avancer le long d'un rail ;
// cinq pierres gravées de runes portent les rubriques (Qui je suis ?, Parcours, Outils, Méthode, Contact).
// Les textes sont du HTML par-dessus la 3D (net, lisible, sélectionnable) ; les mains et la torche sont des images.
import * as THREE from 'three';
import donnees from '../content/pierres.json';
import { R_ARRETS } from './arrets';
import { Flamme } from './flamme';
import { dessinerPierre, HAUT, LARG, type Outil } from './visuels';

const IMG = `${import.meta.env.BASE_URL}sprites/`;

interface Section { titre: string; cle?: boolean; p?: string[]; li?: string[]; }
interface PierreDef { id: string; titre: string; p?: string[]; li?: string[]; liens?: { texte: string; href: string }[]; outils?: Outil[]; sections?: Section[]; }
interface Pierre { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; anneau: THREE.Mesh; u: number; def: PierreDef; canevas: HTMLCanvasElement; tex: THREE.CanvasTexture; reveal: number; }

// Position de chaque pierre le long du rail (0..1) et valeur de défilement (r) où l'on s'y arrête.
const U_PIERRES = [0.15, 0.33, 0.52, 0.71, 0.92];
const AVANCE_ARRET = 0.03; // on s'arrête avant la pierre (≈ 5 m) pour la voir en entier

const lisse = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function hasard(graine: number) { let s = graine >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class Grotte {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(68, 1, 0.1, 150);
  private courbe!: THREE.CatmullRomCurve3;
  private longueur = 1;
  private pierres: Pierre[] = [];
  private table: [number, number][] = [];
  private torche = new THREE.PointLight(0xffc98a, 42, 26, 1.7);
  private lumPierre = new THREE.PointLight(0xa06bff, 0, 12, 2);
  private ui = document.createElement('div');
  private panneau = document.createElement('section');
  private torcheMain = document.createElement('div'); private flammeGL = new Flamme(); private flamme: HTMLCanvasElement = this.flammeGL.canvas; private halo = document.createElement('div');
  private yawLisse = 0; private photo: HTMLImageElement | null = null; private logos: Record<string, HTMLImageElement> = {};
  private r = 0; private uLisse = 0; private uPrec = 0; private mouvement = 0;
  private entree = -1; private actif = false;
  private sol!: THREE.Texture; private roche!: THREE.Texture;
  private pierreActive = -1;

  constructor(private hote: HTMLElement, private mobile: boolean) {}

  async init() {
    const chargeur = new THREE.TextureLoader();
    const [roche, sol] = await Promise.all([chargeur.loadAsync(`${IMG}break/roche.webp`), chargeur.loadAsync(`${IMG}break/sol.webp`)]);
    for (const t of [roche, sol]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }
    this.roche = roche; this.sol = sol;
    this.photo = new Image(); this.photo.src = `${IMG}pierres/tristan.webp`;
    await this.photo.decode().catch(() => { /* la photo manquera, le reste s'affiche */ });
    // Logos fournis (images en couleur) pour la pierre des outils.
    const defsOutils = ((donnees.pierres as PierreDef[]).find((x) => x.id === 'outils')?.outils ?? []).filter((x) => x.logo);
    await Promise.all(defsOutils.map(async (x) => { const im = new Image(); im.src = `${IMG}pierres/logos/${x.logo}.webp`; await im.decode().catch(() => { /* logo absent */ }); this.logos[x.logo as string] = im; }));
    this.construire();
    this.interface();
  }

  // ---------- Décor
  private construire() {
    const r = hasard(99);
    this.scene.background = new THREE.Color(0x120a2a);
    this.scene.fog = new THREE.FogExp2(0x160c30, this.mobile ? 0.075 : 0.06);
    this.scene.add(new THREE.AmbientLight(0x7a66c8, 1.5), new THREE.HemisphereLight(0x9a86e6, 0x1a0e34, 0.8));
    this.torche.castShadow = false;
    this.scene.add(this.torche, this.lumPierre);

    // Le rail : une courbe douce de ~165 m.
    this.courbe = new THREE.CatmullRomCurve3([
      [0, 0, 0], [0, 0, -14], [3, 0, -30], [7, 0, -46], [5, 0, -62], [0, 0, -76], [-5, 0, -92], [-6, 0, -108], [-2, 0, -124], [1, 0, -140], [2, 0, -158],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
    this.longueur = this.courbe.getLength();
    const L = this.longueur, pas = 1.2;
    const place = (u: number) => {
      const c = this.courbe.getPointAt(Math.min(1, Math.max(0, u)));
      const T = this.courbe.getTangentAt(Math.min(1, Math.max(0, u)));
      const N = new THREE.Vector3(0, 1, 0).cross(T).normalize(); // vers la gauche
      return { c, T, N };
    };

    // Sol : une bande de dalles le long du rail.
    {
      const n = Math.ceil(L / pas), larg = 7;
      const P: number[] = [], U: number[] = [], I: number[] = [];
      for (let i = 0; i <= n; i++) {
        const { c, N } = place(i / n);
        const y = Math.sin(i * 0.7) * 0.05 + Math.cos(i * 0.31) * 0.05;
        P.push(c.x + N.x * larg, y, c.z + N.z * larg, c.x - N.x * larg, y, c.z - N.z * larg);
        U.push(0, i * pas / 4, 3.5, i * pas / 4);
        if (i < n) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      g.setIndex(I); g.computeVertexNormals();
      this.scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: this.sol, color: 0x9a8cb8, roughness: 0.85, metalness: 0.05 })));
    }

    // Positions des pierres (pour dégager une clairière autour d'elles).
    const centresPierres = U_PIERRES.map((u, i) => { const { c, N } = place(u); return c.clone().add(N.clone().multiplyScalar(i === U_PIERRES.length - 1 ? 0 : 2.8)); });
    const sansClairiere = (p: THREE.Vector3) => centresPierres.every((c) => Math.hypot(p.x - c.x, p.z - c.z) > 7.5);
    // Parois et plafond : blocs de roche (un seul maillage instancié).
    const blocs: { p: THREE.Vector3; s: THREE.Vector3; rot: THREE.Euler; teinte: number }[] = [];
    const nb = Math.ceil(L / 2.2);
    for (let i = 0; i <= nb; i++) {
      const { c, N } = place(i / nb);
      for (const cote of [1, -1]) {
        const n = this.mobile ? 2 : 3;
        for (let k = 0; k < n; k++) {
          const off = 4.2 + r() * 2.4, h = r() * 3.4 - 0.4;
          const pb = new THREE.Vector3(c.x + N.x * off * cote, h, c.z + N.z * off * cote);
          if (!sansClairiere(pb)) continue;
          blocs.push({ p: pb, s: new THREE.Vector3(1.3 + r() * 2.4, 1.4 + r() * 2.6, 1.3 + r() * 2.4), rot: new THREE.Euler(r() * 3, r() * 3, r() * 3), teinte: 0.4 + r() * 0.5 });
        }
      }
      const off = (r() - 0.5) * 6;
      if (sansClairiere(c)) blocs.push({ p: new THREE.Vector3(c.x + N.x * off, 5.6 + r() * 1.4, c.z + N.z * off), s: new THREE.Vector3(2.6 + r() * 2, 1.8 + r() * 1.4, 2.6 + r() * 2), rot: new THREE.Euler(r() * 3, r() * 3, r() * 3), teinte: 0.3 + r() * 0.3 });
    }
    const matRoche = new THREE.MeshStandardMaterial({ map: this.roche, color: 0xb8a8e8, roughness: 0.92, flatShading: true });
    const rochers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), matRoche, blocs.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    blocs.forEach((b, i) => {
      q.setFromEuler(b.rot); m.compose(b.p, q, b.s); rochers.setMatrixAt(i, m);
      col.setRGB(b.teinte, b.teinte * 0.85, b.teinte * 1.15); rochers.setColorAt(i, col);
    });
    this.scene.add(rochers);

    // Stalactites.
    {
      const n = this.mobile ? 30 : 70;
      const st = new THREE.InstancedMesh(new THREE.ConeGeometry(0.28, 1, 6), matRoche, n);
      for (let i = 0; i < n; i++) {
        const { c, N } = place(r());
        const h = 0.9 + r() * 2.2, off = (r() - 0.5) * 7;
        q.setFromEuler(new THREE.Euler(Math.PI, r() * 6, 0));
        m.compose(new THREE.Vector3(c.x + N.x * off, 5.2 - h / 2 + 0.4, c.z + N.z * off), q, new THREE.Vector3(1 + r(), h, 1 + r()));
        st.setMatrixAt(i, m);
      }
      this.scene.add(st);
    }

    // Les pierres runiques : à gauche du rail, tournées vers l'arrêt ; la dernière (Contact) est au milieu.
    const defs = donnees.pierres as PierreDef[];
    defs.forEach((def, i) => {
      const u = U_PIERRES[i];
      const { c, N } = place(u);
      const dernier = i === defs.length - 1;
      const pos = c.clone().add(N.clone().multiplyScalar(dernier ? 0 : 2.8));
      const arret = place(u - AVANCE_ARRET).c;
      const [w, h, ep] = dernier ? [2.9, 4.6, 0.9] : [2.3, 4.4, 0.7]; // grandes pierres : les visuels doivent se lire de loin
      const geo = new THREE.BoxGeometry(w, h, ep, 4, 8, 3);
      const pa = geo.getAttribute('position') as THREE.BufferAttribute;
      for (let k = 0; k < pa.count; k++) {
        const x = pa.getX(k), y = pa.getY(k), z = pa.getZ(k);
        const bruit = Math.sin(x * 12.9 + y * 7.1) * 43758.5453; const b = (bruit - Math.floor(bruit)) - 0.5;
        const effile = 1 - 0.14 * ((y + h / 2) / h);
        pa.setXYZ(k, x * effile + b * 0.06, y, z + b * 0.05);
      }
      geo.computeVertexNormals();
      const matCote = new THREE.MeshStandardMaterial({ map: this.roche, color: 0x7d6b9c, roughness: 0.95, flatShading: true });
      const { canevas, tex } = this.texturePierre(i, def);
      const mat = new THREE.MeshStandardMaterial({ map: this.roche, color: 0x6b5a88, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.4 });
      const mesh = new THREE.Mesh(geo, [matCote, matCote, matCote, matCote, mat, matCote]);
      mesh.position.set(pos.x, h / 2, pos.z);
      mesh.lookAt(arret.x, h / 2, arret.z);
      this.scene.add(mesh);
      const anneau = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 40), new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      anneau.rotation.x = -Math.PI / 2; anneau.position.set(pos.x, 0.06, pos.z);
      this.scene.add(anneau);
      this.pierres.push({ mesh, mat, anneau, u, def, canevas, tex, reveal: 0 });
    });

    // Table défilement r → avancée u : des paliers autour de chaque pierre pour s'y arrêter.
    this.table = [[0, 0]];
    U_PIERRES.forEach((u, i) => {
      const us = u - AVANCE_ARRET, dernier = i === U_PIERRES.length - 1;
      this.table.push([R_ARRETS[i] - 0.014, us - 0.004]);
      this.table.push([dernier ? 1 : R_ARRETS[i] + 0.014, us + (dernier ? 0.0 : 0.004)]);
    });
    if (this.table[this.table.length - 1][0] < 1) this.table.push([1, this.table[this.table.length - 1][1]]);
  }

  /** Texture lumineuse d'une pierre : un canevas redessiné quand on s'approche (rune → visuel). */
  private texturePierre(i: number, def: PierreDef) {
    const canevas = document.createElement('canvas'); canevas.width = LARG; canevas.height = HAUT;
    const g = canevas.getContext('2d')!;
    dessinerPierre(g, i, def, 0, this.photo, this.logos);
    const tex = new THREE.CanvasTexture(canevas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { canevas, tex };
  }

  // ---------- Interface HTML par-dessus la 3D : panneau de texte, mains, torche
  private interface() {
    this.ui.className = 'grotte-ui'; this.ui.setAttribute('aria-hidden', 'false');
    const vignette = document.createElement('div'); vignette.className = 'grotte-vignette'; vignette.setAttribute('aria-hidden', 'true');
    // Main gauche qui tient la torche (image retournée), flamme animée (4 images), halo de lumière et étincelles.
    this.torcheMain.className = 'torche-main';
    this.halo.className = 'torche-halo'; this.halo.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img'); img.className = 'torche-img'; img.alt = ''; img.draggable = false; img.setAttribute('aria-hidden', 'true');
    img.src = `${IMG}mains/torche-g.webp`;
    this.flamme.className = 'flamme'; this.flamme.setAttribute('aria-hidden', 'true');
    this.torcheMain.append(this.halo, img, this.flamme); // la flamme passe devant la torche (cœur transparent)
    for (let k = 0; k < 7; k++) {
      const e = document.createElement('i'); e.className = 'etincelle'; e.setAttribute('aria-hidden', 'true');
      e.style.setProperty('--dx', `${(Math.sin(k * 2.3) * 70).toFixed(0)}px`); e.style.setProperty('--dy', `${(-150 - (k % 3) * 55).toFixed(0)}px`);
      e.style.animationDelay = `${(k * 0.37).toFixed(2)}s`; e.style.animationDuration = `${(1.6 + (k % 4) * 0.35).toFixed(2)}s`;
      this.torcheMain.append(e);
    }
    this.panneau.className = 'pierre-texte'; this.panneau.setAttribute('aria-live', 'polite');
    this.ui.append(vignette, this.torcheMain, this.panneau);
    this.hote.append(this.ui);
  }

  private remplirPanneau(i: number) {
    const d = this.pierres[i].def;
    // Échappement HTML puis **mot-clé** en or.
    const echap = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    this.panneau.innerHTML =
      `<p class="pierre-num">${i + 1}/${this.pierres.length}</p><h2>${echap(d.titre)}</h2>` +
      (d.p ? d.p.map((t) => `<p>${echap(t)}</p>`).join('') : '') +
      (d.sections ? d.sections.map((sec) => `<section class="${sec.cle ? 'sec-cle' : ''}"><h3>${echap(sec.titre)}</h3>` + (sec.p ? sec.p.map((t) => `<p>${echap(t)}</p>`).join('') : '') + (sec.li ? `<ul>${sec.li.map((t) => `<li>${echap(t)}</li>`).join('')}</ul>` : '') + '</section>').join('') : '') +
      (d.li ? `<ul>${d.li.map((t) => `<li>${echap(t)}</li>`).join('')}</ul>` : '') +
      (d.liens ? `<p class="pierre-liens">${d.liens.map((l) => `<a href="${l.href}" ${l.href.startsWith('http') ? 'rel="noopener" target="_blank"' : ''}>${echap(l.texte)}</a>`).join('')}</p>` : '');
  }

  // ---------- Pilotage
  montrer(oui: boolean, t = performance.now()) {
    this.actif = oui;
    this.ui.style.display = oui ? 'block' : 'none';
    if (oui) { this.entree = t; this.uLisse = 0; this.uPrec = 0; this.pierreActive = -1; this.panneau.classList.remove('visible'); this.definirR(0); }
  }

  /** Défilement de la grotte (0..1). */
  definirR(r: number) {
    this.r = Math.min(1, Math.max(0, r));
  }

  private uPourR(r: number) {
    const T = this.table;
    for (let i = 1; i < T.length; i++) {
      if (r <= T[i][0]) { const [r0, u0] = T[i - 1], [r1, u1] = T[i]; return r1 === r0 ? u1 : mix(u0, u1, (r - r0) / (r1 - r0)); }
    }
    return T[T.length - 1][1];
  }

  redimensionner(W: number, H: number) { this.camera.aspect = W / H; this.camera.updateProjectionMatrix(); }

  /** Met à jour la caméra, les lumières et l'interface ; la scène est ensuite dessinée par l'appelant. */
  image(tMs: number, dtMs: number, reduit: boolean) {
    const dt = Math.min(0.05, dtMs / 1000), t = tMs / 1000;
    const cible = this.uPourR(this.r);
    this.uLisse += (cible - this.uLisse) * Math.min(1, dt * 5);
    const u = Math.min(0.999, Math.max(0, this.uLisse));
    const vit = Math.abs(u - this.uPrec) * this.longueur / Math.max(dt, 0.001); // m/s
    this.uPrec = u;
    this.mouvement += (Math.min(1, vit / 2.2) - this.mouvement) * Math.min(1, dt * 6);

    const c = this.courbe.getPointAt(u), T = this.courbe.getTangentAt(u);
    const marche = reduit ? 0 : this.mouvement;
    const pas = u * this.longueur * 2.1;
    // Intro : on se relève. Caméra basse qui monte, regard vers le haut qui revient à l'horizontale.
    const ti = this.entree < 0 ? 9 : (tMs - this.entree) / 1000;
    const leve = lisse(0.15, 1.7, ti);
    const haut = mix(0.42, 1.68, leve) + Math.abs(Math.sin(pas)) * 0.045 * marche;
    const tangage = mix(0.85, 0, leve);
    this.camera.position.set(c.x + Math.sin(pas * 0.5) * 0.03 * marche, haut, c.z);

    // Regard : le long du rail, avec un coup d'œil vers la pierre qu'on approche. Le premier est large ; les suivants restent
    // sur le côté (pas de demi-tour) et se relâchent dès que la pierre passe à hauteur des yeux.
    const avant = new THREE.Vector3(T.x, 0, T.z).normalize();
    let regardY = 0, poidsMax = 0, proche = -1, pmax = 0;
    this.pierres.forEach((p, i) => {
      const vx = p.mesh.position.x - this.camera.position.x, vz = p.mesh.position.z - this.camera.position.z;
      const d = Math.hypot(vx, vz);
      const prox = lisse(16, 5.0, d);
      const reveal = lisse(9.5, 6.4, d);
      if (Math.abs(reveal - p.reveal) > 0.012) { p.reveal = reveal; dessinerPierre(p.canevas.getContext('2d')!, i, p.def, reveal, this.photo, this.logos); p.tex.needsUpdate = true; }
      p.mat.emissiveIntensity = 0.3 + (1.9 - 0.7 * p.reveal) * prox + Math.sin(t * 2 + i) * 0.08 * prox;
      (p.anneau.material as THREE.MeshBasicMaterial).opacity = 0.75 * prox;
      p.anneau.scale.setScalar(1.45 * (1 + 0.06 * Math.sin(t * 2.4 + i)));
      const ang = Math.atan2(vx * avant.z - vz * avant.x, avant.x * vx + avant.z * vz); // angle de la pierre par rapport à l'axe du rail
      const cosA = Math.cos(ang);
      const premiere = i === 0;
      const relache = premiere ? lisse(-0.7, -0.05, cosA) : lisse(-0.25, 0.55, cosA);
      const w = lisse(9.5, 5.6, d) * relache;
      if (w > poidsMax) { poidsMax = w; regardY = Math.max(-(premiere ? 1.45 : 1.0), Math.min(premiere ? 1.45 : 1.0, ang)) * w; }
      if (prox > pmax) { pmax = prox; proche = i; }
    });
    const poids = poidsMax;
    // Le regard suit sa cible avec de l'inertie : il se pose sur la pierre et revient au chemin sans à-coup.
    this.yawLisse += (regardY - this.yawLisse) * Math.min(1, dt * 2.0);
    const dirRegard = avant.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yawLisse);
    const regard = new THREE.Vector3(c.x + dirRegard.x * 6, mix(1.6, 1.35, poids), c.z + dirRegard.z * 6);
    this.camera.lookAt(regard);
    this.camera.rotateX(tangage);
    this.camera.rotation.z += Math.sin(pas * 0.5) * 0.006 * marche;

    // Lumières : torche vacillante, éclat violet près de la pierre active.
    const tremble = 0.9 + 0.08 * Math.sin(t * 13) + 0.05 * Math.sin(t * 31 + 1);
    this.torche.position.copy(this.camera.position).add(new THREE.Vector3(0, -0.2, 0));
    this.torche.intensity = 42 * tremble * (0.25 + 0.75 * leve);
    if (proche >= 0) { this.lumPierre.position.set(this.pierres[proche].mesh.position.x, 2, this.pierres[proche].mesh.position.z); this.lumPierre.intensity = 40 * pmax; }

    // Panneau de texte de la pierre active.
    let vue = false;
    if (proche >= 0) {
      const sp = this.pierres[proche].mesh.position;
      const dir = new THREE.Vector3(sp.x - this.camera.position.x, 0, sp.z - this.camera.position.z).normalize();
      const reg = new THREE.Vector3(); this.camera.getWorldDirection(reg); reg.y = 0; reg.normalize();
      vue = dir.dot(reg) > 0.8 && pmax > 0.6;   // dans l'axe du regard (à ~35°) et assez proche
    }
    if (vue && proche !== this.pierreActive) { this.pierreActive = proche; this.remplirPanneau(proche); }
    this.panneau.classList.toggle('visible', vue && ti > 1.2);

    // Torche : balancement à la marche, se lève vers la pierre quand on s'y arrête ; flamme qui danse, lumière qui pulse.
    const monte = 1 - lisse(0.3, 1.5, ti);
    const sx = Math.sin(pas) * 10 * marche, sy = Math.abs(Math.sin(pas)) * 12 * marche + Math.sin(t * 1.3) * 2;
    const leveeT = lisse(0.5, 0.95, poids);
    this.torcheMain.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translateY(${(monte * 110).toFixed(1)}%) translate(${(leveeT * 3).toFixed(2)}vw, ${(-leveeT * 5).toFixed(2)}vh) rotate(${(Math.sin(pas) * 1.2 + Math.sin(t * 1.7) * 0.5 + leveeT * 4).toFixed(2)}deg)`;
    this.flammeGL.rendre(t);
    const vac = 1 + 0.05 * Math.sin(t * 17) + 0.04 * Math.sin(t * 29 + 1);
    this.flamme.style.transform = `translate(-50%, 0) rotate(${(-9 + Math.sin(t * 5.3) * 2.5).toFixed(1)}deg) scale(${(0.97 + 0.05 * Math.sin(t * 11)).toFixed(3)}, ${vac.toFixed(3)})`;
    this.halo.style.opacity = String((0.7 + 0.2 * Math.sin(t * 13) + 0.1 * Math.sin(t * 31)) * (0.3 + 0.7 * leve));
  }

  get acheve() { return this.actif; }

  liberer() {
    this.ui.remove();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh; m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    this.scene.clear();
  }
}
