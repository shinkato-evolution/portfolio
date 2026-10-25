// Acte 1 — le chemin : défilement → progression, portail le plus proche, aimant doux, commandes.
// Indépendant du rendu : fonctionne même si PixiJS n'est pas encore chargé (aucun écran bloquant).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const hBarre = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--h-barre')) || 78;

/** Progression (0..1) de chaque portail le long de la section épinglée. */
export const POSITIONS_PORTAILS = [0.07, 0.175, 0.28, 0.385, 0.49, 0.595, 0.7, 0.805, 0.915]; // 7 projets, « Et bien d'autres », puis le portail « ??? » // le huitième est le portail « ??? »
/** Au-delà : la « fin du chemin » (accroche de la transition brisée, J5). */
export const P_FIN_CHEMIN = 0.94;
// Vitesse maximale du héros, en part du parcours par seconde : même en défilant très vite, il ne dépasse jamais l'allure d'une marche rapide.
const VITESSE_MAX = 0.17;
/** En V2 le dragon s'arrête un peu AVANT chaque portail (part du parcours) pour qu'on le voie en entier et qu'on lise sa fiche. */
const RECUL_ARRET = 0.012;
/** Défilement de la V2 : vitesse constante (px/s) et courte pause à chaque portail (ms), le temps que sa fiche apparaisse. */
const VITESSE_DEFILEMENT = 650, ARRET_PORTAIL_MS = 1000;
const SEUIL_AIMANT = 0.04;     // < 4 % du parcours
const DELAI_AIMANT = 300;      // ms d'arrêt
// « À côté du portail » : le héros s'arrête à gauche du portail dessiné ; la zone s'étend jusqu'à ce qu'il l'ait dépassé.
const SEUIL_AVANT = 0.016, SEUIL_APRES = 0.045;

export interface EtatChemin {
  p: number; vitesse: number; proche: number; distance: number; devant: boolean; fin: boolean;
}

export class Chemin {
  etat: EtatChemin = { p: 0, vitesse: 0, proche: 0, distance: 1, devant: false, fin: false };
  private lenis: Lenis | null = null;
  private st!: ScrollTrigger;
  private dernierMouvement = performance.now();
  private aimantEnCours = false;
  /** Vrai : le défilement seul fait avancer, rien n'attire vers les portails (Phase 1 V2). */
  aimantDesactive = false;
  /** Vitesse maximale affichée (part du parcours par seconde) et ralentissement près des portails (Phase 1 V2). */
  vitesseMax = VITESSE_MAX; ralentirPortails = false;
  /** Vrai : la position affichée suit EXACTEMENT le défilement (aucun rattrapage automatique) ; c'est la molette elle-même qui est freinée près des portails. */
  seuilAvant = SEUIL_AVANT;
  directAuScroll = false; arretPortails = false;
  private arrivePortail = -1; private arriveLe = 0; private portailFranchi = -1;
  private pauseAimant = false;
  /** Défilement allongé (Phase 1 V2) : 2 fois plus de défilement pour le même trajet, et encore 2 fois plus autour de chaque portail. `courbe` = cumul normalisé du poids. */
  private facteur = 1; private courbe: Float32Array | null = null; private poidsTotal = 1;
  private sDe(p: number) { if (!this.courbe) return p; const n = this.courbe.length - 1, x = Math.min(1, Math.max(0, p)) * n, i = Math.min(n - 1, Math.floor(x)); return this.courbe[i] + (this.courbe[i + 1] - this.courbe[i]) * (x - i); }
  private pDe(s: number) { if (!this.courbe) return s; let lo = 0, hi = this.courbe.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.courbe[m] < s) lo = m; else hi = m; } const a = this.courbe[lo], b = this.courbe[hi]; return (lo + (b > a ? (s - a) / (b - a) : 0)) / (this.courbe.length - 1); }
  activerLong(oui: boolean) {
    if (oui) {
      const N = 4000, cum = new Float32Array(N + 1);
      for (let i = 0; i < N; i++) cum[i + 1] = cum[i] + 1 / N; // défilement uniforme : même vitesse partout (plus de zones lentes autour des portails)
      this.poidsTotal = cum[N]; for (let i = 0; i <= N; i++) cum[i] /= this.poidsTotal;
      this.courbe = cum; this.facteur = 2 * this.poidsTotal * (8 / 7); // même défilement entre deux portails qu'avant l'ajout du portail « Et bien d'autres »
    } else { this.courbe = null; this.facteur = 1; }
    document.documentElement.style.setProperty('--cv', String(700 * this.facteur));
    ScrollTrigger.refresh();
  }
  private pCible = 0; private vitesseScroll = 0; private tPrec = performance.now(); private immediat = false;
  surChangement: (e: EtatChemin) => void = () => {};

  constructor(private section: HTMLElement, public reduit: boolean) {
    this.st = ScrollTrigger.create({
      trigger: section,
      // L'en-tête reste en haut : la scène colle sous lui. Le chemin dure 700vh ; la grotte (acte 2) suit. Sans animations : pas d'acte 2.
      start: () => `top top+=${hBarre()}`,
      end: () => (this.reduit ? 'bottom bottom' : `+=${7 * window.innerHeight * this.facteur}`),
      invalidateOnRefresh: true,
      onUpdate: (self) => this.cibler(self.progress, self.getVelocity()),
      onRefresh: (self) => this.cibler(self.progress, 0, true),
    });
    this.appliquerReduit(reduit);
    gsap.ticker.add(this.tic);
    gsap.ticker.lagSmoothing(0);
    this.pCible = this.st.progress;
    this.maj(this.pCible, 0);
  }

  /** La position visée suit le défilement ; la progression affichée la rattrape à vitesse limitée. */
  private cibler(p: number, vitesse: number, direct = false) {
    p = this.pDe(p);
    this.pCible = p; this.vitesseScroll = vitesse;
    if (direct || this.reduit) { this.immediat = true; }
    if (this.immediat) { this.immediat = false; this.maj(p, vitesse); }
  }

  private avancer() {
    const maintenant = performance.now();
    const dt = Math.min(0.1, (maintenant - this.tPrec) / 1000); this.tPrec = maintenant;
    const ecart = this.pCible - this.etat.p;
    if (Math.abs(ecart) < 1e-6) return;
    if (this.directAuScroll) { this.maj(this.pCible, this.vitesseScroll); return; }
    let vmax = this.vitesseMax;
    if (this.ralentirPortails) { // près d'un portail on avance beaucoup moins vite : le défilement dure plus longtemps sur la scène du portail
      const t = Math.min(1, this.etat.distance / 0.075), lisse = t * t * (3 - 2 * t);
      vmax *= 0.08 + 0.92 * lisse; // zone large : on traîne devant chaque portail
    }
    const pas = vmax * dt;
    if (this.ralentirPortails && this.arretPortails) { // frein : le dragon ne franchit un portail qu'après s'y être attardé, même si le défilement est très en avance
      const sens = Math.sign(ecart), a = this.etat.p, b = a + sens * pas;
      const pp = POSITIONS_PORTAILS.find((q, i) => i < POSITIONS_PORTAILS.length - 1 && ((sens > 0 && q > a + 1e-6 && q <= b) || (sens < 0 && q < a - 1e-6 && q >= b)));
      if (pp !== undefined && this.portailFranchi !== pp) {
        if (this.arrivePortail === pp) { if (performance.now() - this.arriveLe > 2600) { this.portailFranchi = pp; } else { this.maj(pp, 0); return; } }
        else { this.arrivePortail = pp; this.arriveLe = performance.now(); this.maj(pp, 0); return; }
      }
      if (pp === undefined && POSITIONS_PORTAILS.every((q) => Math.abs(q - a) > 0.02)) { this.portailFranchi = -1; this.arrivePortail = -1; }
    }
    const p = Math.abs(ecart) <= pas ? this.pCible : this.etat.p + Math.sign(ecart) * pas;
    this.maj(p, this.vitesseScroll);
  }

  private tic = (temps: number) => {
    this.lenis?.raf(temps * 1000);
    if (this.maitrise && !this.pauseAimant) this.avancerMaitrise();
    if (this.directAuScroll && this.lenis) { // la molette, le pad ou le geste tactile pèsent beaucoup moins devant un portail : il faut insister pour le dépasser
      const t = Math.min(1, this.etat.distance / 0.07), lisse = t * t * (3 - 2 * t), m = 0.07 + 0.93 * lisse;
      const o = this.lenis.options as { wheelMultiplier?: number; touchMultiplier?: number };
      void m; o.wheelMultiplier = 0.85; o.touchMultiplier = 0.85; // le ralentissement vient désormais de la longueur de la barre, pas de la molette
    }
    this.avancer();
    // Vitesse qui retombe à zéro quand on ne défile plus (ScrollTrigger ne la remet pas à jour seul).
    if (performance.now() - this.dernierMouvement > 120 && this.etat.vitesse !== 0) {
      this.etat.vitesse = 0; this.surChangement(this.etat);
    }
    this.verifierAimant();
  };

  // ---------- Défilement maîtrisé (Phase 1 V2) : la molette, le pad, le tactile et les touches ne déplacent plus la page directement ; ils poussent une cible.
  // La page rejoint la cible à vitesse limitée (très lente près d'un portail) et la cible ne peut jamais être loin devant : un grand coup de molette ne saute rien.
  // Chaque portail (sauf le dernier) est un arrêt : la page s'y fige et ignore la commande pendant 1 s ; il faut ensuite insister pour repartir.
  /** Arrêts fournis de l'extérieur (px de défilement) : en phase 2, les pierres runiques. Sinon, les portails (le dernier excepté). */
  ancresFournies: (() => number[]) | null = null; private libreJusqua = 0;
  /** Vitesse (px/s) et durée d'arrêt (ms) du défilement maîtrisé : réglées par phase (chemin des portails / grotte des runes). */
  vitesseMaitrise = VITESSE_DEFILEMENT; arretMs = ARRET_PORTAIL_MS;
  private maitrise = false; private cibleY = 0; private tDernier = performance.now(); private tenueJusqua = 0; private portailPasse = -1; private ancrePorteY: number[] = [];
  maitriser(oui: boolean) {
    if (oui === this.maitrise) return;
    this.maitrise = oui;
    if (oui) { this.cibleY = window.scrollY; this.tDernier = performance.now(); this.portailPasse = -1; window.addEventListener('wheel', this.surRoue, { capture: true, passive: false }); window.addEventListener('keydown', this.surTouche, true); window.addEventListener('touchstart', this.surToucheDebut, { capture: true, passive: true }); window.addEventListener('touchmove', this.surToucheMouv, { capture: true, passive: false }); }
    else { window.removeEventListener('wheel', this.surRoue, true); window.removeEventListener('keydown', this.surTouche, true); window.removeEventListener('touchstart', this.surToucheDebut, true); window.removeEventListener('touchmove', this.surToucheMouv, true); }
  }
  /** Plancher du défilement maîtrisé (début de la grotte) : ce qu'on pousse en dessous est compté par `surRecul` au lieu de faire reculer la page. */
  plancher: number | null = null; surRecul: ((exces: number) => void) | null = null;
  private pousser(dy: number) {
    if (this.plancher !== null && this.cibleY + dy < this.plancher) { const exces = this.plancher - (this.cibleY + dy); this.cibleY = this.plancher; this.surRecul?.(exces); return; }
    if (performance.now() < this.tenueJusqua) return; // arrêt à un portail : la commande est ignorée un instant
    this.cibleY += dy;
  }
  private surRoue = (e: WheelEvent) => { if (this.scenePortailOuverte() || (e.target as HTMLElement).closest?.('.fiche-portail')) return; // sur la fiche, la molette la fait défiler elle-même
    e.preventDefault(); e.stopImmediatePropagation(); this.pousser(e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY); };
  private surTouche = (e: KeyboardEvent) => {
    const k = e.key; const delta = k === 'ArrowDown' ? 120 : k === 'ArrowUp' ? -120 : k === 'PageDown' || k === ' ' ? 500 : k === 'PageUp' ? -500 : 0;
    if (!delta || this.scenePortailOuverte() || (e.target as HTMLElement).closest('button, a, input, textarea, select')) return;
    e.preventDefault(); e.stopImmediatePropagation(); this.pousser(delta);
  };
  private toucheY = 0;
  private surToucheDebut = (e: TouchEvent) => { this.toucheY = e.touches[0].clientY; };
  /** Fiche dépliée : elle défile d'elle-même ; repliée : le doigt fait avancer la scène. */
  private surToucheMouv = (e: TouchEvent) => {
    const panneau = (e.target as HTMLElement).closest?.('.pierre-texte') as HTMLElement | null;
    if (panneau && panneau.scrollHeight > panneau.clientHeight + 2) { // panneau de texte (grotte) plus long que son cadre : le doigt le fait défiler
      const dy = this.toucheY - e.touches[0].clientY, peutDescendre = panneau.scrollTop + panneau.clientHeight < panneau.scrollHeight - 1, peutMonter = panneau.scrollTop > 0;
      if ((dy > 0 && peutDescendre) || (dy < 0 && peutMonter)) { e.preventDefault(); panneau.scrollTop += dy; this.toucheY = e.touches[0].clientY; return; }
    } if (this.scenePortailOuverte() || (e.target as HTMLElement).closest?.('.fiche-portail.ouvert')) return; e.preventDefault(); const y = e.touches[0].clientY; this.pousser((this.toucheY - y) * 1.3); this.toucheY = y; };
  private scenePortailOuverte() { return !!document.querySelector('dialog[open]'); }
  private avancerMaitrise() {
    const maintenant = performance.now(), dt = Math.min(0.05, (maintenant - this.tDernier) / 1000); this.tDernier = maintenant;
    const pos = window.scrollY;
    if (maintenant < this.libreJusqua) { this.cibleY = pos; return; } // un déplacement guidé (menu, boutons) est en cours : on ne le contrarie pas
    const fournies = this.ancresFournies ? this.ancresFournies() : null;
    this.ancrePorteY = fournies ?? POSITIONS_PORTAILS.map((q) => this.yPour(q - RECUL_ARRET));
    // Une commande ne peut pas être loin devant la position : un grand coup de molette ne fait pas sauter de portails.
    this.cibleY = Math.max(pos - 500, Math.min(pos + 500, this.cibleY));
    const vmax = this.vitesseMaitrise; // px/s : constante, un peu en dessous d'une vitesse moyenne
    let step = Math.max(-vmax * dt, Math.min(vmax * dt, this.cibleY - pos));
    // Arrêt à un portail : si ce pas le franchit, on s'y fige.
    for (let i = 0; i < this.ancrePorteY.length - (fournies ? 0 : 1); i++) {
      const yP = this.ancrePorteY[i];
      if (this.portailPasse === i) { if (Math.abs(pos - yP) > 160) this.portailPasse = -1; continue; }
      if ((step > 0 && pos < yP && pos + step >= yP) || (step < 0 && pos > yP && pos + step <= yP)) { step = yP - pos; this.cibleY = yP; this.tenueJusqua = maintenant + this.arretMs; this.portailPasse = i; break; }
    }
    if (Math.abs(step) > 0.01) this.lenis?.scrollTo(pos + step, { immediate: true, force: true });
  }

  restaurerDefilement() { const o = this.lenis?.options as { wheelMultiplier?: number; touchMultiplier?: number } | undefined; if (o) { o.wheelMultiplier = 1; o.touchMultiplier = 1; } }

  appliquerReduit(reduit: boolean) {
    this.reduit = reduit;
    if (this.st) ScrollTrigger.refresh(); // la hauteur de la section change avec le mode
    if (reduit && this.lenis) { this.lenis.destroy(); this.lenis = null; }
    if (!reduit && !this.lenis) {
      this.lenis = new Lenis({ syncTouch: true, anchors: true, lerp: 0.1 });
      this.lenis.on('scroll', ScrollTrigger.update);
    }
  }

  private maj(p: number, vitesse: number) {
    if (!this.aimantEnCours && Math.abs(vitesse) > 1) this.dernierMouvement = performance.now();
    let proche = 0, distance = 1;
    POSITIONS_PORTAILS.forEach((pp, i) => { const d = Math.abs(p - pp); if (d < distance) { distance = d; proche = i; } });
    this.etat = { p, vitesse, proche, distance, devant: (p - POSITIONS_PORTAILS[proche]) > -this.seuilAvant && (p - POSITIONS_PORTAILS[proche]) < SEUIL_APRES, fin: p >= P_FIN_CHEMIN - 0.02 };
    this.surChangement(this.etat);
  }

  /** Aimant doux : après 300 ms d'arrêt à moins de 4 % d'un portail, le héros s'y place. */
  private verifierAimant() {
    if (this.reduit || this.aimantEnCours || this.pauseAimant || this.aimantDesactive) return;
    const { distance, proche, p } = this.etat;
    if (distance >= SEUIL_AIMANT || distance < 0.0015 || p <= 0 || p >= 1) return;
    if (performance.now() - this.dernierMouvement < DELAI_AIMANT) return;
    this.aimantEnCours = true;
    this.allerA(POSITIONS_PORTAILS[proche], () => { this.aimantEnCours = false; this.dernierMouvement = performance.now(); });
  }

  /** Défilement correspondant à la progression p. */
  yPour(p: number) { return this.st.start + this.sDe(p) * (this.st.end - this.st.start); }

  private cible = 0; private tCible = -1e9;
  /** Base des boutons ‹ › : la destination en cours si on clique vite, sinon la position. */
  private base() { return performance.now() - this.tCible < 1000 ? this.cible : this.etat.p; }

  allerA(p: number, fini?: () => void, immediat = false) {
    this.libreJusqua = performance.now() + 1300;
    this.cible = p; this.tCible = performance.now();
    const y = this.yPour(p);
    if (this.lenis) {
      if (immediat) this.immediat = true;
      this.lenis.scrollTo(y, { immediate: immediat, duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3), onComplete: () => fini?.() });
    } else {
      window.scrollTo({ top: y, behavior: 'auto' });
      fini?.();
    }
  }

  allerAuPortail(i: number, immediat = false) { this.allerA(POSITIONS_PORTAILS[i], undefined, immediat); }

  suivant() {
    const i = POSITIONS_PORTAILS.findIndex((pp) => pp > this.base() + 0.005);
    this.allerA(i === -1 ? POSITIONS_PORTAILS[POSITIONS_PORTAILS.length - 1] : POSITIONS_PORTAILS[i]);
  }

  precedent() {
    const avant = POSITIONS_PORTAILS.filter((pp) => pp < this.base() - 0.005);
    this.allerA(avant.length ? avant[avant.length - 1] : 0);
  }

  /** Défilement (px) où le chemin se termine : au-delà, c'est la brisure puis la grotte. */
  get yFin() { return this.st.end; }

  /** Défilement (px) où le héros se tient devant le portail i. */
  yDuPortail(i: number) { return this.yPour(POSITIONS_PORTAILS[i]); }

  /** Défilement (px) du point d'arrêt devant le portail i (V2). */
  yArret(i: number) { return this.yPour(POSITIONS_PORTAILS[i] - RECUL_ARRET); }

  /** Saute à une position (px) en gardant le défilement fluide synchronisé (sinon il repart de son ancienne position). */
  sauterY(y: number) {
    this.immediat = true;
    if (this.lenis) this.lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo({ top: y, behavior: 'auto' });
  }

  /** Défile en douceur jusqu'à une position (px). */
  allerY(y: number, duree = 1.8) {
    this.libreJusqua = performance.now() + duree * 1000 + 250;
    if (this.lenis) this.lenis.scrollTo(y, { duration: duree, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else window.scrollTo({ top: y, behavior: 'auto' });
  }

  /** Vrai tant que la section du jeu occupe l'écran (sinon les touches restent au navigateur). */
  dansLeJeu() { return window.scrollY < this.st.end - 2; }

  suspendre(oui: boolean) {
    this.pauseAimant = oui;
    this.aimantEnCours = false; // un aimant interrompu par lenis.stop() ne doit pas rester bloqué
    if (oui) this.lenis?.stop(); else this.lenis?.start();
  }
}
