// Point d'entrée. Le texte complet est déjà dans le HTML : ce script n'ajoute que la couche jouable.
// PixiJS est chargé en différé (import()) : commandes et panneau fonctionnent avant qu'il arrive.
import donnees from './content/projets.json';
import type { Projet } from './types';
import { Chemin, POSITIONS_PORTAILS, type EtatChemin } from './act1/chemin';
import { ScenePortail } from './scene/provisoire';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Monde } from './act1/monde';
import { vortexNoir, VortexAnime } from './v2/vortex';
import { poussiereAccueil } from './v2/poussiere';
import { creerBarreJeu } from './barre-jeu';
import { son } from './son';
import type { Brisure } from './break/brisure';
import { R_ARRETS } from './act2/arrets';

// À l'actualisation (et au retour par l'historique), on repart tout en haut, jamais au milieu d'une scène.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.addEventListener('pageshow', (e) => { if (e.persisted) window.scrollTo(0, 0); });

const projets = donnees.projets as Projet[];
let monde: Monde | null = null;
let brisure: Brisure | null = null;
let brisureEnCours = false;
let cibleRubrique: number | null = null; // rubrique demandée par le menu avant la brisure
let futurVu = false; // le message du portail « ??? » a été joué : on attend que le héros s'en éloigne avant de le réarmer
type Phase = 'chemin' | 'brisure' | 'grotte' | 'retour';
let phase: Phase = 'chemin';
const intro = document.getElementById('intro-reve') as HTMLElement;
const scene2d = document.querySelector('#jeu .jeu-scene') as HTMLElement;
let v2: import('./v2/phase1v2').PhaseV2 | null = null;
let v2Actif = false; // Phase 1 V2 : la scène 3D pilote l'image
let v2Vol = false;   // la chute est finie : le défilement fait voler le dragon
let v2Charge = false;
const indiceScroll = document.getElementById('indice-scroll') as HTMLElement;
let indiceY = 0; // la molette reste tant qu'on n'a pas vraiment avancé (un simple coup de molette sans effet ne l'enlève pas)
gsap.ticker.add(() => { if (indiceScroll.classList.contains('visible') && Math.abs(window.scrollY - indiceY) > 40) indiceScroll.classList.remove('visible'); });
let imgVortex: HTMLImageElement | null = null;
let posesChute: import('pixi.js').Texture[] | null = null;
let bloque = false;
let yBloque = 0;
const proxy = { q: 0 };
let sequence: gsap.core.Tween | gsap.core.Timeline | null = null;
const html = document.documentElement;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const section = $('jeu');
const bandeau = $('bandeau');
const btnReduire = document.getElementById('btn-reduire') as HTMLButtonElement | null; // retiré de l'en-tête : le mode « animations réduites » ne s'active plus que par le réglage du système
const btnEntrer = $<HTMLButtonElement>('btn-entrer');
const btnPrec = $<HTMLButtonElement>('btn-prec');
const btnSuiv = $<HTMLButtonElement>('btn-suiv');
const invite = $('invite');
const etatHeros = $('etat-hero');
const orbe = $('orbe');
const orbeVideo = $<HTMLVideoElement>('orbe-video');
const message = $('message-futur');

// La hauteur de l'en-tête (variable selon la largeur) décale la scène collée sous lui.
const barre = $('barre');
const majBarre = () => html.style.setProperty('--h-barre', `${barre.offsetHeight}px`);
majBarre();
new ResizeObserver(() => { majBarre(); ScrollTrigger.refresh(); }).observe(barre);

let reduit = html.classList.contains('reduit');
// ---------- Rubriques verrouillées tant que le parcours n'a pas été vécu en entier (mémorisé dans le navigateur : rien n'est envoyé).
// Déverrouillage : quand la barre du pied de page apparaît après être passé par la grotte. Sans animations ou sans JavaScript : tout reste accessible.
const CLE_PARCOURS = 'parcours-vu';
const liensRubriques = Array.from(barre.querySelectorAll<HTMLAnchorElement>('a[data-rubrique]'));
let parcoursVu = false; // la grotte a été atteinte pendant cette visite
let verrouille = false;
try { verrouille = localStorage.getItem(CLE_PARCOURS) !== '1'; } catch { verrouille = true; }
function majVerrou() {
  for (const a of liensRubriques) {
    a.classList.toggle('verrou', verrouille);
    if (verrouille) { a.setAttribute('aria-disabled', 'true'); a.setAttribute('aria-label', `${a.textContent} (verrouillé : vivez d'abord le parcours)`); } else { a.removeAttribute('aria-disabled'); a.removeAttribute('aria-label'); }
  }
}
function deverrouiller() { if (!verrouille) return; verrouille = false; try { localStorage.setItem(CLE_PARCOURS, '1'); } catch { /* stockage indisponible : déverrouillé pour cette visite seulement */ } majVerrou(); }
if (reduit) verrouille = false;
majVerrou();
// Info-bulle immédiate au survol (ou au focus) d'une rubrique verrouillée : le même message, sous le lien.
for (const a of liensRubriques) {
  const montrer = () => { if (!verrouille || reduit) return; const r = a.getBoundingClientRect(); toastVerrou.style.left = `${Math.round(Math.min(window.innerWidth - 150, Math.max(150, r.left + r.width / 2)))}px`; toastVerrou.style.top = `${Math.round(r.bottom + 10)}px`; toastVerrou.textContent = "Vivez d'abord le parcours"; toastVerrou.classList.add('visible'); window.clearTimeout(toastTimer); };
  const cacher = () => { toastTimer = window.setTimeout(() => toastVerrou.classList.remove('visible'), 150); };
  a.addEventListener('mouseenter', montrer); a.addEventListener('focus', montrer); a.addEventListener('mouseleave', cacher); a.addEventListener('blur', cacher);
}
// E-mail : si aucun logiciel de messagerie n'est réglé sur l'ordinateur, le lien « mailto: » ne fait rien. On copie donc l'adresse et on le dit.
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest?.('a[href^="mailto:"]') as HTMLAnchorElement | null; if (!a) return;
  const adresse = a.getAttribute('href')!.slice(7).split('?')[0];
  navigator.clipboard?.writeText(adresse).catch(() => { /* copie refusée */ });
  const r = a.getBoundingClientRect(); toastVerrou.style.left = `${Math.round(Math.min(window.innerWidth - 190, Math.max(190, r.left + r.width / 2)))}px`; toastVerrou.style.top = `${Math.round(r.bottom + 10)}px`;
  toastVerrou.textContent = `Adresse copiée : ${adresse}`; toastVerrou.classList.add('visible'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toastVerrou.classList.remove('visible'), 4000);
});
const toastVerrou = $('toast-verrou'); let toastTimer: number | undefined;
function direVerrou() { toastVerrou.textContent = "Vivez d'abord le parcours"; toastVerrou.classList.add('visible'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toastVerrou.classList.remove('visible'), 2200); }
const pied = document.querySelector('footer.barre-bas');
if (pied && 'IntersectionObserver' in window) new IntersectionObserver((es) => { if (parcoursVu && es.some((e) => e.isIntersecting)) deverrouiller(); }, { threshold: 0.15 }).observe(pied);

const chemin = new Chemin(section, reduit);
const scene = new ScenePortail();
scene.surFermeture = () => chemin.suspendre(false);

// ---------- Réduire les animations
const mqReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
function definirReduit(oui: boolean, memoriser: boolean) {
  reduit = oui;
  html.classList.toggle('reduit', oui);
  btnReduire?.setAttribute('aria-pressed', String(oui));
  if (btnReduire) btnReduire.textContent = oui ? 'Animations réduites' : 'Réduire les animations';
  chemin.appliquerReduit(oui);
  if (oui) { arreterSequence(); arreterV2(); verrouille = false; majVerrou(); barreJeu?.cacher(); }
  if (memoriser) { try { localStorage.setItem('reduire-animations', oui ? '1' : '0'); } catch { /* stockage indisponible */ } }
}
definirReduit(reduit, false);
btnReduire?.addEventListener('click', () => definirReduit(!reduit, true));
mqReduit.addEventListener('change', (e) => {
  definirReduit(e.matches, false);
});

// ---------- Panneau HTML en haut du bandeau
const DERNIER = POSITIONS_PORTAILS.length - 1; // le portail « ??? »
const AUTRES = DERNIER - 1; // le portail « Et bien d'autres »
const CONTENU_AUTRES = { titre: "Et bien d'autres", statut: 'des jeux en route', emblème: { nom: 'Le Carnet', phrase: 'Un aperçu des autres projets.' } };
const SEUIL_PORTAIL_NOIR = 0.012; // en V2 : l'animation de chute part quand la progression est à moins de 1,2 % du portail noir (~18 unités de la scène)
const FUTUR = { titre: '???', statut: 'à venir', emblème: { nom: 'Un portail inconnu', phrase: 'Les prochains projets.' } };
let dernierProche = -1, dernierDevant = false;
function majPanneau(e: EtatChemin) {
  const p = projets[e.proche] ?? (e.proche === AUTRES ? CONTENU_AUTRES : FUTUR);
  if (e.proche !== dernierProche) {
    dernierProche = e.proche;
    $('hud-compteur').textContent = `${e.proche + 1}/${POSITIONS_PORTAILS.length}`;
    $('hud-statut').textContent = `· ${p.statut}`;
    $('hud-titre').textContent = p.titre;
    $('hud-embleme').textContent = p.emblème.nom;
    $('hud-phrase').textContent = p.emblème.phrase;
    btnEntrer.textContent = e.proche === DERNIER ? 'Avancer' : 'Entrer';
    btnEntrer.setAttribute('aria-label', e.proche === DERNIER ? 'Franchir le portail inconnu' : `Entrer dans le portail ${e.proche + 1} : ${p.titre}`);
  }
  if (e.devant !== dernierDevant) { dernierDevant = e.devant; invite.classList.toggle('visible', e.devant); }
  btnPrec.setAttribute('aria-disabled', String(e.p <= 0.001));
  btnSuiv.setAttribute('aria-disabled', String(e.p >= POSITIONS_PORTAILS[DERNIER] - 0.003));
  if (e.p > 0.7) chargerBrisure();
  verifierFutur(e);
}

// ---------- Entrer / sortir
function entrer(i = chemin.etat.proche) {
  if (scene.ouverte) return;
  if (i >= projets.length) { // le portail « ??? » : le message se joue dès que le héros est devant
    if (!chemin.etat.devant || chemin.etat.proche !== i) chemin.allerAuPortail(i); else lancerFutur();
    return;
  }
  if (!chemin.etat.devant || chemin.etat.proche !== i) chemin.allerAuPortail(i, true); // le héros se place devant, sans animation
  chemin.suspendre(true);
  scene.ouvrir(projets[i], i, projets.length, btnEntrer);
}
btnEntrer.addEventListener('click', () => entrer());
btnPrec.addEventListener('click', () => chemin.precedent());
btnSuiv.addEventListener('click', () => chemin.suivant());

window.addEventListener('keydown', (ev) => {
  if (scene.ouverte || !chemin.dansLeJeu() || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  const cible = ev.target as HTMLElement;
  const surControle = cible.closest('button, a, input, textarea, select, [contenteditable]');
  if (ev.key === 'ArrowRight') { ev.preventDefault(); chemin.suivant(); }
  else if (ev.key === 'ArrowLeft') { ev.preventDefault(); chemin.precedent(); }
  else if ((ev.key === 'Enter' || ev.key === ' ') && !surControle && chemin.etat.devant) { ev.preventDefault(); entrer(); }
});

// ---------- Rendu (différé)
chemin.surChangement = (e) => { majPanneau(e); };
majPanneau(chemin.etat);

// ---------- Fin du chemin : la brisure se joue d'un coup, puis la grotte (acte 2) suit le défilement.
// Le défilement est bloqué pendant la scène ; remonter tout en haut de la grotte rejoue la scène à l'envers.
/** Longueur de défilement de la grotte : 5 écrans au départ, 12,5 aujourd'hui (la vitesse de la phase 2 passe à 40 %). À garder égal à --gv dans style.css. */
const VITESSE_GROTTE = 0.4;
const hauteurGrotte = () => (5 / VITESSE_GROTTE) * window.innerHeight;
const majQ = () => brisure?.definirQ(proxy.q);

function chargerBrisure() {
  if (brisure || brisureEnCours || !monde || reduit) return;
  brisureEnCours = true;
  import('./break/brisure').then(async ({ Brisure }) => {
    const b = new Brisure(section.querySelector('.jeu-scene') as HTMLElement, monde!);
    try { await b.init(); } catch (err) { console.warn('Brisure indisponible.', err); return; }
    brisure = b;
    b.preparerGrotte();
    surDefilement();
    if (cibleRubrique !== null && phase === 'chemin') lancerFutur(); else verifierFutur(chemin.etat);
  }).finally(() => { brisureEnCours = false; });
}

/** Bloque le défilement à la position y (par défaut la position actuelle) pendant une scène, ou le libère. */
function verrouiller(oui: boolean, y?: number) {
  bloque = oui;
  if (oui) { yBloque = y ?? window.scrollY; chemin.sauterY(yBloque); }
  chemin.suspendre(oui);
}
window.addEventListener('scroll', () => {
  if (bloque) { if (Math.abs(window.scrollY - yBloque) > 1) window.scrollTo({ top: yBloque, behavior: 'auto' }); return; }
  surDefilement();
}, { passive: true });
for (const ev of ['wheel', 'touchmove'] as const) window.addEventListener(ev, (e) => { if (bloque) e.preventDefault(); }, { passive: false });
window.addEventListener('keydown', (e) => {
  if (bloque && [' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'End', 'Home'].includes(e.key)) e.preventDefault();
}, true);

function surDefilement() {
  if (reduit || !brisure) return;
  const y = window.scrollY, yFin = chemin.yFin;
  if (phase === 'chemin') {
    // Filet de sécurité : on a dépassé le bout du chemin sans passer devant le portail (barre de défilement, saut).
    // (le héros rattrape le défilement à vitesse limitée : on attend qu'il soit arrivé près du dernier portail)
    if (y > yFin + 6 && y < yFin + hauteurGrotte() + window.innerHeight && chemin.etat.p >= POSITIONS_PORTAILS[DERNIER] - 0.02) lancerFutur();
  } else if (phase === 'grotte') {
    if (y < yFin - 6) retourChemin();
    else brisure.definirR((y - yFin) / hauteurGrotte());
  }
}

/** Rejoue le portail « ??? » en cas de passage devant lui (sinon on attend d'être loin). */
function verifierFutur(e: EtatChemin) {
  if (reduit) return;
  // Phase 1 V2 : un seul déclencheur, à une distance précise du portail noir (en pas de défilement) ; reculer ramène avant ce seuil, avancer le redéclenche toujours.
  if (v2Actif && phase === 'chemin' && brisure && e.p >= POSITIONS_PORTAILS[DERNIER] - SEUIL_PORTAIL_NOIR) { lancerFutur(); return; }
  if (e.proche !== DERNIER || e.distance > 0.03) futurVu = false;
  else if (!futurVu && e.devant && phase === 'chemin' && brisure) lancerFutur();
}

/** Devant le portail « ??? » : le message s'écrit, puis toute la brisure se joue d'un coup. */
function lancerFutur() {
  if (!brisure || phase !== 'chemin' || reduit) return;
  phase = 'brisure'; futurVu = true;
  if (v2Actif) { bloque = true; yBloque = window.scrollY; chemin.suspendre(true); } // en V2 on fige là où l'on est : pas de saut vers le portail
  else verrouiller(true, chemin.yDuPortail(DERNIER));
  brisure.preparerGrotte();
  void son.precharger('tournoi'); // la musique de la grotte se charge pendant la chute
  sequence?.kill();
  proxy.q = 0;
  if (v2Actif && v2) { // Phase 1 V2 : le dragon plonge devant le portail noir, puis on retrouve la chute classique jusqu'à la grotte
    const lance = v2;
    lance.cinematique().then(() => {
      // Écran noir : la brisure fissure le vortex noir (jamais la bande 2D de la phase 1), puis le personnage dessiné tombe avec l'effet de fracture, jusqu'à la grotte.
      const t = monde!.taille, res = Math.min(window.devicePixelRatio || 1, 2);
      const va = new VortexAnime(Math.max(2, Math.round(t.largeur * res * 0.75)), Math.max(2, Math.round(t.hauteur * res * 0.75)), imgVortex);
      monde!.capturePerso = va.canvas;
      monde!.heros.alpha = 1; monde!.heros.definirDessin(posesChute);
      proxy.q = 0.003; majQ(); // la brisure s'active avant que la scène 3D soit retirée
      const t0 = performance.now(); // le vortex reste ANIMÉ (chaos de plus en plus fort) jusqu'à ce que l'écran craque
      const animer = () => { const q = proxy.q; if (q > 0.27 || phase === 'grotte' || !va) { gsap.ticker.remove(animer); return; } va.maj((performance.now() - t0) / 1000, Math.min(1, q / 0.25)); brisure?.rafraichirImage(); };
      gsap.ticker.add(animer);
      chemin.maitriser(false); lance.masquer(); v2Actif = false; scene2d.classList.remove('v2-on', 'v2-vol');
      son.vortex(1, 1.8); // le vortex gronde pendant que l'écran se fissure
      sequence = gsap.timeline({ onComplete: ouvrirGrotte })
        .to(proxy, { q: 0.25, duration: 1.7, ease: 'power2.in', onUpdate: majQ })   // le tremblement monte, l'écran se fissure
        .call(() => son.craquement(0.25), undefined, 0.35).call(() => son.craquement(0.4), undefined, 0.75).call(() => son.craquement(0.5), undefined, 1.0)
        .call(() => son.craquement(0.7), undefined, 1.25).call(() => son.craquement(0.85), undefined, 1.45).call(() => son.craquement(1), undefined, 1.6)
        .call(() => son.jouer('choc_fort2', 0.6, 0.8), undefined, 1.0)
        .to(proxy, { q: 0.33, duration: 0.4, ease: 'power1.out', onUpdate: majQ }, 1.7).call(() => { son.craquement(1); son.vortex(0, 0.5); son.jouer('choc_fort', 0.7, 0.7); son.vent(0.3, 0.4); son.tension(1, 0.6); son.coeur(140); son.chuteLibre(2.4); })  // l'écran éclate
        .to(proxy, { q: 0.62, duration: 2.4, ease: 'none', onUpdate: majQ });        // le personnage tombe dans le vide
    });
    return;
  }
  sequence = gsap.timeline({ onComplete: ouvrirGrotte })
    .call(() => message.classList.add('visible'))
    .to({}, { duration: 3.6 })                                                   // « Le futur est rempli de projets… »
    .call(() => message.classList.remove('visible'))
    .to({}, { duration: 0.7 })
    .to(proxy, { q: 0.25, duration: 1.7, ease: 'power2.in', onUpdate: majQ })   // le tremblement monte, l'écran se fissure
    .to(proxy, { q: 0.33, duration: 0.4, ease: 'power1.out', onUpdate: majQ })  // l'écran éclate
    .to(proxy, { q: 0.62, duration: 2.4, ease: 'none', onUpdate: majQ });        // il tombe dans le vide
}

// Pas dans la grotte : un pas tous les PAS_PX de défilement, donc lents quand on défile lentement, rapprochés et plus appuyés quand on défile vite.
const PAS_PX = 120; let pasActif = false, pasY = 0, pasReste = 0, pasT = 0;
function suivrePas(oui: boolean) { pasActif = oui; pasY = window.scrollY; pasReste = 0; pasT = performance.now(); }
gsap.ticker.add(() => {
  if (!pasActif || phase !== 'grotte') return;
  const y = window.scrollY, maintenant = performance.now(), dy = y - pasY, dt = Math.max(1, maintenant - pasT); pasY = y; pasT = maintenant;
  if (dy <= 0 || dy > 400) return; // à l'arrêt, en recul ou lors d'un saut : silence
  pasReste += dy;
  if (pasReste >= PAS_PX) { pasReste -= PAS_PX; son.pas(Math.min(1, (dy / dt * 1000) / 900)); }
});

function ouvrirGrotte() {
  if (!brisure) return;
  if (!brisure.entrerGrotte()) { window.setTimeout(ouvrirGrotte, 120); return; } // la grotte finit de se préparer
  phase = 'grotte'; parcoursVu = true;
  bloque = false;
  chemin.sauterY(chemin.yFin);   // la bande 2D est cachée : on se place au début de la grotte
  chemin.suspendre(false);
  brisure.definirR(0);
  // Phase 2 (après le saut au début de la grotte, sinon la cible de défilement serait périmée) : même défilement que le chemin (vitesse constante) et 1 s d'arrêt devant chaque pierre runique.
  son.tension(0, 1.5); son.coeur(0); son.vent(0.1, 3); son.musique('tournoi', 0.26, 3); son.torche(true); son.jouer('atterrissage', 0.7, 0.8); suivrePas(true); // la grotte : torche, pas au rythme du défilement, musique d'exploration
  chemin.plancher = chemin.yFin; chemin.surRecul = surRecul; // reculer en phase 2 demande d'insister : jauge « Attention, vous revenez sur vos pas »
  chemin.ancresFournies = () => R_ARRETS.map((r) => chemin.yFin + r * hauteurGrotte());
  chemin.vitesseMaitrise = 330; chemin.arretMs = 250; // grotte : plus lent que le chemin, arrêt un peu plus court devant les runes
  if (!reduit) chemin.maitriser(true);
  if (cibleRubrique !== null) { const r = cibleRubrique; cibleRubrique = null; window.setTimeout(() => chemin.allerY(chemin.yFin + R_ARRETS[r] * hauteurGrotte(), 2.2), 1800); }
}

const recul = $('recul'), reculJauge = $('recul-jauge'); let charge = 0, tCharge = 0;
const SEUIL_RECUL = 700; // quantité de défilement vers le haut à accumuler avant de revenir en arrière
function surRecul(exces: number) {
  if (phase !== 'grotte') return;
  charge = Math.min(SEUIL_RECUL, charge + Math.min(exces, 120)); tCharge = performance.now();
  reculJauge.style.width = `${(charge / SEUIL_RECUL * 100).toFixed(0)}%`; recul.classList.add('visible');
  if (charge >= SEUIL_RECUL) { charge = 0; recul.classList.remove('visible'); retourChemin(); }
}
gsap.ticker.add(() => { // sans insistance, la jauge se vide toute seule
  if (charge <= 0) return;
  if (performance.now() - tCharge > 250) { charge = Math.max(0, charge - 14); reculJauge.style.width = `${(charge / SEUIL_RECUL * 100).toFixed(0)}%`; if (charge <= 0) recul.classList.remove('visible'); }
});
function retourChemin(apres?: () => void) {
  if (!brisure) return;
  son.torche(false); suivrePas(false); son.musique('menu', 0.3, 2.5); son.vent(0, 1.5); // retour au chemin : pas de vent
  chemin.maitriser(false); chemin.plancher = null; chemin.ancresFournies = null; chemin.vitesseMaitrise = 650; chemin.arretMs = 1000;
  phase = 'retour';
  verrouiller(true, chemin.yDuPortail(DERNIER)); // la bande 2D se reforme sous la scène, héros devant le portail
  brisure.sortirGrotte();
  sequence?.kill();
  sequence = gsap.to(proxy, { q: 0, duration: 2.2, ease: 'power2.inOut', onUpdate: majQ, onComplete: () => { verrouiller(false); phase = 'chemin'; futurVu = true; if (v2 && !reduit) chemin.sauterY(chemin.yPour(POSITIONS_PORTAILS[DERNIER] - SEUIL_PORTAIL_NOIR - 0.025)); reprendreV2(); apres?.(); } });
}

/** « Réduire les animations » : on abandonne la scène, le texte prend le relais. */
function arreterSequence() {
  sequence?.kill(); proxy.q = 0;
  message.classList.remove('visible');
  brisure?.definirQ(0);
  phase = 'chemin';
  if (bloque) verrouiller(false);
}

import('./act1/monde').then(async ({ Monde }) => {
  const m = new Monde();
  try { await m.init(bandeau); } catch (err) { console.warn('Rendu indisponible, le panneau reste utilisable.', err); return; }
  monde = m;
  (window as unknown as { __monde: Monde }).__monde = m;
  m.surEtatHeros = (etat) => { etatHeros.textContent = etat; };
  m.surClicPortail = (i) => {
    if (i === chemin.etat.proche && chemin.etat.devant) entrer(i); else chemin.allerAuPortail(i);
  };
  m.app.ticker.add((t) => {
    const e = chemin.etat;
    m.dessiner({ p: e.p, vitesse: e.vitesse, reduit, proche: e.proche, devant: e.devant }, t.deltaMS);
    if (v2Actif && v2) { // Phase 1 V2 : les positions viennent de la scène 3D
      if (!v2Vol) { majOrbe(e.proche, false, 0, 0); return; }
      const pr = v2.projeter(e.proche);
      if (e.devant && pr.visible) invite.style.left = `${pr.x}px`;
      // Les fenêtres d'information sont FIXES à l'écran (indépendantes de la caméra) : du côté opposé au portail, à une position constante.
      const W = bandeau.clientWidth, H = bandeau.clientHeight, droite = v2.coteStation(e.proche) < 0;
      majAutres(e.proche === AUTRES && e.devant && pr.visible);
      majOrbe(e.proche, e.devant && pr.visible, droite ? W * 0.74 : W * 0.27, H * 0.82); // l'aperçu flotte devant la scène ; il s'efface quand le portail est dépassé
      return;
    }
    if (e.devant) invite.style.left = `${m.xEcranPortail(e.proche, e.p)}px`;
    majOrbe(e.proche, e.devant, m.xEcranPortail(e.proche, e.p), m.hautPortail);
  });
});

// ---------- Bouton son
const btnSon = $<HTMLButtonElement>('btn-son');
const majBtnSon = () => { btnSon.setAttribute('aria-pressed', String(!son.active)); btnSon.setAttribute('aria-label', son.active ? 'Couper le son' : 'Activer le son'); };
majBtnSon(); son.surChangement(majBtnSon);
btnSon.addEventListener('click', () => { son.basculer(); });

// ---------- Écran d'arrivée (yeux fermés) : « Phase 1 » = bandeau 2D ; « Phase 1 V2 » = chute puis vol sur le dragon (version de test).
if (!reduit) verrouiller(true, 0);
const arreterPoussiere = reduit ? () => {} : poussiereAccueil(intro);
const NOMS_PIERRES = ['Qui je suis ?', 'Parcours', 'Outils', 'Méthode', 'Contact'];
const barreJeu = reduit ? null : creerBarreJeu({
  portails: () => POSITIONS_PORTAILS.map((q) => chemin.yPour(q)),
  pierres: () => R_ARRETS.map((r) => chemin.yFin + r * hauteurGrotte()),
  nomsPortails: () => [...projets.map((p) => p.titre), "Et bien d'autres", 'Le portail noir'],
  nomsPierres: () => NOMS_PIERRES,
  aller: (type, i) => {
    if (phase === 'brisure' || phase === 'retour') return;
    if (type === 'pierre') { allerRubrique(String(i)); return; }
    if (i >= DERNIER) return;
    if (phase === 'grotte') retourChemin(() => chemin.allerY(chemin.yArret(i), 2.2)); else chemin.allerY(chemin.yArret(i), 2.2);
  },
});
function fermerIntro() { intro.classList.add('fondu'); window.setTimeout(() => intro.classList.add('parti'), 900); }
$('btn-phase1v2').addEventListener('click', async () => {
  if (v2Charge || reduit) return;
  son.demarrer().then(() => { son.tension(0.35, 1); son.coeur(66); son.vent(0.3, 3); }); // le son démarre dans ce clic (règle des navigateurs)
  v2Charge = true;
  try {
    const { PhaseV2 } = await import('./v2/phase1v2');
    const p2 = new PhaseV2(scene2d, () => chemin.etat.p);
    await p2.init();
    imgVortex = new Image(); imgVortex.src = `${import.meta.env.BASE_URL}sprites/v2/vortex-3.webp`; await imgVortex.decode().catch(() => { imgVortex = null; });
    try { const { Assets } = await import('pixi.js'); posesChute = await Promise.all(Array.from({ length: 8 }, (_, i) => Assets.load(`${import.meta.env.BASE_URL}sprites/v2/chute-${i}.webp`))); } catch { posesChute = null; }
    v2 = p2; v2Actif = true; scene2d.classList.add('v2-on'); chemin.aimantDesactive = true; chemin.directAuScroll = true; chemin.ralentirPortails = true; chemin.activerLong(true); chemin.maitriser(true); chemin.seuilAvant = 0.03; // en V2, seul le défilement fait avancer, plus lentement, et il ralentit près des portails
    Object.assign(window, { __v2: p2 });
    arreterPoussiere(); barreJeu?.afficher(); intro.classList.add('parti'); // la scène 3D est noire elle aussi : le relais ne se voit pas
    await p2.demarrer();
    v2Vol = true; verrouiller(false); indiceY = window.scrollY; indiceScroll.classList.add('visible'); // on peut avancer : l'icône de la molette invite à défiler vers le bas
  } catch (err) {
    console.warn('Phase 1 V2 indisponible, retour à la phase 1.', err);
    v2Actif = false; v2Charge = false; scene2d.classList.remove('v2-on');
    intro.classList.remove('parti', 'fondu'); // l'écran d'arrivée reste là : on peut choisir « Phase 1 »
  }
});
function arreterV2() {
  if (!v2) return;
  if (monde) { monde.capturePerso = null; monde.heros.alpha = 1; monde.heros.definirDessin(null); }
  v2.masquer(); v2Actif = false; scene2d.classList.remove('v2-on', 'v2-chute', 'v2-vol'); chemin.aimantDesactive = false; chemin.directAuScroll = false; chemin.ralentirPortails = false; chemin.activerLong(false); chemin.maitriser(false); chemin.seuilAvant = 0.016; chemin.restaurerDefilement();
  if (bloque) verrouiller(false);
  fermerIntro();
}
/** Retour de la grotte : on retrouve le dragon devant le portail noir. */
function reprendreV2() {
  if (!v2 || reduit) return;
  if (monde) { monde.capturePerso = null; monde.heros.alpha = 1; monde.heros.definirDessin(null); }
  v2.afficher(); v2Actif = true; chemin.maitriser(true); scene2d.classList.add('v2-on');
}

// Pour les vérifications (console) : window.__chemin
(window as unknown as { __chemin: Chemin }).__chemin = chemin;

// ---------- Menu de l'en-tête : les rubriques mènent aux portails (Projets) ou aux pierres de la grotte.
// Sans JavaScript, ou en mode « animations réduites », les liens ouvrent la version texte.
function allerRubrique(cible: string) {
  if (phase === 'brisure' || phase === 'retour') return;
  if (cible === 'projets') {
    if (phase === 'grotte') retourChemin(() => chemin.allerAuPortail(0));
    else chemin.allerAuPortail(0);
    return;
  }
  const i = Number(cible);
  if (phase === 'grotte') { chemin.allerY(chemin.yFin + R_ARRETS[i] * hauteurGrotte(), 2.2); return; }
  cibleRubrique = i;
  if (brisure) lancerFutur(); else chargerBrisure();
}
barre.addEventListener('click', (ev) => {
  const lien = (ev.target as HTMLElement).closest('a[data-rubrique]') as HTMLAnchorElement | null;
  if (lien && verrouille && !reduit) { ev.preventDefault(); direVerrou(); return; }
  if (!lien || reduit || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
  ev.preventDefault();
  allerRubrique(lien.dataset.rubrique as string);
});
(window as unknown as { __phase: () => unknown }).__phase = () => ({ phase, bloque, cibleRubrique, q: proxy.q });

// ---------- Fenêtre du trailer : apparaît au-dessus du portail quand le héros est à côté ; un clic entre dans le projet.
const panneauAutres = $('autres'); const videosAutres = Array.from(panneauAutres.querySelectorAll('video'));
let autresVisible = false;
/** Portail « Et bien d'autres » : un titre et trois petites fenêtres vidéo, fixes à l'écran, qui jouent en même temps. */
function majAutres(oui: boolean) {
  if (oui === autresVisible) return; autresVisible = oui; if (oui && annoncer('autres', 'et bien d\'autres')) son.jouer('cristal', 0.2, 1.15);
  panneauAutres.classList.toggle('visible', oui);
  for (const v of videosAutres) { if (oui) v.play().catch(() => { /* lecture refusée */ }); else v.pause(); }
}
// Bandeau « Nouvelle découverte » : annonce la première apparition de chaque portail, sans son (celui de la fiche suffit).
const CATEGORIES = ['application mobile Shinkatô', 'site internet Shinkatô', 'jeu vidéo', 'jeu ludique', 'jeu ludique', 'jeu vidéo', 'jeu vidéo'];
const decouverte = $('decouverte'), decouverteTexte = $('decouverte-texte'); const decouverts = new Set<string>(); let decouverteTimer: number | undefined;
/** Annonce un portail la première fois seulement ; renvoie vrai dans ce cas (le petit son ne se joue qu'alors). */
function annoncer(cle: string, texte: string): boolean {
  if (decouverts.has(cle) || reduit) return false; decouverts.add(cle);
  decouverteTexte.textContent = texte.charAt(0).toUpperCase() + texte.slice(1); decouverte.classList.add('visible');
  window.clearTimeout(decouverteTimer); decouverteTimer = window.setTimeout(() => decouverte.classList.remove('visible'), 3800);
  return true;
}
let orbeIndex = -1;
let orbeMasque: number | undefined;
const fiche = $('fiche-portail');
function remplirFiche(pr: Projet) {
  $('fp-type').textContent = pr.type; $('fp-statut').textContent = pr.statut; $('fp-titre').textContent = pr.titre;
  $('fp-sert').textContent = pr.a_quoi; $('fp-public').textContent = pr.pour_qui;
  const ul = $('fp-outils'); ul.textContent = '';
  pr.fiche.outils.filter((o) => !o.startsWith('[')).slice(0, 5).forEach((o) => { const li = document.createElement('li'); li.textContent = o; ul.append(li); });
  $('fp-idee').textContent = pr.fiche.idee; $('fp-part').textContent = pr.fiche.ma_part; $('fp-tous').textContent = pr.fiche.outils.filter((o) => !o.startsWith('[')).join(' · ');
  fiche.classList.remove('ouvert'); $('fp-plus').setAttribute('aria-expanded', 'false'); $('fp-plus').textContent = 'Voir plus';
}
$('fp-plus').addEventListener('click', () => { son.jouer('ui_clic', 0.7); const ouvert = fiche.classList.toggle('ouvert'); $('fp-plus').setAttribute('aria-expanded', String(ouvert)); $('fp-plus').textContent = ouvert ? 'Voir moins' : 'Voir plus'; });
function majOrbe(proche: number, devant: boolean, x: number, haut: number) {
  const actif = devant && proche < projets.length && phase === 'chemin' && !scene.ouverte;
  if (actif) {
    window.clearTimeout(orbeMasque);
    const pr = projets[proche];
    const vertical = pr.format === 'vertical';
    // Aperçu : 9:16 pour l'application mobile, 16:9 pour le reste ; aussi grand que la place au-dessus du portail le permet.
    const dispo = haut - 12;
    const larg = vertical ? Math.max(90, Math.min(dispo, 400) * 9 / 16) : Math.max(180, Math.min((dispo * 16) / 9, 560, bandeau.clientWidth * 0.42));
    const hauteur = vertical ? larg * 16 / 9 : larg * 9 / 16;
    const gauche = Math.min(Math.max(x, larg / 2 + 8), bandeau.clientWidth - larg / 2 - 8);
    orbe.classList.toggle('vertical', vertical);
    orbe.style.setProperty('--w', `${larg.toFixed(0)}px`);
    orbe.style.left = `${gauche.toFixed(1)}px`;
    orbe.style.top = `${(haut - 4).toFixed(1)}px`;
    // Fiche : à droite de l'aperçu (ou à gauche s'il n'y a pas la place), alignée sur son haut.
    const lf = Math.min(310, bandeau.clientWidth * 0.34);
    const droite = gauche + larg / 2 + 14 + lf <= bandeau.clientWidth - 8;
    fiche.style.left = `${(droite ? gauche + larg / 2 + 14 : Math.max(8, gauche - larg / 2 - 14 - lf)).toFixed(1)}px`;
    const topFiche = Math.max(10, haut - 4 - hauteur); fiche.style.top = `${topFiche.toFixed(1)}px`;
    fiche.style.maxHeight = `${Math.max(160, bandeau.clientHeight - topFiche - 12).toFixed(0)}px`; // la fiche ne dépasse jamais l'écran : elle défile en interne
    if (proche !== orbeIndex) {
      orbeIndex = proche;
      if (annoncer(`p${proche}`, CATEGORIES[proche] ?? pr.type)) son.jouer('cristal', 0.2, 1.15); // le petit son : seulement à la découverte, pas quand on revient en arrière
      orbeVideo.src = pr.video;
      orbeVideo.load();
      remplirFiche(pr);
    }
    if (!reduit) orbeVideo.play().catch(() => { /* lecture refusée : l'image reste fixe */ });
    else orbeVideo.pause();
    orbe.classList.add('visible'); fiche.classList.add('visible');
  } else if (orbe.classList.contains('visible')) {
    orbe.classList.remove('visible'); fiche.classList.remove('visible');
    orbeMasque = window.setTimeout(() => orbeVideo.pause(), 450);
  }
}
orbe.addEventListener('click', () => { if (orbeIndex >= 0) entrer(orbeIndex); });
(window as unknown as { __sequence: () => unknown }).__sequence = () => sequence;
