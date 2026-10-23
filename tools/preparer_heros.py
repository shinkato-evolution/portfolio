"""Découpe la planche de pièces du héros (8 pièces, fond magenta) pour la marionnette 2D.

Usage :
    python tools/preparer_heros.py <planche_pieces.png>

Ordre de lecture attendu : rangée 1 (tête, torse, haut du bras, avant-bras) puis rangée 2
(cuisse, jambe + botte, sacoche, second avant-bras). Sorties dans public/sprites/heros/<nom>.webp
et un contrôle visuel dans prod/contact-heros.png (hors site).
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer, rogner, RACINE  # noqa: E402

NOMS = ["tete", "torse", "bras-haut", "avant-bras", "cuisse", "jambe", "sacoche", "avant-bras-2"]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    img = detourer(Image.open(sys.argv[1]))
    alpha = np.asarray(img.getchannel("A")) > 128
    etiquettes, n = ndimage.label(ndimage.binary_dilation(alpha, iterations=9))
    pieces = []
    for k in range(1, n + 1):
        masque = (etiquettes == k) & alpha
        if masque.sum() < 8000:
            continue
        ys, xs = np.where(masque)
        pieces.append((ys.mean(), xs.mean(), masque))
    if len(pieces) != 8:
        sys.exit(f"{len(pieces)} pièces trouvées au lieu de 8 : pièces collées ou planche incorrecte.")
    milieu = img.size[1] / 2
    haut = sorted([p for p in pieces if p[0] < milieu], key=lambda p: p[1])
    bas = sorted([p for p in pieces if p[0] >= milieu], key=lambda p: p[1])
    if len(haut) != 4 or len(bas) != 4:
        sys.exit(f"Répartition {len(haut)}+{len(bas)} au lieu de 4+4.")
    sortie = os.path.join(RACINE, "public", "sprites", "heros")
    os.makedirs(sortie, exist_ok=True)
    controle = Image.new("RGB", (4 * 420, 2 * 520), (120, 130, 140))
    for i, (nom, (_, _, masque)) in enumerate(zip(NOMS, haut + bas)):
        piece = img.copy()
        a = np.asarray(piece.getchannel("A")).copy()
        a[~ndimage.binary_dilation(masque, iterations=2)] = 0
        piece.putalpha(Image.fromarray(a))
        piece = rogner(piece)
        piece.save(os.path.join(sortie, f"{nom}.webp"), quality=92, method=6)
        v = piece.copy()
        v.thumbnail((400, 500))
        controle.paste(v, ((i % 4) * 420 + 10, (i // 4) * 520 + 10), v)
        print(nom, piece.size)
    controle.save(os.path.join(RACINE, "prod", "contact-heros.png"))


if __name__ == "__main__":
    main()
