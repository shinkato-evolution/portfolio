"""Prépare le dragon marionnette (vue de dos) et les éléments de vie du décor (Phase 1 V2).

Usage : python tools/preparer_dragon_mario_vie.py <planche_pieces_dragon.png> <planche_vie.png>
Sorties dans public/sprites/v2/ :
    mario-corps.webp, mario-aile-int.webp, mario-aile-ext.webp, mario-main.webp   les 4 pièces (aile GAUCHE : pivot à droite)
    vie-<n>.webp   éléments de vie (oiseaux, dragons, rapaces, cascades, brumes, fleurs, branches, lucioles), rangée par rangée
    prod/contact-v2-vie.png : planche de contrôle numérotée
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer  # noqa: E402
from preparer_vol import composantes, extraire, reduire, controle, SORTIE  # noqa: E402


def pieces(chemin):
    rgba = detourer(Image.open(chemin).convert("RGB"))
    objets = composantes(rgba, aire_min=20000, dilatation=6)
    print("pièces :", len(objets), [(o["boite"]) for o in objets])
    if len(objets) != 4:
        sys.exit("attendu : 4 pièces")
    corps = max(objets, key=lambda o: o["boite"][3] - o["boite"][1])
    main = max(objets, key=lambda o: o["cx"])
    ailes = sorted([o for o in objets if o is not corps and o is not main], key=lambda o: o["cy"])
    for nom, o in (("corps", corps), ("main", main), ("aile-int", ailes[0]), ("aile-ext", ailes[1])):
        im = extraire(rgba, o, marge=2)
        im.save(os.path.join(SORTIE, f"mario-{nom}.webp"), quality=92, method=6)
        print(nom, im.size)


def pieces_v2(chemin):
    """Planche de 3 pièces : UNE aile gauche complète, le corps (cou épais, harnais), la main sur la sangle."""
    rgba = detourer(Image.open(chemin).convert("RGB"))
    objets = sorted(composantes(rgba, aire_min=20000, dilatation=6), key=lambda o: o["cx"])
    print("pièces v2 :", len(objets), [o["boite"] for o in objets])
    if len(objets) != 3:
        sys.exit("attendu : 3 pièces")
    for nom, o in zip(("aile", "corps", "main"), objets):
        im = extraire(rgba, o, marge=2)
        im.save(os.path.join(SORTIE, f"mario-{nom}.webp"), quality=92, method=6)
        print(nom, im.size, "bbox", o["boite"])


def vie(chemin):
    rgba = detourer(Image.open(chemin).convert("RGB"))
    objets = composantes(rgba, aire_min=1200, dilatation=22)
    sorties = []
    for i, o in enumerate(objets, start=1):
        im = reduire(extraire(rgba, o), 900)
        im.save(os.path.join(SORTIE, f"vie-{i}.webp"), quality=90, method=6)
        sorties.append(im)
    controle("vie", sorties)
    print("vie", len(sorties), "éléments")


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--pieces-v2":
        os.makedirs(SORTIE, exist_ok=True); pieces_v2(sys.argv[2]); sys.exit(0)
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    os.makedirs(SORTIE, exist_ok=True)
    pieces(sys.argv[1]); vie(sys.argv[2])
