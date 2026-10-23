"""Prépare les portails animés de la Phase 1 V2 : anneaux runiques et disques de vortex, deux calques séparés.

Usage : python tools/preparer_portails_anim.py <planche_anneaux_3.png> <planche_vortex_3.png>
Sorties dans public/sprites/v2/ :
    anneau-<1..3>.webp   anneau runique (1 jaune doré, 2 bleu, 3 noir/violet), carré, centre transparent
    vortex-<1..3>.webp   disque de vortex (mêmes couleurs), carré, même taille de canevas
Affiche le rapport (diamètre intérieur de l'anneau / diamètre extérieur) : à reporter dans phase1v2.ts (RATIO_INTERIEUR).
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer  # noqa: E402
from preparer_vol import composantes, SORTIE  # noqa: E402

TAILLE = 700


def decouper(chemin, prefixe, mesurer=False):
    rgba = detourer(Image.open(chemin).convert("RGB"))
    objets = composantes(rgba, aire_min=40000, dilatation=6)
    if len(objets) != 3:
        sys.exit(f"{prefixe} : 3 objets attendus, {len(objets)} trouvés")
    demi = int(max(max(o["boite"][2] - o["boite"][0], o["boite"][3] - o["boite"][1]) for o in objets) / 2) + 3
    rapports = []
    for k, o in enumerate(objets, start=1):
        x0, y0, x1, y1 = o["boite"]
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        im = rgba.crop((cx - demi, cy - demi, cx + demi, cy + demi))
        if mesurer:
            a = np.asarray(im.getchannel("A")) > 128
            ligne = a[a.shape[0] // 2]
            milieu = len(ligne) // 2
            r_int = next(i for i in range(milieu) if ligne[milieu - i] or ligne[milieu + i])  # premier pixel d'anneau en partant du centre
            dehors = np.where(ligne)[0]
            r_ext = (dehors.max() - dehors.min()) / 2
            rapports.append(r_int / r_ext)
        im.resize((TAILLE, TAILLE), Image.LANCZOS).save(os.path.join(SORTIE, f"{prefixe}-{k}.webp"), quality=92, method=6)
    if mesurer:
        print("RATIO_INTERIEUR (rayon intérieur / rayon extérieur) :", [round(r, 3) for r in rapports])
    return demi


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    os.makedirs(SORTIE, exist_ok=True)
    d1 = decouper(sys.argv[1], "anneau", mesurer=True)
    d2 = decouper(sys.argv[2], "vortex")
    print("demi-canevas anneau", d1, "vortex", d2)
