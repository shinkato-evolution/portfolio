"""Découpe les deux mains du haut de la planche de mains (case haut-gauche : main relâchée ; haut-droite : main ouverte tendue).

Usage : python tools/preparer_mains_chute.py <planche_mains.png>
Sorties : public/sprites/mains/main-souple.webp et main-ouverte.webp (main gauche, avant-bras en bas à gauche).
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer, rogner, trouver_filet, RACINE  # noqa: E402


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    im = Image.open(sys.argv[1]).convert("RGB")
    W, H = im.size
    lum = np.asarray(im.convert("L")).astype(np.float32)
    xc = trouver_filet(lum[: H // 4].mean(axis=0), W // 2, W // 20)
    yc = trouver_filet(lum[:, : W // 4].mean(axis=1), H // 2, H // 20)
    m = 10
    sortie = os.path.join(RACINE, "public", "sprites", "mains")
    os.makedirs(sortie, exist_ok=True)
    for nom, boite in (("main-souple", (m, m, xc - m, yc - m)), ("main-ouverte", (xc + m, m, W - m, yc - m))):
        case = detourer(im.crop(boite))
        a = np.asarray(case.getchannel("A")) > 128
        et, n = ndimage.label(ndimage.binary_dilation(a, iterations=5))
        taille = ndimage.sum(np.ones_like(et), et, range(1, n + 1))
        masque = (et == 1 + int(np.argmax(taille))) & a
        arr = np.asarray(case).copy()
        arr[~ndimage.binary_dilation(masque, iterations=2), 3] = 0
        main = rogner(Image.fromarray(arr, "RGBA"))
        main.thumbnail((900, 900), Image.LANCZOS)
        main.save(os.path.join(sortie, f"{nom}.webp"), quality=90, method=6)
        print(nom, main.size)


if __name__ == "__main__":
    main()
