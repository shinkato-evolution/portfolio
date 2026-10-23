// Sound design du portfolio : musique et effets (fichiers CC0, voir public/audio/CREDITS.md) + ambiances synthétisées (vent, torche, gouttes, battement de cœur).
// Le son ne démarre qu'après un clic (règle des navigateurs) : `demarrer()` est appelé sur « Vivre mon parcours ». Un bouton permet de le couper ; le choix est mémorisé.
const BASE = `${import.meta.env.BASE_URL}audio/`;
const EFFETS = ['ui_clic', 'cristal', 'choc_fort', 'choc_fort2', 'chute', 'atterrissage', 'compte_tick'];
const MUSIQUES = ['menu']; // « tournoi » (la grotte, 1,6 Mo) ne se charge qu'à l'approche de la grotte : voir precharger()

class Son {
  private ctx: AudioContext | null = null; private master!: GainNode; private tampons: Record<string, AudioBuffer> = {};
  private bruit!: AudioBuffer; private actif = true; private pret = false;
  private musiqueCourante: { nom: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private ventGain: GainNode | null = null; private ventFiltre: BiquadFilterNode | null = null; private ventTimer = 0;
  private torcheTimer = 0; private torcheGain: GainNode | null = null; private gouttesTimer = 0; private coeurTimer = 0; private coeurBpm = 0;
  private ecouteurs: (() => void)[] = [];

  constructor() { try { this.actif = localStorage.getItem('son-actif') !== '0'; } catch { /* stockage indisponible */ } }

  get active() { return this.actif; }
  /** Appelé par le bouton du haut : coupe ou rétablit tout le son. */
  basculer() { this.reglerActif(!this.actif); return this.actif; }
  surChangement(f: () => void) { this.ecouteurs.push(f); }
  private reglerActif(oui: boolean) {
    this.actif = oui; try { localStorage.setItem('son-actif', oui ? '1' : '0'); } catch { /* */ }
    if (this.ctx) this.master.gain.setTargetAtTime(oui ? 0.9 : 0, this.ctx.currentTime, 0.08);
    this.ecouteurs.forEach((f) => f());
  }

  /** Crée le contexte audio (dans un clic) et charge les fichiers. */
  async demarrer() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    this.ctx = new C(); this.master = this.ctx.createGain(); this.master.gain.value = this.actif ? 0.9 : 0; this.master.connect(this.ctx.destination);
    // Bruit blanc de 3 s, répété : la matière du vent, de la torche et des souffles.
    const n = this.ctx.sampleRate * 3; this.bruit = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = this.bruit.getChannelData(0); let b0 = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = 0.97 * b0 + 0.03 * w; d[i] = w * 0.5 + b0 * 4; } // un peu rose : moins de sifflement
    await Promise.all([...EFFETS, ...MUSIQUES].map(async (nom) => {
      try { const r = await fetch(`${BASE}${nom}.ogg`); this.tampons[nom] = await this.ctx!.decodeAudioData(await r.arrayBuffer()); } catch { /* un son manquant ne bloque rien */ }
    }));
    this.pret = true;
  }

  private chargements: Record<string, Promise<void>> = {};
  /** Charge un son à la demande (une seule fois) : la musique de la grotte n'est téléchargée que si le visiteur s'en approche. */
  precharger(nom: string): Promise<void> {
    if (!this.ctx || this.tampons[nom]) return Promise.resolve();
    return this.chargements[nom] ??= (async () => { try { const r = await fetch(`${BASE}${nom}.ogg`); this.tampons[nom] = await this.ctx!.decodeAudioData(await r.arrayBuffer()); } catch { /* un son manquant ne bloque rien */ } })();
  }

  /** Joue un effet : volume, hauteur (1 = normale). */
  jouer(nom: string, volume = 0.8, hauteur = 1) {
    if (!this.ctx || !this.pret || !this.actif) return;
    const t = this.tampons[nom]; if (!t) return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = t; s.playbackRate.value = hauteur; g.gain.value = volume; s.connect(g).connect(this.master); s.start();
  }

  /** Musique de fond en boucle, avec fondu enchaîné ; `null` arrête la musique. */
  musique(nom: string | null, volume = 0.3, fondu = 2) {
    if (!this.ctx || !this.pret) return;
    if (nom && !this.tampons[nom]) { void this.precharger(nom).then(() => this.musique(nom, volume, fondu)); return; } // pas encore chargée : on la charge, puis elle démarre
    const c = this.ctx, t = c.currentTime, cour = this.musiqueCourante;
    if (cour && cour.nom === nom) { cour.gain.gain.cancelScheduledValues(t); cour.gain.gain.linearRampToValueAtTime(volume, t + fondu); return; }
    if (cour) { cour.gain.gain.cancelScheduledValues(t); cour.gain.gain.setValueAtTime(cour.gain.gain.value, t); cour.gain.gain.linearRampToValueAtTime(0, t + fondu); const s = cour.src; window.setTimeout(() => { try { s.stop(); } catch { /* déjà arrêtée */ } }, fondu * 1000 + 100); }
    this.musiqueCourante = null;
    if (!nom || !this.tampons[nom]) return;
    const src = c.createBufferSource(), gain = c.createGain(); src.buffer = this.tampons[nom]; src.loop = true; gain.gain.value = 0; src.connect(gain).connect(this.master); src.start();
    gain.gain.linearRampToValueAtTime(volume, t + fondu); this.musiqueCourante = { nom, src, gain };
  }

  /** Vent : souffle filtré dont la hauteur et le volume ondulent ; `niveau` de 0 (éteint) à 1 (chute libre). */
  vent(niveau: number, fondu = 1.5) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (!this.ventGain) {
      const src = c.createBufferSource(); src.buffer = this.bruit; src.loop = true;
      this.ventFiltre = c.createBiquadFilter(); this.ventFiltre.type = 'bandpass'; this.ventFiltre.frequency.value = 500; this.ventFiltre.Q.value = 0.7;
      this.ventGain = c.createGain(); this.ventGain.gain.value = 0; src.connect(this.ventFiltre).connect(this.ventGain).connect(this.master); src.start();
      window.clearInterval(this.ventTimer);
      this.ventTimer = window.setInterval(() => { // le vent vit : niveau qui rejoint sa cible, rafales brusques qui se creusent quand on tombe
        if (!this.ventFiltre || !this.ventGain || !this.ctx) return;
        const ct = this.ctx.currentTime, maintenant = performance.now();
        this.ventCour += (this.ventCible - this.ventCour) * Math.min(1, 0.1 / this.ventTau);
        if (maintenant > this.rafaleFin) {
          const creux = this.ventCible > 0.45 ? 0.85 : 0.25; // en chute libre : de vraies rafales, presque un silence entre deux
          this.rafale = 1 - Math.random() * creux; this.rafaleFin = maintenant + 180 + Math.random() * (this.ventCible > 0.45 ? 520 : 1400);
          this.ventFiltre.frequency.setTargetAtTime(260 + Math.random() * 1100 * (0.3 + this.rafale) * (0.5 + this.ventCible), ct, 0.09);
        }
        this.ventGain.gain.setTargetAtTime(this.ventCour * 0.28 * this.rafale, ct, 0.07);
      }, 100);
    }
    this.niveauVent = niveau; this.ventCible = niveau; this.ventTau = Math.max(0.15, fondu / 3);
  }
  private niveauVent = 0; private ventCible = 0; private ventCour = 0; private ventTau = 0.5; private rafale = 1; private rafaleFin = 0;

  /** Un pas sur la pierre : `force` de 0 (feutré) à 1 (appuyé) ; un pied après l'autre. */
  private piedGauche = true;
  pas(force = 0.5) {
    if (!this.ctx || !this.pret || !this.actif) return;
    const c = this.ctx, t = c.currentTime, f = Math.max(0, Math.min(1, force));
    const pan = c.createStereoPanner(); pan.pan.value = (this.piedGauche ? -0.25 : 0.25); this.piedGauche = !this.piedGauche; pan.connect(this.master);
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(110 + Math.random() * 20, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.1 + 0.3 * f, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14); o.connect(g).connect(pan); o.start(t); o.stop(t + 0.18);
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), gn = c.createGain(); s.buffer = this.bruit; fl.type = 'bandpass'; fl.frequency.value = 500 + f * 900 + Math.random() * 250; fl.Q.value = 0.9;
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(0.03 + 0.14 * f, t + 0.004); gn.gain.exponentialRampToValueAtTime(0.0006, t + 0.05 + 0.05 * f); s.connect(fl).connect(gn).connect(pan); s.start(t, Math.random() * 2); s.stop(t + 0.12);
  }

  /** Verre qui se brise : un claquement sec, puis une pluie d'éclats cristallins ; plus nombreux et plus forts avec `force` (0 à 1). */
  craquement(force = 0.5) {
    if (!this.ctx || !this.pret || !this.actif) return;
    const c = this.ctx, base = c.currentTime, f = Math.max(0, Math.min(1, force));
    { // le claquement : un coup de bruit très bref et très aigu
      const s = c.createBufferSource(), h = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.bruit; h.type = 'highpass'; h.frequency.value = 2200;
      g.gain.setValueAtTime(0, base); g.gain.linearRampToValueAtTime(0.14 + 0.3 * f, base + 0.002); g.gain.exponentialRampToValueAtTime(0.0005, base + 0.035 + 0.04 * f);
      s.connect(h).connect(g).connect(this.master); s.start(base, Math.random() * 2); s.stop(base + 0.12);
    }
    const n = 5 + Math.round(f * 16); // les éclats : des tintements aigus et inharmoniques, qui s'étalent dans le temps
    for (let i = 0; i < n; i++) {
      const t = base + 0.01 + Math.random() * (0.12 + 0.35 * f), fr = 2600 + Math.random() * 6200, vol = (0.025 + Math.random() * 0.06) * (0.5 + f), dur = 0.07 + Math.random() * (0.18 + 0.25 * f);
      for (const [mult, part] of [[1, 1], [2.76, 0.45]] as const) {
        const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = fr * mult;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * part, t + 0.0015); g.gain.exponentialRampToValueAtTime(0.0003, t + dur);
        o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
      }
    }
    if (f > 0.6) { // le gros éclatement : un coup sourd sous le verre
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(120, base); o.frequency.exponentialRampToValueAtTime(38, base + 0.3);
      g.gain.setValueAtTime(0, base); g.gain.linearRampToValueAtTime(0.22 * f, base + 0.008); g.gain.exponentialRampToValueAtTime(0.001, base + 0.35); o.connect(g).connect(this.master); o.start(base); o.stop(base + 0.4);
    }
  }

  /** Woosh : un balayage de vent bref pour enchaîner deux plans ; `sens` 1 monte, -1 descend ; `force` de 0 à 1. */
  whoosh(sens = 1, force = 0.8) {
    if (!this.ctx || !this.pret || !this.actif) return;
    const c = this.ctx, t = c.currentTime, d = 0.3 + Math.random() * 0.08, f = Math.max(0.1, Math.min(1, force));
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.bruit; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 1.1;
    fl.frequency.setValueAtTime(sens > 0 ? 350 : 2800, t); fl.frequency.exponentialRampToValueAtTime(sens > 0 ? 2800 : 350, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * f, t + d * 0.42); g.gain.exponentialRampToValueAtTime(0.0005, t + d);
    s.connect(fl).connect(g).connect(this.master); s.start(t, Math.random() * 2); s.stop(t + d + 0.05);
  }

  /** Aspiration : un souffle qui monte en fréquence et en volume sur `duree` s, comme si le portail avalait le joueur. */
  aspire(duree = 1.4) {
    if (!this.ctx || !this.pret || !this.actif) return;
    const c = this.ctx, t = c.currentTime, fin = t + duree;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.bruit; s.loop = true; f.type = 'bandpass'; f.Q.value = 2.5;
    f.frequency.setValueAtTime(140, t); f.frequency.exponentialRampToValueAtTime(3800, fin);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, fin - 0.05); g.gain.linearRampToValueAtTime(0, fin + 0.06);
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(fin + 0.1);
    const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(520, fin);
    og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.12, fin - 0.05); og.gain.linearRampToValueAtTime(0, fin + 0.06); o.connect(og).connect(this.master); o.start(t); o.stop(fin + 0.1);
  }

  /** Chute libre : un souffle qui part vers le bas, par à-coups, avec un grondement qui s'éloigne ; doux, jamais strident. */
  chuteLibre(duree = 2.4) {
    if (!this.ctx || !this.pret || !this.actif) return;
    const c = this.ctx, t = c.currentTime, fin = t + duree;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.bruit; s.loop = true; f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(220, fin);
    g.gain.setValueAtTime(0, t);
    for (let x = 0; x < duree - 0.1; x += 0.22 + Math.random() * 0.18) { // des à-coups : chaque bouffée monte vite et retombe
      const k = 1 - x / duree, pic = (0.1 + Math.random() * 0.14) * (0.3 + k);
      g.gain.linearRampToValueAtTime(pic, t + x + 0.07); g.gain.linearRampToValueAtTime(pic * 0.25, t + x + 0.2);
    }
    g.gain.linearRampToValueAtTime(0, fin); s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(fin + 0.1);
    const o = c.createOscillator(), og = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(45, fin);
    og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.07, t + 0.3); og.gain.linearRampToValueAtTime(0, fin); o.connect(og).connect(this.master); o.start(t); o.stop(fin + 0.1);
  }

  /** Respiration subjective (chute) : un souffle très léger, court et irrégulier, avec parfois une inspiration coupée ; plus `niveau` est haut, plus il est rapide et haché (0 l'éteint). */
  private tensionTimer = 0; private tensionNiveau = 0;
  tension(niveau: number, _fondu = 1.5) {
    this.tensionNiveau = niveau;
    if (niveau <= 0) { window.clearTimeout(this.tensionTimer); this.tensionTimer = 0; return; }
    if (!this.ctx || this.tensionTimer) return; // déjà en cours : seul le niveau change
    const souffle = (t: number, duree: number, f0: number, f1: number, vol: number) => { // un souffle : bruit filtré qui monte et retombe
      const c = this.ctx!, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.bruit; s.loop = true; f.type = 'bandpass'; f.Q.value = 0.9;
      f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + duree);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + duree * 0.45); g.gain.linearRampToValueAtTime(0, t + duree);
      s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 2); s.stop(t + duree + 0.05);
    };
    const respire = () => {
      if (!this.ctx || this.tensionNiveau <= 0) { this.tensionTimer = 0; return; }
      const n = this.tensionNiveau; let attente = 0.5 + Math.random() * 0.5 - n * 0.25; // pause avant la prochaine respiration
      if (this.actif) {
        const t = this.ctx.currentTime + 0.02, v = 0.075 + 0.05 * n; // faible mais audible
        const inspire = 0.28 - n * 0.1 + Math.random() * 0.08;
        souffle(t, inspire, 700, 1500, v);
        if (Math.random() < 0.3 + n * 0.3) { souffle(t + inspire + 0.07, 0.14, 800, 1700, v * 0.9); attente += 0.1; } // inspiration coupée : le souffle est coupé
        else souffle(t + inspire + 0.06, 0.34 - n * 0.1, 1100, 450, v * 0.8); // sinon, il expire
      }
      this.tensionTimer = window.setTimeout(respire, (0.75 + attente) * 1000);
    };
    respire();
  }

  /** Bourdonnement du vortex : grave, ondulant, qui monte avec `niveau` (0 l'éteint). */
  private vortexGain: GainNode | null = null; private vortexFiltre: BiquadFilterNode | null = null; private vortexOscs: OscillatorNode[] = [];
  vortex(niveau: number, fondu = 1) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
    if (!this.vortexGain) {
      this.vortexGain = c.createGain(); this.vortexGain.gain.value = 0; this.vortexFiltre = c.createBiquadFilter(); this.vortexFiltre.type = 'lowpass'; this.vortexFiltre.frequency.value = 260; this.vortexFiltre.Q.value = 4;
      this.vortexFiltre.connect(this.vortexGain).connect(this.master);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.9; lg.gain.value = 160; lfo.connect(lg).connect(this.vortexFiltre.frequency); lfo.start();
      for (const [fr, dt] of [[55, 0], [82.4, 7], [110.5, -9]] as const) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt; o.connect(this.vortexFiltre); o.start(); this.vortexOscs.push(o); }
    }
    this.vortexGain.gain.cancelScheduledValues(t); this.vortexGain.gain.setTargetAtTime(niveau * 0.07, t, fondu / 3);
    this.vortexFiltre!.frequency.setTargetAtTime(220 + niveau * 700, t, fondu / 2);
    this.vortexOscs.forEach((o, i) => o.frequency.setTargetAtTime([55, 82.4, 110.5][i] * (1 + niveau * 0.5), t, fondu / 2)); // la note monte : ça s'emballe
  }

  /** Torche : un ronflement grave et des crépitements irréguliers. */
  torche(oui: boolean) {
    if (!this.ctx) return; const c = this.ctx;
    window.clearTimeout(this.torcheTimer);
    if (!oui) { this.torcheGain?.gain.setTargetAtTime(0, c.currentTime, 0.4); return; }
    if (!this.torcheGain) {
      const src = c.createBufferSource(); src.buffer = this.bruit; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; this.torcheGain = c.createGain(); this.torcheGain.gain.value = 0;
      src.connect(f).connect(this.torcheGain).connect(this.master); src.start();
    }
    this.torcheGain.gain.setTargetAtTime(0.05, c.currentTime, 0.8);
    const crepite = () => {
      if (!this.ctx || !this.actif) { this.torcheTimer = window.setTimeout(crepite, 400); return; }
      const t = this.ctx.currentTime, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      s.buffer = this.bruit; s.loop = true; f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 3500; f.Q.value = 1.4;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.12, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.02 + Math.random() * 0.05);
      s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 2); s.stop(t + 0.1);
      this.torcheTimer = window.setTimeout(crepite, 40 + Math.random() * 260);
    };
    crepite();
  }

  /** Gouttes lointaines de la grotte : un ping qui s'éteint en écho. */
  gouttes(oui: boolean) {
    window.clearTimeout(this.gouttesTimer); if (!oui || !this.ctx) return;
    const c = this.ctx, delai = c.createDelay(1), retour = c.createGain(), sortie = c.createGain(); delai.delayTime.value = 0.31; retour.gain.value = 0.42; sortie.gain.value = 0.5;
    delai.connect(retour).connect(delai); delai.connect(sortie).connect(this.master);
    const goutte = () => {
      if (!this.ctx) return;
      if (this.actif) {
        const t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1400 + Math.random() * 900, t); o.frequency.exponentialRampToValueAtTime(700 + Math.random() * 300, t + 0.12);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.35); o.connect(g); g.connect(delai); g.connect(this.master); o.start(t); o.stop(t + 0.4);
      }
      this.gouttesTimer = window.setTimeout(goutte, 2200 + Math.random() * 5200);
    };
    this.gouttesTimer = window.setTimeout(goutte, 1500);
  }

  /** Battement de cœur : `bpm` à 0 l'arrête ; plus il est haut, plus l'angoisse monte. */
  coeur(bpm: number) {
    this.coeurBpm = bpm; window.clearTimeout(this.coeurTimer); if (!bpm || !this.ctx) return;
    const batt = () => {
      if (!this.ctx || !this.coeurBpm) return;
      if (this.actif) for (const [dec, vol] of [[0, 0.4], [0.16, 0.27]] as const) {
        const t = this.ctx.currentTime + dec, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.16); // assez haut pour s'entendre sur de petits haut-parleurs
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.25);
      }
      this.coeurTimer = window.setTimeout(batt, 60000 / this.coeurBpm);
    };
    batt();
  }

  /** Coupe tout ce qui tourne (retour à l'accueil, animations réduites). */
  tout(arreter = true) { if (!arreter) return; this.musique(null, 0, 0.6); this.vent(0); this.torche(false); this.gouttes(false); this.coeur(0); }
}

export const son = new Son();
