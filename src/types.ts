export interface Projet {
  id: string;
  titre: string;
  type: string;
  pitch: string;
  emblème: { nom: string; phrase: string };
  geste: string;
  video: string;
  fiche: { idee: string; ma_part: string; outils: string[] };
  statut: string;
  format: 'vertical' | 'paysage'; // forme de l'aperçu vidéo au-dessus du portail
  a_quoi: string;
  pour_qui: string;
}
