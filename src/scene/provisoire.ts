// Scène de portail PROVISOIRE (J1) : plein écran, titre du projet, « Sortir du portail ».
// La vraie scène (vidéo sans cadre, voix off, sous-titres, geste) la remplacera en J3.
import type { Projet } from '../types';

export class ScenePortail {
  private dialog = document.getElementById('scene-portail') as HTMLDialogElement;
  private retourFocus: HTMLElement | null = null;
  surFermeture: () => void = () => {};

  constructor() {
    document.getElementById('scene-sortir')!.addEventListener('click', () => this.fermer());
    // Échap déclenche « cancel » puis « close » nativement.
    this.dialog.addEventListener('close', () => {
      this.surFermeture();
      this.retourFocus?.focus({ preventScroll: true });
    });
  }

  get ouverte() { return this.dialog.open; }

  ouvrir(projet: Projet, index: number, total: number, retour: HTMLElement | null) {
    this.retourFocus = retour;
    document.getElementById('scene-compteur')!.textContent = `Portail ${index + 1}/${total}`;
    document.getElementById('scene-titre')!.textContent = projet.titre;
    document.getElementById('scene-embleme')!.textContent = `${projet.emblème.nom} — ${projet.emblème.phrase}`;
    (document.getElementById('scene-fiche') as HTMLAnchorElement).href = `/projets/${projet.id}.html`;
    this.dialog.showModal();
    document.getElementById('scene-sortir')!.focus();
  }

  fermer() { if (this.dialog.open) this.dialog.close(); }
}
