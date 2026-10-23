"""Prépare la vue à la première personne sur le dragon et les mains qui l'attrapent (Phase 1 V2).

Usage : python tools/preparer_vue_dragon.py <planche_dragon_2x3.png> [<planche_mains_6.png>]
Sorties dans public/sprites/v2/ :
    vue-dragon-<1..6>.webp   les six cases de la planche (même cadrage), fond magenta retiré
    main-tendue-<1..2>.webp  (ancien essai) rangée du haut d'une planche de mains
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer, RACINE  # noqa: E402
from preparer_vol import composantes, extraire, SORTIE  # noqa: E402


def dragon(chemin, colonnes=2, lignes=3):
    """Planche 2 colonnes x 3 lignes (cases très larges) lue de gauche à droite puis de haut en bas."""
    im = Image.open(chemin).convert("RGB")
    W, H = im.size
    xs = [round(W * i / colonnes) for i in range(colonnes + 1)]
    ys = [round(H * j / lignes) for j in range(lignes + 1)]
    n = 1
    for j in range(lignes):
        for i in range(colonnes):
            case = detourer(im.crop((xs[i], ys[j], xs[i + 1], ys[j + 1])))
            a = np.asarray(case).copy()
            # Les petites poussières isolées (quelques pixels) sont effacées ; le dragon reste d'un seul tenant avec ses ailes.
            masque = a[..., 3] > 40
            et, k = ndimage.label(ndimage.binary_dilation(masque, iterations=4))
            if k:
                tailles = ndimage.sum(np.ones_like(et), et, range(1, k + 1))
                garde = np.isin(et, [i2 + 1 for i2, t in enumerate(tailles) if t > 5000])
                a[~ndimage.binary_dilation(garde, iterations=3), 3] = 0
            Image.fromarray(a, "RGBA").save(os.path.join(SORTIE, f"vue-dragon-{n}.webp"), quality=90, method=6)
            n += 1
    print("vue-dragon", n - 1, "cases", (xs[1] - xs[0]), "x", (ys[1] - ys[0]))


def mains(chemin):
    rgba = detourer(Image.open(chemin).convert("RGB"))
    objets = composantes(rgba, aire_min=8000, dilatation=6)
    haut = [o for o in objets if o["cy"] < rgba.height / 2]
    print("mains rangée du haut :", len(haut))
    for k, o in enumerate(haut[1:3], start=1):  # 2e et 3e : les deux mains droites
        extraire(rgba, o).save(os.path.join(SORTIE, f"main-tendue-{k}.webp"), quality=92, method=6)


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    os.makedirs(SORTIE, exist_ok=True)
    dragon(sys.argv[1])
    if len(sys.argv) == 3:
        mains(sys.argv[2])
