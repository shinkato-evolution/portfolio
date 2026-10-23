"""Prépare les portails ronds et les textures de roche de la Phase 1 V2.

Usage : python tools/preparer_portails_roches.py <planche_roches_2x2.png> <planche_portails_4x2.png>
Sorties dans public/sprites/v2/ :
    roche-<1..4>.webp    falaise, roche usée, roche claire, roche sombre (cases de la planche 2x2, en 1024 px de large)
    portail-<1..8>.webp  portails ronds, fond magenta retiré (ordre : de gauche à droite, rangée par rangée ; le 8e est le mystérieux)
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer  # noqa: E402
from preparer_vol import composantes, extraire, SORTIE  # noqa: E402


def roches(chemin):
    im = Image.open(chemin).convert("RGB")
    W, H = im.size
    n = 1
    for j in range(2):
        for i in range(2):
            c = im.crop((i * W // 2 + 2, j * H // 2 + 2, (i + 1) * W // 2 - 2, (j + 1) * H // 2 - 2))
            c = c.resize((1024, round(1024 * c.height / c.width)), Image.LANCZOS)
            c.save(os.path.join(SORTIE, f"roche-{n}.webp"), quality=90, method=6)
            n += 1


def portails(chemin):
    rgba = detourer(Image.open(chemin).convert("RGB"))
    objets = composantes(rgba, aire_min=40000, dilatation=10)
    print("portails :", len(objets))
    if len(objets) != 8:
        sys.exit("attendu : 8 portails")
    # Même canevas carré pour tous : le centre de chaque portail reste au centre.
    demi = int(max(max(o["boite"][2] - o["boite"][0], o["boite"][3] - o["boite"][1]) for o in objets) / 2) + 4
    for k, o in enumerate(objets, start=1):
        cx, cy = int(o["cx"]), int(o["cy"])
        im = rgba.crop((cx - demi, cy - demi, cx + demi, cy + demi))
        im = im.resize((600, 600), Image.LANCZOS)
        im.save(os.path.join(SORTIE, f"portail-{k}.webp"), quality=92, method=6)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    os.makedirs(SORTIE, exist_ok=True)
    roches(sys.argv[1]); portails(sys.argv[2])
