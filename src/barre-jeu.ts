// Barre de défilement « façon jeu » : une jauge verticale à droite qui remplace la barre du navigateur.
// On ne la fait pas glisser (le défilement est freiné aux portails). Les repères — portails (losanges) et pierres de la grotte (ronds) — ne se révèlent qu'une fois
// découverts : on peut alors poser la souris dessus pour lire leur nom et cliquer pour y retourner. Les repères non découverts restent sombres et inertes.
export interface DonneesBarre {
  portails: () => number[]; pierres: () => number[];       // positions de défilement (px)
  nomsPortails: () => string[]; nomsPierres: () => string[];
  aller: (type: 'portail' | 'pierre', i: number) => void;
}

export function creerBarreJeu(d: DonneesBarre) {
  const racine = document.createElement('div'); racine.className = 'barre-jeu'; racine.setAttribute('aria-hidden', 'true');
  racine.innerHTML = '<div class="bj-rail"><i class="bj-remplissage"></i></div><i class="bj-curseur"></i><span class="bj-info"></span>';
  document.body.append(racine);
  const remplissage = racine.querySelector('.bj-remplissage') as HTMLElement, curseur = racine.querySelector('.bj-curseur') as HTMLElement, rail = racine.querySelector('.bj-rail') as HTMLElement, info = racine.querySelector('.bj-info') as HTMLElement;
  const marques: { el: HTMLElement; type: 'portail' | 'pierre'; i: number; vu: boolean }[] = [];
  const poser = (type: 'portail' | 'pierre', n: number, classe: string) => {
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i'); el.className = classe; rail.append(el);
      const m = { el, type, i, vu: false }; marques.push(m);
      el.addEventListener('mouseenter', () => { if (!m.vu) return; const noms = type === 'portail' ? d.nomsPortails() : d.nomsPierres(); info.textContent = noms[i] ?? ''; info.style.top = el.style.top; info.classList.add('visible'); });
      el.addEventListener('mouseleave', () => info.classList.remove('visible'));
      el.addEventListener('click', () => { if (m.vu) d.aller(type, i); });
    }
  };
  poser('portail', 9, 'bj-portail'); poser('pierre', 5, 'bj-pierre');
  let actif = false, raf = 0;
  const tic = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight), p = Math.min(1, Math.max(0, window.scrollY / max));
    remplissage.style.height = `${(p * 100).toFixed(2)}%`; curseur.style.top = `${(p * 100).toFixed(2)}%`;
    const pos = { portail: d.portails(), pierre: d.pierres() };
    for (const m of marques) {
      const q = Math.min(1, Math.max(0, (pos[m.type][m.i] ?? 0) / max));
      m.el.style.top = `${(q * 100).toFixed(2)}%`;
      if (!m.vu && p >= q - 0.0005) { m.vu = true; m.el.classList.add('passe'); } // une fois découvert, le repère le reste
    }
    raf = requestAnimationFrame(tic);
  };
  return {
    afficher() { if (actif) return; actif = true; racine.classList.add('visible'); document.documentElement.classList.add('barre-jeu-on'); raf = requestAnimationFrame(tic); },
    cacher() { actif = false; cancelAnimationFrame(raf); racine.classList.remove('visible'); document.documentElement.classList.remove('barre-jeu-on'); },
  };
}
