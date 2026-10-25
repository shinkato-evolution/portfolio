// Valeurs de défilement (0..1 dans la grotte) où l'on s'arrête devant chacune des cinq pierres.
// Fichier séparé : le menu de l'en-tête les utilise sans charger Three.js.
// Téléphone : la dernière pierre est plus près de la fin, pour que le pied de page arrive plus tôt (l'ordinateur ne change pas).
export const R_ARRETS = window.matchMedia('(max-width: 700px)').matches ? [0.12, 0.30, 0.49, 0.69, 0.955] : [0.12, 0.30, 0.49, 0.68, 0.9];
