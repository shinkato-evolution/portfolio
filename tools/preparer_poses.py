"""Découpe la planche 2 du héros : poses de profil (cellule haut-droite) et mains en vue subjective (cellules du bas).

Usage :
    python tools/preparer_poses.py <planche2.png>

Sorties : public/sprites/poses/<n>.webp, public/sprites/mains/<cellule>-<n>.webp
et un contrôle numéroté prod/contact-poses.png (hors site). Les éléments de décor dessinés avec les poses
(porte, pierre gravée) sont à écarter à la main après contrôle : ils sont collés aux mains ou au héros.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer, rogner, trouver_filet, RACINE  # noqa: E402

CELLULES = {1: ("visages", None), 2: ("poses", "poses"), 3: ("mains-a", "mains"), 4: ("mains-b", "mains")}


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    im = Image.open(sys.argv[1]).convert("RGB")
    W, H = im.size
    lum = np.asarray(im.convert("L")).astype(np.float32)
    xc = trouver_filet(lum[: H // 4].mean(axis=0), W // 2, W // 20)
    yc = trouver_filet(lum[:, : W // 4].mean(axis=1), H // 2, H // 20)
    marge = 10
    boites = {1: (0, 0, xc, yc), 2: (xc, 0, W, yc), 3: (0, yc, xc, H), 4: (xc, yc, W, H)}
    feuille = []
    for num, (x0, y0, x1, y1) in boites.items():
        nom, dossier = CELLULES[num]
        if dossier is None:
            continue  # les visages portent un autre costume : non repris
        cell = detourer(im.crop((x0 + marge, y0 + marge, x1 - marge, y1 - marge)))
        alpha = np.asarray(cell.getchannel("A")) > 128
        etiquettes, n = ndimage.label(ndimage.binary_dilation(alpha, iterations=9))
        objets = []
        for k in range(1, n + 1):
            masque = (etiquettes == k) & alpha
            if masque.sum() < 6000:
                continue
            ys, xs = np.where(masque)
            objets.append((xs.mean(), masque))
        objets.sort(key=lambda o: o[0])
        sortie = os.path.join(RACINE, "public", "sprites", dossier)
        os.makedirs(sortie, exist_ok=True)
        for i, (_, masque) in enumerate(objets, 1):
            piece = cell.copy()
            a = np.asarray(piece.getchannel("A")).copy()
            a[~ndimage.binary_dilation(masque, iterations=2)] = 0
            piece.putalpha(Image.fromarray(a))
            piece = rogner(piece)
            fichier = f"{i}.webp" if dossier == "poses" else f"{nom[-1]}-{i}.webp"
            piece.save(os.path.join(sortie, fichier), quality=92, method=6)
            feuille.append((f"{dossier}/{fichier}", piece))
            print(dossier, fichier, piece.size)
    cols, t = 4, 400
    lignes = (len(feuille) + cols - 1) // cols
    ctl = Image.new("RGB", (cols * t, lignes * (t + 20)), (120, 130, 140))
    d = ImageDraw.Draw(ctl)
    for i, (nom, p) in enumerate(feuille):
        v = p.copy(); v.thumbnail((t - 12, t - 12))
        x, y = (i % cols) * t, (i // cols) * (t + 20)
        ctl.paste(v, (x + 6, y + 18), v)
        d.text((x + 6, y + 3), nom, fill=(255, 255, 255))
    ctl.save(os.path.join(RACINE, "prod", "contact-poses.png"))


if __name__ == "__main__":
    main()
