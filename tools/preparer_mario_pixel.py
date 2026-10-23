"""Découpe la planche de pièces de la marionnette PIXEL (8 pièces, fond magenta) et les ramène à la grille de pixels.

Usage : python tools/preparer_mario_pixel.py <planche_pieces.png> [--pixel N]

Ordre : rangée 1 = tête, torse, haut du bras, avant-bras + main ; rangée 2 = cuisse, jambe + botte, sacoche, second avant-bras.
Sorties : public/sprites/mario/<nom>.png (une image par pièce, un pixel d'image = un pixel dessiné)
et src/content/mario.json (tailles). Contrôle visuel : prod/contact-mario.png (hors site).
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer, rogner, RACINE  # noqa: E402
from preparer_heros_pixel import estimer_pixel, vers_grille  # noqa: E402

NOMS = ["tete", "torse", "bras-haut", "avant-bras", "cuisse", "jambe", "sacoche", "avant-bras-2"]


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    img = detourer(Image.open(args[0]))
    a = np.asarray(img.getchannel("A")) > 128
    et, n = ndimage.label(ndimage.binary_dilation(a, iterations=9))
    pieces = []
    for k in range(1, n + 1):
        m = (et == k) & a
        if m.sum() < 8000:
            continue
        ys, xs = np.where(m)
        pieces.append((ys.mean(), xs.mean(), m))
    if len(pieces) != 8:
        sys.exit(f"{len(pieces)} pièces au lieu de 8")
    milieu = img.size[1] / 2
    haut = sorted([p for p in pieces if p[0] < milieu], key=lambda p: p[1])
    bas = sorted([p for p in pieces if p[0] >= milieu], key=lambda p: p[1])
    crops = []
    for _, _, m in haut + bas:
        piece = img.copy()
        arr = np.asarray(piece.getchannel("A")).copy()
        arr[~ndimage.binary_dilation(m, iterations=2)] = 0
        piece.putalpha(Image.fromarray(arr))
        crops.append(rogner(piece))
    s = int(sys.argv[sys.argv.index("--pixel") + 1]) if "--pixel" in sys.argv else estimer_pixel(crops)
    print("côté du pixel dessiné :", s)
    sortie = os.path.join(RACINE, "public", "sprites", "mario")
    os.makedirs(sortie, exist_ok=True)
    meta = {}
    feuille = Image.new("RGB", (8 * 260, 560), (205, 238, 250))
    for i, (nom, c) in enumerate(zip(NOMS, crops)):
        g = vers_grille(c, s)
        g.save(os.path.join(sortie, f"{nom}.png"))
        meta[nom] = {"w": g.width, "h": g.height}
        print(nom, g.size)
        v = g.resize((g.width * 3, g.height * 3), Image.NEAREST)
        v.thumbnail((250, 540))
        feuille.paste(v, (i * 260 + 5, 5), v)
    meta["_pixel"] = s
    with open(os.path.join(RACINE, "src", "content", "mario.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=1)
    feuille.save(os.path.join(RACINE, "prod", "contact-mario.png"))


if __name__ == "__main__":
    main()
