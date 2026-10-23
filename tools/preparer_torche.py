"""Prépare la main gauche qui tient la torche et les flammes animées (planche de 4 cases, fond magenta).

Usage : python tools/preparer_torche.py <planche_mains.png>

Case bas-gauche : main droite tenant une torche (sans flamme) -> retournée horizontalement : main GAUCHE, avant-bras en bas à gauche.
Case bas-droite : 4 flammes isolées. Sorties dans public/sprites/mains/ : torche-g.webp, flamme-0..3.webp.
Affiche la position de la tête de la torche (fractions de l'image) : point d'accroche de la flamme.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer, rogner, trouver_filet, RACINE  # noqa: E402

SORTIE = os.path.join(RACINE, "public", "sprites", "mains")


def composantes(img, mini):
    a = np.asarray(img.getchannel("A")) > 128
    et, n = ndimage.label(ndimage.binary_dilation(a, iterations=5))
    res = []
    for k in range(1, n + 1):
        m = (et == k) & a
        if m.sum() < mini:
            continue
        ys, xs = np.where(m)
        arr = np.asarray(img).copy()
        arr[~ndimage.binary_dilation(m, iterations=2), 3] = 0
        res.append((xs.mean(), rogner(Image.fromarray(arr, "RGBA"))))
    return [p for _, p in sorted(res, key=lambda t: t[0])]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    im = Image.open(sys.argv[1]).convert("RGB")
    W, H = im.size
    lum = np.asarray(im.convert("L")).astype(np.float32)
    xc = trouver_filet(lum[: H // 4].mean(axis=0), W // 2, W // 20)
    yc = trouver_filet(lum[:, : W // 4].mean(axis=1), H // 2, H // 20)
    m = 10
    torche_case = detourer(im.crop((m, yc + m, xc - m, H - m)))
    flammes_case = detourer(im.crop((xc + m, yc + m, W - m, H - m)))
    os.makedirs(SORTIE, exist_ok=True)

    t = composantes(torche_case, 40000)
    if not t:
        sys.exit("torche introuvable")
    torche = max(t, key=lambda p: p.width * p.height).transpose(Image.FLIP_LEFT_RIGHT)  # main gauche
    torche.save(os.path.join(SORTIE, "torche-g.webp"), quality=92, method=6)
    # Tête de la torche : le quart le plus haut de l'image (la torche pointe vers le haut).
    a = np.asarray(torche.getchannel("A")) > 128
    haut = a[: max(8, torche.height // 5)]
    ys, xs = np.where(haut)
    cx, cy = xs.mean() / torche.width, (ys.min() + 0) / torche.height
    largeur_tete = (xs.max() - xs.min()) / torche.width
    print("torche", torche.size, "tête x=%.3f y(haut)=%.3f largeur=%.3f" % (cx, cy, largeur_tete))

    fl = [p for p in composantes(flammes_case, 9000)]
    print(len(fl), "flammes")
    for i, f in enumerate(fl[:4]):
        f.save(os.path.join(SORTIE, f"flamme-{i}.webp"), quality=92, method=6)
        print("flamme", i, f.size)


if __name__ == "__main__":
    main()
